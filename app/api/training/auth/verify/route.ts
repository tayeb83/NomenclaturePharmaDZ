import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { getTraining } from '@/lib/training'
import { setSessionCookie } from '@/lib/training/auth'
import { rejectForeignOrigin, tooMany } from '@/lib/training/guard'

export const dynamic = 'force-dynamic'

/**
 * GET : compatibilité avec d'anciens e-mails. Ne consomme RIEN (les
 * antivirus et aperçus de messagerie ouvrent les liens à l'avance) : redirige
 * vers la page de confirmation où l'utilisateur clique lui-même.
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const target = new URL('/training/connexion', req.url)
  if (token) target.searchParams.set('token', token)
  return NextResponse.redirect(target, 302)
}

/** POST : échange le jeton (usage unique, 15 min) contre une session. */
export async function POST(req: NextRequest) {
  const foreign = rejectForeignOrigin(req)
  if (foreign) return foreign

  const limited = rateLimit(`training-verify:ip:${getClientIp(req)}`, 30, 15 * 60 * 1000)
  if (limited !== null) return tooMany(limited)

  const body = await req.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''

  try {
    const result = await getTraining().consumeLoginToken(token)
    // Expiré, déjà utilisé, inconnu, compte non validé : une seule réponse.
    if (!result) return NextResponse.json({ error: 'invalid' }, { status: 400 })
    const res = NextResponse.json({ ok: true, redirect: '/training/espace' })
    setSessionCookie(res, result.sessionToken)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('[api/training/auth/verify]', (err as Error).message)
    return NextResponse.json({ error: 'serveur' }, { status: 500 })
  }
}
