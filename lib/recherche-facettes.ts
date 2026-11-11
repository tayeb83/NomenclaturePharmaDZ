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
import { filtreAllergie } from './allergies-core.ts'

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
  /** filtre « allergie connue » appliqué, avec ce qu'il a trouvé dans le lot analysé ; null sans filtre */
  allergie: ChoixAllergieRecherche & { signales: number; signales_total: number; masques: number } | null
}

/** Allergie connue choisie dans la recherche : signaler les présentations concernées, ou les masquer. */
export type ChoixAllergieRecherche = { code: string; mode: 'signaler' | 'masquer' }

export async function rechercheAvecFacettes(
  q: string,
  scope: string,
  limit: number,
  filtres: Filtres,
  choix: FacetteSel = {},
  allergie: ChoixAllergieRecherche | null = null,
): Promise<RechercheFacettes> {
  const rep = await searchMedicamentsTolerant(q, scope, Math.max(limit, POOL_FACETTES), filtres)
  // Allergie connue : avant les facettes, pour que leurs compteurs ne comptent pas ce qui est masqué.
  // Seule la substance ou la classe DE l'allergie choisie est visée : aucune allergie croisée.
  let lignes = rep.results
  let bilanAllergie: RechercheFacettes['allergie'] = null
  const concerne = allergie ? filtreAllergie(allergie.code) : null
  if (allergie && concerne) {
    let signalesLot = 0
    const marquees = lignes.map(r => {
      const m = concerne(r.dci, r.code_atc ?? null)
      if (!m) return { r, flag: false }
      signalesLot++
      return { r: { ...r, allergie: { code: m.allergie.code, relation: m.relation, via: m.via } }, flag: true }
    })
    lignes = allergie.mode === 'masquer' ? marquees.filter(x => !x.flag).map(x => x.r) : marquees.map(x => x.r)
    bilanAllergie = { code: allergie.code, mode: allergie.mode, signales: 0, signales_total: 0, masques: allergie.mode === 'masquer' ? signalesLot : 0 }
  }
  const f = appliquerFacettes(lignes, choix)
  const affichees = f.rows.slice(0, limit)
  if (bilanAllergie && bilanAllergie.mode === 'signaler') {
    // « signalées » = ce qu'on voit dans la liste ; `signales_total` = tout le lot respectant les facettes (le reste est plus loin)
    bilanAllergie.signales = affichees.filter(r => r.allergie).length
    bilanAllergie.signales_total = f.rows.filter(r => r.allergie).length
  }
  return {
    fuzzy: rep.fuzzy, matchedTerm: rep.matchedTerm, synonymTerm: rep.synonymTerm,
    results: affichees,
    total: f.rows.length,
    tronque: rep.results.length >= POOL_FACETTES,
    facettes: f.facettes, selection: f.selection, ignores: f.ignores,
    allergie: bilanAllergie,
  }
}
