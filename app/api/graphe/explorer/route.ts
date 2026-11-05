import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { getGrapheAcces } from '@/lib/graphe/access'
import { PLAFOND_ABONNE } from '@/lib/graphe/core'
import { ATC_RE, chercherClasses, chercherLabos, chercherSubstances, construire } from '@/lib/graphe/data'

export const dynamic = 'force-dynamic'

/**
 * Explorateur de graphes (abonnés) :
 *   /api/graphe/explorer?vue=substance&substance=AMIODARONE[&labo=SAIDAL]     (substance + laboratoire : seuls les enregistrements de ce laboratoire)
 *   /api/graphe/explorer?vue=classe&atc=C10A&mode=importation|concentration[&labo=SAIDAL]
 *   /api/graphe/explorer?vue=laboratoire&labo=SAIDAL
 *   /api/graphe/explorer?suggere=substance|classe|labo&q=amio
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

    if (suggere === 'labo') {
      const results = await chercherLabos(p.get('q') ?? '')
      return NextResponse.json({ results: results.map(r => ({ valeur: r.labo, detail: `${r.n} enregistrements` })) }, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    const vue = p.get('vue')
    const labo = (p.get('labo') ?? '').slice(0, 120).trim()
    const reponse = (graph: unknown, vide: string) => graph
      ? NextResponse.json({ graph }, { headers: { 'Cache-Control': 'private, no-store' } })
      : NextResponse.json({ error: vide }, { status: 404 })
    if (vue === 'laboratoire') {
      if (!labo) return NextResponse.json({ error: 'Indiquez un laboratoire.' }, { status: 400 })
      return reponse(await construire({ vue: 'laboratoire', labo, couches: [] }, PLAFOND_ABONNE), 'Laboratoire introuvable.')
    }
    if (vue === 'substance') {
      const substance = (p.get('substance') ?? '').slice(0, 120)
      if (!substance.trim()) return NextResponse.json({ error: 'Indiquez une substance.' }, { status: 400 })
      const graph = await construire({ vue: 'substance', substance, couches: [], labo: labo || undefined }, PLAFOND_ABONNE)
      return reponse(graph, labo ? 'Aucun enregistrement de ce laboratoire pour cette substance.' : 'Substance introuvable.')
    }
    if (vue === 'classe') {
      const atc = (p.get('atc') ?? '').trim().toUpperCase()
      if (!ATC_RE.test(atc)) return NextResponse.json({ error: 'Code ATC invalide.' }, { status: 400 })
      const mode = p.get('mode') === 'concentration' ? 'concentration' : 'importation'
      const graph = await construire({ vue: 'classe', atc, mode, labo: labo || undefined }, PLAFOND_ABONNE)
      return reponse(graph, labo && mode === 'importation' ? 'Aucun enregistrement de ce laboratoire dans cette classe.' : 'Classe introuvable.')
    }
    return NextResponse.json({ error: 'Vue inconnue.' }, { status: 400 })
  } catch (err) {
    console.error('[api/graphe/explorer]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
