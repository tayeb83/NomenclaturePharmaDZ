import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { appUrl, trainingSecret } from '@/lib/training'
import { buildAuthUrl, readFacebookConfig } from '@/lib/training/facebook.ts'
import { signPayload } from '@/lib/training/security.ts'

export const dynamic = 'force-dynamic'


/** Démarre Facebook Login : état anti-CSRF aléatoire, posé en cookie signé, puis redirection vers Facebook. */
export async function GET(req: NextRequest) {
  const base = appUrl()
  const cfg = readFacebookConfig(process.env, base)
  const secret = trainingSecret()
  if (!cfg || !secret) return NextResponse.redirect(`${base}/training?fb=indisponible`, 302)

  if (rateLimit(`training-fb:ip:${getClientIp(req)}`, 20, 60 * 60 * 1000) !== null) {
    return NextResponse.redirect(`${base}/training?fb=rate`, 302)
  }

  const state = crypto.randomBytes(24).toString('base64url')
  const res = NextResponse.redirect(buildAuthUrl(cfg, state), 302)
  res.cookies.set('tr_fb_state', signPayload({ state }, secret, 10 * 60 * 1000), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // le retour de Facebook est une navigation de haut niveau : Lax suffit et reste nécessaire
    path: '/api/training/auth/facebook',
    maxAge: 600,
  })
  return res
}
