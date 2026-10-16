/**
 * DwaDZ — title et meta description des fiches médicament.
 *
 * Les requêtes qui amènent sur les fiches sont en lettres latines, courtes
 * (« elerax 25 », « pallada collyre ») et cherchent une notice, une indication
 * ou un générique. Le title commence donc toujours par la dénomination latine
 * (marque, dosage, forme), y compris sur les pages arabes, puis annonce ce que
 * la fiche apporte réellement. Aucun prix n'est promis : la base n'en contient
 * pas, et un title qui ne tient pas sa promesse est réécrit par Google.
 */

import type { Lang } from './i18n'

// Le gabarit du layout racine ajoute « | DwaDZ » (8 caractères) ; au-delà de
// ~60 caractères au total Google tronque le title.
const MAX_TITLE = 52
const MAX_DESCRIPTION = 158

type SeoMed = {
  nom_marque: string
  dci?: string | null
  dosage?: string | null
  forme?: string | null
  labo?: string | null
  source?: string | null
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).replace(/[\s,;:—-]+\S*$/, '').trimEnd() + '…'
}

/**
 * « 200MG » → « 200 mg » : les internautes tapent « adfen 200 mg » (avec
 * espace), alors que la nomenclature stocke « 200MG ». Google rapproche mal
 * les deux graphies, d'où un dosage normalisé dans title et description.
 */
function normalizeDosage(s: string): string {
  return s.replace(/(\d)\s*(mg|µg|mcg|g|ml|l)\b/gi, (_, n, u) => `${n} ${u.toLowerCase()}`)
}

/** Marque + dosage + forme, du plus complet au plus court. */
function designations(med: SeoMed): string[] {
  const marque = clean(med.nom_marque)
  const dosage = normalizeDosage(clean(med.dosage))
  const forme = clean(med.forme).toLowerCase()
  const full = [marque, dosage, forme].filter(Boolean).join(' ')
  const noForme = [marque, dosage].filter(Boolean).join(' ')
  return Array.from(new Set([full, noForme, marque]))
}

/** Désignation complète normalisée (marque + dosage + forme), pour le H1. */
export function medicamentDesignation(med: SeoMed): string {
  return designations(med)[0]
}

const SUFFIXES: Record<Lang, Record<'actif' | 'retrait' | 'non_renouvele', string[]>> = {
  fr: {
    // « Algérie » en tête de suffixe : c'est le mot que les internautes
    // ajoutent à leur requête (« adfen 200 mg comprimé algérie »).
    actif: [' Algérie : notice, générique', ' en Algérie : notice', ' Algérie : notice', ' : notice'],
    retrait: [' : médicament retiré, alternatives', ' : retiré, alternatives', ' : retiré'],
    non_renouvele: [' : AMM non renouvelée, équivalents', ' : AMM non renouvelée'],
  },
  ar: {
    actif: [' — النشرة والبدائل في الجزائر', ' — النشرة والبدائل', ' — دواء'],
    retrait: [' — دواء مسحوب وبدائله', ' — دواء مسحوب'],
    non_renouvele: [' — AMM غير مجددة وبدائله', ' — AMM غير مجددة'],
  },
}

export function buildMedicamentTitle(med: SeoMed, lang: Lang): string {
  const kind = med.source === 'retrait' || med.source === 'non_renouvele' ? med.source : 'actif'
  const suffixes = SUFFIXES[lang][kind]
  for (const d of designations(med)) {
    for (const s of suffixes) {
      if (d.length + s.length <= MAX_TITLE) return d + s
    }
  }
  // Dénomination exceptionnellement longue : on la tronque, suffixe minimal.
  const last = suffixes[suffixes.length - 1]
  return truncate(designations(med)[0], MAX_TITLE - last.length) + last
}

export function buildMedicamentDescription(med: SeoMed, lang: Lang): string {
  const designation = designations(med)[0]
  const dci = clean(med.dci)
  const labo = clean(med.labo)
  const kind = med.source === 'retrait' || med.source === 'non_renouvele' ? med.source : 'actif'

  const head =
    lang === 'ar'
      ? `${designation}${dci ? ` (${dci})` : ''}${labo ? ` — ${labo}` : ''}.`
      : `${designation}${dci ? ` (${dci})` : ''}${labo ? ` — laboratoire ${labo}` : ''}.`

  const tail = {
    fr: {
      actif: ' Notice, indications, générique et équivalents enregistrés en Algérie (nomenclature MIPH).',
      retrait: ' Médicament retiré de la nomenclature MIPH : motif, date et alternatives de même DCI.',
      non_renouvele: ' AMM non renouvelée (nomenclature MIPH) : équivalents encore enregistrés en Algérie.',
    },
    ar: {
      actif: ' النشرة والمعلومات والبدائل الجنيسة المسجلة في الجزائر (التسمية الرسمية MIPH).',
      retrait: ' دواء مسحوب من التسمية الرسمية MIPH: السبب والتاريخ والبدائل بنفس المادة الفعالة.',
      non_renouvele: ' رخصة التسويق غير مجددة (MIPH): البدائل المسجلة حاليا في الجزائر.',
    },
  }[lang][kind]

  const room = MAX_DESCRIPTION - tail.length
  return truncate(head, Math.max(room, 40)) + tail
}
