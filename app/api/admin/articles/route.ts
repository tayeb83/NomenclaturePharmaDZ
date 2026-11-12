import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { checkAdminAuth } from '@/lib/admin-auth'
import { ARTICLES } from '@/lib/articles'
import { ARTICLES_TAG, getArticleAdmin, listArticlesAdmin, removeArticle, saveArticle, validateArticle } from '@/lib/articles-db'

const noAuth = () => NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

function dbError(err: any) {
  if (err?.code === '42P01') return NextResponse.json({ error: 'Table absente : appliquez sql/41_articles_admin.sql', tableMissing: true }, { status: 500 })
  if (err?.code === 'NOT_FOUND') return NextResponse.json({ error: 'Article introuvable' }, { status: 404 })
  if (err?.code === '23505') return NextResponse.json({ error: 'Cet identifiant (slug) est déjà utilisé par un autre article.' }, { status: 409 })
  if (err?.code === '23514') return NextResponse.json({ error: 'Refusé par la base : un article publié exige un texte et un résumé.' }, { status: 400 })
  return null
}

/** Sans paramètre : liste. Avec ?id= : un article complet. */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  try {
    const id = Number(new URL(request.url).searchParams.get('id'))
    if (id) return NextResponse.json({ article: await getArticleAdmin(id) })
    return NextResponse.json({
      articles: await listArticlesAdmin(),
      facebookConfigured: Boolean(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
      uploadConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    })
  } catch (err: any) {
    const r = dbError(err); if (r) return r
    console.error('Admin articles GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }) }
  const v = validateArticle(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  // l'adresse d'un article écrit dans le code ne peut pas être reprise : elle serait ambiguë
  if (ARTICLES.some(a => a.slug === v.value.slug)) {
    return NextResponse.json({ error: 'Cet identifiant est déjà pris par un article du site. Choisissez-en un autre.' }, { status: 409 })
  }
  try {
    const id = await saveArticle(v.value)
    revalidateTag(ARTICLES_TAG)
    return NextResponse.json({ ok: true, id })
  } catch (err: any) {
    const r = dbError(err); if (r) return r
    console.error('Admin articles PUT error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  try {
    await removeArticle(id)
    revalidateTag(ARTICLES_TAG)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Admin articles DELETE error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
