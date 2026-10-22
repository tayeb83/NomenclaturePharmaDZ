import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getTraining } from '@/lib/training'
import { allowedHostsFor, isSameOrigin } from '@/lib/training/security.ts'

export const dynamic = 'force-dynamic'

const ACTIONS = { approve: 'approved', reject: 'rejected', pending: 'pending' } as const

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!isSameOrigin(req.headers, allowedHostsFor(req.headers.get('host'), process.env.NEXT_PUBLIC_APP_URL))) {
    return NextResponse.json({ error: 'origine' }, { status: 403 })
  }

  const id = Number(params.id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'id invalide' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const action = typeof body?.action === 'string' ? body.action : ''

  try {
    const svc = getTraining()
    if (action === 'resend') {
      const res = await svc.resendAccess(id)
      if (!res) return NextResponse.json({ error: 'Utilisateur introuvable ou non validé' }, { status: 404 })
      return NextResponse.json({ user: res.user, mailSent: res.mailSent })
    }
    if (action === 'delete') {
      // Suppression à la demande de la personne (droit à l'effacement) : définitive.
      if (body?.confirm !== true) return NextResponse.json({ error: 'confirmation requise' }, { status: 400 })
      const ok = await svc.deleteUser(id, 'admin')
      return ok ? NextResponse.json({ deleted: true }) : NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }
    if (!(action in ACTIONS)) return NextResponse.json({ error: 'action invalide' }, { status: 400 })
    const res = await svc.setStatus(id, ACTIONS[action as keyof typeof ACTIONS])
    if (!res) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    return NextResponse.json({ user: res.user, mailSent: res.mailSent })
  } catch (err) {
    console.error('[api/admin/training/requests/:id]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
