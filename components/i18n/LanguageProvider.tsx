'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getDir, isLang, type Lang } from '@/lib/i18n'

type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

// Certaines pages (pharmacie de garde) ont une route arabe dédiée et
// server-rendue pour l'indexation séparée. Pour celles-ci, changer de
// langue doit naviguer vers l'URL correspondante, sinon le contenu SSR
// reste dans l'ancienne langue alors que la nav/le contexte changent.
function arPathFor(pathname: string): string | null {
  if (pathname === '/pharmacie-de-garde') return '/ar/pharmacie-de-garde'
  if (pathname.startsWith('/pharmacie-de-garde/')) return `/ar${pathname}`
  return null
}

function frPathFor(pathname: string): string | null {
  if (pathname === '/ar/pharmacie-de-garde') return '/pharmacie-de-garde'
  if (pathname.startsWith('/ar/pharmacie-de-garde/')) return pathname.slice('/ar'.length)
  return null
}

export function LanguageProvider({ children, initialLang = 'fr' }: { children: React.ReactNode; initialLang?: Lang }) {
  const pathname = usePathname() || '/'
  const router = useRouter()
  // Les URLs /ar/* ont une langue fixée par le chemin (indexation séparée) —
  // le cookie/localStorage du toggle FR/AR ne doit pas l'écraser au montage.
  const routeLang: Lang | null = pathname.startsWith('/ar') ? 'ar' : null
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

  const setLang = useCallback((l: Lang) => {
    const suffix = typeof window !== 'undefined' ? window.location.search : ''
    const target = l === 'ar' ? arPathFor(pathname) : frPathFor(pathname)
    if (target) {
      // La page cible a son propre rendu serveur pour cette langue : on y navigue.
      router.push(`${target}${suffix}`)
      return
    }
    // Pas de route dédiée pour cette page : le toggle est purement côté client.
    if (routeLang) return
    setLangState(l)
  }, [pathname, routeLang, router])

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
