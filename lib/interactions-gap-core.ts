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
 *   non_resolue        le partenaire n'a pas pu être identifié (nom hors nomenclature et hors thésaurus) :
 *                      jamais compté comme absent — un rapprochement douteux ne produit aucun candidat.
 *   ignoree            écartée à la main dans data/ansm/alias_partenaires.json (artefact d'extraction, hors sujet).
 *
 * Les noms que les RCP et le thésaurus écrivent différemment (« Bêta-bloquants » ↔ « BÊTA-BLOQUANTS (SAUF ESMOLOL) »,
 * un code ATC de classe) passent par la table data/ansm/alias_partenaires.json, relue par un pharmacien.
 */

import {
  NIVEAU_RANG, classeDuPartenaire, cle, composantsDeDci,
  type Composant, type Niveau, type ThesaurusIndex,
} from './interactions-core.ts'
import { foldNom } from './rcp-match.ts'

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

export type Ecart = 'couverte_directe' | 'couverte_classe' | 'divergence_niveau' | 'absente' | 'non_resolue' | 'ignoree'

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
  /** le partenaire est une classe (titre de classe du thésaurus, ou alias vers plusieurs titres) */
  b_est_classe: boolean
  /** motif de l'écart, pour `ignoree` */
  note: string | null
}

/** Correspondance relue d'un nom cité par un RCP : vers un ou plusieurs titres du thésaurus, ou à ignorer. */
export type Alias = { vers: string[] } | { ignorer: string }
export type TableAlias = {
  /** libellé du RCP (sans « les », « autres »…) → titres du thésaurus */
  alias: Record<string, Alias>
  /** code ATC de classe (cible_type 'classe') → titres du thésaurus */
  atc: Record<string, string[]>
}

export type GapContext = {
  index: ThesaurusIndex
  /** clé du titre → lignes écrites sous ce titre */
  parSubstance: Map<string, LigneAnsm[]>
  aliases: Map<string, Alias>
  atc: Map<string, string[]>
  /** tous les titres du thésaurus (substances et classes) */
  titres: string[]
  /** cleAlias(titre) → titre : un nom de RCP identique à un titre du thésaurus, malgré parenthèses, articles ou pluriel */
  titreParCle: Map<string, string>
}

/**
 * Clé de comparaison d'un nom de classe ou de substance : sans accents, articles et « autres », pluriel ramené au singulier,
 * « susceptibles de provoquer / d'induire / donnant des torsades » ramenés à la formule du thésaurus.
 * « Les bêta-bloquants », « Un bêta-bloquant » et « Bêta-bloquants » donnent la même clé.
 */
export const cleAlias = (s: string): string => {
  let f = foldNom(s)
  for (let i = 0; i < 4; i++) f = f.replace(/^(?:les|des|autres?|aux|la|le|l|du|de la|de l|d|un|une|certains|certaines)\s+/, '')
  f = f.replace(/\b(?:susceptibles?|capables?) (?:de|d) (?:provoquer|induire|donner|causer)\b/g, 'susceptibles de donner')
    .replace(/\bdonnant\b/g, 'susceptibles de donner')
  return f.split(' ').map(t => (t.length > 3 && /[sx]$/.test(t) ? t.slice(0, -1) : t)).join(' ')
}

/**
 * Les RCP copient les lignes du thésaurus, souvent coupées en fin de ligne ou suivies d'exemples :
 * « Corticoïdes (gluco-, minéralo-) (voie générale) (sauf hydrocortisone en traitement », « Indinavir : ».
 * Formes à essayer, de la plus complète à la plus nue : ponctuation finale et parenthèse ouverte retirées, puis sans parenthèses
 * ni exemples (« tels que… », « [ … »).
 */
export function variantesLibelle(libelle: string): string[] {
  let v = libelle.replace(/\s+/g, ' ').trim().replace(/^[\s[(]+/, '')
  v = v.replace(/[\s:;,.]+$/, '')
  // parenthèse restée ouverte (ligne coupée) : on garde ce qui la précède ; parenthèse fermante orpheline : retirée
  let depth = 0
  let coupe = -1
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '(') { if (depth === 0) coupe = i; depth++ } else if (v[i] === ')') { if (depth > 0) depth--; else v = v.slice(0, i) + v.slice(i + 1), i-- }
  }
  if (depth > 0) v = v.slice(0, coupe)
  v = v.replace(/[\s:;,.]+$/, '').trim()
  let sans = v
  while (/\([^()]*\)/.test(sans)) sans = sans.replace(/\([^()]*\)/g, ' ')
  const nu = sans.split(/\s+(?:tels?\s+qu|y\s+compris|notamment|utilis[ée]e?s?\s)|\s*\[/i)[0].replace(/\s+/g, ' ').replace(/[\s:;,.]+$/, '').trim()
  return [...new Set([v, nu].filter(Boolean))]
}

export function buildGapContext(index: ThesaurusIndex, lignes: LigneAnsm[], table?: TableAlias): GapContext {
  const parSubstance = new Map<string, LigneAnsm[]>()
  for (const l of lignes) {
    const k = cle(l.substance)
    parSubstance.set(k, [...(parSubstance.get(k) ?? []), l])
  }
  const aliases = new Map(Object.entries(table?.alias ?? {}).map(([k, v]) => [cleAlias(k), v]))
  const atc = new Map(Object.entries(table?.atc ?? {}))
  const titres = [...new Set([...index.titres.exact.values()].flat().map(x => x.dci))]
  const titreParCle = new Map(titres.map(t => [cleAlias(t), t]))
  return { index, parSubstance, aliases, atc, titres, titreParCle }
}

const titreEstClasse = (ctx: GapContext, titre: string | null): boolean => !!titre && ctx.index.membresDe.has(cle(titre))

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

type Partenaire =
  | { composants: Composant[]; estClasse: boolean; libre?: boolean }
  | { ignorer: string }
  | null

/** Composant correspondant à des titres du thésaurus : un titre seul se comporte comme une substance, plusieurs comme une classe. */
function composantDepuisTitres(nom: string, titres: string[]): Composant {
  return titres.length === 1 ? { nom, titre: titres[0], classes: [] } : { nom, titre: null, classes: titres }
}

const GENERIQUE = /(^| )(medicament|substance|produit|traitement|agent|derive|inhibiteur|antagoniste|agoniste|inducteur|antidiabetique|anti|enzyme|transporteur|autre)/

/** Un nom court qui ressemble à une substance (« Glitazones », « Phénylbutazone ») : candidat hors thésaurus, jamais lié à rien. */
const nomLibre = (ctx: GapContext, v: string): boolean => {
  const f = foldNom(v)
  // s'il ressemble à un titre du thésaurus, c'est un alias à écrire, pas une substance absente
  return f.length >= 4 && f.split(' ').length <= 3 && !/\d/.test(f) && !GENERIQUE.test(f) && diagnostiquer(ctx, v).cause === 'inconnu'
}

/** Un nom isolé : table d'alias relue, titre du thésaurus, puis nomenclature. */
function resoudreNom(ctx: GapContext, nom: string): Partenaire {
  const k = cleAlias(nom)
  const alias = ctx.aliases.get(k)
  if (alias && 'ignorer' in alias) return { ignorer: alias.ignorer }
  if (alias) return { composants: [composantDepuisTitres(nom, alias.vers)], estClasse: alias.vers.length > 1 || titreEstClasse(ctx, alias.vers[0]) }
  const titre = ctx.titreParCle.get(k)
  if (titre) return { composants: [composantDepuisTitres(nom, [titre])], estClasse: titreEstClasse(ctx, titre) }
  const composants = composantsDeDci(ctx.index, nom)
  if (composants.some(p => !!p.titre || p.classes.length > 0)) {
    return { composants, estClasse: composants.length === 1 && titreEstClasse(ctx, composants[0].titre) }
  }
  return null
}

/** Le nom, ses formes nettoyées, puis — pour « A, B, C : » ou « A et B » — chacun de ses éléments. */
function resoudreListe(ctx: GapContext, libelle: string): { libelle: string; partenaire: Partenaire }[] {
  const formes = variantesLibelle(libelle)
  for (const f of formes) {
    const r = resoudreNom(ctx, f)
    if (r) return [{ libelle: f, partenaire: r }]
  }
  const nu = formes[formes.length - 1] ?? libelle
  if (ARTEFACT.test(foldNom(nu))) return [{ libelle: nu, partenaire: null }] // phrase, pas une liste de substances
  for (const separateur of [/\s*,\s*|\s*;\s*/, /\s+et\s+/]) {
    const parts = nu.split(separateur).map(x => x.trim()).filter(Boolean)
    if (parts.length < 2) continue
    const elements = parts.flatMap(x => {
      for (const f of variantesLibelle(x)) { const r = resoudreNom(ctx, f); if (r) return [{ libelle: f, partenaire: r }] }
      return [{ libelle: x, partenaire: nomLibre(ctx, x) ? ({ composants: [{ nom: x, titre: null, classes: [] }], estClasse: false, libre: true } as Partenaire) : null }]
    })
    // « A et B » : on ne coupe que si chaque moitié est reconnue (« Héparines de bas poids moléculaire et apparentés » reste entier)
    if (separateur.source.includes('et') && elements.some(e => !e.partenaire || ('libre' in e.partenaire && e.partenaire.libre))) continue
    return elements
  }
  return [{ libelle: nu, partenaire: nomLibre(ctx, nu) ? { composants: [{ nom: nu, titre: null, classes: [] }], estClasse: false, libre: true } : null }]
}

/** Qui est le partenaire cité par le RCP : alias relu, code ATC de classe, nomenclature, puis le nom lui-même (nettoyé, éventuellement en liste). */
function resoudrePartenaires(ctx: GapContext, fait: FaitRcp): { libelle: string; partenaire: Partenaire }[] {
  const alias = ctx.aliases.get(cleAlias(fait.libelle)) ?? (fait.cible ? ctx.aliases.get(cleAlias(fait.cible)) : undefined)
  if (alias && 'ignorer' in alias) return [{ libelle: fait.libelle, partenaire: { ignorer: alias.ignorer } }]
  if (alias) return [{ libelle: fait.libelle, partenaire: { composants: [composantDepuisTitres(fait.libelle, alias.vers)], estClasse: alias.vers.length > 1 || titreEstClasse(ctx, alias.vers[0]) } }]
  if (fait.cible_type === 'classe') {
    const titres = (fait.cible && ctx.atc.get(fait.cible)) || null
    return [{ libelle: fait.libelle, partenaire: titres?.length ? { composants: [composantDepuisTitres(fait.libelle, titres)], estClasse: true } : null }]
  }
  if (fait.cible_type === 'dci' && fait.cible) {
    // la nomenclature a reconnu la substance à l'import : on s'y fie
    return [{ libelle: fait.libelle, partenaire: { composants: composantsDeDci(ctx.index, fait.cible), estClasse: false } }]
  }
  return resoudreListe(ctx, fait.libelle)
}

/** Compare un fait RCP au thésaurus : un constat par couple (substance de la fiche, substance du partenaire). */
export function comparerFait(ctx: GapContext, fait: FaitRcp): Constat[] {
  const base = { fait, niveau_ansm: null, via: [], sens: null, a_hors_thesaurus: false, b_hors_thesaurus: false, b_est_classe: false, note: null }
  const source = composantsDeDci(ctx.index, fait.dci)
  const out: Constat[] = []
  for (const { libelle, partenaire } of resoudrePartenaires(ctx, fait)) {
    if (!partenaire) {
      for (const a of source) out.push({ ...base, via: [] as string[], a: a.nom, b: libelle, ecart: 'non_resolue' })
      continue
    }
    if ('ignorer' in partenaire) {
      for (const a of source) out.push({ ...base, via: [] as string[], a: a.nom, b: libelle, ecart: 'ignoree', note: partenaire.ignorer })
      continue
    }
    for (const a of source) {
      for (const b of partenaire.composants) {
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
          sens: null, a_hors_thesaurus: horsThesaurus(a), b_hors_thesaurus: horsThesaurus(b) && !partenaire.estClasse,
          b_est_classe: partenaire.estClasse, note: null,
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
  }
  return out
}

// ─── Diagnostic des partenaires non résolus ─────────────────────────────────

export type Diagnostic = {
  cause: 'artefact_extraction' | 'proche_titre' | 'inconnu'
  /** titres du thésaurus qui ressemblent au libellé, du plus proche au moins proche */
  suggestions: string[]
}

const MOTS_VIDES = new Set(['medicaments', 'medicament', 'substances', 'substance', 'autres', 'avec', 'dans', 'pour', 'susceptibles', 'donner', 'effet', 'type', 'voie', 'sauf'])
const ARTEFACT = /^(voir|cf\b|du fait|dans|association|il\b|en cas|ce\b|cette\b|l utilisation|toute|pour|sauf|et\b|ou\b|de\b)|\b4 \d\b|\bcontre indiqu/

/**
 * Pourquoi un partenaire reste non résolu, et ce qui y ressemble dans le thésaurus. Ne résout rien :
 * un rapprochement douteux ne produit aucun candidat. Sert à remplir data/ansm/alias_partenaires.json.
 */
export function diagnostiquer(ctx: GapContext, libelle: string): Diagnostic {
  const nu = variantesLibelle(libelle).slice(-1)[0] ?? libelle
  const f = foldNom(nu)
  if (f.length > 80 || f.split(' ').length > 9 || ARTEFACT.test(f)) return { cause: 'artefact_extraction', suggestions: [] }
  const mots = f.split(' ').filter(m => m.length >= 4 && !MOTS_VIDES.has(m))
  if (mots.length === 0) return { cause: 'inconnu', suggestions: [] }
  const scores = ctx.titres.map(t => {
    const tm = foldNom(t).split(' ').filter(m => m.length >= 4)
    const communs = mots.filter(m => tm.some(x => x === m || (m.length >= 7 && x.length >= 7 && x.slice(0, 7) === m.slice(0, 7))))
    return { t, score: communs.length / mots.length - tm.length * 0.01 }
  }).filter(x => x.score >= 0.5).sort((a, b) => b.score - a.score || a.t.localeCompare(b.t))
  return scores.length
    ? { cause: 'proche_titre', suggestions: scores.slice(0, 3).map(x => x.t) }
    : { cause: 'inconnu', suggestions: [] }
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
  /** `substance_b` est une classe : l'interaction se crée alors dans un seul sens (substance + CLASSE) */
  b_est_classe: boolean
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

const ECARTS: Ecart[] = ['couverte_directe', 'couverte_classe', 'divergence_niveau', 'absente', 'non_resolue', 'ignoree']
const zero = (): Record<Ecart, number> => ({ couverte_directe: 0, couverte_classe: 0, divergence_niveau: 0, absente: 0, non_resolue: 0, ignoree: 0 })

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
    // une classe passe toujours en second (substance + CLASSE) ; sinon ordre alphabétique
    const inverse = !c.b_est_classe && cle(c.a) > cle(c.b)
    const [sa, sb] = inverse ? [c.b, c.a] : [c.a, c.b]
    const existant = parPaire.get(key)
    if (!existant) {
      parPaire.set(key, {
        paire_key: key, substance_a: sa, substance_b: sb, ecart: c.ecart, gravite_source: c.fait.gravite,
        niveau_ansm: c.niveau_ansm, sens: c.sens, via: c.via,
        a_hors_thesaurus: inverse ? c.b_hors_thesaurus : c.a_hors_thesaurus,
        b_hors_thesaurus: inverse ? c.a_hors_thesaurus : c.b_hors_thesaurus,
        b_est_classe: c.b_est_classe,
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
