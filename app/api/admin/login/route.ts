import { NextRequest, NextResponse } from 'next/server'
import { hashAdminPassword } from '@/lib/admin-auth'

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

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', hashAdminPassword(adminPwd), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, // 8 heures
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }
}
