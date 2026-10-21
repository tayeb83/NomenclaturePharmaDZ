import { NextRequest, NextResponse } from 'next/server'
import { getExam } from '@/lib/training'
import { requireTrainingUserApi } from '@/lib/training/auth'
import { rejectForeignOrigin } from '@/lib/training/guard'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

type Ctx = { params: { id: string; position: string } }

/**
 * Énoncé + propositions + état de la réponse. La correction n'est incluse
 * que si le moteur l'autorise (tuteur validé, ou tentative terminée).
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requireTrainingUserApi(req)
  if ('response' in auth) return auth.response
  const view = await getExam().viewQuestion(auth.user.id, Number(params.id), Number(params.position))
  if (!view) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  return NextResponse.json(view, { headers: NO_STORE })
}

/** Enregistre choix, rayures, marque, temps passé ; en tuteur, `submit` valide la réponse. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const foreign = rejectForeignOrigin(req)
  if (foreign) return foreign
  const auth = await requireTrainingUserApi(req)
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalide' }, { status: 400 })

  const res = await getExam().saveAnswer(auth.user.id, Number(params.id), Number(params.position), {
    choice: 'choice' in body ? body.choice : undefined,
    struck: 'struck' in body ? body.struck : undefined,
    marked: 'marked' in body ? Boolean(body.marked) : undefined,
    timeSpentDelta: body.timeSpentDelta,
    submit: body.submit === true,
  })
  if (!res.ok) {
    const status = res.error === 'not_found' ? 404 : res.error === 'invalid' ? 400 : 409
    return NextResponse.json({ error: res.error }, { status, headers: NO_STORE })
  }
  return NextResponse.json({ ok: true, remaining_s: res.remaining_s, validated: res.validated }, { headers: NO_STORE })
}
