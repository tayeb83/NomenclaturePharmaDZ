import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { getGrapheAcces } from '@/lib/graphe/access'
import { PLAFOND_ABONNE } from '@/lib/graphe/core'
import { ATC_RE, chercherClasses, chercherSubstances, construire } from '@/lib/graphe/data'

export const dynamic = 'force-dynamic'

/**
 * Explorateur de graphes (abonnés) :
 *   /api/graphe/explorer?vue=substance&substance=AMIODARONE
 *   /api/graphe/explorer?vue=classe&atc=C10A&mode=importation|concentration
 *   /api/graphe/explorer?suggere=substance|classe&q=amio
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(`graphe-explorer:ip:${getClientIp(req)}`, 120, 10 * 60 * 1000)
  if (limited !== null) {
    return NextResponse.json({ error: 'rate' }, { status: 429, headers: { 'Retry-After': String(limited) } })
  }
  const { acces } = await getGrapheAcces()
  if (acces !== 'abonne') {
    return NextResponse.json({ error: acces === 'public' ? 'connexion' : 'abonnement' }, { status: acces === 'public' ? 401 : 403 })
  }

  const p = req.nextUrl.searchParams
  try {
    const suggere = p.get('suggere')
    if (suggere === 'substance') {
      const results = await chercherSubstances(p.get('q') ?? '')
      return NextResponse.json({ results: results.map(r => ({ valeur: r.dci, detail: `${r.n} spécialités` })) }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    if (suggere === 'classe') {
      const results = await chercherClasses(p.get('q') ?? '')
      return NextResponse.json({ results: results.map(r => ({ valeur: r.code, detail: r.label })) }, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    const vue = p.get('vue')
    if (vue === 'substance') {
      const substance = (p.get('substance') ?? '').slice(0, 120)
      if (!substance.trim()) return NextResponse.json({ error: 'Indiquez une substance.' }, { status: 400 })
      const graph = await construire({ vue: 'substance', substance, couches: [] }, PLAFOND_ABONNE)
      return graph ? NextResponse.json({ graph }, { headers: { 'Cache-Control': 'private, no-store' } }) : NextResponse.json({ error: 'Substance introuvable.' }, { status: 404 })
    }
    if (vue === 'classe') {
      const atc = (p.get('atc') ?? '').trim().toUpperCase()
      if (!ATC_RE.test(atc)) return NextResponse.json({ error: 'Code ATC invalide.' }, { status: 400 })
      const mode = p.get('mode') === 'concentration' ? 'concentration' : 'importation'
      const graph = await construire({ vue: 'classe', atc, mode }, PLAFOND_ABONNE)
      return graph ? NextResponse.json({ graph }, { headers: { 'Cache-Control': 'private, no-store' } }) : NextResponse.json({ error: 'Classe introuvable.' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Vue inconnue.' }, { status: 400 })
  } catch (err) {
    console.error('[api/graphe/explorer]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
