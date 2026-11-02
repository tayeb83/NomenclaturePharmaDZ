import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { publishPostToFacebook } from '@/lib/social-publish'
import {
  getNextDuePost,
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
 * Cron « publication » : publie les posts APPROUVÉS dont l'échéance est
 * arrivée, un par flux et par exécution :
 *   - flux thématique : le cron tourne chaque jour mais ne publie que si un
 *     post approuvé est dû (de fait tous les 2-3 jours selon l'espacement) ;
 *   - flux « demandes » : un post par jour tant que des demandes sont actives.
 * Les brouillons non validés ne sont jamais publiés.
 */
export async function GET(request: NextRequest) {
  if (!isValidBearerToken(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const results: Record<string, unknown>[] = []
    let failed = false

    for (const flux of ['themes', 'demandes'] as const) {
      const post = await getNextDuePost(flux)
      if (!post) {
        results.push({ flux, published: false, message: 'Aucun post approuvé à échéance' })
        continue
      }

      const res = await publishPostToFacebook(post)
      if (!res.success) {
        failed = true
        await markError(post.id, res.error || 'Échec de publication')
        console.error(`[api/cron/social-publish] Facebook error (${flux}):`, res.error)
        results.push({ flux, published: false, error: res.error })
        continue
      }

      await markPublished(post.id, res.postId || '')
      results.push({ flux, published: true, id: post.id, titre: post.titre, fbPostId: res.postId })
    }

    // Réponse historique conservée : { published, ... } du flux thématique, plus le détail par flux.
    const [themes] = results
    return NextResponse.json({ ...themes, results }, { status: failed ? 502 : 200 })
  } catch (err: any) {
    console.error('[api/cron/social-publish] error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
