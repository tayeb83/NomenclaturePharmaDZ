import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getStats } from '@/lib/training'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const days = Number(new URL(req.url).searchParams.get('days') ?? 7)
  try {
    const svc = getStats()
    const [overview, missed] = await Promise.all([svc.overview(days), svc.mostMissed(20)])
    return NextResponse.json({ overview, missed }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[api/admin/training/stats]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
