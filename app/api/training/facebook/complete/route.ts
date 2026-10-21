import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { getTraining, trainingSecret } from '@/lib/training'
import { rejectForeignOrigin, tooMany } from '@/lib/training/guard'
import { verifyPayload } from '@/lib/training/security.ts'
import { cleanFreeText, isRole, MAX_FACULTE_LENGTH } from '@/lib/training/validation.ts'

export const dynamic = 'force-dynamic'

/**
 * Dernière étape de la demande par Facebook : le profil (étudiant, enseignant,
 * pharmacien) que Facebook ne fournit pas. L'identifiant et l'e-mail viennent
 * UNIQUEMENT du cookie signé posé au retour de Facebook, jamais du corps.
 */
export async function POST(req: NextRequest) {
  const foreign = rejectForeignOrigin(req)
  if (foreign) return foreign
  const limited = rateLimit(`training-fb-complete:ip:${getClientIp(req)}`, 10, 60 * 60 * 1000)
  if (limited !== null) return tooMany(limited)

  const secret = trainingSecret()
  const profile = secret ? verifyPayload<{ id: string; email: string }>(req.cookies.get('tr_fb_profile')?.value, secret) : null
  if (!profile) return NextResponse.json({ error: 'expire' }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!isRole(body?.role)) return NextResponse.json({ error: 'role' }, { status: 400 })

  try {
    await getTraining().submitRequest({
      email: profile.email,
      role: body.role,
      faculte: cleanFreeText(body?.faculte, MAX_FACULTE_LENGTH),
      source: 'facebook',
      facebookId: profile.id,
    })
    const res = NextResponse.json({ ok: true })
    res.cookies.set('tr_fb_profile', '', { path: '/', maxAge: 0 })
    return res
  } catch (err) {
    console.error('[api/training/facebook/complete]', (err as Error).message)
    return NextResponse.json({ error: 'serveur' }, { status: 500 })
  }
}
