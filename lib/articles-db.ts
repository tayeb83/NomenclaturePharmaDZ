/**
 * DwaDZ — articles publiés depuis l'admin : accès base (voir sql/41_articles_admin.sql).
 * Serveur seulement. Les articles de la base s'ajoutent à ceux de lib/articles.ts ; une table absente
 * donne simplement « aucun article en base » : le site continue d'afficher les articles historiques.
 */
import { unstable_cache } from 'next/cache'
import { query, queryOne } from './db'
import { ARTICLES, type Article, type ArticleLang } from './articles'
import { rowToArticle, type ArticleInput, type ArticleRow } from './articles-core'

export * from './articles-core'

export const ARTICLES_TAG = 'articles'

const isMissingTable = (err: any) => err?.code === '42P01'

const PUBLIC_COLS = `slug, lang, audience, title, subtitle, description, seo_title, tags, image_url, body,
  traduction_slug, source_nom, source_url, published_at, created_at`

const listPublishedRows = unstable_cache(
  async (): Promise<ArticleRow[]> => {
    try {
      return await query<ArticleRow>(`SELECT ${PUBLIC_COLS} FROM articles WHERE statut = 'publie' ORDER BY published_at DESC NULLS LAST, id DESC`)
    } catch (err) {
      if (isMissingTable(err)) return []
      throw err
    }
  },
  ['articles-published'],
  { tags: [ARTICLES_TAG], revalidate: 3600 }
)

/** Articles de la base visibles du public, du plus récent au plus ancien. Ne casse jamais le site. */
export async function listDbArticles(): Promise<Article[]> {
  try { return (await listPublishedRows()).map(rowToArticle) } catch (err) {
    console.error('[articles] lecture de la base impossible', err)
    return []
  }
}

/** Tous les articles du site : ceux de la base d'abord (récents en tête), puis les historiques. */
export async function getAllArticles(): Promise<Article[]> {
  return [...(await listDbArticles()), ...ARTICLES]
}

export async function findArticle(slug: string): Promise<Article | undefined> {
  return (await listDbArticles()).find(a => a.slug === slug) ?? ARTICLES.find(a => a.slug === slug)
}

/** Aperçu d'un brouillon (admin seulement) : l'article de la base, quel que soit son statut. */
export async function findArticleDraft(slug: string): Promise<Article | undefined> {
  try {
    const row = await queryOne<ArticleRow>(`SELECT ${PUBLIC_COLS} FROM articles WHERE slug = $1`, [slug])
    return row ? rowToArticle(row) : undefined
  } catch (err) {
    if (isMissingTable(err)) return undefined
    throw err
  }
}

export async function articlesByLang(lang: ArticleLang): Promise<Article[]> {
  return (await getAllArticles()).filter(a => a.lang === lang)
}

/** Version dans l'autre langue : lien explicite de l'admin, sinon la convention « slug » / « slug-ar » des articles historiques. */
export async function findTranslation(a: Article): Promise<Article | undefined> {
  const tous = await getAllArticles()
  if (a.translationSlug) return tous.find(x => x.slug === a.translationSlug)
  const reverse = tous.find(x => x.translationSlug === a.slug)
  if (reverse) return reverse
  const alt = a.slug.endsWith('-ar') ? a.slug.replace(/-ar$/, '') : `${a.slug}-ar`
  return tous.find(x => x.slug === alt)
}

export async function relatedArticles(a: Article, limit = 3): Promise<Article[]> {
  return (await getAllArticles())
    .filter(x => x.slug !== a.slug && x.lang === a.lang)
    .sort((x, y) => Number(y.audience === a.audience) - Number(x.audience === a.audience))
    .slice(0, limit)
}

// ── Admin ─────────────────────────────────────────────────────

export type ArticleAdminRow = ArticleRow & {
  id: number; statut: 'brouillon' | 'publie'; fb_post_id: string | null; fb_published_at: string | null; updated_at: string
}

export function listArticlesAdmin(): Promise<ArticleAdminRow[]> {
  return query<ArticleAdminRow>(
    `SELECT id, ${PUBLIC_COLS}, statut, fb_post_id, fb_published_at, updated_at FROM articles ORDER BY updated_at DESC`
  )
}

export function getArticleAdmin(id: number): Promise<ArticleAdminRow | null> {
  return queryOne<ArticleAdminRow>(
    `SELECT id, ${PUBLIC_COLS}, statut, fb_post_id, fb_published_at, updated_at FROM articles WHERE id = $1`, [id]
  )
}

/** Crée ou met à jour (par id). published_at est fixé à la première publication. */
export async function saveArticle(v: ArticleInput): Promise<number> {
  const p = [v.slug, v.lang, v.audience, v.title, v.subtitle, v.description, v.seo_title, v.tags, v.image_url, v.body,
    v.traduction_slug, v.source_nom, v.source_url, v.statut]
  if (v.id) {
    const row = await queryOne<{ id: number }>(
      `UPDATE articles SET slug = $1, lang = $2, audience = $3, title = $4, subtitle = $5, description = $6, seo_title = $7,
         tags = $8, image_url = $9, body = $10, traduction_slug = $11, source_nom = $12, source_url = $13, statut = $14::varchar,
         published_at = CASE WHEN $14::varchar = 'publie' THEN COALESCE(published_at, NOW()) ELSE published_at END,
         updated_at = NOW()
       WHERE id = $15 RETURNING id`, [...p, v.id])
    if (!row) throw Object.assign(new Error('Article introuvable'), { code: 'NOT_FOUND' })
    return row.id
  }
  const row = await queryOne<{ id: number }>(
    `INSERT INTO articles (slug, lang, audience, title, subtitle, description, seo_title, tags, image_url, body,
       traduction_slug, source_nom, source_url, statut, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::varchar, CASE WHEN $14::varchar = 'publie' THEN NOW() END)
     RETURNING id`, p)
  return row!.id
}

export async function removeArticle(id: number): Promise<void> {
  await query(`DELETE FROM articles WHERE id = $1`, [id])
}

export async function markArticleFacebook(id: number, postId: string): Promise<void> {
  await query(`UPDATE articles SET fb_post_id = $2, fb_published_at = NOW(), updated_at = NOW() WHERE id = $1`, [id, postId])
}

export async function getPublishedArticleSlugs(): Promise<{ slug: string; date: string }[]> {
  return (await listDbArticles()).map(a => ({ slug: a.slug, date: a.date }))
}
