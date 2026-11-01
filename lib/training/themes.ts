/**
 * Dzair-Pharma Training — types de questions regroupés par thème.
 * Sert au choix d'un thème au démarrage d'une série et à la page « Méthode ».
 * Module pur (aucun import).
 */
export const THEMES = {
  nomenclature: ['dci_from_brand', 'reference_generique', 'forme_dosage', 'labo_pays'],
  interactions: ['interaction_niveau', 'interaction_contre_indication'],
  comparaison: ['compare_specialites', 'substitution'],
  codage: ['atc_classe', 'atc_code', 'atc_inverse'],
  retraits: ['retrait_motif', 'retrait_identification'],
} as const

export type Theme = keyof typeof THEMES
export const THEME_KEYS = Object.keys(THEMES) as Theme[]
export const ALL_TYPES: string[] = THEME_KEYS.flatMap(k => [...THEMES[k]])

export function themeOf(type: string): Theme | null {
  return THEME_KEYS.find(k => (THEMES[k] as readonly string[]).includes(type)) ?? null
}

/** Types d'un thème, ou undefined (= tous) si le thème est inconnu ou « all ». */
export function typesForTheme(theme: string): string[] | undefined {
  return (THEMES as Record<string, readonly string[]>)[theme]?.slice()
}
