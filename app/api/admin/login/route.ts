import { NextRequest, NextResponse } from 'next/server'
import { createAdminSessionToken, SESSION_MAX_AGE_SECONDS } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    const adminPwd = process.env.ADMIN_PASSWORD
    if (!adminPwd) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD non configuré sur le serveur' }, { status: 500 })
    }

    if (!password || password !== adminPwd) {
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
