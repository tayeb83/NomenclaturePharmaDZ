/**
 * Arabisation des noms de médicaments (DCI et marques) : latin → arabe.
 *
 * Deux niveaux :
 *  1. WORD_OVERRIDES — mots dont l'écriture arabe usuelle est connue et validée
 *     (paracétamol → باراسيتامول, ACIDE → حمض…). Prioritaire, relisible à la main.
 *  2. arabizeWord() — translittération à règles, orientée noms français/latins
 *     (ph→ف, ch→ش, c doux→س, p→ب, o/ou/u→و, i/é→ي, e final muet…).
 *
 * Le résultat des règles est une proposition : l'arabe n'écrit pas de voyelles brèves
 * et plusieurs graphies existent. Toute graphie validée par un terminologue se corrige
 * en ajoutant le mot (en minuscules, sans accents) à WORD_OVERRIDES.
 *
 * Safe côté client (aucune dépendance serveur).
 */

import type { Lang } from './i18n'

/** Graphies arabes validées, indexées par mot latin minuscule sans accents. */
export const WORD_OVERRIDES: Record<string, string> = {
  // Substances très courantes
  paracetamol: 'باراسيتامول',
  ibuprofene: 'إيبوبروفين',
  amoxicilline: 'أموكسيسيلين',
  metformine: 'ميتفورمين',
  omeprazole: 'أوميبرازول',
  diclofenac: 'ديكلوفيناك',
  aspirine: 'أسبرين',
  azithromycine: 'أزيثروميسين',
  ciprofloxacine: 'سيبروفلوكساسين',
  salbutamol: 'سالبوتامول',
  atorvastatine: 'أتورفاستاتين',
  amlodipine: 'أملوديبين',
  levothyroxine: 'ليفوثيروكسين',
  prednisolone: 'بريدنيزولون',
  prednisone: 'بريدنيزون',
  insuline: 'أنسولين',
  furosemide: 'فوروسيميد',
  clopidogrel: 'كلوبيدوغريل',
  ranitidine: 'رانيتيدين',
  cetirizine: 'سيتيريزين',
  loratadine: 'لوراتادين',
  metronidazole: 'ميترونيدازول',
  ceftriaxone: 'سيفترياكسون',
  gentamicine: 'جنتاميسين',
  tramadol: 'ترامادول',
  codeine: 'كوديين',
  caffeine: 'كافيين',
  vitamine: 'فيتامين',
  // Termes de nomenclature
  acide: 'حمض',
  sodique: 'الصوديوم',
  potassique: 'البوتاسيوم',
  calcique: 'الكالسيوم',
  chlorhydrate: 'هيدروكلوريد',
  sulfate: 'سلفات',
  maleate: 'ماليات',
  tartrate: 'طرطرات',
  phosphate: 'فوسفات',
  acetate: 'أسيتات',
  de: '',
  et: 'و',
  en: '',
  association: 'مشاركة',
}

const LETTERS: Record<string, string> = {
  b: 'ب', d: 'د', f: 'ف', h: 'ه', j: 'ج', k: 'ك', l: 'ل', m: 'م', n: 'ن',
  p: 'ب', q: 'ق', r: 'ر', t: 'ت', v: 'ف', w: 'و', z: 'ز',
}

const VOWELS = 'aeiouyàâäéèêëîïôöùûü'
const isVowel = (ch: string | undefined) => !!ch && VOWELS.includes(ch)

function stripAccentsKeepMarks(word: string): string {
  // é/è/ê/ë sont conservés pour distinguer le « e » plein du « e » muet
  return word.replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/ç/g, 'ç')
}

/** Translittère un mot latin isolé (sans espace) en arabe. */
export function arabizeWord(raw: string): string {
  const lower = raw.toLowerCase()
  const key = lower.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  if (key in WORD_OVERRIDES) return WORD_OVERRIDES[key]

  const w = stripAccentsKeepMarks(lower)
  let out = ''
  let i = 0
  const at = (k: number) => w[k]

  while (i < w.length) {
    const c = w[i]
    const rest = w.slice(i)
    const first = i === 0
    const prev = at(i - 1)
    const next = at(i + 1)

    // ── Digrammes et trigrammes ──
    if (rest.startsWith('eau')) { out += 'و'; i += 3; continue }
    if (rest.startsWith('ph')) { out += 'ف'; i += 2; continue }
    if (rest.startsWith('ch')) { out += 'ش'; i += 2; continue }
    if (rest.startsWith('sh')) { out += 'ش'; i += 2; continue }
    if (rest.startsWith('th')) { out += 'ت'; i += 2; continue }
    if (rest.startsWith('ck')) { out += 'ك'; i += 2; continue }
    if (rest.startsWith('qu')) { out += 'ك'; i += 2; continue }
    if (rest.startsWith('gu') && (next === 'u') && 'eiéèêy'.includes(at(i + 2) ?? '-')) { out += 'ج'; i += 2; continue }
    if (rest.startsWith('ou')) { out += 'و'; i += 2; continue }
    if (rest.startsWith('au')) { out += first ? 'أو' : 'و'; i += 2; continue }
    if (rest.startsWith('oi')) { out += 'وا'; i += 2; continue }
    if (rest.startsWith('ai') || rest.startsWith('ei')) { out += 'ي'; i += 2; continue }
    if (rest.startsWith('oe')) { out += 'ي'; i += 2; continue }
    if (rest.startsWith('ss')) { out += 'س'; i += 2; continue }
    if (c === next && !isVowel(c)) { i += 1; continue } // lettre doublée : une seule

    // ── Voyelles ──
    if (c === 'a') { out += first ? 'أ' : 'ا'; i += 1; continue }
    if (c === 'é' || c === 'è' || c === 'ê' || c === 'ë') { out += first ? 'إي' : 'ي'; i += 1; continue }
    if (c === 'e') {
      const last = i === w.length - 1
      if (last && w.length > 2) { i += 1; continue } // e final muet (-ine, -ane, -one…)
      if (i === w.length - 2 && next === 's') { i += 2; continue } // pluriel -es
      out += first ? 'إي' : 'ي'
      i += 1; continue
    }
    if (c === 'i' || c === 'y') { out += first ? 'إي' : 'ي'; i += 1; continue }
    if (c === 'o') { out += first ? 'أو' : 'و'; i += 1; continue }
    if (c === 'u') { out += first ? 'أو' : 'و'; i += 1; continue }

    // ── Consonnes à contexte ──
    if (c === 'c' || c === 'ç') {
      out += (c === 'ç' || (next && 'eiy'.includes(next) || next === 'é' || next === 'è' || next === 'ê')) ? 'س' : 'ك'
      i += 1; continue
    }
    if (c === 'g') { out += 'ج'; i += 1; continue }
    if (c === 's') {
      // s entre deux voyelles = [z] en français (rosuvastatine → روزوفاستاتين)
      out += isVowel(prev) && isVowel(next) ? 'ز' : 'س'
      i += 1; continue
    }
    if (c === 'x') { out += 'كس'; i += 1; continue }
    if (c === 'h') {
      // h muet après voyelle en fin de mot, sinon ه
      if (prev && isVowel(prev) && !next) { i += 1; continue }
      out += 'ه'; i += 1; continue
    }

    if (c in LETTERS) { out += LETTERS[c]; i += 1; continue }

    out += c // chiffres, ponctuation, symboles
    i += 1
  }
  return out
}

/** Unités et sigles de dosage : conservés tels quels. */
const UNITS = new Set(['mg', 'g', 'mcg', 'ug', 'µg', 'ml', 'l', 'ui', 'iu', 'meq', 'mmol', 'cp', 'sb', 'sp', 'gel', 'inj'])

/**
 * Arabise un nom complet (marque ou DCI) : mot à mot, en conservant chiffres,
 * séparateurs et dosages (« DOLIPRANE 500 » → « دوليبران 500 »).
 */
export function arabizeName(name: string | null | undefined): string {
  if (!name) return ''
  const parts = name.split(/([\s,;/+()\-]+)/)
  const converted = parts.map(part => {
    if (!part || /^[\s,;/+()\-]+$/.test(part)) return part
    if (/^\d/.test(part)) return part
    if (UNITS.has(part.toLowerCase())) return part
    if (/^[\p{L}]+$/u.test(part)) return arabizeWord(part)
    // mélange lettres/chiffres (B12, 500MG) : les unités et sigles restent latins
    return part
  })
  return converted.join('').replace(/\s{2,}/g, ' ').replace(/,\s*/g, '، ').trim()
}

/**
 * Libellé d'un nom de médicament selon la langue de l'interface.
 *  - fr : nom d'origine
 *  - ar : nom arabisé, puis le nom d'origine entre parenthèses
 *         (ماكسيبلاز (MAXIPLAZ)) — l'original reste nécessaire pour reconnaître la boîte.
 */
export function displayName(name: string | null | undefined, lang: Lang): string {
  if (!name) return ''
  if (lang !== 'ar') return name
  const ar = arabizeName(name)
  return ar && ar !== name ? `${ar} (${name})` : name
}
