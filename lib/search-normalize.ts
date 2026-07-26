/**
 * Normalisation de requêtes de recherche : translittération arabe/darija → latin
 * et repli phonétique (fautes de frappe, orthographes populaires).
 *
 * Safe à importer côté client (aucune dépendance serveur).
 *
 * IMPORTANT : foldPhonetic() doit rester strictement équivalent à
 * l'expression SQL construite par phoneticFoldSql() dans lib/queries.ts —
 * les deux côtés (requête utilisateur en JS, colonnes en SQL) doivent
 * produire la même clé pour qu'une comparaison trigram ait un sens.
 */

/** Translittération arabe → latin orientée noms de médicaments francophones.
 *  L'arabe n'écrit pas les voyelles brèves : le résultat est un squelette
 *  consonantique + voyelles longues (ا/و/ي), que foldPhonetic() rapproche
 *  ensuite des noms latins. */
const ARABIC_TO_LATIN: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ٱ': 'a',
  'ب': 'b', 'پ': 'p',
  'ت': 't', 'ث': 't', 'ة': 'a',
  'ج': 'j', 'چ': 'ch',
  'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'd',
  'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'ch', 'ص': 's', 'ض': 'd',
  'ط': 't', 'ظ': 'z',
  'ع': 'a', 'غ': 'gh',
  'ف': 'f', 'ڤ': 'v', 'ڥ': 'v',
  'ق': 'k', 'ك': 'k', 'گ': 'g',
  'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h',
  'و': 'ou', 'ؤ': 'ou',
  'ي': 'i', 'ى': 'a', 'ئ': 'i',
  'ء': '',
}

/** Diacritiques arabes (harakat, tanwin, shadda…) à supprimer avant translittération */
const ARABIC_DIACRITICS = /[ً-ٰٟۖ-ۭ]/g

export function hasArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text)
}

export function transliterateArabic(text: string): string {
  let out = ''
  for (const char of text.replace(ARABIC_DIACRITICS, '')) {
    out += ARABIC_TO_LATIN[char] ?? char
  }
  return out
}

/** Chiffres de l'arabizi (clavier latin utilisé en darija) → équivalents latins */
const ARABIZI: Record<string, string> = {
  '2': 'a', // hamza
  '3': 'a', // ع
  '5': 'kh',
  '7': 'h',
  '9': 'k', // ق
}

function foldArabizi(text: string): string {
  // Ne remplacer un chiffre arabizi que s'il est collé à des lettres
  // (pour ne pas casser les dosages comme "500mg" ou "B12").
  return text.replace(/([a-z])?([23579])/g, (match, before: string | undefined, digit: string, offset: number, full: string) => {
    const nextTwoAreLetters = /^[a-z]{2}/.test(full.slice(offset + match.length))
    if (!before && !nextTwoAreLetters) return match
    return `${before ?? ''}${ARABIZI[digit] ?? digit}`
  })
}

/** Minuscules + suppression des accents + caractères non alphanumériques */
export function normalizeLatin(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Clé phonétique tolérante : rapproche les orthographes populaires,
 * les fautes courantes et les translittérations arabes des noms officiels.
 * Exemples : doliprane / dolipran / دوليبران → "dolibran" ;
 * amoxicilline / amoxiciline / أموكسيسيلين → "amoksisilin".
 */
export function foldPhonetic(text: string): string {
  let s = text.toLowerCase()
  if (hasArabic(s)) s = transliterateArabic(s)
  s = foldArabizi(s)
  s = s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '')
    // digraphes avant substitutions simples
    .replace(/ph/g, 'f')
    .replace(/sh/g, 'ch')
    .replace(/ou/g, 'u')
    .replace(/w/g, 'u')
    .replace(/y/g, 'i')
    .replace(/q/g, 'k')
    // c dur/doux : devant e/i → s, sinon k (amoxicilline → amoksisilin)
    .replace(/c(?=[ei])/g, 's')
    .replace(/c/g, 'k')
    .replace(/x/g, 'ks')
    // l'arabe n'a pas de p : بنادول (banadol) doit matcher panadol
    .replace(/p/g, 'b')
    // lettres doublées (amoxicilline → amoxicilin)
    .replace(/(.)\1+/g, '$1')
    // e muet final
    .replace(/e$/, '')
  return s
}

/** Formes normalisées d'une requête utilisateur, prêtes pour le SQL */
export function buildQueryKeys(rawQuery: string): {
  raw: string
  latin: string
  normalized: string
  phonetic: string
  isArabic: boolean
} {
  const raw = rawQuery.trim()
  const isArabic = hasArabic(raw)
  const latin = isArabic ? transliterateArabic(raw) : raw
  return {
    raw,
    latin,
    normalized: normalizeLatin(latin),
    phonetic: foldPhonetic(raw),
    isArabic,
  }
}
