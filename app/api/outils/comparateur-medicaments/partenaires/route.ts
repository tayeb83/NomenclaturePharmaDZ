import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { requireTrainingUserApi } from '@/lib/training/auth'
import { parseCote, partenaires } from '@/lib/comparateur-medicaments'

export const dynamic = 'force-dynamic'

/**
 * Partenaires d'interaction d'un seul côté (marque ou substance), pour proposer l'autre côté de la comparaison :
 *   /api/outils/comparateur-medicaments/partenaires?a=enregistrement:12&lang=ar
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(`comparateur-med-part:ip:${getClientIp(req)}`, 60, 10 * 60 * 1000)
  if (limited !== null) {
    return NextResponse.json({ error: 'rate' }, { status: 429, headers: { 'Retry-After': String(limited) } })
  }
  const auth = await requireTrainingUserApi(req)
  if ('response' in auth) return auth.response

  const p = req.nextUrl.searchParams
  const a = parseCote(p.get('a'))
  if (!a) return NextResponse.json({ error: 'Un médicament ou une substance est nécessaire.' }, { status: 400 })

  try {
    const res = await partenaires(a, p.get('lang') === 'ar' ? 'ar' : 'fr')
    if (!res) return NextResponse.json({ error: 'Médicament introuvable.' }, { status: 404 })
    return NextResponse.json(res, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('[api/outils/comparateur-medicaments/partenaires]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
