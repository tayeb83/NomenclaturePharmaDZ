import { NextRequest, NextResponse } from 'next/server'
import { searchMedicaments } from '@/lib/queries'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const scope = searchParams.get('scope') || 'all'
  const labo = searchParams.get('labo') || ''
  const substance = searchParams.get('substance') || ''
  const activeOnly = searchParams.get('activeOnly') === '1'
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 80)

  if (!q.trim() && !labo.trim() && !substance.trim()) {
    return NextResponse.json({ results: [], count: 0 })
  }

  try {
    const results = await searchMedicaments(q, scope, limit, { labo, substance, activeOnly })
    return NextResponse.json({
      results,
      count: results.length,
      query: q,
      scope,
      filters: { labo, substance, activeOnly },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    })
  } catch (err: any) {
    console.error('Search error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
