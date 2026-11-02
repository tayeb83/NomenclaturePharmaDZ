import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { modifierDemande, supprimerDemande, type DemandeAction } from '@/lib/demandes'

export const dynamic = 'force-dynamic'

function lireId(params: { id: string }): number | null {
  const id = Number(params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * PATCH — { action: 'trouvee' | 'clore' | 'reactiver' | 'prolonger' | 'urgence' | 'compteur' | 'note', … }
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const id = lireId(params)
  if (!id) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  let action: DemandeAction
  switch (body.action) {
    case 'trouvee': case 'clore': case 'reactiver': action = { action: body.action }; break
    case 'prolonger': action = { action: 'prolonger', jours: Number(body.jours) || 14 }; break
    case 'urgence': action = { action: 'urgence', urgence: body.urgence === 'haute' ? 'haute' : 'normale' }; break
    case 'compteur': action = { action: 'compteur', nb_demandes: Number(body.nb_demandes) }; break
    case 'note': action = { action: 'note', note: String(body.note ?? '') }; break
    default: return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  }

  try {
    const demande = await modifierDemande(id, action)
    if (!demande) return NextResponse.json({ error: 'Demande introuvable ou statut incompatible' }, { status: 404 })
    return NextResponse.json({ demande })
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json({ error: 'Une demande identique est déjà active : prolongez celle-là.' }, { status: 409 })
    }
    console.error('[api/admin/demandes/:id] PATCH error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** DELETE — supprime définitivement (erreur de saisie). Pour clore sans effacer : action 'clore'. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const id = lireId(params)
  if (!id) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  try {
    return (await supprimerDemande(id))
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  } catch (err: any) {
    console.error('[api/admin/demandes/:id] DELETE error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
