import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { AccountError, peekToken, setPasswordWithToken } from '@/lib/admin-accounts'

function limited(req: NextRequest) {
  return rateLimit(`admin-password:${getClientIp(req)}`, 15, 15 * 60 * 1000) !== null
}

export async function GET(req: NextRequest) {
  if (limited(req)) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  const token = new URL(req.url).searchParams.get('token') || ''
  try {
    const t = await peekToken(token, ['activation', 'reset'])
    if (!t) return NextResponse.json({ error: 'Ce lien est invalide ou a expiré.' }, { status: 410 })
    return NextResponse.json({ email: t.email, name: t.name })
  } catch (err) {
    console.error('Admin password GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (limited(req)) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  try {
    const { token, password } = await req.json()
    await setPasswordWithToken(String(token || ''), password)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AccountError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Admin password POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
