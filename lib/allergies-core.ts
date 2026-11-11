/**
 * DwaDZ — allergies HDO (Human Disease Ontology) : rapprochement d'une fiche, ou d'un résultat de recherche,
 * avec les allergies documentées. Sans dépendance serveur : testable seul (tests/allergies).
 *
 * Deux niveaux, jamais davantage :
 *   1. SUBSTANCE : chaque substance de la DCI est rapprochée du nom de l'agent de l'allergie (même moteur que
 *      les RCP et l'ANSM : accents, sels, pluriel, synonymes — lib/rcp-match.ts). Une association fixe
 *      (co-trimoxazole) exige ses deux composants.
 *   2. CLASSE : le code ATC de la fiche tombe sous l'un des codes ATC que l'allergie de classe nomme
 *      (« pénicillines » = J01C). C'est la classe DÉCLARÉE par l'allergie, rien de plus.
 *
 * Pas d'allergie croisée : « allergie à l'amoxicilline » ne signale jamais une autre pénicilline, et une allergie
 * aux céphalosporines ne signale pas les pénicillines. HDO n'en décrit pas, DwaDZ n'en déduit pas.
 * Prudence : un rapprochement douteux ne produit aucun lien, jamais un lien faux.
 */

import { buildMatchIndex, resolveCible, type MatchIndex } from './rcp-match.ts'
import { substancesDeDci } from './interactions-core.ts'
import { ALLERGIES_HDO } from './allergies-data.ts'

export type RelationAllergie = 'exact' | 'classe' | 'proche' | 'aucun'

export type AllergieHdo = {
  /** DOID sans préfixe : « 0040004 » */
  code: string
  en: string
  /** brouillon généré (« Allergie — amoxicilline ») ; jamais présenté comme relu tant que fr_statut ≠ 'relu' */
  fr: string | null
  fr_statut: 'absent' | 'brouillon' | 'relu'
  definition_en: string
  nature: string
  /** fiche : rattachable à une substance ; excipient : exige la composition (absente de la nomenclature) ; conditionnement : latex */
  perimetre: 'fiche' | 'excipient' | 'conditionnement'
  relation: RelationAllergie
  /** clé de la substance (nom anglais ATC, minuscules) ; null pour une classe ou une allergie sans substance */
  cle: string | null
  /** écritures de la substance à rapprocher (français, anglais, synonyme ChEBI) */
  noms: string[]
  /** association fixe : clés des composants, tous requis */
  composants: string[] | null
  /** codes ATC : niveau 5 pour une substance, préfixes (niveaux 2 à 4) pour une classe */
  atc: string[]
  atc_libelle_fr: string | null
  agents: { id: string | null; en: string | null; fr: string | null; uri: string | null }[]
  note: string | null
  parents: string[]
  sources: string[]
  uri: string
}

export type AllergieMatch = {
  allergie: AllergieHdo
  /** exact / proche : la substance ; classe : un code ATC de classe */
  relation: Exclude<RelationAllergie, 'aucun'>
  niveau: 'substance' | 'classe'
  /** ce par quoi la fiche est rattachée : le nom de la substance (« amoxicilline ») ou le préfixe ATC (« J01C ») */
  via: string
}

export type AllergiesFiche = {
  substance: AllergieMatch[]
  classes: AllergieMatch[]
  /** allergies pertinentes mais non évaluables : la nomenclature ne porte pas les excipients */
  excipients: AllergieHdo[]
}

export const HDO_SOURCE = 'Human Disease Ontology (HDO), allergies à déclencheur documenté'
export const HDO_PURL = (code: string) => `http://purl.obolibrary.org/obo/DOID_${code}`

/** Signe affiché après le code, comme pour l'EDQM : ⊂ plus large que la substance, ≈ à confirmer. */
export const SIGNE_RELATION: Record<Exclude<RelationAllergie, 'aucun'>, string> = { exact: '', classe: ' ⊂', proche: ' ≈' }

export const allergieParCode = (code: string): AllergieHdo | null => PAR_CODE.get(code.replace(/^DOID:/i, '')) ?? null
const PAR_CODE = new Map(ALLERGIES_HDO.map(a => [a.code, a]))

const EXCIPIENTS = ALLERGIES_HDO.filter(a => a.perimetre !== 'fiche')

// ── Index des noms de substances, construit une fois ─────────────────────────
type Index = { match: MatchIndex; cleDeNom: Map<string, string>; parCle: Map<string, AllergieHdo[]>; classes: AllergieHdo[]; associations: AllergieHdo[] }
let memo: Index | undefined
function index(): Index {
  if (memo) return memo
  const cleDeNom = new Map<string, string>()
  const parCle = new Map<string, AllergieHdo[]>()
  const classes: AllergieHdo[] = []
  const associations: AllergieHdo[] = []
  for (const a of ALLERGIES_HDO) {
    if (a.perimetre !== 'fiche') continue
    if (a.relation === 'classe') { classes.push(a); continue }
    if (!a.cle) continue
    for (const n of a.noms) cleDeNom.set(n, a.cle)
    parCle.set(a.cle, [...(parCle.get(a.cle) ?? []), a])
    if (a.composants) associations.push(a)
  }
  const match = buildMatchIndex({ dcis: [...cleDeNom.keys()].map(dci => ({ dci, n: 1 })), atc: [] })
  return (memo = { match, cleDeNom, parCle, classes, associations })
}

/** Clés de substance (HDO) que reconnaît une DCI de la nomenclature, composant par composant. */
export function clesDeDci(dci: string): Set<string> {
  const idx = index()
  const cles = new Set<string>()
  const noms = [dci, ...substancesDeDci(dci)]
  for (const nom of noms) {
    const hit = resolveCible(idx.match, { libelle: nom, cible_type: null, cible: null }).dci
    const cle = hit ? idx.cleDeNom.get(hit) : null
    if (cle) cles.add(cle)
  }
  return cles
}

const nettoyer = (dci: string | null) => (dci ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
const prefixeAtc = (code: string | null, a: AllergieHdo): string | null =>
  code ? (a.atc.find(p => code.toUpperCase().startsWith(p)) ?? null) : null

function matchsDe(cles: Set<string>, codeAtc: string | null): AllergieMatch[] {
  const idx = index()
  const out: AllergieMatch[] = []
  for (const cle of cles) {
    for (const a of idx.parCle.get(cle) ?? []) {
      if (a.composants) continue // une association se juge sur l'ensemble de ses composants, plus bas
      out.push({ allergie: a, relation: a.relation === 'proche' ? 'proche' : 'exact', niveau: 'substance', via: a.agents[0]?.fr ?? a.noms[0] ?? cle })
    }
  }
  for (const a of idx.associations) {
    if (a.composants!.every(c => cles.has(c)) && !out.some(m => m.allergie === a)) {
      out.push({ allergie: a, relation: 'exact', niveau: 'substance', via: a.composants!.join(' + ') })
    }
  }
  for (const a of idx.classes) {
    const p = prefixeAtc(codeAtc, a)
    if (p) out.push({ allergie: a, relation: 'classe', niveau: 'classe', via: p })
  }
  return out
}

/**
 * Allergies HDO d'un médicament, par sa DCI (et son code ATC niveau 5 si on l'a, pour les classes).
 * Les classes sont triées de la plus précise (pénicillines : un code) à la plus large (bêta-lactamines : plusieurs).
 */
export function allergiesDeDci(dci: string | null, codeAtc: string | null): AllergiesFiche {
  const d = nettoyer(dci)
  const matchs = d ? matchsDe(clesDeDci(d), codeAtc) : codeAtc ? matchsDe(new Set(), codeAtc) : []
  const rang = (m: AllergieMatch) => (m.relation === 'exact' ? 0 : m.relation === 'proche' ? 1 : 2)
  const substance = matchs.filter(m => m.niveau === 'substance')
    .sort((x, y) => rang(x) - rang(y) || x.allergie.code.localeCompare(y.allergie.code))
  const classes = matchs.filter(m => m.niveau === 'classe')
    .sort((x, y) => y.via.length - x.via.length || x.allergie.atc.length - y.allergie.atc.length || x.allergie.code.localeCompare(y.allergie.code))
  return { substance, classes, excipients: EXCIPIENTS }
}

/**
 * Filtre « allergie connue » de la recherche : pour UNE allergie choisie, dit si une ligne de résultat la concerne.
 * Uniquement la substance ou la classe de cette allergie : jamais une allergie croisée.
 * Mémorise le calcul par DCI (un lot de résultats répète beaucoup de DCI).
 */
export function filtreAllergie(code: string): ((dci: string | null, codeAtc: string | null) => AllergieMatch | null) | null {
  const a = allergieParCode(code)
  if (!a || a.perimetre !== 'fiche') return null
  const cache = new Map<string, AllergieMatch | null>()
  return (dci, codeAtc) => {
    const d = nettoyer(dci)
    const k = `${d}|${codeAtc ?? ''}`
    if (cache.has(k)) return cache.get(k)!
    const m = (d ? matchsDe(clesDeDci(d), codeAtc) : matchsDe(new Set(), codeAtc)).find(x => x.allergie === a) ?? null
    cache.set(k, m)
    return m
  }
}

/** Libellé court de l'allergie dans la langue demandée. L'arabe n'existe pas encore : repli français, signalé par `repli`. */
export function libelleAllergie(a: AllergieHdo, lang: 'fr' | 'ar'): { texte: string; repli: boolean; brouillon: boolean } {
  return { texte: a.fr ?? a.en, repli: lang === 'ar', brouillon: a.fr_statut !== 'relu' }
}

/** Nom de l'agent (« amoxicilline », « pénicillines ») sans le préfixe « Allergie — ». */
export function nomAgent(a: AllergieHdo): string {
  const ag = a.agents[0]
  return ag?.fr ?? ag?.en ?? a.en
}

/** Les DCI (avec leurs présentations) concernées par une allergie, parmi les lignes données (page de l'allergie). */
export function dcisConcernees(a: AllergieHdo, lignes: { dci: string; code_atc: string | null; n: number }[]): { dci: string; n: number; via: string }[] {
  const f = filtreAllergie(a.code)
  if (!f) return []
  const out: { dci: string; n: number; via: string }[] = []
  for (const l of lignes) {
    const m = f(l.dci, l.code_atc)
    if (m) out.push({ dci: l.dci, n: l.n, via: m.via })
  }
  return out.sort((x, y) => y.n - x.n || x.dci.localeCompare(y.dci))
}
