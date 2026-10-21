import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getQuestionsAdmin } from '@/lib/training'
import { QUESTION_STATUSES, type QuestionStatus } from '@/lib/training/questions.ts'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const status = sp.get('status')
  try {
    const svc = getQuestionsAdmin()
    const [list, counts] = await Promise.all([
      svc.list({
        status: (QUESTION_STATUSES as readonly string[]).includes(status ?? '') ? (status as QuestionStatus) : 'all',
        type: sp.get('type') || undefined,
        stale: sp.get('stale') === '1',
        q: sp.get('q') ?? '',
        limit: Number(sp.get('limit') ?? 50),
        offset: Number(sp.get('offset') ?? 0),
      }),
      svc.counts(),
    ])
    return NextResponse.json({ ...list, counts })
  } catch (err) {
    console.error('[api/admin/training/questions]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
