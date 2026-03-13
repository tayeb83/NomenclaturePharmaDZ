import { NextResponse } from 'next/server'
import { getAllLaboratoires } from '@/lib/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET() {
  try {
    const labos = await getAllLaboratoires()
    return NextResponse.json({ labos }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (err) {
    console.error('[API /laboratoires]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
