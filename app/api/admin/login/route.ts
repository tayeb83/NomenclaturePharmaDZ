import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAccountSessionToken, createAdminSessionToken, getOwnerEmail, SESSION_MAX_AGE_SECONDS } from '@/lib/admin-auth'
import { authenticate } from '@/lib/admin-accounts'
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

    const body = await req.json()
    const password = typeof body.password === 'string' ? body.password : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!password) return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })

    // 1. Mot de passe unique historique : réservé au propriétaire (e-mail vide ou égal au sien).
    const adminPwd = process.env.ADMIN_PASSWORD
    const ownerEmail = getOwnerEmail()
    let sessionToken: string | null = null
    if (adminPwd && (!email || email === ownerEmail) && passwordsMatch(password, adminPwd)) {
      sessionToken = createAdminSessionToken(adminPwd)
    } else if (email) {
      // 2. Compte nominatif.
      try {
        const account = await authenticate(email, password)
        if (account && (account.role === 'admin' || account.role === 'editor')) {
          sessionToken = createAccountSessionToken(account)
        }
      } catch (err) {
        console.error('Admin login (comptes) error:', err)
      }
    }

    if (!sessionToken) {
      if (!adminPwd && !email) {
        return NextResponse.json({ error: 'ADMIN_PASSWORD non configuré sur le serveur' }, { status: 500 })
      }
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
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
