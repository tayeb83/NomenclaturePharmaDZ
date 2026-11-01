import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { AccountError, appBaseUrl, approveAccount, peekToken, rejectAccount } from '@/lib/admin-accounts'
import { getOwnerEmail } from '@/lib/admin-auth'

// Le jeton envoyé au propriétaire tient lieu d'authentification : la page de
// confirmation (POST) évite qu'un antivirus ou un aperçu de lien approuve à sa place.

function limited(req: NextRequest) {
  return rateLimit(`admin-approval:${getClientIp(req)}`, 20, 15 * 60 * 1000) !== null
}

export async function GET(req: NextRequest) {
  if (limited(req)) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  const token = new URL(req.url).searchParams.get('token') || ''
  try {
    const t = await peekToken(token, ['approval'])
    if (!t || !['pending_approval', 'invited'].includes(t.status)) {
      return NextResponse.json({ error: 'Lien invalide, expiré ou déjà utilisé.' }, { status: 410 })
    }
    return NextResponse.json({ email: t.email, name: t.name, role: t.role, invitedBy: t.invited_by, owner: getOwnerEmail() })
  } catch (err) {
    console.error('Admin approval GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (limited(req)) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  try {
    const { token, decision } = await req.json()
    const t = await peekToken(String(token || ''), ['approval'])
    if (!t) return NextResponse.json({ error: 'Lien invalide, expiré ou déjà utilisé.' }, { status: 410 })
    if (decision === 'approve') {
      const { mailSent } = await approveAccount(t.account_id, appBaseUrl(req))
      return NextResponse.json({ success: true, mailSent })
    }
    if (decision === 'reject') {
      await rejectAccount(t.account_id)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Décision inconnue' }, { status: 400 })
  } catch (err) {
    if (err instanceof AccountError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Admin approval POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
