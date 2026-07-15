import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const wilaya = searchParams.get('wilaya') || ''
  const status = searchParams.get('status') || 'none'

  const conditions = ['ph.geocode_status = $1']
  const params: string[] = [status]
  if (wilaya) {
    conditions.push(`ph.wilaya_code = $${params.length + 1}`)
    params.push(wilaya)
  }

  try {
    const rows = await query(`
      SELECT ph.id, ph.wilaya_code, ph.commune_name_fr, ph.name_fr, ph.address_fr,
             ph.phone_e164, ph.lat, ph.lng, ph.geocode_status,
             w.wilaya_name_fr
      FROM garde_pharmacies ph
      LEFT JOIN LATERAL (
        SELECT wilaya_name_fr FROM garde_rosters r
        WHERE r.wilaya_code = ph.wilaya_code
        ORDER BY imported_at DESC LIMIT 1
      ) w ON true
      WHERE ${conditions.join(' AND ')}
      ORDER BY ph.wilaya_code, ph.commune_name_fr, ph.name_fr
    `, params)

    return NextResponse.json({ data: rows })
  } catch (err: any) {
    console.error('Admin garde pharmacies API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
