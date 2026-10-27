import { MetadataRoute } from 'next'
import {
  getAllMedicamentIds,
  getAllLaboSlugs,
  getAllDciList,
  getAllFormeList,
  getAllRetraitAnnees,
  getAllNouveauteAnneeMois,
  getLastVersionDate,
  getAllMarqueFamilies,
  getLettreCounts,
} from '@/lib/queries'
import { getGardeCoverage, slugify } from '@/lib/garde'
import { getDirectoryPlaces, getAllPharmacyRefs, groupByWilaya, pharmacyPath } from '@/lib/annuaire'
import { medicamentPath } from '@/lib/medicament-url'
import { ARTICLES } from '@/lib/articles'
import { MIN_FAMILY_SIZE } from '@/lib/marque'
import { LETTRE_SLUGS, REPERTOIRE_PAGE_SIZE, lettrePath } from '@/lib/repertoire'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

// Revalidate sitemap every 24h
export const revalidate = 86400

// Le sitemap agrège l'intégralité du catalogue : on lui laisse un budget
// d'exécution supérieur aux 10 s par défaut, sous peine d'expiration (Google
// reçoit alors une erreur et n'indexe rien).
export const maxDuration = 60

// ─── Découpage en segments ─────────────────────────────────────
// Un fichier unique mélangeant ~40 000 URLs dépasse vite la limite de 50 000
// URLs par sitemap (le surplus est ignoré) et empêche de savoir, dans la
// Search Console, quelle famille de pages s'indexe. On sert donc un index
// (/sitemap-index.xml) qui pointe vers :
//   0  pages hub (catalogue, DCI, marques, labos, répertoire A–Z, articles…)
//   1  pharmacies de garde
//   2  annuaire des pharmacies
//   3+ fiches médicament, par lots de FICHES_PAR_SEGMENT
const SEGMENT_HUBS = 0
const SEGMENT_GARDE = 1
const SEGMENT_ANNUAIRE = 2
const FIRST_FICHE_SEGMENT = 3
const FICHES_PAR_SEGMENT = 10_000

// Les fiches arabes sont jumelles des françaises (hreflang). Tant que les
// françaises ne sont pas indexées, soumettre aussi les ~11 000 arabes double la
// file d'attente de Google sans rien apporter. Les balises hreflang des pages
// restent en place : l'arabe sera découvert par ce biais. Réactiver en posant
// SITEMAP_INCLUDE_AR_FICHES=1 une fois les fiches FR indexées.
const INCLUDE_AR_FICHES = process.env.SITEMAP_INCLUDE_AR_FICHES === '1'

type FicheUrl = { url: string; lastModified?: Date; changeFrequency: 'monthly' | 'yearly'; priority: number }

/** URLs des fiches indexables, ordonnées : toutes les françaises d'abord. */
async function loadFicheUrls(catalogueDate?: Date): Promise<FicheUrl[]> {
  // Les produits non renouvelés sont en `noindex` (cf. buildMedicamentMetadata) :
  // les déclarer dans le sitemap enverrait un signal contradictoire.
  const ids = (await getAllMedicamentIds().catch(() => [])).filter(med => med.source !== 'non_renouvele')
  const langs = INCLUDE_AR_FICHES ? (['fr', 'ar'] as const) : (['fr'] as const)
  return langs.flatMap(lang =>
    ids.map(med => {
      const { source, id, updated_at } = med
      const parsedRowDate = updated_at ? new Date(updated_at) : null
      const lastModified =
        parsedRowDate && !isNaN(parsedRowDate.getTime()) ? parsedRowDate : catalogueDate
      return {
        // Forme canonique (avec segment descriptif) : l'URL nue passerait par une redirection.
        url: `${APP_URL}${medicamentPath(source, id, med, lang)}`,
        lastModified,
        changeFrequency: source === 'enregistrement' ? ('monthly' as const) : ('yearly' as const),
        priority: source === 'enregistrement' ? 0.6 : 0.4,
      }
    })
  )
}

/** Identifiants des segments : appelé par Next et par /sitemap-index.xml. */
export async function generateSitemaps(): Promise<{ id: number }[]> {
  const ficheCount = (await loadFicheUrls()).length
  const ficheSegments = Math.max(1, Math.ceil(ficheCount / FICHES_PAR_SEGMENT))
  return Array.from({ length: FIRST_FICHE_SEGMENT + ficheSegments }, (_, id) => ({ id }))
}

export default async function sitemap({ id }: { id: number | string }): Promise<MetadataRoute.Sitemap> {
  // Selon la version de Next, `id` arrive en chaîne.
  const segment = Number(id)
  const isHubs = segment === SEGMENT_HUBS
  const isGarde = segment === SEGMENT_GARDE
  const isAnnuaire = segment === SEGMENT_ANNUAIRE
  const isFiches = segment >= FIRST_FICHE_SEGMENT
  // Ne charge une source que si le segment demandé en a besoin.
  const load = <T,>(needed: boolean, fn: () => Promise<T>, fallback: T): Promise<T> =>
    needed ? fn().catch(() => fallback) : Promise.resolve(fallback)

  // ─── Dates de dernière modification ────────────────────────────
  // Une date de modification n'a de valeur que si elle est exacte. En datant
  // chaque URL de l'instant de génération, on affirmait que les ~20 000 fiches
  // du catalogue changeaient toutes les 24 h : Google constate que ce n'est pas
  // le cas, cesse de faire confiance au <lastmod> du sitemap et retombe sur ses
  // propres heuristiques d'exploration — exactement ce qu'on cherchait à
  // éviter. Trois régimes désormais : `now` pour ce qui bouge réellement chaque
  // jour (gardes), `catalogueDate` pour tout ce qui dérive de la nomenclature,
  // et aucune date pour les pages éditoriales figées — un <lastmod> absent vaut
  // mieux qu'un <lastmod> faux.
  const now = new Date()

  // ─── Chargement parallèle de toutes les sources ───────────────
  // Ces requêtes étaient auparavant enchaînées séquentiellement : sur un
  // catalogue de plusieurs milliers de références, la somme des allers-retours
  // dépassait le budget d'exécution et le sitemap expirait — Google recevait
  // une erreur et ne découvrait aucune page. Un seul lot parallèle, chaque
  // source dégradant indépendamment si la DB est injoignable.
  const [
    laboSlugs,
    dciList,
    formeList,
    retraitAnnees,
    nouveautePeriodes,
    substitutionDcis,
    gardeCoverage,
    directoryPlaces,
    pharmacyRefs,
    versionDate,
    marqueFamilies,
    lettreCounts,
  ] = await Promise.all([
    load(isHubs, getAllLaboSlugs, []),
    load(isHubs, () => getAllDciList(2000), []),
    load(isHubs, () => getAllFormeList(200), []),
    load(isHubs, getAllRetraitAnnees, []),
    load(isHubs, getAllNouveauteAnneeMois, []),
    load(isHubs, () => getAllDciList(500), []),
    load(isGarde, getGardeCoverage, []),
    load(isAnnuaire, getDirectoryPlaces, []),
    load(isAnnuaire, getAllPharmacyRefs, []),
    load(isHubs || isFiches, getLastVersionDate, null),
    load(isHubs, () => getAllMarqueFamilies(MIN_FAMILY_SIZE), []),
    load(isHubs, getLettreCounts, {} as Record<string, number>),
  ])

  // Toutes les pages dérivées du catalogue changent le jour où une nouvelle
  // nomenclature MIPH est ingérée, et ce jour-là seulement : c'est cette date
  // qu'on leur donne. `undefined` (nomenclature non versionnée en base) fait
  // simplement omettre le <lastmod>.
  const parsedVersionDate = versionDate ? new Date(versionDate) : null
  const catalogueDate =
    parsedVersionDate && !isNaN(parsedVersionDate.getTime()) ? parsedVersionDate : undefined

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${APP_URL}/recherche`,
      lastModified: catalogueDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/alertes`,
      lastModified: catalogueDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${APP_URL}/veille`,
      lastModified: catalogueDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/outils`,
      lastModified: catalogueDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${APP_URL}/substitution`,
      lastModified: catalogueDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/medicaments`,
      lastModified: catalogueDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/laboratoires`,
      lastModified: catalogueDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${APP_URL}/garde`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${APP_URL}/pharmacie-de-garde`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/ar/pharmacie-de-garde`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${APP_URL}/pharmacies`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/ar/pharmacies`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.65,
    },
    {
      url: `${APP_URL}/a-propos`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${APP_URL}/contact`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${APP_URL}/privacy`,
      lastModified: new Date('2026-07-17'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${APP_URL}/specialites`,
      lastModified: catalogueDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${APP_URL}/classes-therapeutiques`,
      lastModified: catalogueDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${APP_URL}/pro`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    // Sections publiques qui n'étaient déclarées nulle part : absentes du
    // sitemap ET sans lien depuis la navigation principale, elles ne
    // pouvaient être découvertes que par hasard.
    {
      url: `${APP_URL}/medicaments-critiques`,
      lastModified: catalogueDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/comparateur`,
      lastModified: catalogueDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${APP_URL}/help`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${APP_URL}/api-docs`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  const lettrePages: MetadataRoute.Sitemap = LETTRE_SLUGS.flatMap(lettre => {
    const pages = Math.ceil((lettreCounts[lettre] ?? 0) / REPERTOIRE_PAGE_SIZE)
    return Array.from({ length: pages }, (_, i) => ({
      url: `${APP_URL}${lettrePath(lettre, i + 1)}`,
      lastModified: catalogueDate,
      changeFrequency: 'monthly' as const,
      priority: i === 0 ? 0.8 : 0.6,
    }))
  })

  const laboPages: MetadataRoute.Sitemap = laboSlugs.map(({ slug }) => ({
    url: `${APP_URL}/laboratoire/${slug}`,
    lastModified: catalogueDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const dciPages: MetadataRoute.Sitemap = dciList.map(({ dci }) => ({
    url: `${APP_URL}/dci/${encodeURIComponent(dci.toLowerCase())}`,
    lastModified: catalogueDate,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  // Familles de marque d'au moins deux présentations (les autres sont en noindex).
  const marquePages: MetadataRoute.Sitemap = marqueFamilies.map(({ slug }) => ({
    url: `${APP_URL}/marque/${slug}`,
    lastModified: catalogueDate,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const formePages: MetadataRoute.Sitemap = formeList.map(({ forme }) => ({
    url: `${APP_URL}/forme/${encodeURIComponent(forme.toLowerCase())}`,
    lastModified: catalogueDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const retraitAnneePages: MetadataRoute.Sitemap = retraitAnnees.map(annee => ({
    url: `${APP_URL}/retraits/${annee}`,
    lastModified: catalogueDate,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }))

  const nouveautePages: MetadataRoute.Sitemap = nouveautePeriodes.map(({ annee, mois }) => ({
    url: `${APP_URL}/nouveautes/${annee}/${String(mois).padStart(2, '0')}`,
    lastModified: catalogueDate,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }))

  const substitutionPages: MetadataRoute.Sitemap = substitutionDcis.map(({ dci }) => ({
    url: `${APP_URL}/substitution/${encodeURIComponent(dci.toLowerCase())}`,
    lastModified: catalogueDate,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  // Pages wilaya : seules les wilayas couvertes sont indexables (les autres
  // sont en noindex), donc seules elles entrent dans le sitemap.
  const gardeWilayaSlugs = Array.from(new Set(gardeCoverage.map(c => slugify(c.wilaya_name_fr))))
  const gardeWilayaPages: MetadataRoute.Sitemap = gardeWilayaSlugs.flatMap(wilayaSlug => [
    { url: `${APP_URL}/pharmacie-de-garde/${wilayaSlug}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${APP_URL}/ar/pharmacie-de-garde/${wilayaSlug}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.85 },
  ])

  const gardePages: MetadataRoute.Sitemap = gardeCoverage.flatMap(c => {
    const wilayaSlug = slugify(c.wilaya_name_fr)
    const communeSlug = slugify(c.commune_name_fr)
    return [
      {
        url: `${APP_URL}/pharmacie-de-garde/${wilayaSlug}/${communeSlug}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.85,
      },
      {
        url: `${APP_URL}/ar/pharmacie-de-garde/${wilayaSlug}/${communeSlug}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      },
    ]
  })

  // ─── Annuaire des pharmacies ───────────────────────────────────
  // Pages wilaya, commune et fiche, en FR et AR. Pas de lastmod : la date
  // exacte d'une fiche n'est pas suivie, et un lastmod faux est pire qu'absent.
  const annuairePages: MetadataRoute.Sitemap = [
    ...groupByWilaya(directoryPlaces).flatMap(g => [
      ...(['', '/ar'] as const).map(prefix => ({
        url: `${APP_URL}${prefix}/pharmacies/${g.wilaya_slug}`,
        changeFrequency: 'weekly' as const,
        priority: prefix ? 0.6 : 0.7,
      })),
      ...g.communes.flatMap(c =>
        (['', '/ar'] as const).map(prefix => ({
          url: `${APP_URL}${prefix}/pharmacies/${g.wilaya_slug}/${c.commune_slug}`,
          changeFrequency: 'weekly' as const,
          priority: prefix ? 0.6 : 0.7,
        }))
      ),
    ]),
    ...pharmacyRefs.flatMap(p => [
      { url: `${APP_URL}${pharmacyPath(p, 'fr')}`, changeFrequency: 'monthly' as const, priority: 0.6 },
      { url: `${APP_URL}${pharmacyPath(p, 'ar')}`, changeFrequency: 'monthly' as const, priority: 0.5 },
    ]),
  ]

  // ─── Pages articles ────────────────────────────────────────────
  const articlePages: MetadataRoute.Sitemap = [
    {
      url: `${APP_URL}/articles`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...ARTICLES.map(article => ({
      url: `${APP_URL}/articles/${article.slug}`,
      lastModified: new Date(article.date),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),
  ]

  if (isGarde) return [...gardeWilayaPages, ...gardePages]
  if (isAnnuaire) return annuairePages
  if (isFiches) {
    const fiches = await loadFicheUrls(catalogueDate)
    const start = (segment - FIRST_FICHE_SEGMENT) * FICHES_PAR_SEGMENT
    return fiches.slice(start, start + FICHES_PAR_SEGMENT)
  }
  if (!isHubs) return []

  return [
    ...staticPages,
    ...articlePages,
    ...lettrePages,
    ...laboPages,
    ...dciPages,
    ...marquePages,
    ...formePages,
    ...retraitAnneePages,
    ...nouveautePages,
    ...substitutionPages,
  ]
}
