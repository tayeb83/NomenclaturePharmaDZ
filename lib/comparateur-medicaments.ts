/**
 * DwaDZ — comparateur (outil à accès limité). Chaque côté est un nom de marque OU une substance.
 * Marque contre marque : fiche à fiche (champs de la fiche publique, prix, ATC). Dans tous les cas, interactions du
 * Thesaurus ANSM entre les deux, avec le détail pédagogique : quelle substance de chaque médicament est en jeu et
 * si le rapprochement passe par une classe. Les données sont celles de la nomenclature ; rien n'est déduit.
 */
import { getCachedMedicamentById } from './medicament-cache'
import { query, queryOne } from './db'
import { getPpa } from './ppa'
import {
  chercherTitresThesaurus, getComposants, getInteractionsAnsm, getInteractionsEntre, getPartenairesAnsm,
  type Composant, type InteractionsFiche, type PartenairesFiche,
} from './interactions'
import { foldNom } from './rcp-match'
import type { Lang } from './i18n'

export type RefMedicament = { source: 'enregistrement' | 'retrait' | 'non_renouvele'; id: number }

export type FicheComparee = {
  source: RefMedicament['source']
  id: number
  nom_marque: string
  dci: string
  forme: string | null
  dosage: string | null
  conditionnement: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  statut: string | null
  liste: string | null
  prescription: string | null
  code_atc: string | null
  atc_label: string | null
  date_init: string | null
  date_final: string | null
  ppa: number | null
  /** nombre d'interactions du thésaurus pour la substance, tous partenaires confondus */
  nb_interactions: number | null
}

/** Un côté de la comparaison : un nom de marque (fiche complète) ou une substance seule. */
export type CoteComparaison = {
  type: 'marque' | 'substance'
  /** nom de marque, ou substance telle qu'écrite */
  libelle: string
  dci: string
  /** substances de la DCI et leur rapprochement avec le thésaurus */
  composants: Composant[]
  fiche: FicheComparee | null
  /** nombre de médicaments de la nomenclature qui contiennent cette DCI (substance seulement) */
  nb_medicaments: number | null
}

export type Comparaison = {
  a: CoteComparaison
  b: CoteComparaison
  meme_dci: boolean
  /** un des deux médicaments est retiré : les interactions ne sont pas recherchées */
  retrait: boolean
  interactions: InteractionsFiche | null
}

export type RefCote = { type: 'marque'; ref: RefMedicament } | { type: 'substance'; dci: string }

const SOURCES = ['enregistrement', 'retrait', 'non_renouvele'] as const

/** « enregistrement:123 » → référence, ou null. */
export function parseRef(raw: string | null | undefined): RefMedicament | null {
  const m = /^(enregistrement|retrait|non_renouvele):(\d{1,9})$/.exec(raw ?? '')
  if (!m) return null
  const id = Number(m[2])
  return id > 0 && (SOURCES as readonly string[]).includes(m[1]) ? { source: m[1] as RefMedicament['source'], id } : null
}

/** « dci:AMIODARONE » → substance, ou null. Majuscules, espaces simples, 2 à 120 caractères sans caractère de contrôle. */
export function parseSubstance(raw: string | null | undefined): string | null {
  const m = /^dci:([\s\S]+)$/.exec(raw ?? '')
  if (!m) return null
  const dci = m[1].replace(/\s+/g, ' ').trim().toUpperCase()
  return dci.length >= 2 && dci.length <= 120 && !/[\u0000-\u001f\u007f]/.test(dci) ? dci : null
}

/** « enregistrement:12 » (marque) ou « dci:AMIODARONE » (substance). */
export function parseCote(raw: string | null | undefined): RefCote | null {
  const ref = parseRef(raw)
  if (ref) return { type: 'marque', ref }
  const dci = parseSubstance(raw)
  return dci ? { type: 'substance', dci } : null
}

async function fiche(ref: RefMedicament, lang: Lang): Promise<FicheComparee | null> {
  const med = await getCachedMedicamentById(ref.source, ref.id)
  if (!med) return null
  const [ppa, inter] = await Promise.all([
    getPpa(med.n_enreg, med.code).catch(() => null),
    med.source === 'retrait' ? Promise.resolve(null) : getInteractionsAnsm(med.dci, lang).catch(() => null),
  ])
  return {
    source: med.source, id: med.id, nom_marque: med.nom_marque, dci: med.dci, forme: med.forme, dosage: med.dosage,
    conditionnement: med.conditionnement, labo: med.labo, pays: med.pays, type_prod: med.type_prod, statut: med.statut,
    liste: med.liste, prescription: med.prescription, code_atc: med.code_atc,
    atc_label: (lang === 'ar' ? null : med.atc_label_fr) ?? med.atc_label_en ?? null,
    date_init: med.date_init, date_final: med.date_final, ppa,
    nb_interactions: inter ? inter.items.length : null,
  }
}

async function nbMedicamentsDeDci(dci: string): Promise<number> {
  const row = await queryOne<{ n: string }>(
    `SELECT COUNT(*)::TEXT AS n FROM enregistrements WHERE UPPER(REGEXP_REPLACE(TRIM(dci), '\\s+', ' ', 'g')) = $1`, [dci]
  ).catch(() => null)
  return Number(row?.n ?? 0)
}

async function cote(ref: RefCote, lang: Lang): Promise<CoteComparaison | null> {
  if (ref.type === 'marque') {
    const f = await fiche(ref.ref, lang)
    if (!f) return null
    return { type: 'marque', libelle: f.nom_marque, dci: f.dci, composants: await getComposants(f.dci).catch(() => []), fiche: f, nb_medicaments: null }
  }
  const [composants, n] = await Promise.all([getComposants(ref.dci).catch(() => [] as Composant[]), nbMedicamentsDeDci(ref.dci)])
  // ni dans la nomenclature ni dans le thésaurus : saisie inventée, on ne compare pas
  if (n === 0 && !composants.some(c => c.titre || c.classes.length > 0)) return null
  return { type: 'substance', libelle: ref.dci, dci: ref.dci, composants, fiche: null, nb_medicaments: n }
}

const sameDci = (x: string, y: string) => x.replace(/\s+/g, ' ').trim().toUpperCase() === y.replace(/\s+/g, ' ').trim().toUpperCase()

export async function comparer(refA: RefCote, refB: RefCote, lang: Lang): Promise<Comparaison | null> {
  const [a, b] = await Promise.all([cote(refA, lang), cote(refB, lang)])
  if (!a || !b) return null
  const meme = sameDci(a.dci, b.dci)
  const retire = (c: CoteComparaison) => c.fiche?.source === 'retrait'
  const retrait = retire(a) || retire(b)
  const interactions = meme || retrait
    ? null
    : await getInteractionsEntre(a.dci, b.dci, lang).catch(() => null)
  return { a, b, meme_dci: meme, retrait, interactions }
}

export type SubstanceTrouvee = {
  dci: string
  /** nombre de médicaments de la nomenclature ; 0 pour un titre du thésaurus absent de la nomenclature */
  n: number
  /** titre du thésaurus qui désigne une classe (ex. ANTICOAGULANTS ORAUX) */
  classe: boolean
}

const escapeLike = (v: string) => v.replace(/[\\%_]/g, m => `\\${m}`)

/** Substances de la nomenclature (DCI) puis titres du thésaurus dont le nom contient la saisie. */
export async function chercherSubstances(saisie: string): Promise<SubstanceTrouvee[]> {
  const q = saisie.replace(/\s+/g, ' ').trim().slice(0, 60)
  if (q.length < 2) return []
  const plie = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const [nomenclature, thesaurus] = await Promise.all([
    query<{ dci: string; n: string }>(
      `SELECT UPPER(REGEXP_REPLACE(TRIM(dci), '\\s+', ' ', 'g')) AS dci, COUNT(*)::TEXT AS n
         FROM enregistrements
        WHERE dci IS NOT NULL AND unaccent(lower(dci)) LIKE '%' || $1 || '%'
        GROUP BY 1
        ORDER BY (unaccent(lower(MIN(dci))) LIKE $1 || '%') DESC, COUNT(*) DESC, 1
        LIMIT 8`,
      [escapeLike(plie)]
    ).catch(() => []),
    chercherTitresThesaurus(q, 6).catch(() => []),
  ])
  const vus = new Set<string>()
  const out: SubstanceTrouvee[] = []
  for (const r of nomenclature) {
    vus.add(foldNom(r.dci))
    out.push({ dci: r.dci, n: Number(r.n), classe: false })
  }
  for (const t of thesaurus) {
    const k = foldNom(t.nom)
    if (vus.has(k)) { const e = out.find(x => foldNom(x.dci) === k); if (e) e.classe = t.classe; continue }
    vus.add(k)
    out.push({ dci: t.nom, n: 0, classe: t.classe })
  }
  return out.slice(0, 12)
}

export type PartenairesResultat = PartenairesFiche & { cote: Pick<CoteComparaison, 'type' | 'libelle' | 'dci'> }

/** Tous les partenaires d'interaction d'un côté (marque ou substance), pour proposer l'autre côté. */
export async function partenaires(ref: RefCote, lang: Lang): Promise<PartenairesResultat | null> {
  let libelle: string
  let dci: string
  if (ref.type === 'marque') {
    const med = await getCachedMedicamentById(ref.ref.source, ref.ref.id)
    if (!med) return null
    libelle = med.nom_marque
    dci = med.dci
    if (med.source === 'retrait') return { cote: { type: 'marque', libelle, dci }, composants: [], partenaires: [], version: null }
  } else {
    libelle = dci = ref.dci
  }
  return { cote: { type: ref.type, libelle, dci }, ...(await getPartenairesAnsm(dci, lang)) }
}
