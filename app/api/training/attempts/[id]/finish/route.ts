import { NextRequest, NextResponse } from 'next/server'
import { getExam } from '@/lib/training'
import { requireTrainingUserApi } from '@/lib/training/auth'
import { rejectForeignOrigin } from '@/lib/training/guard'

export const dynamic = 'force-dynamic'

/** « Terminer la section » : clôture (idempotente) et révèle le score. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const foreign = rejectForeignOrigin(req)
  if (foreign) return foreign
  const auth = await requireTrainingUserApi(req)
  if ('response' in auth) return auth.response
  const res = await getExam().finishAttempt(auth.user.id, Number(params.id))
  if (!res) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  return NextResponse.json({ ...res, redirect: `/training/resultats/${Number(params.id)}` }, { headers: { 'Cache-Control': 'no-store' } })
}
