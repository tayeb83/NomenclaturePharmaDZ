'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getDir, isLang, type Lang } from '@/lib/i18n'

type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children, initialLang = 'fr' }: { children: React.ReactNode; initialLang?: Lang }) {
  const pathname = usePathname()
  // Les URLs /ar/* ont une langue fixée par le chemin (indexation séparée) —
  // le cookie/localStorage du toggle FR/AR ne doit ni les écraser au montage
  // ni pouvoir être changé tant qu'on y est.
  const routeLang: Lang | null = pathname?.startsWith('/ar') ? 'ar' : null
  const [lang, setLangState] = useState<Lang>(routeLang || initialLang)

  useEffect(() => {
    if (routeLang) { setLangState(routeLang); return }
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('lang') : null
    if (isLang(saved)) setLangState(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeLang])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = getDir(lang)
    if (!routeLang) {
      window.localStorage.setItem('lang', lang)
      document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`
    }
  }, [lang, routeLang])

  const setLang = (l: Lang) => { if (!routeLang) setLangState(l) }

  const value = useMemo(() => ({ lang, setLang }), [lang, routeLang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
