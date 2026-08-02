import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query } from '@/lib/db'

// Corriger une adresse suppose de pouvoir atteindre une fiche déjà pointée :
// la liste n'est donc plus limitée aux geocode_status = 'none'.
const MAX_ROWS = 1000

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const wilaya = searchParams.get('wilaya') || ''
  const status = searchParams.get('status') || 'none'
  const q = (searchParams.get('q') || '').trim()

  const conditions: string[] = []
  const params: string[] = []

  if (status && status !== 'all') {
    params.push(status)
    conditions.push(`ph.geocode_status = $${params.length}`)
  }
  if (wilaya) {
    params.push(wilaya)
    conditions.push(`ph.wilaya_code = $${params.length}`)
  }
  if (q) {
    params.push(`%${q}%`)
    conditions.push(`(
      ph.name_fr ILIKE $${params.length} OR ph.name_ar ILIKE $${params.length}
      OR ph.address_fr ILIKE $${params.length} OR ph.address_ar ILIKE $${params.length}
      OR ph.commune_name_fr ILIKE $${params.length}
    )`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const rows = await query(`
      SELECT ph.id, ph.wilaya_code, ph.commune_name_fr, ph.name_fr, ph.name_ar, ph.address_fr, ph.address_ar,
             ph.phone_e164, ph.lat, ph.lng, ph.geocode_status,
             w.wilaya_name_fr
      FROM garde_pharmacies ph
      LEFT JOIN LATERAL (
        SELECT wilaya_name_fr FROM garde_rosters r
        WHERE r.wilaya_code = ph.wilaya_code
        ORDER BY imported_at DESC LIMIT 1
      ) w ON true
      ${where}
      ORDER BY ph.wilaya_code, ph.commune_name_fr, COALESCE(ph.name_fr, ph.name_ar)
      LIMIT ${MAX_ROWS}
    `, params)

    return NextResponse.json({ data: rows })
  } catch (err: any) {
    console.error('Admin garde pharmacies API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
