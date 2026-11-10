/**
 * DwaDZ — Terminologies d'une fiche : forme, voies et méthode d'administration EDQM, unités UCUM du dosage.
 * Sans dépendance serveur : testable seul. Le calcul est celui de la recherche guidée (lib/guide-core.ts) ;
 * une correction manuelle faite en base (forme_edqm_mapping, source = 'manual') arrive par `surcharge`.
 */

import { edqmForme, edqmMethode, edqmVoie, type EdqmRelation, type EdqmTerme } from './edqm.ts'
import { normaliserDci, normaliserDosage, normaliserForme } from './guide-core.ts'
import { UNITES_INFO } from './ucum.ts'

export type TermeFiche = Pick<EdqmTerme, 'code' | 'fr' | 'en' | 'ar' | 'ar_relu'>
export type UniteFiche = { ucum: string; symbole: string; ar: string }

export type TerminologieFiche = {
  forme: (TermeFiche & { relation: EdqmRelation }) | null
  voies: TermeFiche[]
  methode: TermeFiche | null
  unites: UniteFiche[]
}

/** Ce que la base peut imposer à la place du calcul. */
export type Surcharge = {
  forme?: { code: string; relation: EdqmRelation | null } | null
  voies?: string[]
  methode?: string | null
  /** traductions arabes relues en base (edqm_termes.ar_statut = 'relu') : elles passent avant le brouillon du dépôt */
  arRelus?: Record<string, string>
}

const UNITE_PAR_UCUM = new Map<string, UniteFiche>()
for (const u of Object.values(UNITES_INFO)) if (u.ucum && !UNITE_PAR_UCUM.has(u.ucum)) UNITE_PAR_UCUM.set(u.ucum, { ucum: u.ucum, symbole: u.symbole, ar: u.ar })

export function terminologieDeFiche(
  forme: string | null | undefined,
  dosage: string | null | undefined,
  dci: string | null | undefined,
  surcharge: Surcharge = {},
): TerminologieFiche {
  const f = normaliserForme(forme)
  const d = normaliserDosage(dosage, Math.max(1, normaliserDci(dci).substances.length))
  const garder = (t: EdqmTerme | null): TermeFiche | null => {
    if (!t) return null
    const relu = surcharge.arRelus?.[t.code]
    return { code: t.code, fr: t.fr, en: t.en, ar: relu ?? t.ar, ar_relu: relu ? true : t.ar_relu }
  }
  const sf = surcharge.forme !== undefined ? surcharge.forme : undefined
  const codeForme = sf === undefined ? f.edqm?.code : sf?.code
  const termeForme = codeForme ? garder(edqmForme(codeForme)) : null
  const relation = sf === undefined ? f.edqm?.relation : sf?.relation ?? 'proche'
  const codesVoies = surcharge.voies ?? f.voies_edqm
  const codeMethode = surcharge.methode !== undefined ? surcharge.methode : f.methode_edqm
  const unites = [...d.quantites, ...(d.denominateur ? [d.denominateur] : [])]
    .flatMap(q => (q.ucum ? [q.ucum] : []))
    .filter((c, i, tous) => tous.indexOf(c) === i)
    .flatMap(c => UNITE_PAR_UCUM.get(c) ?? [])
  return {
    forme: termeForme && relation ? { ...termeForme, relation } : null,
    voies: codesVoies.flatMap(c => garder(edqmVoie(c)) ?? []),
    methode: codeMethode ? garder(edqmMethode(codeMethode)) : null,
    unites,
  }
}

/** Page des référentiels : onglet et code à mettre en avant. */
export function lienTerminologie(onglet: 'formes' | 'voies' | 'methodes' | 'ucum' | 'atc', code: string): string {
  return `/terminologies?onglet=${onglet}&code=${encodeURIComponent(code)}`
}
