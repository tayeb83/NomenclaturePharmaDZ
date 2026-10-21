import { generateSitemaps } from '../sitemap'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

// Même cadence que les sitemaps qu'il référence.
export const revalidate = 86400
export const maxDuration = 60

/**
 * Index des sitemaps. Next 14 sert chaque segment sous /sitemap/<id>.xml mais
 * ne génère pas d'index : c'est cette URL qu'on soumet à la Search Console.
 */
export async function GET() {
  const segments = await generateSitemaps()
  const entries = segments
    .map(({ id }) => `  <sitemap><loc>${APP_URL}/sitemap/${id}.xml</loc></sitemap>`)
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
