import { NextResponse } from 'next/server'
import { getArticleBySlug } from '@/lib/articles'
import { buildArticleShareImage } from '@/lib/article-share-image'

// Visuel d'aperçu d'un article (Facebook, X, WhatsApp…) : /partage/article/<slug>
// Hors /api exprès : le middleware n'admet les robots d'aperçu que sur les pages.

export const revalidate = 86_400

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const article = getArticleBySlug(params.slug)
  if (!article) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 })
  try {
    return await buildArticleShareImage(article)
  } catch (err) {
    console.error('[partage] image d\'article impossible', err)
    return NextResponse.json({ error: 'Image indisponible' }, { status: 500 })
  }
}
