/**
 * DwaDZ — écarts entre les interactions citées par une source (ici : rubrique 4.5 des RCP de l'ANPP)
 * et le Thesaurus ANSM. Sans dépendance serveur : testable seul.
 *
 * Un « écart » n'est PAS une erreur de l'ANSM : le thésaurus est une sélection d'experts. C'est un
 * candidat à relire. Rien ici ne publie ni ne classe une interaction.
 *
 * Pour chaque fait « le RCP de A cite B », on regarde si le thésaurus dit déjà quelque chose, dans
 * un sens ou dans l'autre, directement (A + B) ou par une classe (A + « ANTI-TNF ALPHA », « AUTRES X »…) :
 *   couverte_directe   une ligne A + B existe
 *   couverte_classe    une ligne existe, mais via une classe de A ou de B
 *   divergence_niveau  couverte, mais la source est plus (ou moins) sévère que l'ANSM
 *   absente            rien dans le thésaurus
 *   non_resolue        le partenaire n'a pas pu être identifié (classe ATC, nom hors nomenclature) :
 *                      jamais compté comme absent — un rapprochement douteux ne produit aucun candidat.
 */

import {
  NIVEAU_RANG, classeDuPartenaire, cle, composantsDeDci,
  type Composant, type Niveau, type ThesaurusIndex,
} from './interactions-core.ts'

export type Gravite = 'contre_indiquee' | 'deconseillee' | 'precaution' | 'a_prendre_en_compte' | 'non_precisee'

/** Équivalence entre l'échelle des faits RCP (sql/27) et celle du thésaurus. `non_precisee` n'en a pas. */
export const GRAVITE_VERS_NIVEAU: Record<Exclude<Gravite, 'non_precisee'>, Niveau> = {
  contre_indiquee: 'contre_indication',
  deconseillee: 'deconseillee',
  precaution: 'precaution_emploi',
  a_prendre_en_compte: 'a_prendre_en_compte',
}

const GRAVITE_RANG: Record<Gravite, number> = { contre_indiquee: 4, deconseillee: 3, precaution: 2, a_prendre_en_compte: 1, non_precisee: 0 }

/** Une ligne « SUBSTANCE + PARTENAIRE » du thésaurus. */
export type LigneAnsm = { substance: string; partenaire: string; niveau: Niveau }

/** Un fait « interaction » de rcp_faits, avec la DCI de la fiche dont il vient. */
export type FaitRcp = {
  rcp_id: string
  /** DCI de la fiche (rcp_dci) : « A », « A + B » */
  dci: string
  libelle: string
  cible_type: 'dci' | 'classe' | null
  cible: string | null
  gravite: Gravite
  section?: string | null
  page?: number | null
  version_texte?: string | null
  contexte?: string | null
}

export type Ecart = 'couverte_directe' | 'couverte_classe' | 'divergence_niveau' | 'absente' | 'non_resolue'

export type Constat = {
  fait: FaitRcp
  a: string
  b: string
  ecart: Ecart
  /** niveau le plus grave des lignes du thésaurus qui couvrent la paire */
  niveau_ansm: Niveau | null
  /** lignes du thésaurus qui couvrent la paire, « SUBSTANCE + PARTENAIRE » */
  via: string[]
  sens: 'source_plus_grave' | 'source_moins_grave' | null
  /** la substance n'est pas un titre ni un membre de classe du thésaurus */
  a_hors_thesaurus: boolean
  b_hors_thesaurus: boolean
}

export type GapContext = {
  index: ThesaurusIndex
  /** clé du titre → lignes écrites sous ce titre */
  parSubstance: Map<string, LigneAnsm[]>
}

export function buildGapContext(index: ThesaurusIndex, lignes: LigneAnsm[]): GapContext {
  const parSubstance = new Map<string, LigneAnsm[]>()
  for (const l of lignes) {
    const k = cle(l.substance)
    parSubstance.set(k, [...(parSubstance.get(k) ?? []), l])
  }
  return { index, parSubstance }
}

const horsThesaurus = (c: Composant) => !c.titre && c.classes.length === 0

/** Les lignes d'un côté X qui visent Y, directes (titre ↔ titre) ou par classe. */
function lignesVisant(ctx: GapContext, x: Composant, y: Composant): { direct: LigneAnsm[]; classe: LigneAnsm[] } {
  const sous = [x.titre, ...x.classes].filter((s): s is string => !!s)
  const kx = x.titre ? cle(x.titre) : null
  const ky = y.titre ? cle(y.titre) : null
  const classesY = new Set(y.classes.map(cle))
  const direct: LigneAnsm[] = []
  const classe: LigneAnsm[] = []
  for (const s of new Set(sous)) {
    for (const l of ctx.parSubstance.get(cle(s)) ?? []) {
      const kp = cle(l.partenaire)
      const groupe = classeDuPartenaire(ctx.index, l.partenaire)
      const kg = groupe ? cle(groupe) : null
      const vise = (!!ky && kp === ky) || classesY.has(kp) || (!!kg && ((!!ky && kg === ky) || classesY.has(kg)))
      if (!vise) continue
      if (kx && cle(l.substance) === kx && ky && kp === ky) direct.push(l)
      else classe.push(l)
    }
  }
  return { direct, classe }
}

const rangMin = (ls: LigneAnsm[]): Niveau | null =>
  ls.length ? ls.reduce((m, l) => (NIVEAU_RANG[l.niveau] < NIVEAU_RANG[m] ? l.niveau : m), ls[0].niveau) : null

/** Compare un fait RCP au thésaurus : un constat par couple (substance de la fiche, substance du partenaire). */
export function comparerFait(ctx: GapContext, fait: FaitRcp): Constat[] {
  const base: Omit<Constat, 'a' | 'b' | 'ecart'> = { fait, niveau_ansm: null, via: [], sens: null, a_hors_thesaurus: false, b_hors_thesaurus: false }
  const source = composantsDeDci(ctx.index, fait.dci)

  // Une classe ATC n'a pas (encore) d'équivalent dans les classes du thésaurus : on ne tranche pas.
  if (fait.cible_type === 'classe') {
    return source.map(a => ({ ...base, a: a.nom, b: fait.libelle, ecart: 'non_resolue' as const }))
  }
  const nomPartenaire = fait.cible_type === 'dci' && fait.cible ? fait.cible : fait.libelle
  const partenaires = composantsDeDci(ctx.index, nomPartenaire)
  // Le partenaire est identifié s'il est dans la nomenclature (cible_type 'dci') ou s'il est connu du thésaurus.
  const identifie = fait.cible_type === 'dci' || partenaires.some(p => !!p.titre || p.classes.length > 0)
  if (!identifie) return source.map(a => ({ ...base, a: a.nom, b: fait.libelle, ecart: 'non_resolue' as const }))

  const out: Constat[] = []
  for (const a of source) {
    for (const b of partenaires) {
      // nom canonique : le titre du thésaurus quand il existe (sans sel), pour que « Phénytoïne sodique » et « PHENYTOINE » ne fassent qu'une paire
      const na = a.titre ?? a.nom
      const nb = b.titre ?? b.nom
      if (cle(na) === cle(nb)) continue // une substance ne figure pas en interaction avec elle-même
      const ab = lignesVisant(ctx, a, b)
      const ba = lignesVisant(ctx, b, a)
      const direct = [...ab.direct, ...ba.direct]
      const classe = [...ab.classe, ...ba.classe]
      const toutes = [...direct, ...classe]
      const niveau = rangMin(toutes)
      const c: Constat = {
        fait, a: na, b: nb, ecart: 'absente', niveau_ansm: niveau,
        via: [...new Set(toutes.map(l => `${l.substance} + ${l.partenaire}`))],
        sens: null, a_hors_thesaurus: horsThesaurus(a), b_hors_thesaurus: horsThesaurus(b),
      }
      if (toutes.length > 0) {
        c.ecart = direct.length > 0 ? 'couverte_directe' : 'couverte_classe'
        if (fait.gravite !== 'non_precisee' && niveau) {
          const rs = NIVEAU_RANG[GRAVITE_VERS_NIVEAU[fait.gravite]]
          const ra = NIVEAU_RANG[niveau]
          if (rs !== ra) { c.ecart = 'divergence_niveau'; c.sens = rs < ra ? 'source_plus_grave' : 'source_moins_grave' }
        }
      }
      out.push(c)
    }
  }
  return out
}

// ─── Agrégation en candidats ────────────────────────────────────────────────

/** Substances à marge thérapeutique étroite : un écart les concernant passe en premier. */
export const MARGE_ETROITE = new Set([
  'warfarine', 'acenocoumarol', 'fluindione', 'lithium', 'digoxine', 'methotrexate', 'ciclosporine',
  'tacrolimus', 'phenytoine', 'carbamazepine', 'acide valproique', 'theophylline', 'gentamicine', 'amikacine',
])

export type Preuve = {
  rcp_id: string
  section: string | null
  page: number | null
  gravite: Gravite
  version_texte: string | null
  contexte: string | null
}

export type Candidat = {
  /** paire non ordonnée : les deux clés triées, séparées par « | » */
  paire_key: string
  substance_a: string
  substance_b: string
  ecart: 'absente' | 'divergence_niveau'
  /** gravité la plus forte citée par les RCP */
  gravite_source: Gravite
  niveau_ansm: Niveau | null
  sens: 'source_plus_grave' | 'source_moins_grave' | null
  via: string[]
  a_hors_thesaurus: boolean
  b_hors_thesaurus: boolean
  /** nombre de RCP distincts qui citent la paire (les génériques d'un même princeps se recopient : indicatif) */
  n_rcp: number
  score: number
  preuves: Preuve[]
}

const BASE_GRAVITE: Record<Gravite, number> = { contre_indiquee: 40, deconseillee: 30, precaution: 20, a_prendre_en_compte: 10, non_precisee: 5 }

/** Ordre de revue : sévérité citée, nombre de RCP, marge étroite, divergence plus sévère ; moins si une substance est hors thésaurus. */
export function scorePriorite(c: Pick<Candidat, 'gravite_source' | 'n_rcp' | 'substance_a' | 'substance_b' | 'sens' | 'a_hors_thesaurus' | 'b_hors_thesaurus'>): number {
  let s = BASE_GRAVITE[c.gravite_source] + Math.min(c.n_rcp, 5) * 2
  if (MARGE_ETROITE.has(cle(c.substance_a)) || MARGE_ETROITE.has(cle(c.substance_b))) s += 10
  if (c.sens === 'source_plus_grave') s += 10
  if (c.a_hors_thesaurus || c.b_hors_thesaurus) s -= 5
  return s
}

export type Bilan = {
  faits: Record<Ecart, number>
  paires: Record<Ecart, number>
  candidats: Candidat[]
}

const ECARTS: Ecart[] = ['couverte_directe', 'couverte_classe', 'divergence_niveau', 'absente', 'non_resolue']
const zero = (): Record<Ecart, number> => ({ couverte_directe: 0, couverte_classe: 0, divergence_niveau: 0, absente: 0, non_resolue: 0 })

export function bilan(constats: Constat[]): Bilan {
  const faits = zero()
  const vus: Record<Ecart, Set<string>> = Object.fromEntries(ECARTS.map(e => [e, new Set<string>()])) as Record<Ecart, Set<string>>
  const parPaire = new Map<string, Candidat>()
  const rcps = new Map<string, Set<string>>()

  for (const c of constats) {
    faits[c.ecart]++
    const key = [cle(c.a), cle(c.b)].sort().join('|')
    vus[c.ecart].add(key)
    if (c.ecart !== 'absente' && c.ecart !== 'divergence_niveau') continue

    const preuve: Preuve = {
      rcp_id: c.fait.rcp_id, section: c.fait.section ?? null, page: c.fait.page ?? null,
      gravite: c.fait.gravite, version_texte: c.fait.version_texte ?? null, contexte: c.fait.contexte ?? null,
    }
    const [sa, sb] = cle(c.a) <= cle(c.b) ? [c.a, c.b] : [c.b, c.a]
    const existant = parPaire.get(key)
    if (!existant) {
      parPaire.set(key, {
        paire_key: key, substance_a: sa, substance_b: sb, ecart: c.ecart, gravite_source: c.fait.gravite,
        niveau_ansm: c.niveau_ansm, sens: c.sens, via: c.via,
        a_hors_thesaurus: cle(c.a) <= cle(c.b) ? c.a_hors_thesaurus : c.b_hors_thesaurus,
        b_hors_thesaurus: cle(c.a) <= cle(c.b) ? c.b_hors_thesaurus : c.a_hors_thesaurus,
        n_rcp: 0, score: 0, preuves: [preuve],
      })
      rcps.set(key, new Set([c.fait.rcp_id]))
    } else {
      existant.preuves.push(preuve)
      rcps.get(key)!.add(c.fait.rcp_id)
      if (GRAVITE_RANG[c.fait.gravite] > GRAVITE_RANG[existant.gravite_source]) {
        existant.gravite_source = c.fait.gravite
        if (existant.ecart === 'divergence_niveau' && existant.niveau_ansm) {
          existant.sens = NIVEAU_RANG[GRAVITE_VERS_NIVEAU[existant.gravite_source as Exclude<Gravite, 'non_precisee'>]] < NIVEAU_RANG[existant.niveau_ansm]
            ? 'source_plus_grave' : existant.sens
        }
      }
      if (c.ecart === 'absente') existant.ecart = 'absente'
    }
  }

  const candidats = [...parPaire.values()].map(c => {
    const n_rcp = rcps.get(c.paire_key)!.size
    const complet = { ...c, n_rcp }
    return { ...complet, score: scorePriorite(complet) }
  }).sort((x, y) => y.score - x.score || x.paire_key.localeCompare(y.paire_key))

  return {
    faits,
    paires: Object.fromEntries(ECARTS.map(e => [e, vus[e].size])) as Record<Ecart, number>,
    candidats,
  }
}
