/**
 * DwaDZ — accès aux interactions du Thesaurus ANSM pour une fiche
 * (voir lib/interactions-core.ts et sql/29_interactions_ansm.sql).
 * Table absente (sql/29 non appliqué) ou aucune interaction pour la DCI : la fiche
 * n'affiche simplement pas le bloc.
 */

import { unstable_cache } from 'next/cache'
import { query, queryOne } from './db'
import type { Lang } from './i18n'
import { loadMatchIndex, type MatchIndex } from './rcp-core'
import { resolveCible } from './rcp-match'
import {
  buildThesaurusIndex, cle, composantsDeDci, fusionnerSens, interactionsVisantDetail, membresDeClasse, NIVEAU_RANG, resoudreDci,
  substancesDeDci, substancesVisees, toItem, trierItems,
  type ClasseLien, type Composant, type InteractionItem, type InteractionRow, type Niveau, type ThesaurusIndex,
} from './interactions-core'

export * from './interactions-core'

export const INTERACTIONS_TAG = 'interactions-ansm'

/** Au-delà, la liste des membres d'une classe est tronquée à l'affichage. */
const MEMBRES_MAX = 60

export type InteractionPartenaire = {
  /** DCI de la nomenclature DwaDZ quand le partenaire y est retrouvé (page /dci/…) */
  dci: string | null
  /** faux quand la nomenclature a été consultée et ne contient pas la substance ; null si inconnu ou si c'est une classe */
  en_nomenclature: boolean | null
  /** membres connus d'une classe partenaire, avec leur DCI de la nomenclature quand ils y figurent */
  membres: { nom: string; dci: string | null }[]
  membres_total: number
}

export type InteractionsFiche = {
  items: InteractionItem[]
  /** informations sur chaque partenaire, par id d'interaction */
  partenaires: Record<number, InteractionPartenaire>
  /** titres du thésaurus correspondant aux substances de la fiche */
  substances: string[]
  /** classes de ces substances dont les interactions s'ajoutent */
  classes: string[]
  version: string
  /** vrai si au moins un texte s'affiche en français sur une page arabe */
  repli_fr: boolean
  /** noms arabes des substances et classes citées (titre du thésaurus → arabe), pour la page arabe */
  noms_ar: Record<string, string>
}

let tableExists: boolean | undefined
async function hasTables(): Promise<boolean> {
  if (tableExists) return true
  const row = await queryOne<{ exists: boolean }>(
    `SELECT to_regclass('public.interactions_ansm') IS NOT NULL AND to_regclass('public.interactions_ansm_classes') IS NOT NULL AS "exists"`
  )
  tableExists = row?.exists ?? false
  return tableExists
}

// Les index sont reconstruits au plus une fois par heure et par instance.
let thesaurusMemo: { at: number; index: ThesaurusIndex } | undefined
async function getThesaurusIndex(): Promise<ThesaurusIndex> {
  if (thesaurusMemo && Date.now() - thesaurusMemo.at < 3_600_000) return thesaurusMemo.index
  const [titres, liens] = await Promise.all([
    query<{ substance: string }>(`SELECT DISTINCT substance FROM interactions_ansm`),
    query<ClasseLien>(`SELECT DISTINCT classe, membre FROM interactions_ansm_classes`),
  ])
  const index = buildThesaurusIndex(titres.map(t => t.substance), liens)
  thesaurusMemo = { at: Date.now(), index }
  return index
}

// Noms arabes déjà traduits pour les partenaires : ils servent aussi quand ces mêmes noms apparaissent comme titres.
let nomsArMemo: { at: number; noms: Map<string, string> } | undefined
async function getNomsAr(): Promise<Map<string, string>> {
  if (nomsArMemo && Date.now() - nomsArMemo.at < 3_600_000) return nomsArMemo.noms
  const rows = await query<{ partenaire: string; partenaire_ar: string }>(
    `SELECT DISTINCT partenaire, partenaire_ar FROM interactions_ansm WHERE partenaire_ar IS NOT NULL`
  )
  nomsArMemo = { at: Date.now(), noms: new Map(rows.map(r => [r.partenaire, r.partenaire_ar])) }
  return nomsArMemo.noms
}

let nomenclatureMemo: { at: number; index: MatchIndex } | undefined
async function getNomenclatureIndex(): Promise<MatchIndex> {
  if (nomenclatureMemo && Date.now() - nomenclatureMemo.at < 3_600_000) return nomenclatureMemo.index
  const index = await loadMatchIndex(query)
  nomenclatureMemo = { at: Date.now(), index }
  return index
}

async function fetchInteractionsFiche(dci: string, lang: Lang): Promise<InteractionsFiche | null> {
  if (!(await hasTables())) return null
  const t = await getThesaurusIndex()
  const { titres, classes } = resoudreDci(t, dci)
  if (titres.length + classes.length === 0) return null

  const rows = await query<InteractionRow>(
    `SELECT id, substance, partenaire, partenaire_est_classe, niveau, niveaux, risque_fr, conduite_fr,
            risque_ar, conduite_ar, partenaire_ar, ar_statut, page, source_version
     FROM interactions_ansm WHERE substance = ANY($1::text[])`,
    [[...titres, ...classes]]
  )
  if (rows.length === 0) return null

  const directs = new Set(titres)
  const items = trierItems(rows.map(r => toItem({ ...r, page: Number(r.page) }, lang, directs)))

  // un lien vers la page /dci n'est proposé que si la nomenclature DwaDZ contient la substance
  const nomenclature = await getNomenclatureIndex().catch(() => null)
  const dciDe = (libelle: string): string | null =>
    (nomenclature && resolveCible(nomenclature, { libelle, cible_type: null, cible: null }).dci) || null
  const parClasse = new Map<string, InteractionPartenaire>() // les cartes d'une même classe la partagent
  const partenaires: Record<number, InteractionPartenaire> = {}
  for (const it of items) {
    // `partenaire` peut être la traduction arabe : l'index du thésaurus raisonne sur le nom d'origine
    const nom = it.partenaire_origine ?? it.partenaire
    if (it.partenaire_est_classe) {
      let p = parClasse.get(nom)
      if (!p) {
        const membres = membresDeClasse(t, nom)
        p = {
          dci: null, en_nomenclature: null, membres_total: membres.length,
          membres: membres.slice(0, MEMBRES_MAX).map(m => ({ nom: m, dci: dciDe(m) })),
        }
        parClasse.set(nom, p)
      }
      partenaires[it.id] = p
    } else {
      const dci = dciDe(nom)
      partenaires[it.id] = { dci, en_nomenclature: nomenclature ? !!dci : null, membres: [], membres_total: 0 }
    }
  }

  const nomsAr: Record<string, string> = {}
  if (lang === 'ar') {
    const noms = await getNomsAr().catch(() => new Map<string, string>())
    for (const n of [...titres, ...classes, ...items.map(i => i.via_classe).filter((x): x is string => !!x)]) {
      const ar = noms.get(n)
      if (ar) nomsAr[n] = ar
    }
  }

  return {
    items,
    partenaires,
    substances: titres,
    classes,
    version: rows[0].source_version,
    repli_fr: lang === 'ar' && items.some(i => i.langue === 'fr'),
    noms_ar: nomsAr,
  }
}

/** Interactions du thésaurus pour la DCI d'une fiche, dans la langue demandée (repli français), ou null. */
export function getInteractionsAnsm(dci: string | null, lang: Lang): Promise<InteractionsFiche | null> {
  const key = (dci ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
  if (!key) return Promise.resolve(null)
  return unstable_cache(
    () => fetchInteractionsFiche(key, lang),
    ['interactions-ansm', 'v2', key, lang],
    { revalidate: 86_400, tags: [INTERACTIONS_TAG] }
  )()
}

const cleDci = (dci: string | null) => (dci ?? '').replace(/\s+/g, ' ').trim().toUpperCase()

async function fetchInteractionsEntre(dciA: string, dciB: string, lang: Lang): Promise<InteractionsFiche | null> {
  const [a, b] = await Promise.all([getInteractionsAnsm(dciA, lang), getInteractionsAnsm(dciB, lang)])
  if (!a && !b) return null
  const t = await getThesaurusIndex()
  const compA = composantsDeDci(t, dciA)
  const compB = composantsDeDci(t, dciB)
  const resA = resoudreDci(t, dciA)
  const resB = resoudreDci(t, dciB)
  const items = fusionnerSens(
    a ? interactionsVisantDetail(t, a.items, compA, compB, 'a') : [],
    b ? interactionsVisantDetail(t, b.items, compB, compA, 'b') : [],
  )
  const partenaires: Record<number, InteractionPartenaire> = {}
  for (const it of items) {
    const p = a?.partenaires[it.id] ?? b?.partenaires[it.id]
    if (p) partenaires[it.id] = p
  }
  return {
    items,
    partenaires,
    substances: [...new Set([...resA.titres, ...resB.titres])],
    classes: [...new Set([...resA.classes, ...resB.classes])],
    version: (a ?? b)!.version,
    repli_fr: items.some(i => i.langue === 'fr') && lang === 'ar',
    noms_ar: { ...(b?.noms_ar ?? {}), ...(a?.noms_ar ?? {}) },
  }
}

/**
 * Interactions du thésaurus entre deux médicaments (par leur DCI), dans les deux sens.
 * null : thésaurus indisponible ou aucune des deux substances n'y figure. Un tableau `items` vide
 * veut dire « le thésaurus ne signale rien entre ces deux substances ».
 */
export function getInteractionsEntre(dciA: string | null, dciB: string | null, lang: Lang): Promise<InteractionsFiche | null> {
  const a = cleDci(dciA)
  const b = cleDci(dciB)
  if (!a || !b || a === b) return Promise.resolve(null)
  return unstable_cache(
    () => fetchInteractionsEntre(a, b, lang),
    ['interactions-ansm-entre', 'v2', a, b, lang],
    { revalidate: 86_400, tags: [INTERACTIONS_TAG] }
  )()
}

/**
 * Substances d'une DCI et ce que le thésaurus en connaît (titre, classes). Sans la base du thésaurus,
 * les substances sont listées sans titre : le comparateur dit alors qu'il ne peut pas conclure.
 */
export async function getComposants(dci: string | null): Promise<Composant[]> {
  const key = cleDci(dci)
  if (!key) return []
  if (!(await hasTables().catch(() => false))) return substancesDeDci(key).map(nom => ({ nom, titre: null, classes: [] }))
  return composantsDeDci(await getThesaurusIndex(), key)
}

export type PartenaireSuggere = {
  nom: string
  /** nom français d'origine, quand `nom` est la traduction arabe */
  nom_origine: string | null
  est_classe: boolean
  /** gravité la plus forte parmi les lignes qui visent ce partenaire */
  niveau: Niveau
  niveaux: Niveau[]
  /** substances du médicament choisi concernées */
  via: string[]
  via_classe: string | null
  /** extrait du risque, pour comprendre d'un coup d'œil */
  risque: string
  langue: Lang
  dci: string | null
  en_nomenclature: boolean | null
  membres: { nom: string; dci: string | null }[]
  membres_total: number
  lignes: number
}

export type PartenairesFiche = {
  composants: Composant[]
  partenaires: PartenaireSuggere[]
  version: string | null
}

async function fetchPartenaires(dci: string, lang: Lang): Promise<PartenairesFiche> {
  const [fiche, composants] = await Promise.all([getInteractionsAnsm(dci, lang), getComposants(dci)])
  if (!fiche) return { composants, partenaires: [], version: null }
  const groupes = new Map<string, PartenaireSuggere>()
  for (const it of fiche.items) {
    const nom = it.partenaire_origine ?? it.partenaire
    const k = `${it.partenaire_est_classe ? 'c' : 's'}:${cle(nom)}`
    const via = substancesVisees(composants, it.substance, !!it.via_classe)
    const p = fiche.partenaires[it.id]
    const g = groupes.get(k)
    if (!g) {
      groupes.set(k, {
        nom: it.partenaire, nom_origine: it.partenaire_origine, est_classe: it.partenaire_est_classe,
        niveau: it.niveau, niveaux: [it.niveau], via, via_classe: it.via_classe, risque: it.risque, langue: it.langue,
        dci: p?.dci ?? null, en_nomenclature: p?.en_nomenclature ?? null, membres: p?.membres ?? [], membres_total: p?.membres_total ?? 0, lignes: 1,
      })
      continue
    }
    g.lignes++
    g.via = [...new Set([...g.via, ...via])]
    if (!g.niveaux.includes(it.niveau)) g.niveaux.push(it.niveau)
    // les items arrivent triés par gravité : le premier est le plus grave, on le garde
    if (NIVEAU_RANG[it.niveau] < NIVEAU_RANG[g.niveau]) Object.assign(g, { niveau: it.niveau, risque: it.risque, langue: it.langue })
  }
  const partenaires = [...groupes.values()]
    .sort((x, y) => NIVEAU_RANG[x.niveau] - NIVEAU_RANG[y.niveau] || x.nom.localeCompare(y.nom, lang === 'ar' ? 'ar' : 'fr'))
  return { composants, partenaires, version: fiche.version }
}

/** Tous les partenaires d'interaction d'un médicament (par sa DCI), regroupés par partenaire. */
export function getPartenairesAnsm(dci: string | null, lang: Lang): Promise<PartenairesFiche> {
  const key = cleDci(dci)
  if (!key) return Promise.resolve({ composants: [], partenaires: [], version: null })
  return unstable_cache(
    () => fetchPartenaires(key, lang),
    ['interactions-ansm-partenaires', 'v1', key, lang],
    { revalidate: 86_400, tags: [INTERACTIONS_TAG] }
  )()
}

/** Titres du thésaurus (substances ou classes) dont le nom contient la saisie. */
export async function chercherTitresThesaurus(saisie: string, limite = 8): Promise<{ nom: string; classe: boolean }[]> {
  const k = cle(saisie)
  if (k.length < 2 || !(await hasTables().catch(() => false))) return []
  const rows = await query<{ nom: string; classe: boolean }>(
    `SELECT DISTINCT i.substance AS nom,
            EXISTS (SELECT 1 FROM interactions_ansm_classes c WHERE c.classe_key = i.substance_key) AS classe
       FROM interactions_ansm i
      WHERE i.substance_key LIKE '%' || $1 || '%'
      ORDER BY (i.substance_key LIKE $1 || '%') DESC, i.substance
      LIMIT ${Math.max(1, Math.min(20, limite))}`,
    [k.replace(/[\\%_]/g, m => `\\${m}`)]
  )
  return rows
}
