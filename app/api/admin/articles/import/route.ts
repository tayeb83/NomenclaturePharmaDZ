import { NextRequest, NextResponse } from 'next/server'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { checkAdminAuth } from '@/lib/admin-auth'
import { extraireMeta, htmlToMarkdown, isHttpUrl, readingMinutes } from '@/lib/articles-core'

export const maxDuration = 30

const MAX_BYTES = 3 * 1024 * 1024
const MAX_REDIRECTIONS = 4

/** Adresses internes (boucle locale, réseaux privés, lien-local, métadonnées cloud) : jamais interrogées. */
function adresseInterne(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase()
    if (v.startsWith('::ffff:')) return adresseInterne(v.slice(7))
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')
  }
  const [a, b] = ip.split('.').map(Number)
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

async function adresseAutorisee(url: URL): Promise<boolean> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  if (url.username || url.password) return false
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false
  if (isIP(host)) return !adresseInterne(host)
  try {
    const adresses = await lookup(host, { all: true })
    return adresses.length > 0 && adresses.every(a => !adresseInterne(a.address))
  } catch { return false }
}

/**
 * Importe une page web dans le formulaire d'article : titre, résumé, image, langue et texte (converti en Markdown).
 * L'admin relit et corrige avant d'enregistrer ; la source d'origine est mémorisée pour être affichée sous l'article.
 * Protégé contre les adresses internes (SSRF) : chaque redirection est revérifiée.
 */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body: any = await request.json().catch(() => ({}))
  const adresse = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!isHttpUrl(adresse)) return NextResponse.json({ error: 'Adresse invalide (http:// ou https:// attendu).' }, { status: 400 })

  let url = new URL(adresse)
  try {
    for (let i = 0; i <= MAX_REDIRECTIONS; i++) {
      if (!(await adresseAutorisee(url))) return NextResponse.json({ error: 'Cette adresse n’est pas accessible depuis le serveur.' }, { status: 400 })
      const res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
        headers: { 'User-Agent': 'DwaDZ-ImportArticle/1.0', Accept: 'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5' },
      })
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        url = new URL(res.headers.get('location')!, url)
        continue
      }
      if (!res.ok) return NextResponse.json({ error: `La page a répondu ${res.status}.` }, { status: 502 })
      const type = res.headers.get('content-type') || ''
      if (!/html|text\/plain/i.test(type)) return NextResponse.json({ error: `Type non pris en charge (${type || 'inconnu'}) : une page web est attendue.` }, { status: 415 })
      const lu = new Uint8Array(await res.arrayBuffer())
      if (lu.byteLength > MAX_BYTES) return NextResponse.json({ error: 'Page trop volumineuse (3 Mo maximum).' }, { status: 413 })
      const charset = /charset=([\w-]+)/i.exec(type)?.[1] ?? 'utf-8'
      let html: string
      try { html = new TextDecoder(charset).decode(lu) } catch { html = new TextDecoder('utf-8').decode(lu) }
      const meta = extraireMeta(html, url.toString())
      const markdown = htmlToMarkdown(html, url.toString())
      if (!markdown) return NextResponse.json({ error: 'Aucun texte exploitable trouvé sur cette page.' }, { status: 422 })
      return NextResponse.json({
        ok: true,
        title: meta.title, description: meta.description, image_url: meta.image, lang: meta.lang, date: meta.date,
        source_nom: meta.site || url.hostname.replace(/^www\./, ''), source_url: url.toString(),
        body: markdown, minutes: readingMinutes(markdown),
      })
    }
    return NextResponse.json({ error: 'Trop de redirections.' }, { status: 502 })
  } catch (err: any) {
    return NextResponse.json({ error: `Import impossible : ${err?.name === 'TimeoutError' ? 'délai dépassé' : err?.message || err}` }, { status: 502 })
  }
}
