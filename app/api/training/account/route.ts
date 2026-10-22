import { NextRequest, NextResponse } from 'next/server'
import { getTraining } from '@/lib/training'
import { clearSessionCookie, requireTrainingUserApi } from '@/lib/training/auth'
import { rejectForeignOrigin } from '@/lib/training/guard'

export const dynamic = 'force-dynamic'

/**
 * Suppression de son propre compte et de toutes ses données Training
 * (progression, flashcards, jetons, sessions). Irréversible : le corps doit
 * contenir {"confirm": true}.
 */
export async function DELETE(req: NextRequest) {
  const foreign = rejectForeignOrigin(req)
  if (foreign) return foreign
  const auth = await requireTrainingUserApi(req)
  if ('response' in auth) return auth.response
  const body = await req.json().catch(() => null)
  if (body?.confirm !== true) return NextResponse.json({ error: 'confirmation requise' }, { status: 400 })
  const ok = await getTraining().deleteUser(auth.user.id, 'self')
  if (!ok) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
}
