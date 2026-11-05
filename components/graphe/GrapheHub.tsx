'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { CASBAH as C } from '@/lib/garde-ornaments'
import { CAS_USAGE } from '@/lib/graphe/demos'
import { OffreGraphe } from './OffreGraphe'
import { TEXTES } from './textes'

export function GrapheHub() {
  const { lang } = useLanguage()
  const t = TEXTES[lang]
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <p style={{ fontSize: 18, maxWidth: '62ch', color: C.ink, marginTop: 0 }}>{t.accroche}</p>
      <h2 style={{ fontSize: 22, color: C.navy, marginBottom: 4 }}>{t.demos}</h2>
      <p style={{ marginTop: 0, color: C.muted }}>{t.demosTexte}</p>
      <div style={{ display: 'grid', gap: 18 }}>
        {CAS_USAGE.map(c => (
          <section key={c.id} style={{ border: `1px solid ${C.creamEdge}`, borderRadius: 14, padding: '16px 18px', background: '#fffdf6' }}>
            <h3 style={{ margin: 0, fontSize: 18, color: C.navy }}>{c.icone} {c.titre[lang]}</h3>
            <p style={{ margin: '4px 0 12px', color: C.muted }}>{c.resume[lang]}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
              {c.demos.map(d => (
                <Link key={d.id} href={`/graphe/demo/${d.id}`} style={{ display: 'block', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.brass}`, background: 'white', color: C.ink, textDecoration: 'none' }}>
                  <b style={{ display: 'block' }}>{d.titre[lang]}</b>
                  <span style={{ fontSize: 13.5, color: C.muted }}>{d.question[lang]}</span>
                  <span style={{ display: 'block', marginTop: 6, fontSize: 13, fontWeight: 700, color: C.blueDeep }}>{t.ouvrir} →</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div style={{ marginTop: 28 }}><OffreGraphe /></div>
    </div>
  )
}
