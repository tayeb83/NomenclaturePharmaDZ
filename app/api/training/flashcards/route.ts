import { NextRequest, NextResponse } from 'next/server'
import { getExam } from '@/lib/training'
import { requireTrainingUserApi } from '@/lib/training/auth'
import { rejectForeignOrigin } from '@/lib/training/guard'

export const dynamic = 'force-dynamic'

async function handle(req: NextRequest, on: boolean) {
  const foreign = rejectForeignOrigin(req)
  if (foreign) return foreign
  const auth = await requireTrainingUserApi(req)
  if ('response' in auth) return auth.response
  const body = await req.json().catch(() => null)
  const qid = Number(body?.question_id)
  if (!Number.isSafeInteger(qid) || qid <= 0) return NextResponse.json({ error: 'invalide' }, { status: 400 })
  const ok = await getExam().setFlashcard(auth.user.id, qid, on)
  // Pas de correction lisible pour cette question : on ne confirme même pas qu'elle existe.
  if (!ok) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  return NextResponse.json({ ok: true, flashcard: on })
}

export const POST = (req: NextRequest) => handle(req, true)
export const DELETE = (req: NextRequest) => handle(req, false)
