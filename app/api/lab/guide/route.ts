/**
 * GET /api/lab/guide — une étape de la recherche guidée (Lab).
 *
 *   /api/lab/guide?q=amox                                   → DCI correspondant à la saisie (étape 1)
 *   /api/lab/guide?dci=amoxicilline                         → voies, formes, dosages possibles
 *   /api/lab/guide?dci=amoxicilline&voie=orale-liquide      → la forme unique est remplie d'office
 *   …&forme=…&dosage=…&statut=f&labo=saidal&lang=ar&limit=50
 *
 * Les valeurs sont les identifiants renvoyés dans `options` : l'état complet tient dans l'URL.
 * Calcul en mémoire (lib/guide.ts), aucune requête SQL après le premier appel de l'instance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { getGuideIndex } from '@/lib/guide'
import { CRITERES, guider, type Selection } from '@/lib/guide-core'
import { medicamentPath } from '@/lib/medicament-url'

export const dynamic = 'force-dynamic'

const LIMIT_DEFAULT = 30
const LIMIT_MAX = 100
const ID_VALIDE = /^[a-z0-9-]{1,160}$/

export async function GET(req: NextRequest) {
  const retry = rateLimit(`lab-guide:${getClientIp(req)}`, 120, 60_000)
  if (retry !== null) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans un instant.' }, { status: 429, headers: { 'Retry-After': String(retry) } })
  }

  const sp = req.nextUrl.searchParams
  const lang = sp.get('lang') === 'ar' ? 'ar' : 'fr'
  const limit = Math.min(LIMIT_MAX, Math.max(0, parseInt(sp.get('limit') || String(LIMIT_DEFAULT), 10) || 0))
  const sel: Selection = {}
  for (const c of CRITERES) {
    const v = sp.get(c)?.trim().toLowerCase()
    if (!v) continue
    if (!ID_VALIDE.test(v)) {
      return NextResponse.json({ error: `Paramètre « ${c} » invalide : utilisez un identifiant renvoyé par cette route.` }, { status: 400 })
    }
    sel[c] = v
  }
  const q = sp.get('q')?.slice(0, 80)
  if (q) sel.q = q

  let index
  try {
    index = await getGuideIndex()
  } catch (e) {
    console.error('[lab/guide] chargement de l’index impossible', e)
    return NextResponse.json({ error: 'Nomenclature indisponible pour le moment.' }, { status: 503 })
  }

  const r = guider(index, sel, lang)
  const body = {
    etape: r.etape,
    selection: r.selection,
    auto: r.auto,
    ignores: r.ignores,
    options: r.options,
    total: r.total,
    presentations: r.presentations.slice(0, limit).map(p => ({
      id: p.id,
      url: medicamentPath('enregistrement', p.id, p, lang),
      nom_marque: p.nom_marque,
      dci: p.dci,
      forme: p.forme,
      dosage: p.dosage,
      conditionnement: p.conditionnement ?? null,
      labo: p.labo ?? null,
      pays: p.pays ?? null,
      statut: p.statut ?? null,
      forme_norm: p.norm.forme.fr,
      forme_ar: p.norm.forme.ar,
      forme_edqm: p.norm.forme.edqm ? { code: p.norm.forme.edqm.code, relation: p.norm.forme.edqm.relation } : null,
      dosage_norm: p.norm.dosage.libelle,
      dosage_ar: p.norm.dosage.libelle_ar,
      dosage_ucum: { quantites: p.norm.dosage.quantites, denominateur: p.norm.dosage.denominateur },
    })),
  }
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'private, max-age=300' },
  })
}
