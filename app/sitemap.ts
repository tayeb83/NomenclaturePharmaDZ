import { MetadataRoute } from 'next'
import {
  getAllMedicamentIds,
  getAllLaboSlugs,
  getAllDciList,
  getAllFormeList,
  getAllRetraitAnnees,
  getAllNouveauteAnneeMois,
} from '@/lib/queries'
import { getGardeCoverage, slugify } from '@/lib/garde'
import { ARTICLES } from '@/lib/articles'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

// Revalidate sitemap every 24h
export const revalidate = 86400

// Le sitemap agrège l'intégralité du catalogue : on lui laisse un budget
// d'exécution supérieur aux 10 s par défaut, sous peine d'expiration (Google
// reçoit alors une erreur et n'indexe rien).
export const maxDuration = 60

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${APP_URL}/recherche`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/alertes`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${APP_URL}/veille`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/outils`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${APP_URL}/substitution`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/medicaments`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/laboratoires`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${APP_URL}/garde`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${APP_URL}/pharmacie-de-garde`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/ar/pharmacie-de-garde`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${APP_URL}/pharmacies`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/a-propos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${APP_URL}/contact`,
      lastModified: new Date(),
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
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${APP_URL}/pro`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

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
  ] = await Promise.all([
    getAllMedicamentIds().catch(() => []),
    getAllLaboSlugs().catch(() => []),
    getAllDciList(2000).catch(() => []),
    getAllFormeList(200).catch(() => []),
    getAllRetraitAnnees().catch(() => []),
    getAllNouveauteAnneeMois().catch(() => []),
    getAllDciList(500).catch(() => []),
    getGardeCoverage().catch(() => []),
  ])

  // Chaque fiche existe en deux versions indexables (FR et AR), reliées entre
  // elles par des balises hreflang. On déclare les deux : sans cela, la
  // version arabe resterait invisible pour les moteurs.
  const medicamentPages: MetadataRoute.Sitemap = medicamentIds.flatMap(({ source, id, updated_at }) => {
    const lastModified = updated_at ? new Date(updated_at) : new Date()
    const changeFrequency = source === 'enregistrement' ? ('monthly' as const) : ('yearly' as const)
    const priority = source === 'enregistrement' ? 0.6 : 0.4
    return [
      { url: `${APP_URL}/medicament/${source}/${id}`, lastModified, changeFrequency, priority },
      { url: `${APP_URL}/ar/medicament/${source}/${id}`, lastModified, changeFrequency, priority },
    ]
  })

  const laboPages: MetadataRoute.Sitemap = laboSlugs.map(({ slug }) => ({
    url: `${APP_URL}/laboratoire/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const dciPages: MetadataRoute.Sitemap = dciList.map(({ dci }) => ({
    url: `${APP_URL}/dci/${encodeURIComponent(dci.toLowerCase())}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const formePages: MetadataRoute.Sitemap = formeList.map(({ forme }) => ({
    url: `${APP_URL}/forme/${encodeURIComponent(forme.toLowerCase())}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const retraitAnneePages: MetadataRoute.Sitemap = retraitAnnees.map(annee => ({
    url: `${APP_URL}/retraits/${annee}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }))

  const nouveautePages: MetadataRoute.Sitemap = nouveautePeriodes.map(({ annee, mois }) => ({
    url: `${APP_URL}/nouveautes/${annee}/${String(mois).padStart(2, '0')}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }))

  const substitutionPages: MetadataRoute.Sitemap = substitutionDcis.map(({ dci }) => ({
    url: `${APP_URL}/substitution/${encodeURIComponent(dci.toLowerCase())}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const gardePages: MetadataRoute.Sitemap = gardeCoverage.flatMap(c => {
    const wilayaSlug = slugify(c.wilaya_name_fr)
    const communeSlug = slugify(c.commune_name_fr)
    return [
      {
        url: `${APP_URL}/pharmacie-de-garde/${wilayaSlug}/${communeSlug}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.85,
      },
      {
        url: `${APP_URL}/ar/pharmacie-de-garde/${wilayaSlug}/${communeSlug}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      },
    ]
  })

  // ─── Pages articles ────────────────────────────────────────────
  const articlePages: MetadataRoute.Sitemap = [
    {
      url: `${APP_URL}/articles`,
      lastModified: new Date(),
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
