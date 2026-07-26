import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query } from '@/lib/db'

// Boîte englobante large de l'Algérie — garde-fou contre une erreur de saisie/clic.
const DZ_BOUNDS = { latMin: 18, latMax: 38, lngMin: -9, lngMax: 12 }

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const id = parseInt(params.id, 10)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const lat = Number(body?.lat)
  const lng = Number(body?.lng)

  if (
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    lat < DZ_BOUNDS.latMin || lat > DZ_BOUNDS.latMax ||
    lng < DZ_BOUNDS.lngMin || lng > DZ_BOUNDS.lngMax
  ) {
    return NextResponse.json({ error: 'Coordonnées invalides (hors Algérie)' }, { status: 400 })
  }

  try {
    await query(
      `UPDATE garde_pharmacies SET lat = $1, lng = $2, geocode_status = 'manual', updated_at = NOW() WHERE id = $3`,
      [lat, lng, id]
    )
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Admin garde pharmacy patch error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
