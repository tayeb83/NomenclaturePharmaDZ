import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { getExam } from '@/lib/training'
import { requireTrainingUserApi } from '@/lib/training/auth'
import { rejectForeignOrigin, tooMany } from '@/lib/training/guard'

export const dynamic = 'force-dynamic'

/** Démarre une série (mode tuteur) ou un examen. Réservé aux utilisateurs validés. */
export async function POST(req: NextRequest) {
  const foreign = rejectForeignOrigin(req)
  if (foreign) return foreign
  const auth = await requireTrainingUserApi(req)
  if ('response' in auth) return auth.response

  const limited = rateLimit(`training-start:${auth.user.id}:${getClientIp(req)}`, 30, 60 * 60 * 1000)
  if (limited !== null) return tooMany(limited)

  const body = await req.json().catch(() => null)
  try {
    const res = await getExam().startAttempt(auth.user.id, {
      mode: body?.mode,
      count: Number(body?.count),
      types: Array.isArray(body?.types) ? body.types : undefined,
      examCode: typeof body?.examCode === 'string' ? body.examCode : undefined,
    })
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.error === 'invalid' ? 400 : 409 })
    return NextResponse.json({ id: res.id }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[api/training/attempts]', (err as Error).message)
    return NextResponse.json({ error: 'serveur' }, { status: 500 })
  }
}
