import { NextRequest, NextResponse } from 'next/server'
import { searchMedicaments } from '@/lib/queries'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const scope = searchParams.get('scope') || 'all'
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 50)

  if (!q.trim() || q.length < 2) {
    return NextResponse.json({ results: [], count: 0 })
  }

  try {
    const results = await searchMedicaments(q, scope, limit)
    return NextResponse.json({ results, count: results.length, query: q, scope }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    })
  } catch (err: any) {
    console.error('Search error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
