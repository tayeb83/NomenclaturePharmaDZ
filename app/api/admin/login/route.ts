import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSessionToken, SESSION_MAX_AGE_SECONDS } from '@/lib/admin-auth'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

// Anti brute-force : 5 tentatives par IP puis blocage 15 minutes
const LOGIN_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

function passwordsMatch(provided: string, expected: string): boolean {
  // Comparaison en temps constant sur les hachés (longueurs égales)
  const providedDigest = crypto.createHash('sha256').update(provided).digest()
  const expectedDigest = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(providedDigest, expectedDigest)
}

export async function POST(req: NextRequest) {
  try {
    const retryAfter = rateLimit(`admin-login:${getClientIp(req)}`, LOGIN_ATTEMPTS, LOGIN_WINDOW_MS)
    if (retryAfter !== null) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const { password } = await req.json()

    const adminPwd = process.env.ADMIN_PASSWORD
    if (!adminPwd) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD non configuré sur le serveur' }, { status: 500 })
    }

    if (!password || typeof password !== 'string' || !passwordsMatch(password, adminPwd)) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }

    const sessionToken = createAdminSessionToken(adminPwd)
    if (!sessionToken) {
      return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }
}
