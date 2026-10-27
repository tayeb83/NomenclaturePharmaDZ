/**
 * DwaDZ — comparateur de deux médicaments (outil à accès limité).
 * Fiche à fiche : mêmes champs que la fiche publique, prix, ATC, et interactions du Thesaurus ANSM
 * entre les deux substances. Les données sont celles de la nomenclature ; rien n'est déduit.
 */
import { getCachedMedicamentById } from './medicament-cache'
import { getPpa } from './ppa'
import { getInteractionsAnsm, getInteractionsEntre, type InteractionsFiche } from './interactions'
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

export type Comparaison = {
  a: FicheComparee
  b: FicheComparee
  meme_dci: boolean
  interactions: InteractionsFiche | null
}

const SOURCES = ['enregistrement', 'retrait', 'non_renouvele'] as const

/** « enregistrement:123 » → référence, ou null. */
export function parseRef(raw: string | null | undefined): RefMedicament | null {
  const m = /^(enregistrement|retrait|non_renouvele):(\d{1,9})$/.exec(raw ?? '')
  if (!m) return null
  const id = Number(m[2])
  return id > 0 && (SOURCES as readonly string[]).includes(m[1]) ? { source: m[1] as RefMedicament['source'], id } : null
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

export async function comparer(refA: RefMedicament, refB: RefMedicament, lang: Lang): Promise<Comparaison | null> {
  const [a, b] = await Promise.all([fiche(refA, lang), fiche(refB, lang)])
  if (!a || !b) return null
  const meme = a.dci.trim().toUpperCase() === b.dci.trim().toUpperCase()
  const retire = (f: FicheComparee) => f.source === 'retrait'
  const interactions = meme || retire(a) || retire(b)
    ? null
    : await getInteractionsEntre(a.dci, b.dci, lang).catch(() => null)
  return { a, b, meme_dci: meme, interactions }
}
