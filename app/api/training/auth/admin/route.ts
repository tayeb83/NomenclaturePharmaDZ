import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getTraining } from '@/lib/training'
import { setSessionCookie } from '@/lib/training/auth'

export const dynamic = 'force-dynamic'

/**
 * Un administrateur déjà connecté à l'administration n'a pas à demander l'accès :
 * son compte Training est créé / validé d'office et une session s'ouvre.
 * Sans session admin valide, retour à la page d'inscription.
 */
export async function GET(req: NextRequest) {
  const admin = getAdminSession(req)
  if (!admin?.email) return NextResponse.redirect(new URL('/training?admin=0', req.url), 302)
  try {
    const { sessionToken } = await getTraining().sessionForTrusted(admin.email)
    const res = NextResponse.redirect(new URL('/training/espace', req.url), 302)
    setSessionCookie(res, sessionToken)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('[api/training/auth/admin]', (err as Error).message)
    return NextResponse.redirect(new URL('/training?admin=0', req.url), 302)
  }
}
