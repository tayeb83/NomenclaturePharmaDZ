import { MetadataRoute } from 'next'
import { getAllMedicamentIds } from '@/lib/queries'

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

  return [...staticPages, ...medicamentPages]
}
