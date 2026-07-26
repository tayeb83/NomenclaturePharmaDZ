import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { postToFacebook } from '@/lib/social'
import {
  getNextDuePost,
  composeMessage,
  markPublished,
  markError,
} from '@/lib/facebook-content'

export const dynamic = 'force-dynamic'

function isValidBearerToken(authorizationHeader: string | null, expectedToken: string | undefined): boolean {
  if (!authorizationHeader || !expectedToken) return false
  const expectedHeader = `Bearer ${expectedToken}`
  const providedBuffer = Buffer.from(authorizationHeader)
  const expectedBuffer = Buffer.from(expectedHeader)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}

/**
 * Cron « publication » : publie le prochain post APPROUVÉ dont l'échéance est
 * arrivée. Un seul post par exécution — le cron tourne chaque jour mais ne
 * publie que si un post approuvé est dû (donc de fait tous les 2-3 jours selon
 * l'espacement des dates). Les brouillons non validés ne sont jamais publiés.
 */
export async function GET(request: NextRequest) {
  if (!isValidBearerToken(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const post = await getNextDuePost()
    if (!post) {
      return NextResponse.json({ published: false, message: 'Aucun post approuvé à échéance' })
    }

    const message = composeMessage(post)
    const res = await postToFacebook(message)

    if (!res.success) {
      await markError(post.id, res.error || 'Échec de publication')
      console.error('[api/cron/social-publish] Facebook error:', res.error)
      return NextResponse.json({ published: false, error: res.error }, { status: 502 })
    }

    await markPublished(post.id, res.postId || '')
    return NextResponse.json({ published: true, id: post.id, titre: post.titre, fbPostId: res.postId })
  } catch (err: any) {
    console.error('[api/cron/social-publish] error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
