'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { CASBAH as C } from '@/lib/garde-ornaments'
import type { Couche, GraphData } from '@/lib/graphe/core'
import type { CasUsage, Demo } from '@/lib/graphe/demos'
import { GrapheView } from './GrapheView'
import { OffreGraphe } from './OffreGraphe'
import { TEXTES } from './textes'

export function DemoGraphe({ cas, demo, graph, couches }: { cas: CasUsage; demo: Demo; graph: GraphData | null; couches: Couche[] }) {
  const { lang } = useLanguage()
  const t = TEXTES[lang]
  const autres = cas.demos.filter(d => d.id !== demo.id)
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: C.brassDark, margin: 0 }}>{cas.icone} {cas.titre[lang]}</p>
      <h2 style={{ fontSize: 26, margin: '4px 0 6px', color: C.navy }}>{demo.question[lang]}</h2>
      <p style={{ margin: '0 0 16px', color: C.muted, maxWidth: '70ch' }}><b style={{ color: C.ink }}>{t.lecture} · </b>{demo.lecture[lang]}</p>

      {graph ? <GrapheView graph={graph} couchesInitiales={couches} demo /> : <p role="status" style={{ padding: 20, border: `1px dashed ${C.brass}`, borderRadius: 12 }}>{t.indisponible}</p>}
      <p style={{ fontSize: 14, color: C.muted, marginTop: 12 }}>{t.limiteDemo}</p>

      {autres.length > 0 && (
        <>
          <h3 style={{ fontSize: 17, color: C.navy, marginTop: 26 }}>{t.autres}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {autres.map(d => (
              <Link key={d.id} href={`/graphe/demo/${d.id}`} style={{ padding: '8px 14px', borderRadius: 999, border: `1.5px solid ${C.brass}`, background: C.cream, color: C.ink, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>{d.titre[lang]}</Link>
            ))}
          </div>
        </>
      )}
      <div style={{ marginTop: 28 }}><OffreGraphe /></div>
    </div>
  )
}
