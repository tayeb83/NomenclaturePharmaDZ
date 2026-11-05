'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { CASBAH as C } from '@/lib/garde-ornaments'
import { OffreGraphe } from './OffreGraphe'
import { TEXTES } from './textes'

/** Ce que voit un visiteur sans abonnement actif sur /graphe/explorer. */
export function AccesExplorateur({ connecte }: { connecte: boolean }) {
  const { lang } = useLanguage()
  const t = TEXTES[lang]
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ display: 'grid', gap: 18 }}>
      <p style={{ margin: 0, padding: '12px 16px', borderRadius: 10, background: C.cream, border: `1px solid ${C.creamEdge}` }}>
        {connecte ? t.connecteSansAbo : t.connexionTexte}
      </p>
      {!connecte && (
        <p style={{ margin: 0 }}>
          <Link href="/training/connexion" style={{ fontWeight: 700, color: C.blueDeep }}>{t.connexion} →</Link>
        </p>
      )}
      <OffreGraphe connecte={connecte} ouvrirExplorateur={false} />
      <p style={{ margin: 0 }}><Link href="/graphe" style={{ fontWeight: 700, color: C.blueDeep }}>{t.demos} →</Link></p>
    </div>
  )
}
