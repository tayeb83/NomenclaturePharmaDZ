/**
 * DwaDZ — Standard Terms EDQM : recherche d'un terme et rattachement d'une forme de la nomenclature.
 * Sans dépendance serveur. Données : lib/edqm-data.ts (généré), arabe : lib/edqm-ar.ts.
 *
 * Une forme normalisée (lib/guide-core.ts) est rattachée à un terme EDQM avec une relation explicite,
 * calquée sur les équivalences de ConceptMap FHIR :
 *   - « exact »      : même concept (libellé officiel, ou synonyme d'usage : « gel buvable » = « Gel oral ») ;
 *   - « plus-large » : le terme EDQM est plus général que la forme (« comprimé pelliculé sécable » → « Comprimé
 *                      pelliculé » : la sécabilité n'est pas un Standard Term) ;
 *   - « proche »     : meilleur terme disponible, à confirmer (« solution pour inhalation » → « … par nébuliseur »).
 * Sans terme sûr, pas de lien : jamais un code inventé.
 */

import { EDQM_FORMES, EDQM_VOIES, type EdqmLigne } from './edqm-data.ts'
import { EDQM_AR, EDQM_AR_RELUS } from './edqm-ar.ts'

export { EDQM_SYSTEM, EDQM_SOURCE } from './edqm-data.ts'

export type EdqmTerme = {
  code: string
  en: string
  /** terme français officiel ; null quand la source n'en fournit pas de fiable */
  fr: string | null
  /** traduction arabe DwaDZ (l'EDQM n'en publie pas dans nos sources) ; null si absente */
  ar: string | null
  /** false tant que la traduction arabe n'a pas été relue */
  ar_relu: boolean
}
export type EdqmRelation = 'exact' | 'plus-large' | 'proche'
export type EdqmLien = EdqmTerme & { relation: EdqmRelation }

const plier = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/gastro resistant/g, 'gastroresistant')

const terme = ([code, en, fr]: EdqmLigne): EdqmTerme =>
  ({ code, en, fr, ar: EDQM_AR[code] ?? null, ar_relu: EDQM_AR_RELUS.has(code) })
const FORMES = new Map(EDQM_FORMES.map(l => [l[0], terme(l)]))
const VOIES = new Map(EDQM_VOIES.map(l => [l[0], terme(l)]))
const FORME_PAR_LIBELLE = new Map<string, EdqmTerme>()
for (const t of FORMES.values()) if (t.fr && !FORME_PAR_LIBELLE.has(plier(t.fr))) FORME_PAR_LIBELLE.set(plier(t.fr), t)

export const edqmForme = (code: string) => FORMES.get(code) ?? null
export const edqmVoie = (code: string) => VOIES.get(code) ?? null
export const edqmFormes = () => [...FORMES.values()]

/** Synonymes d'usage en Algérie et en France → terme officiel (libellés pliés). */
const SYNONYMES: Record<string, [officiel: string, relation: EdqmRelation]> = {
  'dispositif transdermique': ['patch transdermique', 'exact'],
  'shampooing': ['shampoing', 'exact'],
  'gel buvable': ['gel oral', 'exact'],
  'emulsion pour application cutanee': ['emulsion cutanee', 'exact'],
  'gouttes auriculaires': ['solution auriculaire en gouttes', 'exact'],
  'gouttes nasales': ['solution nasale en gouttes', 'exact'],
  'solution concentree pour hemodialyse': ['solution a diluer pour hemodialyse', 'exact'],
  'solvant pour preparation injectable': ['solvant pour preparation parenterale', 'exact'],
  'suppositoire vaginal': ['ovule', 'exact'],
  'collyre en solution a liberation prolongee': ['collyre a liberation prolongee', 'exact'],
  'solution pour inhalation': ['solution pour inhalation par nebuliseur', 'proche'],
  'suspension pour inhalation': ['suspension pour inhalation par nebuliseur', 'proche'],
  'solution auriculaire': ['solution auriculaire en gouttes', 'proche'],
  'solution nasale': ['solution nasale en gouttes', 'proche'],
  'suspension nasale': ['suspension nasale en gouttes', 'proche'],
  'mousse': ['mousse cutanee', 'proche'],
  'pate': ['pate cutanee', 'proche'],
  'lavement': ['solution rectale', 'proche'],
}

/**
 * Rattache une forme canonique (« comprimé pelliculé sécable ») à un Standard Term.
 * Ordre : libellé officiel, synonyme, puis généralisations successives (relation « plus-large »).
 */
export function lierForme(libelle: string): EdqmLien | null {
  const k = plier(libelle)
  const direct = FORME_PAR_LIBELLE.get(k)
  if (direct) return { ...direct, relation: 'exact' }
  const syn = SYNONYMES[k]
  if (syn) {
    const t = FORME_PAR_LIBELLE.get(syn[0])
    if (t) return { ...t, relation: syn[1] }
  }
  // généralisations : la sécabilité, puis le pelliculage d'une forme à libération modifiée, puis le solvant joint
  const etapes: ((s: string) => string)[] = [
    s => s.replace(/ (?:quadri)?secable\b/, ''),
    s => s.replace(/^comprime (?:pellicule|enrobe) (?=gastroresistant|a liberation)/, 'comprime '),
    s => s.replace(/^(poudre|lyophilisat|granules) et solvant pour /, '$1 pour '),
  ]
  let s = k
  for (const e of etapes) {
    const suivant = e(s)
    if (suivant === s) continue
    s = suivant
    const t = FORME_PAR_LIBELLE.get(s) ?? (SYNONYMES[s] ? FORME_PAR_LIBELLE.get(SYNONYMES[s][0]) : undefined)
    if (t) return { ...t, relation: 'plus-large' }
  }
  return null
}
