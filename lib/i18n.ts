export type Lang = 'fr' | 'ar'

export function isLang(value: string | undefined | null): value is Lang {
  return value === 'fr' || value === 'ar'
}

export function getDir(lang: Lang): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}

export function pickLang<T>(lang: Lang, values: { fr: T; ar: T }): T {
  return lang === 'ar' ? values.ar : values.fr
}
