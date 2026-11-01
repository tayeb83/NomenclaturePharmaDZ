import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { AccountError, appBaseUrl, approveAccount, rejectAccount, resendInvite, setAccountActive } from '@/lib/admin-accounts'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getAdminSession(req)
  if (!session || session.role === 'editor') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  try {
    const { action } = await req.json()
    // Seul le propriétaire valide ou refuse une invitation.
    if ((action === 'approve' || action === 'reject') && session.role !== 'owner') {
      return NextResponse.json({ error: 'Seul le propriétaire peut approuver ou refuser.' }, { status: 403 })
    }
    if ((action === 'disable') && session.accountId === id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' }, { status: 400 })
    }
    let mailSent: boolean | undefined
    switch (action) {
      case 'approve': mailSent = (await approveAccount(id, appBaseUrl(req))).mailSent; break
      case 'reject': await rejectAccount(id); break
      case 'disable': await setAccountActive(id, false); break
      case 'enable': await setAccountActive(id, true); break
      case 'resend': mailSent = await resendInvite(id, appBaseUrl(req)); break
      default: return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }
    return NextResponse.json({ success: true, mailSent })
  } catch (err) {
    if (err instanceof AccountError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Admin accounts PATCH error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
