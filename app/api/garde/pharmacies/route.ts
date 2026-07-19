import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { GardePharmacy } from '@/lib/db-types'

/**
 * GET /api/garde/pharmacies?wilaya=&commune=
 *
 * Annuaire de toutes les pharmacies connues d'une wilaya (et optionnellement
 * d'une commune), avec position — indépendant du planning de garde du jour.
 * Réutilise `garde_pharmacies`, alimentée au fil des imports de rosters DSP
 * (scripts/import_garde.py) : c'est donc un annuaire qui s'enrichit avec le
 * temps (une pharmacie y apparaît dès qu'elle a eu au moins une garde
 * recensée), pas une liste exhaustive officielle de toutes les officines.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wilaya = searchParams.get('wilaya') || ''
  const commune = searchParams.get('commune') || ''

  if (!wilaya) {
    return NextResponse.json({ error: 'Paramètre wilaya requis' }, { status: 400 })
  }

  const conditions = ['wilaya_code = $1']
  const params: string[] = [wilaya]
  if (commune) {
    conditions.push(`commune_code = $${params.length + 1}`)
    params.push(commune)
  }

  try {
    const rows = await query<GardePharmacy & { geocode_status: string }>(`
      SELECT external_id AS pharmacy_id, wilaya_code, type, name_fr, name_ar, name_fr_confidence,
             commune_code, commune_name_fr, commune_name_ar,
             address_fr, address_ar, phone_e164, lat, lng, geocode_status
      FROM garde_pharmacies
      WHERE ${conditions.join(' AND ')}
      ORDER BY commune_name_fr ASC, COALESCE(name_fr, name_ar) ASC
    `, params)

    return NextResponse.json({ data: rows }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (err: any) {
    console.error('Garde pharmacies directory API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
