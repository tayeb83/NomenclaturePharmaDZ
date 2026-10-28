'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'

/** En-tête de la page du comparateur, dans la langue choisie (la page elle-même est rendue côté serveur). */
export function EnteteComparateur() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  return (
    <div className="page-header" style={{ background: 'linear-gradient(135deg, #12233f, #173f82)' }}>
      <div className="container">
        <Link href="/outils" style={{ color: 'rgba(255,255,255,.8)', fontSize: 13 }}>{ar ? 'الأدوات →' : '← Outils'}</Link>
        <h1>⚖️ {ar ? 'مقارنة بين دواءين' : 'Comparateur de deux médicaments'}</h1>
      </div>
    </div>
  )
}
