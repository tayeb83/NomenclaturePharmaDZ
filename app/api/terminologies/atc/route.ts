/**
 * GET /api/terminologies/atc — codes ATC pour la page « Terminologies » (tous niveaux, filtrables, paginés).
 *   ?niveau=3&q=bêtabloquants&utilises=1&offset=0&limit=100     ou  ?code=C07AB02
 */

import { NextRequest, NextResponse } from 'next/server'
import { listAtcPourReferentiel } from '@/lib/queries'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const retry = rateLimit(`terminologies-atc:${getClientIp(req)}`, 90, 60_000)
  if (retry !== null) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans un instant.' }, { status: 429, headers: { 'Retry-After': String(retry) } })
  }
  const sp = req.nextUrl.searchParams
  const niveau = parseInt(sp.get('niveau') || '', 10)
  const code = (sp.get('code') || '').trim().toUpperCase()
  if (code && !/^[A-Z][0-9A-Z]{0,6}$/.test(code)) return NextResponse.json({ error: 'Code ATC invalide.' }, { status: 400 })
  const r = await listAtcPourReferentiel({
    niveau: Number.isFinite(niveau) ? niveau : undefined,
    q: (sp.get('q') || '').slice(0, 80),
    code: code || undefined,
    utilises: sp.get('utilises') !== '0',
    offset: parseInt(sp.get('offset') || '0', 10) || 0,
    limit: parseInt(sp.get('limit') || '100', 10) || 100,
  })
  return NextResponse.json(r, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
