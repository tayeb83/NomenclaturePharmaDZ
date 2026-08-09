import { MetadataRoute } from 'next'
import {
  getAllMedicamentIds,
  getAllLaboSlugs,
  getAllDciList,
  getAllFormeList,
  getAllRetraitAnnees,
  getAllNouveauteAnneeMois,
  getLastVersionDate,
} from '@/lib/queries'
import { getGardeCoverage, slugify } from '@/lib/garde'
import { medicamentPath } from '@/lib/medicament-url'
import { ARTICLES } from '@/lib/articles'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

// Revalidate sitemap every 24h
export const revalidate = 86400

// Le sitemap agrège l'intégralité du catalogue : on lui laisse un budget
// d'exécution supérieur aux 10 s par défaut, sous peine d'expiration (Google
// reçoit alors une erreur et n'indexe rien).
export const maxDuration = 60

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    medicamentIds,
    laboSlugs,
    dciList,
    formeList,
    retraitAnnees,
    nouveautePeriodes,
    substitutionDcis,
    gardeCoverage,
    versionDate,
  ] = await Promise.all([
    getAllMedicamentIds().catch(() => []),
    getAllLaboSlugs().catch(() => []),
    getAllDciList(2000).catch(() => []),
    getAllFormeList(200).catch(() => []),
    getAllRetraitAnnees().catch(() => []),
    getAllNouveauteAnneeMois().catch(() => []),
    getAllDciList(500).catch(() => []),
    getGardeCoverage().catch(() => []),
    getLastVersionDate().catch(() => null),
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

  // Chaque fiche existe en deux versions indexables (FR et AR), reliées entre
  // elles par des balises hreflang. On déclare les deux : sans cela, la
  // version arabe resterait invisible pour les moteurs.
  const medicamentPages: MetadataRoute.Sitemap = medicamentIds.flatMap((med) => {
    const { source, id, updated_at } = med
    const parsedRowDate = updated_at ? new Date(updated_at) : null
    const lastModified =
      parsedRowDate && !isNaN(parsedRowDate.getTime()) ? parsedRowDate : catalogueDate
    const changeFrequency = source === 'enregistrement' ? ('monthly' as const) : ('yearly' as const)
    const priority = source === 'enregistrement' ? 0.6 : 0.4
    // On déclare la forme canonique (avec segment descriptif) : soumettre
    // l'URL nue enverrait les robots sur une redirection à chaque fiche.
    return [
      { url: `${APP_URL}${medicamentPath(source, id, med, 'fr')}`, lastModified, changeFrequency, priority },
      { url: `${APP_URL}${medicamentPath(source, id, med, 'ar')}`, lastModified, changeFrequency, priority },
    ]
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

  return [
    ...staticPages,
    ...articlePages,
    ...medicamentPages,
    ...laboPages,
    ...dciPages,
    ...formePages,
    ...retraitAnneePages,
    ...nouveautePages,
    ...substitutionPages,
    ...gardePages,
  ]
}
