/**
 * DwaDZ — articles publiés depuis l'admin : logique pure (sans base ni réseau), testable.
 *   npm run test:articles
 *
 * Le corps d'un article s'écrit en Markdown simple (voir `markdownToSections`) et se convertit en
 * sections que la page /articles/[slug] sait déjà afficher. Un article écrit ailleurs s'importe :
 * fichier .md / .html / .txt, ou adresse d'une page (`htmlToMarkdown`, `extraireMeta`), avec mention de la source.
 */
import type { Article, ArticleAudience, ArticleLang, ArticleSection } from './articles.ts'

export type ArticleStatut = 'brouillon' | 'publie'

export type ArticleInput = {
  id?: number
  slug: string
  lang: ArticleLang
  audience: ArticleAudience
  title: string
  subtitle: string
  description: string
  seo_title: string | null
  tags: string[]
  image_url: string | null
  body: string
  /** version dans l'autre langue (slug), pour le lien « disponible en arabe / en français » */
  traduction_slug: string | null
  /** article écrit ailleurs : nom du site / de l'auteur et adresse d'origine, affichés sous l'article */
  source_nom: string | null
  source_url: string | null
  statut: ArticleStatut
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const isHttpUrl = (v: unknown): v is string => {
  if (typeof v !== 'string') return false
  try { const p = new URL(v).protocol; return p === 'https:' || p === 'http:' } catch { return false }
}
const isHttps = (v: unknown): v is string => {
  if (typeof v !== 'string') return false
  try { return new URL(v).protocol === 'https:' } catch { return false }
}

/** « Loi 18-11 : ce qui change » → « loi-18-11-ce-qui-change » ; titre arabe seul → « article-xxxx ». */
export function slugify(text: string): string {
  const s = text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '')
  return s || `article-${Date.now().toString(36)}`
}

/** Temps de lecture : 200 mots par minute, au moins une minute. */
export function readingMinutes(texte: string): number {
  const mots = texte.replace(/[#*>|`\-[\]()!]/g, ' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(mots / 200))
}

// ── Markdown → sections ─────────────────────────────────────

const IMAGE_LIGNE = /^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)\s*$/
const LIGNE_TABLE = /^\s*\|.*\|\s*$/
const SEPARATEUR_TABLE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

const cellules = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())

/** Une image n'est acceptée qu'en https ou depuis le site (chemin absolu) : jamais javascript:, data:… */
export const srcImageSure = (src: string): boolean => isHttps(src) || /^\/[^/\\]/.test(src)

/**
 * Markdown simple → sections d'article.
 *   ## Titre / ### Sous-titre       h2 / h3 (« # » compte comme h2)
 *   - élément, * élément, 1. élément liste (le **gras** est pris en charge)
 *   > texte                          encadré « info » ; > [!warning] ou > ⚠️ : alerte ; > [!tip] : astuce
 *   ![texte alternatif](https://…)   image (légende : entre guillemets après l'adresse)
 *   | a | b |  puis  |---|---|       tableau
 *   le premier paragraphe est le chapô (type « intro »)
 */
export function markdownToSections(md: string): ArticleSection[] {
  const lignes = md.replace(/\r\n?/g, '\n').split('\n')
  const out: ArticleSection[] = []
  let para: string[] = []
  let premierParagrapheFait = false

  const flushPara = () => {
    if (!para.length) return
    const text = para.join(' ').replace(/\s+/g, ' ').trim()
    para = []
    if (!text) return
    out.push({ type: premierParagrapheFait ? 'paragraph' : 'intro', text })
    premierParagrapheFait = true
  }

  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i]
    const t = l.trim()
    if (!t) { flushPara(); continue }

    const h = /^(#{1,4})\s+(.+?)\s*#*$/.exec(t)
    if (h) {
      flushPara()
      out.push({ type: h[1].length >= 3 ? 'h3' : 'h2', title: h[2].trim(), ...(h[1].length >= 3 ? {} : { text: '' }) })
      premierParagrapheFait = true // un chapô ne vient qu'avant le premier intertitre
      continue
    }

    const img = IMAGE_LIGNE.exec(t)
    if (img) {
      flushPara()
      if (srcImageSure(img[2])) out.push({ type: 'image', src: img[2], alt: img[1], ...(img[3] ? { caption: img[3] } : {}) })
      continue
    }

    if (LIGNE_TABLE.test(t) && i + 1 < lignes.length && SEPARATEUR_TABLE.test(lignes[i + 1].trim())) {
      flushPara()
      const headers = cellules(t)
      const rows: { cells: string[] }[] = []
      i += 2
      while (i < lignes.length && LIGNE_TABLE.test(lignes[i].trim())) {
        const c = cellules(lignes[i])
        rows.push({ cells: headers.map((_, k) => c[k] ?? '') })
        i++
      }
      i--
      out.push({ type: 'table', headers, rows })
      continue
    }

    if (/^>\s?/.test(t)) {
      flushPara()
      const bloc: string[] = []
      while (i < lignes.length && /^\s*>/.test(lignes[i])) { bloc.push(lignes[i].trim().replace(/^>\s?/, '')); i++ }
      i--
      let variant: 'info' | 'warning' | 'tip' = 'info'
      let text = bloc.join(' ').trim()
      const marque = /^\[!(warning|attention|tip|astuce|info|note)\]\s*/i.exec(text)
      if (marque) {
        const m = marque[1].toLowerCase()
        variant = m === 'warning' || m === 'attention' ? 'warning' : m === 'tip' || m === 'astuce' ? 'tip' : 'info'
        text = text.slice(marque[0].length)
      } else if (/^(⚠️?|🚨)/.test(text)) variant = 'warning'
      else if (/^(💡)/.test(text)) variant = 'tip'
      if (text) out.push({ type: 'callout', variant, text })
      continue
    }

    if (/^([-*•]|\d+[.)])\s+/.test(t)) {
      flushPara()
      const items: string[] = []
      while (i < lignes.length && /^\s*([-*•]|\d+[.)])\s+/.test(lignes[i])) {
        items.push(lignes[i].trim().replace(/^([-*•]|\d+[.)])\s+/, ''))
        i++
      }
      i--
      out.push({ type: 'list', items })
      continue
    }

    para.push(t)
  }
  flushPara()
  return out
}

// ── HTML → Markdown (import d'un article écrit ailleurs) ────

const ENTITES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', eacute: 'é', egrave: 'è', agrave: 'à', ecirc: 'ê' }
export function decoderEntites(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { const n = parseInt(h, 16); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '' })
    .replace(/&#(\d+);/g, (_, d) => { const n = Number(d); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '' })
    .replace(/&([a-z]+);/gi, (m, n) => ENTITES[n.toLowerCase()] ?? m)
}

const sansBalises = (s: string) => decoderEntites(s.replace(/<[^>]*>/g, ''))

/** Contenu d'une balise méta (og:title, description…), quel que soit l'ordre des attributs. */
function meta(html: string, cle: string): string | null {
  const re = new RegExp(`<meta\\b[^>]*\\b(?:property|name)=["']${cle}["'][^>]*>`, 'i')
  const tag = re.exec(html)?.[0]
  if (!tag) return null
  const c = /\bcontent=(?:"([^"]*)"|'([^']*)')/i.exec(tag)
  const v = c ? decoderEntites(c[1] ?? c[2] ?? '').trim() : ''
  return v || null
}

export type MetaImportee = {
  title: string; description: string; image: string | null; site: string | null; lang: ArticleLang | null; date: string | null
}

/** Titre, résumé, image, site et langue d'une page HTML. `base` sert à résoudre l'adresse de l'image. */
export function extraireMeta(html: string, base?: string): MetaImportee {
  const titreTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]
  const title = (meta(html, 'og:title') ?? (h1 ? sansBalises(h1).trim() : null) ?? (titreTag ? sansBalises(titreTag).trim() : '')).replace(/\s+/g, ' ')
  const description = (meta(html, 'og:description') ?? meta(html, 'description') ?? '').replace(/\s+/g, ' ')
  let image = meta(html, 'og:image') ?? meta(html, 'twitter:image')
  if (image && base) { try { image = new URL(image, base).toString() } catch { image = null } }
  if (image && !isHttps(image)) image = null
  const htmlLang = /<html[^>]*\blang=["']?([a-z]{2})/i.exec(html)?.[1]?.toLowerCase()
  const lang: ArticleLang | null = htmlLang === 'ar' ? 'ar' : htmlLang === 'fr' ? 'fr' : null
  const date = (meta(html, 'article:published_time') ?? meta(html, 'date') ?? '').slice(0, 10) || null
  return { title, description, image, site: meta(html, 'og:site_name'), lang, date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null }
}

/** Zone d'article d'une page : <article>, sinon <main>, sinon <body>. */
export function extraireCorpsHtml(html: string): string {
  const enleve = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|iframe|form|nav|footer|header|aside|button|template)\b[\s\S]*?<\/\1>/gi, '')
  const bloc = (tag: string) => new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(enleve)?.[1]
  return bloc('article') ?? bloc('main') ?? bloc('body') ?? enleve
}

/** HTML d'un article → Markdown simple (titres, paragraphes, listes, tableaux, citations, images, gras, liens). */
export function htmlToMarkdown(html: string, base?: string): string {
  let s = extraireCorpsHtml(html)
  const abs = (u: string) => { try { return base ? new URL(u, base).toString() : u } catch { return u } }
  const inline = (x: string) => decoderEntites(
    x.replace(/<br\s*\/?>/gi, ' ')
      .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
      .replace(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, txt) => {
        const t = String(txt).replace(/<[^>]*>/g, '').trim()
        const u = abs(href)
        return t && isHttp(u) ? `[${t}](${u})` : t
      })
      .replace(/<[^>]*>/g, ''),
  ).replace(/\s+/g, ' ').trim()
  const isHttp = (u: string) => isHttpUrl(u)

  s = s.replace(/<table\b[\s\S]*?<\/table>/gi, (tb) => {
    const lignes = [...tb.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(m => [...m[0].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c => inline(c[1]).replace(/\|/g, '/')))
    if (lignes.length < 1 || lignes[0].length < 1) return '\n'
    const [tete, ...corps] = lignes
    return `\n\n| ${tete.join(' | ')} |\n|${tete.map(() => '---').join('|')}|\n${corps.map(r => `| ${tete.map((_, k) => r[k] ?? '').join(' | ')} |`).join('\n')}\n\n`
  })
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, n, t) => `\n\n${Number(n) <= 2 ? '##' : '###'} ${inline(t)}\n\n`)
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, t) => `\n- ${inline(t)}`)
  s = s.replace(/<\/(ul|ol)>/gi, '\n\n')
  s = s.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, t) => `\n\n> ${inline(t)}\n\n`)
  s = s.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1]
    const alt = /\balt=["']([^"']*)["']/i.exec(tag)?.[1] ?? ''
    const u = src ? abs(src) : ''
    return u && isHttps(u) ? `\n\n![${decoderEntites(alt).replace(/[\]\n]/g, ' ').trim()}](${u})\n\n` : ''
  })
  s = s.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_m, t) => `\n\n${inline(t)}\n\n`)
  s = s.replace(/<\/(div|section|figure|figcaption)>/gi, '\n\n')
  // le reste (texte libre dans des <div>, balises inconnues)
  const lignes = s.split('\n').map(l => l.replace(/<\/?[a-z][^>]*>/gi, '').trim())
  return lignes.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Texte brut ou Markdown d'un fichier .txt / .md : retours à la ligne normalisés. */
export function nettoyerTexte(raw: string): string {
  return raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim()
}

// ── Validation ──────────────────────────────────────────────

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim().slice(0, max) : '')
const opt = (v: unknown, max: number): string | null => str(v, max) || null

export function parseTags(v: unknown): string[] {
  const l = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,،;\n]/) : []
  return [...new Set(l.map(x => str(x, 40)).filter(Boolean))].slice(0, 12)
}

export function validateArticle(raw: unknown): { ok: true; value: ArticleInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Données invalides' }
  const b = raw as Record<string, unknown>
  const title = str(b.title, 300)
  if (!title) return { ok: false, error: 'Le titre est obligatoire.' }
  const lang = b.lang === 'ar' ? 'ar' : b.lang === 'fr' ? 'fr' : null
  if (!lang) return { ok: false, error: 'Choisissez la langue (français ou arabe).' }
  const slug = str(b.slug, 90) || slugify(title)
  if (!SLUG_RE.test(slug)) return { ok: false, error: 'Identifiant invalide : lettres minuscules, chiffres et tirets uniquement.' }
  const image_url = opt(b.image_url, 1000)
  if (image_url && !isHttps(image_url)) return { ok: false, error: 'L’adresse de l’image doit commencer par https://.' }
  const source_url = opt(b.source_url, 1000)
  if (source_url && !isHttpUrl(source_url)) return { ok: false, error: 'L’adresse de la source d’origine doit commencer par http:// ou https://.' }
  const traduction = opt(b.traduction_slug, 90)
  if (traduction && !SLUG_RE.test(traduction)) return { ok: false, error: 'Identifiant de la traduction invalide.' }
  const statut: ArticleStatut = b.statut === 'publie' ? 'publie' : 'brouillon'
  const body = str(b.body, 200_000)
  const description = str(b.description, 400)
  if (statut === 'publie') {
    if (!body) return { ok: false, error: 'Rédigez le texte avant de publier.' }
    if (!description) return { ok: false, error: 'Ajoutez un résumé (description) avant de publier : il sert aux moteurs de recherche et à Facebook.' }
  }
  const value: ArticleInput = {
    slug, lang, audience: b.audience === 'etudiant' ? 'etudiant' : 'professionnel',
    title, subtitle: str(b.subtitle, 400), description, seo_title: opt(b.seo_title, 200),
    tags: parseTags(b.tags), image_url, body,
    traduction_slug: traduction && traduction !== slug ? traduction : null,
    source_nom: opt(b.source_nom, 200), source_url, statut,
  }
  const id = Number(b.id)
  if (Number.isInteger(id) && id > 0) value.id = id
  return { ok: true, value }
}

// ── Passage au type Article du site ─────────────────────────

export type ArticleRow = {
  slug: string; lang: ArticleLang; audience: ArticleAudience; title: string; subtitle: string; description: string
  seo_title: string | null; tags: string[]; image_url: string | null; body: string
  traduction_slug: string | null; source_nom: string | null; source_url: string | null
  published_at: string | null; created_at: string
}

export function rowToArticle(r: ArticleRow): Article {
  const date = (r.published_at ?? r.created_at).slice(0, 10)
  return {
    slug: r.slug, lang: r.lang, audience: r.audience, title: r.title, subtitle: r.subtitle, description: r.description,
    seoTitle: r.seo_title ?? undefined, date, readingTime: readingMinutes(r.body), tags: r.tags,
    imageUrl: r.image_url ?? undefined,
    content: markdownToSections(r.body),
    translationSlug: r.traduction_slug ?? undefined,
    source: r.source_url || r.source_nom ? { nom: r.source_nom, url: r.source_url } : undefined,
  }
}
