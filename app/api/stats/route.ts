import { NextResponse } from 'next/server'
import { getStats } from '@/lib/queries'

export const revalidate = 3600

export async function GET() {
  try {
    const stats = await getStats()
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' }
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
