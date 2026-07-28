import { NextResponse, type NextRequest } from 'next/server'

// ————————————————————————————————————————————————————————————————
// Anti-aspiration : bots d'entraînement IA, aspirateurs SEO/data et
// clients HTTP génériques utilisés par les scrapers. Les moteurs de
// recherche légitimes (Googlebot, Bingbot…) ne sont PAS bloqués pour
// préserver le référencement.
// ————————————————————————————————————————————————————————————————
const BLOCKED_BOTS = /GPTBot|ChatGPT-User|OAI-SearchBot|CCBot|ClaudeBot|Claude-Web|anthropic-ai|Google-Extended|Applebot-Extended|Meta-ExternalAgent|Bytespider|PerplexityBot|YouBot|cohere-ai|Diffbot|omgili|Amazonbot|PetalBot|SemrushBot|AhrefsBot|MJ12bot|DotBot|BLEXBot|DataForSeoBot|serpstatbot|ZoominfoBot|MegaIndex|SeekportBot|ImagesiftBot|HTTrack|WebCopier|Offline Explorer|Scrapy|PhantomJS|python-requests|python-urllib|python-httpx|aiohttp|Go-http-client|Java\/|libwww-perl|wget|curl\//i

// ————————————————————————————————————————————————————————————————
// Crawlers d'aperçu des réseaux sociaux : autorisés sur les PAGES
// publiques (pas sur les API). Sans eux, un lien partagé sur Facebook,
// WhatsApp, LinkedIn ou X s'affiche « nu » — sans image, titre ni
// description — ce qui effondre le taux de clic. À ne pas confondre
// avec Meta-ExternalAgent (entraînement IA), qui reste bloqué.
// ————————————————————————————————————————————————————————————————
const SOCIAL_PREVIEW_BOTS = /facebookexternalhit|Meta-ExternalFetcher|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|redditbot|SkypeUriPreview|vkShare/i

// Chemins exemptés des contrôles anti-bot : appels internes (analytics
// fire-and-forget émis par ce middleware, cron Vercel, publication
// protégée par secret) dont le User-Agent n'est pas un navigateur.
const INTERNAL_PATHS = ['/api/analytics/', '/api/cron/', '/api/publish']

// ————————————————————————————————————————————————————————————————
// Rate limiting best-effort en mémoire (par instance edge — suffisant
// pour casser les scrapers en rafale, sans dépendance externe).
// Limites volontairement généreuses : en Algérie beaucoup d'utilisateurs
// partagent la même IP publique (CGNAT mobile), d'où la clé IP + UA.
// ————————————————————————————————————————————————————————————————
const WINDOW_MS = 60_000
const API_LIMIT = 90 // requêtes API / minute / client
const PAGE_LIMIT = 300 // pages / minute / client

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

/** Retourne le délai (en s) avant réessai si la limite est dépassée, sinon null. */
function checkRateLimit(key: string, limit: number): number | null {
  const now = Date.now()
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.resetAt < now) buckets.delete(k)
    }
  }
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return null
  }
  bucket.count++
  if (bucket.count > limit) return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')
  const isInternal = INTERNAL_PATHS.some((p) => pathname.startsWith(p))

  const ua = request.headers.get('user-agent') || ''
  // Aperçu social : uniquement sur les pages publiques, jamais sur les API.
  const isSocialPreview = !isApi && SOCIAL_PREVIEW_BOTS.test(ua)

  if (!isInternal && !isSocialPreview) {
    if (BLOCKED_BOTS.test(ua)) {
      return new NextResponse('Accès refusé', { status: 403 })
    }

    // Les API de données ne sont pas destinées aux scripts sans identité
    if (isApi && !ua) {
      return new NextResponse(JSON.stringify({ error: 'Accès refusé' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const ip =
      request.ip ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    const key = `${isApi ? 'a' : 'p'}:${ip}:${ua.slice(0, 40)}`
    const retryAfter = checkRateLimit(key, isApi ? API_LIMIT : PAGE_LIMIT)
    if (retryAfter !== null) {
      return new NextResponse(
        isApi
          ? JSON.stringify({ error: 'Trop de requêtes, réessayez dans un instant.' })
          : 'Trop de requêtes — réessayez dans un instant.',
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            ...(isApi ? { 'Content-Type': 'application/json' } : {}),
          },
        }
      )
    }
  }

  if (isApi && !pathname.startsWith('/api/analytics/api-exec')) {
    const payload = JSON.stringify({
      api_path: pathname,
      method: request.method,
    })

    fetch(`${request.nextUrl.origin}/api/analytics/api-exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})

    return NextResponse.next()
  }

  // Transmet le chemin au layout racine (via next/headers) pour forcer
  // lang="ar"/dir="rtl" sur les routes /ar/* indépendamment du cookie de
  // langue — nécessaire pour que ces pages restent indexables séparément.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-192.png|icon-512.png|ads.txt|.*\\.svg).*)'],
}
