import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { postToFacebook } from '@/lib/social'
import {
  getPost,
  updatePost,
  composeMessage,
  markPublished,
  markError,
} from '@/lib/facebook-content'

export const dynamic = 'force-dynamic'

/**
 * PATCH — modifie / valide un post.
 *   body: {
 *     action?: 'approve' | 'ignore' | 'publish',   // raccourcis d'état
 *     corps?, titre?, lien?, scheduled_for?         // édition de contenu
 *   }
 * action:'publish' publie immédiatement sur Facebook.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const id = Number(params.id)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  }

  try {
    const post = await getPost(id)
    if (!post) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const body = await request.json().catch(() => ({}))

    // 1. Édition de contenu éventuelle (corps / titre / lien / date)
    const edits: Record<string, any> = {}
    for (const key of ['corps', 'titre', 'lien', 'scheduled_for'] as const) {
      if (typeof body[key] === 'string') edits[key] = body[key]
    }

    // 2. Actions d'état
    if (body.action === 'approve') edits.statut = 'approuve'
    else if (body.action === 'ignore') edits.statut = 'ignore'

    if (body.action === 'publish') {
      // Applique d'abord les éventuelles éditions, puis publie.
      const merged = { ...post, ...edits }
      const message = composeMessage(merged)
      const res = await postToFacebook(message)
      if (!res.success) {
        await markError(id, res.error || 'Échec de publication')
        return NextResponse.json({ error: res.error || 'Échec de publication' }, { status: 502 })
      }
      // Sauvegarde des éditions + marque comme publié
      if (Object.keys(edits).length) await updatePost(id, edits)
      await markPublished(id, res.postId || '')
      return NextResponse.json({ post: await getPost(id) })
    }

    const updated = Object.keys(edits).length ? await updatePost(id, edits) : post
    return NextResponse.json({ post: updated })
  } catch (err: any) {
    console.error('[api/admin/social/:id] PATCH error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
