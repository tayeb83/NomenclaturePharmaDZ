import { NextRequest, NextResponse } from 'next/server'
import { getGardeNow } from '@/lib/garde'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wilaya = searchParams.get('wilaya') || ''
  const commune = searchParams.get('commune') || ''
  const at = searchParams.get('at') || ''
  const date = searchParams.get('date') || ''

  if (!wilaya || !commune) {
    return NextResponse.json({ error: 'Paramètres wilaya et commune requis' }, { status: 400 })
  }

  try {
    const result = await getGardeNow(wilaya, commune, { at, date })
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (err: any) {
    console.error('Garde API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
