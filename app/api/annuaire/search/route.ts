import { NextRequest, NextResponse } from 'next/server'
import { searchDirectory } from '@/lib/annuaire'

/** GET /api/annuaire/search?q= — recherche globale par nom, quartier, commune ou wilaya. */
export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q') || ''
  if (q.trim().length < 2) return NextResponse.json({ data: [] })
  try {
    const data = await searchDirectory(q)
    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('Annuaire search API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
