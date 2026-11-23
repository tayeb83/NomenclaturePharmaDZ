/**
 * Classements tirés de la nomenclature pour les articles de données (partie pure, sans base) :
 *   - bloc `top-labos`      : les laboratoires les plus présents, et la part fabriquée en Algérie ;
 *   - bloc `dci-generiques` : les substances qui ont le plus de génériques, et celles qui n'en ont aucun.
 * Les chiffres ne sont jamais écrits dans les articles : ils sont calculés à l'affichage
 * (lib/nomenclature-stats.ts, components/articles/*Block.tsx).
 *   npm run test:articles
 */

export type LaboClassement = {
  labo: string
  slug: string
  presentations: number
  substances: number
  fabriquees: number
  /** pays les plus fréquents de ses présentations, du plus au moins fréquent */
  pays: string[]
}

export type TopLabos = {
  labos: LaboClassement[]
  /** toutes les présentations de la nomenclature, et tous les laboratoires */
  totalPresentations: number
  totalLabos: number
}

export type SubstanceGeneriques = {
  /** code ATC de substance quand la DCI y est rattachée, sinon null (regroupement sur la DCI écrite) */
  codeAtc: string | null
  libelleFr: string
  libelleAr: string | null
  /** une DCI telle qu'écrite dans la nomenclature, pour le lien de recherche */
  dci: string
  presentations: number
  generiques: number
  laboratoiresGeneriques: number
  biologiques: number
}

export type ClassementGeneriques = {
  substances: SubstanceGeneriques[]
  /** nombre de substances qui répondent au critère (avant la limite d'affichage) */
  total: number
}

export type ModeGeneriques = 'plus' | 'aucun'

/** Pourcentage arrondi à l'unité ; 0 si le total est nul. */
export function pourcentage(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

/** Nombre au format du pays : espace fine insécable pour les milliers en français, chiffres occidentaux en arabe aussi. */
export function nombre(n: number, lang: 'fr' | 'ar'): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'fr-DZ' : 'fr-FR').format(n)
}

/** Limite d'affichage d'un classement : entier entre 1 et 50, 20 par défaut. */
export function limiteClassement(v: unknown, defaut = 20): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : defaut
  return Math.min(50, Math.max(1, n))
}

/** Le pays tel qu'écrit dans la nomenclature, sans les variantes de casse ni d'espaces. */
export function normaliserPays(p: string | null | undefined): string {
  return (p ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
}
