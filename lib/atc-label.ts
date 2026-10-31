import type { Lang } from './i18n'

type AtcLabels = { label_fr?: string | null; label_en?: string | null; label_ar?: string | null }

/** Libellé ATC selon la langue : arabe si traduit, sinon français, sinon anglais. */
export function atcLabel(l: AtcLabels | null | undefined, lang: Lang): string {
  if (!l) return ''
  if (lang === 'ar' && l.label_ar?.trim()) return l.label_ar.trim()
  return l.label_fr || l.label_en || ''
}
