/**
 * DwaDZ — title et meta description des fiches médicament.
 *
 * Les requêtes qui amènent sur les fiches sont en lettres latines, courtes
 * (« elerax 25 », « pallada collyre ») : l'internaute veut savoir ce qu'est le
 * médicament, puis son prix. Presque personne ne tape « générique ». Le title
 * commence donc toujours par la dénomination latine (marque, dosage, forme), y
 * compris sur les pages arabes, puis donne la substance active et ce que la
 * fiche contient réellement.
 *
 * Rien n'est promis que la fiche n'affiche : le prix n'est annoncé que si un
 * PPA est saisi, la notice que si un RCP de l'ANPP est rattaché. La nomenclature
 * ne publie aucune indication ; la description donne à la place la classe
 * thérapeutique (ATC), qui est la réponse sourcée à « c'est quoi ».
 */

import type { Lang } from './i18n'
import { formatPpa } from './ppa-format.ts'

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
  return s
    .replace(/(\d)\s*(mg|µg|mcg|g|ml|l)\b/gi, (_, n, u) => `${n} ${u.toLowerCase()}`)
    // « 1MG/ML » : l'unité du dénominateur n'est précédée d'aucun chiffre
    .replace(/\/(mg|µg|mcg|g|ml|l)\b/gi, (_, u) => `/${u.toLowerCase()}`)
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

/** Ce que la fiche affiche en plus de la nomenclature, quand la donnée existe. */
export type SeoExtras = {
  /** PPA en DA, saisi dans l'admin ; null si absent. */
  ppa?: number | null
  /** Libellé de la classe thérapeutique (ATC), dans la langue de la page. */
  classe?: string | null
  /** Un RCP de l'ANPP est rattaché à la fiche. */
  hasRcp?: boolean
}

type AtcLevel = { code: string; niveau: number; label_fr?: string | null; label_en?: string | null; label_ar?: string | null }

/**
 * Classe à annoncer : le sous-groupe pharmacologique (ATC niveau 3, « ANTIHISTAMINIQUES
 * A USAGE SYSTEMIQUE »), à défaut le niveau 4 puis le 2. Une DCI peut porter plusieurs
 * codes ATC : on retient la branche du code de la fiche.
 */
export function pickClasseAtc(hierarchy: AtcLevel[], codeAtc: string | null | undefined, lang: Lang): string | null {
  const code = clean(codeAtc).toUpperCase()
  for (const niveau of [3, 4, 2]) {
    const levels = hierarchy.filter(l => l.niveau === niveau)
    const level = levels.find(l => code && code.startsWith(l.code.toUpperCase())) ?? levels[0]
    const label = clean(level && ((lang === 'ar' && level.label_ar) || level.label_fr || level.label_en))
    if (label) return label
  }
  return null
}

/** Les libellés ATC sont stockés en capitales : en cours de phrase, on les met en minuscules. */
function inSentence(label: string): string {
  if (label === label.toUpperCase()) return label.toLocaleLowerCase('fr')
  // « IEC non associés » : un sigle en tête reste tel quel
  return /^\p{Lu}\p{Ll}/u.test(label) ? label[0].toLocaleLowerCase('fr') + label.slice(1) : label
}

const dciOf = (med: SeoMed) => clean(med.dci).toLocaleLowerCase('fr')

const kindOf = (med: SeoMed) => (med.source === 'retrait' || med.source === 'non_renouvele' ? med.source : 'actif')

// Fiches retirées ou non renouvelées : le statut est l'information qui compte.
const SUFFIXES_INACTIF: Record<Lang, Record<'retrait' | 'non_renouvele', string[]>> = {
  fr: {
    retrait: [' : médicament retiré, alternatives', ' : retiré, alternatives', ' : retiré'],
    non_renouvele: [' : AMM non renouvelée, équivalents', ' : AMM non renouvelée'],
  },
  ar: {
    retrait: [' — دواء مسحوب وبدائله', ' — دواء مسحوب'],
    non_renouvele: [' — AMM غير مجددة وبدائله', ' — AMM غير مجددة'],
  },
}

/**
 * Ce que le title annonce après la dénomination, du plus complet au plus court.
 * « Algérie » y figure : c'est le mot que les internautes ajoutent à leur
 * requête (« adfen 200 mg prix algérie »). Une seule promesse : le prix
 * passe avant la notice, et laisse sa place à la substance active.
 */
function promesses(lang: Lang, x: SeoExtras): string[] {
  const prix = x.ppa != null
  if (lang === 'ar') {
    if (prix) return ['السعر في الجزائر', 'السعر']
    if (x.hasRcp) return ['النشرة في الجزائر', 'النشرة']
    return ['البدائل في الجزائر', 'دواء']
  }
  if (prix) return ['prix en Algérie', 'prix']
  if (x.hasRcp) return ['notice en Algérie', 'notice']
  return ['équivalents en Algérie', 'équivalents']
}

/** « ELERAX 25 mg : hydroxyzine, prix en Algérie » / « ELERAX 25 mg (hydroxyzine) — السعر في الجزائر ». */
function compose(lang: Lang, designation: string, dci: string, promesse: string): string {
  if (lang === 'ar') return `${designation}${dci ? ` (${dci})` : ''} — ${promesse}`
  return `${designation} : ${dci ? `${dci}, ` : ''}${promesse}`
}

export function buildMedicamentTitle(med: SeoMed, lang: Lang, extras: SeoExtras = {}): string {
  const kind = kindOf(med)
  const [full, noForme, marque] = [...designations(med), '', ''] // dédoublonnées : les dernières peuvent manquer

  if (kind !== 'actif') {
    const suffixes = SUFFIXES_INACTIF[lang][kind]
    for (const d of designations(med)) {
      for (const s of suffixes) {
        if (d.length + s.length <= MAX_TITLE) return d + s
      }
    }
    // Dénomination exceptionnellement longue : on la tronque, suffixe minimal.
    const last = suffixes[suffixes.length - 1]
    return truncate(full, MAX_TITLE - last.length) + last
  }

  // La substance active d'abord (c'est elle qui dit ce qu'est le médicament),
  // quitte à laisser tomber la forme ; la promesse la plus complète ensuite.
  const dci = dciOf(med)
  const tails = promesses(lang, extras)
  const candidates: string[] = []
  for (const names of [[full, noForme], [marque]]) {
    for (const tail of tails) {
      for (const withDci of dci ? [dci, ''] : ['']) {
        for (const d of names) if (d) candidates.push(compose(lang, d, withDci, tail))
      }
    }
  }
  const fit = candidates.find(c => c.length <= MAX_TITLE)
  if (fit) return fit
  const last = compose(lang, '', '', tails[tails.length - 1])
  return truncate(full, MAX_TITLE - last.length) + last
}

export function buildMedicamentDescription(med: SeoMed, lang: Lang, extras: SeoExtras = {}): string {
  const labo = clean(med.labo)
  const kind = kindOf(med)
  const ar = lang === 'ar'

  if (kind !== 'actif') {
    const designation = designations(med)[0]
    const dci = clean(med.dci)
    const head = ar
      ? `${designation}${dci ? ` (${dci})` : ''}${labo ? ` — ${labo}` : ''}.`
      : `${designation}${dci ? ` (${dci})` : ''}${labo ? ` — laboratoire ${labo}` : ''}.`
    const tail = {
      fr: {
        retrait: ' Médicament retiré de la nomenclature MIPH : motif, date et alternatives de même DCI.',
        non_renouvele: ' AMM non renouvelée (nomenclature MIPH) : équivalents encore enregistrés en Algérie.',
      },
      ar: {
        retrait: ' دواء مسحوب من التسمية الرسمية MIPH: السبب والتاريخ والبدائل بنفس المادة الفعالة.',
        non_renouvele: ' رخصة التسويق غير مجددة (MIPH): البدائل المسجلة حاليا في الجزائر.',
      },
    }[lang][kind]
    return truncate(head, Math.max(MAX_DESCRIPTION - tail.length, 40)) + tail
  }

  // Ce qu'est le médicament : substance active et classe thérapeutique.
  const dci = dciOf(med)
  const classe = clean(extras.classe) && inSentence(clean(extras.classe))
  const sep = ar ? ': ' : ' : '
  const quoi = (d: string, avecClasse: boolean) =>
    `${d}${dci ? `${sep}${dci}` : ''}${avecClasse && classe ? ` (${classe})` : ''}.`

  const prix = extras.ppa != null
    ? (ar ? ` السعر العمومي (PPA): ${formatPpa(extras.ppa, 'ar')}.` : ` Prix public (PPA) : ${formatPpa(extras.ppa, 'fr')}.`)
    : ''
  const fin = ar ? ' البدائل المسجلة والوضعية في الجزائر (MIPH).' : ' Équivalents et statut en Algérie (nomenclature MIPH).'
  const notice = extras.hasRcp ? (ar ? ' النشرة الرسمية (RCP).' : ' Notice officielle (RCP ANPP).') : ''
  const fabricant = labo ? (ar ? ` مخبر ${labo}.` : ` Laboratoire ${labo}.`) : ''

  // Le prix et la phrase de fin sont toujours gardés ; notice puis laboratoire
  // s'ajoutent s'il reste de la place.
  // Si tout ne tient pas, la forme cède d'abord, puis la classe : la substance
  // active n'est jamais coupée au profit d'une forme à rallonge.
  const names = designations(med)
  const max = MAX_DESCRIPTION - prix.length - fin.length
  const heads = [
    ...names.slice(0, 2).map(d => quoi(d, true)),
    ...names.map(d => quoi(d, false)),
  ]
  const head = heads.find(h => h.length <= max) ?? truncate(quoi(names[0], false), Math.max(max, 40))
  let room = MAX_DESCRIPTION - head.length - prix.length - fin.length
  const extra = [notice, fabricant].filter(part => {
    if (!part || part.length > room) return false
    room -= part.length
    return true
  })
  return head + prix + extra.join('') + fin
}
