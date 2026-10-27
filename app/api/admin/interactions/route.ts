import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { checkAdminAuth } from '@/lib/admin-auth'
import { INTERACTIONS_TAG } from '@/lib/interactions'

/**
 * Après un import des interactions ou des traductions arabes en ligne de commande
 * (scripts/import_ansm_*.py) : vide le cache des fiches, sans attendre les 24 h.
 * Session admin requise : POST /api/admin/interactions
 */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  revalidateTag(INTERACTIONS_TAG)
  return NextResponse.json({ ok: true })
}
