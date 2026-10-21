import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getTraining } from '@/lib/training'
import { isStatus } from '@/lib/training/validation.ts'

export const dynamic = 'force-dynamic'

/** Export CSV des demandes (admin uniquement) ; mêmes filtres que la liste. */
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const status = sp.get('status')
  try {
    const csv = await getTraining().exportRequestsCsv({ status: isStatus(status) ? status : 'all', q: sp.get('q') ?? '' })
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="training-demandes.csv"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[api/admin/training/export]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
