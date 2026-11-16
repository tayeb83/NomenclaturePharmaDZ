'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { TEXTES } from './textes'

export function EnteteGraphe({ titre, retour = true }: { titre?: { fr: string; ar: string }; retour?: boolean }) {
  const { lang } = useLanguage()
  const t = TEXTES[lang]
  return (
    <div className="page-header">
      <div className="container">
        {retour && <Link href="/graphe" style={{ color: 'var(--slate-600)', fontSize: 13 }}>{t.retour}</Link>}
        <h1>🕸️ {titre ? titre[lang] : t.titre}</h1>
      </div>
    </div>
  )
}
