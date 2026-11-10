/**
 * DwaDZ — Recherche avec facettes (voie, forme, dosage, origine).
 *
 * Les facettes sont calculées sur un lot de résultats plus large que la page affichée (POOL_FACETTES) : choisir
 * « sirop » doit montrer les sirops de toute la requête, pas seulement ceux des 30 premières lignes. Les lignes
 * renvoyées sont ensuite celles du lot qui respectent les choix, tronquées à `limit`.
 * Le lot est borné : au-delà, `tronque` est vrai et l'interface le dit.
 */

import { searchMedicamentsTolerant, type TolerantSearchResponse } from './queries'
import type { SearchResult } from './db-types'
import { appliquerFacettes, type Facettes, type Facette, type FacetteSel } from './facettes'

/** Même ordre de grandeur que la liste d'une DCI (DCI_MODE_MIN_LIMIT dans lib/queries.ts). */
export const POOL_FACETTES = 300

type Filtres = Parameters<typeof searchMedicamentsTolerant>[3]

export type RechercheFacettes = Omit<TolerantSearchResponse, 'results'> & {
  results: SearchResult[]
  /** nombre de lignes qui respectent les choix (avant troncature à `limit`) */
  total: number
  /** le lot analysé est plein : les compteurs ne couvrent que les premiers résultats */
  tronque: boolean
  facettes: Facettes
  selection: FacetteSel
  ignores: Facette[]
}

export async function rechercheAvecFacettes(
  q: string,
  scope: string,
  limit: number,
  filtres: Filtres,
  choix: FacetteSel = {},
): Promise<RechercheFacettes> {
  const rep = await searchMedicamentsTolerant(q, scope, Math.max(limit, POOL_FACETTES), filtres)
  const f = appliquerFacettes(rep.results, choix)
  return {
    fuzzy: rep.fuzzy, matchedTerm: rep.matchedTerm, synonymTerm: rep.synonymTerm,
    results: f.rows.slice(0, limit),
    total: f.rows.length,
    tronque: rep.results.length >= POOL_FACETTES,
    facettes: f.facettes, selection: f.selection, ignores: f.ignores,
  }
}
