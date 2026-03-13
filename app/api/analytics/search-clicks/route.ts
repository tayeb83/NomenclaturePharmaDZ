import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const daysParam = Number(searchParams.get('days') || 30)
    const { getSearchClickStats } = await import('@/lib/queries')
    const stats = await getSearchClickStats(daysParam)
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'public, s-maxage=120' },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
