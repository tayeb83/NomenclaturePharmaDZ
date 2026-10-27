import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { requireTrainingUserApi } from '@/lib/training/auth'
import { comparer, parseCote } from '@/lib/comparateur-medicaments'

export const dynamic = 'force-dynamic'

/**
 * Comparaison de deux côtés, chacun une marque ou une substance :
 *   /api/outils/comparateur-medicaments?a=enregistrement:12&b=dci:AMIODARONE&lang=ar
 * Réservée aux comptes validés (mêmes comptes que Training) : sans session, 401.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(`comparateur-med:ip:${getClientIp(req)}`, 60, 10 * 60 * 1000)
  if (limited !== null) {
    return NextResponse.json({ error: 'rate' }, { status: 429, headers: { 'Retry-After': String(limited) } })
  }
  const auth = await requireTrainingUserApi(req)
  if ('response' in auth) return auth.response

  const p = req.nextUrl.searchParams
  const a = parseCote(p.get('a'))
  const b = parseCote(p.get('b'))
  if (!a || !b) return NextResponse.json({ error: 'Deux médicaments ou substances sont nécessaires.' }, { status: 400 })

  try {
    const res = await comparer(a, b, p.get('lang') === 'ar' ? 'ar' : 'fr')
    if (!res) return NextResponse.json({ error: 'Médicament introuvable.' }, { status: 404 })
    return NextResponse.json(res, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('[api/outils/comparateur-medicaments]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
