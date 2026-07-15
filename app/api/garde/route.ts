import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import type { GardeShift, GardeRosterMeta } from '@/lib/db-types'

const SHIFT_FIELDS = `
  dp.id, dp.shift, dp.duty_date, dp.weekday, dp.starts_at, dp.ends_at, dp.source, dp.source_ref,
  ph.external_id AS pharmacy_id, ph.type, ph.name_fr, ph.name_ar, ph.name_fr_confidence,
  ph.address_fr, ph.address_ar, ph.phone_e164, ph.lat, ph.lng
`

const SHIFT_FIELDS_WITH_ACTIVE = `
  ${SHIFT_FIELDS},
  (dp.starts_at <= $4::timestamptz AND dp.ends_at > $4::timestamptz) AS active_now
`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wilaya = searchParams.get('wilaya') || ''
  const commune = searchParams.get('commune') || ''
  const atParam = searchParams.get('at') || ''
  const dateParam = searchParams.get('date') || ''

  if (!wilaya || !commune) {
    return NextResponse.json({ error: 'Paramètres wilaya et commune requis' }, { status: 400 })
  }

  const at = atParam || new Date().toISOString()

  try {
    const dateRow = await queryOne<{ target_date: string }>(
      dateParam
        ? `SELECT $1::date AS target_date`
        : `SELECT ($1::timestamptz AT TIME ZONE 'Africa/Algiers')::date AS target_date`,
      [dateParam || at]
    )
    const targetDate = dateRow?.target_date

    const [currentRows, dayRows, rosterMeta] = await Promise.all([
      // "De garde maintenant" : basé sur l'intervalle réel (starts_at/ends_at),
      // pas sur duty_date — une garde de nuit commencée la veille est encore
      // active après minuit alors que duty_date pointe déjà sur le jour précédent.
      query<GardeShift>(`
        SELECT ${SHIFT_FIELDS}
        FROM garde_duty_periods dp
        JOIN garde_pharmacies ph ON ph.id = dp.pharmacy_id
        WHERE dp.wilaya_code = $1 AND dp.commune_code = $2
          AND dp.starts_at <= $3::timestamptz AND dp.ends_at > $3::timestamptz
        ORDER BY dp.starts_at DESC
        LIMIT 1
      `, [wilaya, commune, at]),
      // Planning complet du jour sélectionné (jour + nuit), pour l'onglet
      // "Cette nuit" / "Vendredi" de l'app. active_now reste calculé sur l'heure
      // réelle ($4 = at), pas sur le fait que duty_date == aujourd'hui.
      query<GardeShift & { active_now: boolean }>(`
        SELECT ${SHIFT_FIELDS_WITH_ACTIVE}
        FROM garde_duty_periods dp
        JOIN garde_pharmacies ph ON ph.id = dp.pharmacy_id
        WHERE dp.wilaya_code = $1 AND dp.commune_code = $2 AND dp.duty_date = $3
        ORDER BY dp.starts_at ASC
      `, [wilaya, commune, targetDate, at]),
      queryOne<GardeRosterMeta>(`
        SELECT wilaya_code, wilaya_name_fr, commune_code, commune_name_fr,
               period_from, period_to, review_status, issuer_fr, source_page
        FROM garde_rosters
        WHERE wilaya_code = $1 AND commune_code = $2
          AND period_from <= $3::date AND period_to >= $3::date
        ORDER BY imported_at DESC
        LIMIT 1
      `, [wilaya, commune, targetDate]),
    ])

    return NextResponse.json({
      wilaya_code: wilaya,
      commune_code: commune,
      at,
      date: targetDate,
      current: currentRows[0] || null,
      day_schedule: dayRows,
      coverage: rosterMeta,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (err: any) {
    console.error('Garde API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
