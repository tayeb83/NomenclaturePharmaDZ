/**
 * Types et libellés des monographies, sans dépendance serveur : importable
 * depuis les composants client (le formulaire d'administration).
 */

import type { Lang } from './i18n'

export const MONOGRAPHIE_SECTIONS = [
  'mecanisme',
  'indications',
  'posologie',
  'contre_indications',
  'effets_indesirables',
  'grossesse_allaitement',
  'interactions',
] as const
export type MonographieSection = (typeof MONOGRAPHIE_SECTIONS)[number]

export const SECTION_LABELS: Record<MonographieSection, Record<Lang, string>> = {
  mecanisme: { fr: 'Mécanisme d\'action', ar: 'آلية العمل' },
  indications: { fr: 'Indications', ar: 'دواعي الاستعمال' },
  posologie: { fr: 'Posologie usuelle', ar: 'الجرعة المعتادة' },
  contre_indications: { fr: 'Contre-indications', ar: 'موانع الاستعمال' },
  effets_indesirables: { fr: 'Effets indésirables', ar: 'الآثار الجانبية' },
  grossesse_allaitement: { fr: 'Grossesse et allaitement', ar: 'الحمل والرضاعة' },
  interactions: { fr: 'Interactions médicamenteuses', ar: 'التداخلات الدوائية' },
}

export type Monographie = {
  dci: string
  lang: Lang
  status: 'brouillon' | 'publie'
  mecanisme: string | null
  indications: string | null
  posologie: string | null
  contre_indications: string | null
  effets_indesirables: string | null
  grossesse_allaitement: string | null
  interactions: string | null
  sources: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  updated_at: string | null
}

export type MonographieListRow = {
  dci: string
  nb_fiches: number
  fr: 'publie' | 'brouillon' | null
  ar: 'publie' | 'brouillon' | null
}

