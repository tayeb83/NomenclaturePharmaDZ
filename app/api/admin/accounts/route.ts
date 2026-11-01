import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { AccountError, appBaseUrl, inviteAccount, listAccounts } from '@/lib/admin-accounts'

function guard(req: NextRequest) {
  const s = getAdminSession(req)
  return s && (s.role === 'owner' || s.role === 'admin') ? s : null
}

export async function GET(req: NextRequest) {
  if (!guard(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    return NextResponse.json({ accounts: await listAccounts() })
  } catch (err) {
    console.error('Admin accounts GET error:', err)
    return NextResponse.json({ error: 'Table admin_accounts introuvable : exécutez sql/33_admin_accounts.sql.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = guard(req)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const body = await req.json()
    const { account, mailSent } = await inviteAccount(
      {
        email: body.email,
        name: body.name,
        role: body.role,
        invitedBy: session.role === 'owner' ? 'Propriétaire' : session.name || session.email,
      },
      appBaseUrl(req),
    )
    return NextResponse.json({ account, mailSent }, { status: 201 })
  } catch (err) {
    if (err instanceof AccountError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Admin accounts POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
