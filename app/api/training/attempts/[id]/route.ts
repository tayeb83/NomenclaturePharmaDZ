import { NextRequest, NextResponse } from 'next/server'
import { getExam } from '@/lib/training'
import { requireTrainingUserApi } from '@/lib/training/auth'

export const dynamic = 'force-dynamic'

/** États du navigateur de questions (aucun contenu de question, aucune correction). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTrainingUserApi(req)
  if ('response' in auth) return auth.response
  const overview = await getExam().getOverview(auth.user.id, Number(params.id))
  if (!overview) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  return NextResponse.json(overview, { headers: { 'Cache-Control': 'no-store' } })
}
