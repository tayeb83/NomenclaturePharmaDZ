import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getQuestionsAdmin } from '@/lib/training'
import { rejectForeignOrigin } from '@/lib/training/guard'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const q = await getQuestionsAdmin().get(Number(params.id))
  if (!q) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  return NextResponse.json({ question: q })
}

/** Modification manuelle par un relecteur (énoncé, propositions, bonne réponse, explications). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const foreign = rejectForeignOrigin(req)
  if (foreign) return foreign
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalide' }, { status: 400 })
  const res = await getQuestionsAdmin().edit(Number(params.id), {
    stem: body.stem,
    options: body.options,
    correct_index: body.correct_index,
    explanation: body.explanation,
    a_valider: typeof body.a_valider === 'boolean' ? body.a_valider : undefined,
  })
  if (!res.ok) return NextResponse.json({ errors: res.errors }, { status: 400 })
  return NextResponse.json({ ok: true })
}
