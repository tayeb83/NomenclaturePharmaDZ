import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { requireTrainingUserApi } from '@/lib/training/auth'
import { chercherSubstances } from '@/lib/comparateur-medicaments'

export const dynamic = 'force-dynamic'

/** Recherche d'une substance pour le comparateur : /api/outils/comparateur-medicaments/substances?q=amio */
export async function GET(req: NextRequest) {
  const limited = rateLimit(`comparateur-med-subst:ip:${getClientIp(req)}`, 240, 10 * 60 * 1000)
  if (limited !== null) {
    return NextResponse.json({ error: 'rate' }, { status: 429, headers: { 'Retry-After': String(limited) } })
  }
  const auth = await requireTrainingUserApi(req)
  if ('response' in auth) return auth.response

  try {
    const results = await chercherSubstances(req.nextUrl.searchParams.get('q') ?? '')
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('[api/outils/comparateur-medicaments/substances]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
