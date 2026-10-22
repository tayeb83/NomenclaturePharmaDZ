import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getStats } from '@/lib/training'

export const dynamic = 'force-dynamic'

/** Export CSV (admin uniquement) : ?kind=users | attempts. Contient des e-mails : à traiter comme données personnelles. */
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const kind = new URL(req.url).searchParams.get('kind')
  if (kind !== 'users' && kind !== 'attempts') return NextResponse.json({ error: 'kind invalide' }, { status: 400 })
  try {
    const svc = getStats()
    const csv = kind === 'users' ? await svc.exportUsersCsv() : await svc.exportAttemptsCsv()
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="training-${kind}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[api/admin/training/export]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
