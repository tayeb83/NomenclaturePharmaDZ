import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import type { GardeShift, GardeRosterMeta } from '@/lib/db-types'

const SHIFT_FIELDS = `
  dp.id, dp.shift, dp.duty_date, dp.weekday, dp.starts_at, dp.ends_at, dp.source, dp.source_ref,
  ph.external_id AS pharmacy_id, ph.type,
  COALESCE(ph.name_fr, ph.name_ar) AS name_fr,
  CASE WHEN ph.name_fr IS NULL THEN NULL ELSE ph.name_ar END AS name_ar,
  ph.name_fr_confidence,
  ph.address_fr, ph.address_ar, ph.phone_e164, ph.lat, ph.lng
`

function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
}

/**
 * GET /api/garde/month?wilaya=&commune=&month=YYYY-MM
 *
 * Planning complet (jour + nuit) d'un mois calendaire pour une commune —
 * vue "grand format" équivalente aux tableaux PDF/HTML publiés par les DSP,
 * par opposition à /api/garde qui ne renvoie que le jour courant/ciblé.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wilaya = searchParams.get('wilaya') || ''
  const commune = searchParams.get('commune') || ''
  const monthParam = searchParams.get('month') || ''

  if (!wilaya || !commune) {
    return NextResponse.json({ error: 'Paramètres wilaya et commune requis' }, { status: 400 })
  }

  const month = isValidMonth(monthParam)
    ? monthParam
    : new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit' })
        .format(new Date()).replace('/', '-')

  try {
    const [rows, rosterMeta] = await Promise.all([
      query<GardeShift>(`
        SELECT ${SHIFT_FIELDS}
        FROM garde_duty_periods dp
        JOIN garde_pharmacies ph ON ph.id = dp.pharmacy_id
        WHERE dp.wilaya_code = $1 AND dp.commune_code = $2
          AND to_char(dp.duty_date, 'YYYY-MM') = $3
        ORDER BY dp.duty_date ASC, dp.starts_at ASC
      `, [wilaya, commune, month]),
      queryOne<GardeRosterMeta>(`
        SELECT wilaya_code, wilaya_name_fr, commune_code, commune_name_fr,
               period_from, period_to, review_status, issuer_fr, source_page
        FROM garde_rosters
        WHERE wilaya_code = $1 AND commune_code = $2
        ORDER BY imported_at DESC
        LIMIT 1
      `, [wilaya, commune]),
    ])

    return NextResponse.json({
      wilaya_code: wilaya,
      commune_code: commune,
      month,
      coverage: rosterMeta,
      data: rows,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (err: any) {
    console.error('Garde month API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
