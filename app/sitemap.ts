import { MetadataRoute } from 'next'
import {
  getAllMedicamentIds,
  getAllLaboSlugs,
  getAllDciList,
  getAllFormeList,
  getAllRetraitAnnees,
  getAllNouveauteAnneeMois,
} from '@/lib/queries'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

// Revalidate sitemap every 24h
export const revalidate = 86400

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
  ]

  // ─── Pages médicaments individuelles ──────────────────────────
  let medicamentPages: MetadataRoute.Sitemap = []
  try {
    const ids = await getAllMedicamentIds()
    medicamentPages = ids.map(({ source, id, updated_at }) => ({
      url: `${APP_URL}/medicament/${source}/${id}`,
      lastModified: updated_at ? new Date(updated_at) : new Date(),
      changeFrequency: source === 'enregistrement' ? 'monthly' : 'yearly',
      priority: source === 'enregistrement' ? 0.6 : 0.4,
    }))
  } catch {
    // Si la DB est inaccessible, on retourne uniquement les pages statiques
  }

  // ─── Pages laboratoires ────────────────────────────────────────
  let laboPages: MetadataRoute.Sitemap = []
  try {
    const slugs = await getAllLaboSlugs()
    laboPages = slugs.map(({ slug }) => ({
      url: `${APP_URL}/laboratoire/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  } catch {
    // Si la DB est inaccessible, on ignore les pages labo
  }

  // ─── Pages DCI ─────────────────────────────────────────────────
  let dciPages: MetadataRoute.Sitemap = []
  try {
    const list = await getAllDciList(2000)
    dciPages = list.map(({ dci }) => ({
      url: `${APP_URL}/dci/${encodeURIComponent(dci.toLowerCase())}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))
  } catch {
    // ignore
  }

  // ─── Pages formes pharmaceutiques ─────────────────────────────
  let formePages: MetadataRoute.Sitemap = []
  try {
    const list = await getAllFormeList(200)
    formePages = list.map(({ forme }) => ({
      url: `${APP_URL}/forme/${encodeURIComponent(forme.toLowerCase())}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  } catch {
    // ignore
  }

  // ─── Pages retraits par année ──────────────────────────────────
  let retraitAnneePages: MetadataRoute.Sitemap = []
  try {
    const annees = await getAllRetraitAnnees()
    retraitAnneePages = annees.map(annee => ({
      url: `${APP_URL}/retraits/${annee}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    }))
  } catch {
    // ignore
  }

  // ─── Pages nouveautés par mois ────────────────────────────────
  let nouveautePages: MetadataRoute.Sitemap = []
  try {
    const periodes = await getAllNouveauteAnneeMois()
    nouveautePages = periodes.map(({ annee, mois }) => ({
      url: `${APP_URL}/nouveautes/${annee}/${String(mois).padStart(2, '0')}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    }))
  } catch {
    // ignore
  }

  // ─── Pages substitution par DCI ───────────────────────────────
  let substitutionPages: MetadataRoute.Sitemap = []
  try {
    // On réutilise la liste DCI pour les pages substitution
    const list = await getAllDciList(500)
    substitutionPages = list.map(({ dci }) => ({
      url: `${APP_URL}/substitution/${encodeURIComponent(dci.toLowerCase())}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))
  } catch {
    // ignore
  }

  return [
    ...staticPages,
    ...medicamentPages,
    ...laboPages,
    ...dciPages,
    ...formePages,
    ...retraitAnneePages,
    ...nouveautePages,
    ...substitutionPages,
  ]
}
