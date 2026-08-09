import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { diagnoseFacebook } from '@/lib/social'

// Vérifie la configuration Facebook sans rien publier : type de jeton,
// application émettrice, autorisations, expiration, accès à la Page.
// Répond notamment à l'erreur « Cannot call API for app … on behalf of
// user … », qui signale un jeton utilisateur là où un jeton de Page est
// attendu.

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    return NextResponse.json(await diagnoseFacebook())
  } catch (err: any) {
    console.error('[api/admin/social/diagnostic] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
