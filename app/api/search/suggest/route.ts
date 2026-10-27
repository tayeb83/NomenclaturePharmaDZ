import { NextRequest, NextResponse } from 'next/server'
import { suggestSearch } from '@/lib/suggest'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q') || ''
  try {
    const suggestions = await suggestSearch(q)
    return NextResponse.json({ suggestions }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('Suggest error:', err)
    return NextResponse.json({ suggestions: [] })
  }
}
