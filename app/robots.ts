import { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/medicaments', '/api/search', '/api/stats'],
        disallow: ['/admin', '/api/admin', '/api/newsletter', '/api/publish', '/api/cron', '/diff'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  }
}
