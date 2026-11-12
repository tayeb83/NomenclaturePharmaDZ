import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { postFacebookLink } from '@/lib/social'
import { articleShareMessage, hashtagsArticle, ligneSuivre } from '@/lib/article-share'
import { getArticleAdmin, markArticleFacebook } from '@/lib/articles-db'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

/** Publie un article déjà publié sur le site vers la Page Facebook (une seule fois sauf force). */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body: any = await request.json().catch(() => ({}))
  const a = body?.id ? await getArticleAdmin(Number(body.id)) : null
  if (!a) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 })
  if (a.statut !== 'publie') return NextResponse.json({ error: 'Publiez d’abord l’article sur le site.' }, { status: 400 })
  if (a.fb_post_id && !body?.force) return NextResponse.json({ error: 'Déjà publié sur Facebook.' }, { status: 409 })
  const url = `${APP_URL}/articles/${a.slug}`
  const message = typeof body?.message === 'string' && body.message.trim()
    ? body.message.trim()
    : [articleShareMessage(a), '', hashtagsArticle(a.tags, a.lang).join(' '), '', ligneSuivre(a.lang)].join('\n')
  const res = await postFacebookLink(message, url)
  if (!res.success || !res.postId) return NextResponse.json({ error: res.error || 'Facebook a refusé la publication' }, { status: 502 })
  await markArticleFacebook(a.id, res.postId)
  return NextResponse.json({ ok: true, postId: res.postId })
}
