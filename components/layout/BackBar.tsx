'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { goBack, internalDepth, parentOf, recordVisit } from '@/lib/nav-history'

const LABELS: Record<string, { fr: string; ar: string }> = {
  '/': { fr: 'l\'accueil', ar: 'الرئيسية' },
  '/recherche': { fr: 'la recherche', ar: 'البحث' },
  '/specialites': { fr: 'les spécialités', ar: 'التخصصات' },
  '/pharmacies': { fr: 'l\'annuaire', ar: 'الدليل' },
  '/pharmacie-de-garde': { fr: 'les pharmacies de garde', ar: 'صيدليات المناوبة' },
  '/classes-therapeutiques': { fr: 'les classes ATC', ar: 'الأصناف العلاجية' },
  '/laboratoires': { fr: 'les laboratoires', ar: 'المخابر' },
  '/training': { fr: 'le Training', ar: 'التدريب' },
  '/articles': { fr: 'les articles', ar: 'المقالات' },
  '/outils': { fr: 'les outils', ar: 'الأدوات' },
  '/medicaments': { fr: 'le catalogue', ar: 'الفهرس' },
  '/alertes': { fr: 'les alertes', ar: 'التنبيهات' },
}

/**
 * Barre « Retour » sur toutes les pages sauf l'accueil. Suit l'historique
 * interne du site (voir lib/nav-history.ts) : un visiteur arrivé depuis Google ou
 * Facebook revient à la page parente plutôt que de quitter DwaDZ.
 */
export function BackBar() {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const { lang } = useLanguage()
  const [depth, setDepth] = useState(0)

  useEffect(() => {
    recordVisit(pathname + window.location.search)
    setDepth(internalDepth())
  }, [pathname])

  if (pathname === '/' || pathname === '/ar' || pathname.startsWith('/admin')) return null

  const parent = parentOf(pathname)
  const target = LABELS[parent]
  const word = lang === 'ar' ? 'رجوع' : 'Retour'
  const hint = depth > 0 ? '' : target ? (lang === 'ar' ? ` إلى ${target.ar}` : ` vers ${target.fr}`) : ''

  return (
    <div className="back-bar">
      <div className="container">
        <button type="button" className="back-bar-btn" onClick={() => goBack(router, pathname)}>
          <span aria-hidden="true">{lang === 'ar' ? '→' : '←'}</span>
          {word}{hint}
        </button>
      </div>
    </div>
  )
}
