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
  // Toute route /ar/* est le miroir d'une route FR : /ar/xxx → /xxx.
  if (pathname === '/ar') return '/'
  if (pathname.startsWith('/ar/')) return pathname.slice('/ar'.length) || '/'
  return null
}

// Persiste le choix EXPLICITE de l'utilisateur : cookie (pour le SSR du
// layout) + localStorage (repli côté client). Écrit immédiatement dans
// setLang — et non dans un useEffect — pour que la langue survive à la
// navigation qui suit le clic (sinon on « reste sur l'ancienne langue »).
function persistLang(lang: Lang) {
  try {
    window.localStorage.setItem('lang', lang)
  } catch {
    // localStorage indisponible (navigation privée) : le cookie suffit
  }
  document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`
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
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    if (l === lang && !((l === 'fr' && routeLang) || (l === 'ar' && arPathFor(pathname)))) return

    // Choix explicite de l'utilisateur : persisté tout de suite pour que
    // toutes les pages suivantes (SSR comme client) restent dans sa langue.
    persistLang(l)
    // Mise à jour immédiate de l'UI (nav, contenu client) — le switch doit
    // répondre instantanément, même si une navigation suit.
    setLangState(l)

    // Si la page a un rendu serveur dédié dans la langue cible, on y navigue.
    const target = l === 'ar' ? arPathFor(pathname) : frPathFor(pathname)
    if (target) {
      const suffix = typeof window !== 'undefined' ? window.location.search : ''
      router.push(`${target}${suffix}`)
    }
  }, [lang, pathname, routeLang, router])

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
