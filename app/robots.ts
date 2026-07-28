import { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

// Bots d'entraînement IA et aspirateurs de données : interdits sur tout le
// site (le middleware les bloque aussi par User-Agent — robots.txt sert de
// signal officiel pour ceux qui le respectent).
const AI_AND_SCRAPER_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'CCBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'Bytespider',
  'PerplexityBot',
  'YouBot',
  'cohere-ai',
  'Diffbot',
  'omgilibot',
  'Amazonbot',
  'PetalBot',
  'SemrushBot',
  'AhrefsBot',
  'MJ12bot',
  'DotBot',
  'DataForSeoBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Moteurs de recherche classiques : pages publiques indexables,
      // mais ni l'admin ni les API de données (anti-aspiration).
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/diff'],
      },
      ...AI_AND_SCRAPER_BOTS.map((userAgent) => ({
        userAgent,
        disallow: '/',
      })),
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  }
}
