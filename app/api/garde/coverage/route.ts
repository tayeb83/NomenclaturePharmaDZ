import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { GardeCoverageEntry } from '@/lib/db-types'

export async function GET() {
  try {
    const rows = await query<GardeCoverageEntry>(`
      SELECT DISTINCT ON (wilaya_code, commune_code)
        wilaya_code, wilaya_name_fr, wilaya_name_ar,
        commune_code, commune_name_fr, commune_name_ar,
        period_from, period_to, review_status
      FROM garde_rosters
      ORDER BY wilaya_code, commune_code, imported_at DESC
    `)

    return NextResponse.json({ data: rows }, {
      // Court : la liste des wilayas couvertes évolue au fil des imports,
      // contrairement à la nomenclature qui ne change qu'une fois par mois.
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  } catch (err: any) {
    console.error('Garde coverage API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
