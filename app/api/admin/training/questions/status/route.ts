import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getQuestionsAdmin } from '@/lib/training'
import { rejectForeignOrigin } from '@/lib/training/guard'
import { QUESTION_ACTIONS, type QuestionAction } from '@/lib/training/questions.ts'

export const dynamic = 'force-dynamic'

/** Relire / publier / remettre en brouillon une ou plusieurs questions (relecteur obligatoire). */
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const foreign = rejectForeignOrigin(req)
  if (foreign) return foreign
  const body = await req.json().catch(() => null)
  const action = body?.action as QuestionAction
  if (!(action in QUESTION_ACTIONS) || !Array.isArray(body?.ids)) return NextResponse.json({ error: 'invalide' }, { status: 400 })
  const res = await getQuestionsAdmin().setStatus(body.ids.map(Number), action, typeof body.reviewer === 'string' ? body.reviewer : '')
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json(res)
}
