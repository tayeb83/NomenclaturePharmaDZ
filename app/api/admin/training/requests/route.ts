import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getTraining } from '@/lib/training'
import { isStatus } from '@/lib/training/validation.ts'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const status = sp.get('status')
  try {
    const svc = getTraining()
    const [requests, counts] = await Promise.all([
      svc.listRequests({ status: isStatus(status) ? status : 'all', q: sp.get('q') ?? '' }),
      svc.counts(),
    ])
    return NextResponse.json({ requests, counts })
  } catch (err) {
    if ((err as { code?: string })?.code === '42P01') {
      return NextResponse.json({ error: 'tables absentes : appliquer sql/23_training.sql', tableMissing: true }, { status: 503 })
    }
    console.error('[api/admin/training/requests]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
