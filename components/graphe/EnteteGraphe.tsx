'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { TEXTES } from './textes'

export function EnteteGraphe({ titre, retour = true }: { titre?: { fr: string; ar: string }; retour?: boolean }) {
  const { lang } = useLanguage()
  const t = TEXTES[lang]
  return (
    <div className="page-header" style={{ background: 'linear-gradient(135deg, #12233f, #173f82)' }}>
      <div className="container">
        {retour && <Link href="/graphe" style={{ color: 'rgba(255,255,255,.8)', fontSize: 13 }}>{t.retour}</Link>}
        <h1>🕸️ {titre ? titre[lang] : t.titre}</h1>
      </div>
    </div>
  )
}
