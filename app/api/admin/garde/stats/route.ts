import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query } from '@/lib/db'

// Vue d'ensemble par wilaya, indépendamment du statut de géocodage —
// répond à "quelles wilayas sont vraiment en base ?" sans passer par SQL.
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const rows = await query(`
      SELECT
        ph.wilaya_code,
        r.wilaya_name_fr,
        COUNT(*)::int AS total_pharmacies,
        COUNT(*) FILTER (WHERE ph.geocode_status <> 'none')::int AS geocoded_count,
        r.imported_at AS last_imported_at,
        r.period_from,
        r.period_to
      FROM garde_pharmacies ph
      LEFT JOIN LATERAL (
        SELECT wilaya_name_fr, imported_at, period_from, period_to
        FROM garde_rosters gr
        WHERE gr.wilaya_code = ph.wilaya_code
        ORDER BY imported_at DESC
        LIMIT 1
      ) r ON true
      GROUP BY ph.wilaya_code, r.wilaya_name_fr, r.imported_at, r.period_from, r.period_to
      ORDER BY ph.wilaya_code
    `)

    return NextResponse.json({ data: rows })
  } catch (err: any) {
    console.error('Admin garde stats API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
