import { NextRequest, NextResponse } from 'next/server'
import { getGardeMonth } from '@/lib/garde'

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

  try {
    const result = await getGardeMonth(wilaya, commune, monthParam)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (err: any) {
    console.error('Garde month API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
