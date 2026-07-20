'use client'

import { useMemo, useState } from 'react'
import type { WilayaHubEntry } from '@/lib/garde'
import { slugify } from '@/lib/slug'
import type { Lang } from '@/lib/i18n'

const LABELS = {
  fr: {
    search: 'Rechercher une wilaya…',
    available: 'Programme disponible',
    soon: 'Bientôt disponible',
    counter: (n: number, total: number) => `${n} / ${total} wilayas couvertes`,
    viewPharmacies: 'Voir les pharmacies de garde →',
    communesLabel: (n: number) => `${n} commune${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`,
    noResults: 'Aucune wilaya ne correspond à votre recherche.',
  },
  ar: {
    search: 'ابحث عن ولاية…',
    available: 'البرنامج متوفر',
    soon: 'قريبًا',
    counter: (n: number, total: number) => `${n} / ${total} ولاية مغطاة`,
    viewPharmacies: '← عرض صيدليات الحراسة',
    communesLabel: (n: number) => `${n} بلدية متوفرة`,
    noResults: 'لا توجد ولاية مطابقة لبحثك.',
  },
}

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export function GardeWilayaGrid({ wilayas, lang, basePath }: { wilayas: WilayaHubEntry[]; lang: Lang; basePath: string }) {
  const t = LABELS[lang]
  const [search, setSearch] = useState('')
  const coveredCount = useMemo(() => wilayas.filter(w => w.covered).length, [wilayas])

  const query = normalize(search.trim())
  const isVisible = (w: WilayaHubEntry) =>
    !query || normalize(w.name_fr).includes(query) || normalize(w.name_ar).includes(query) || w.code.includes(query)

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 18 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.search}
          style={{
            flex: '1 1 240px', maxWidth: 340, background: '#fff', border: '1px solid var(--slate-200)',
            borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--navy)',
          }}
        />
        <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--slate-500)', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--green, #16a34a)', display: 'inline-block' }} />
            {t.available}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--slate-300, #cbd5e1)', display: 'inline-block' }} />
            {t.soon}
          </span>
          <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{t.counter(coveredCount, wilayas.length)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {wilayas.map(w => {
          const hidden = !isVisible(w)
          const soleCommune = w.communes.length === 1 ? w.communes[0] : null
          const cardStyle: React.CSSProperties = {
            display: hidden ? 'none' : 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '16px 18px',
            borderRadius: 12,
            border: w.covered ? '1px solid var(--slate-200)' : '1px dashed var(--slate-200)',
            background: w.covered ? '#fff' : 'var(--slate-50)',
            boxShadow: w.covered ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            opacity: w.covered ? 1 : 0.65,
            textDecoration: 'none',
          }

          const header = (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5, fontWeight: 700,
                color: w.covered ? 'var(--blue)' : 'var(--slate-400)',
                background: w.covered ? 'rgba(37,99,235,0.1)' : 'var(--slate-100, #f1f5f9)',
                borderRadius: 6, padding: '2px 7px', flexShrink: 0,
              }}>
                {w.code}
              </span>
              <div style={{ minWidth: 0 }}>
                <div dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} style={{ fontWeight: 700, fontSize: 15, color: w.covered ? 'var(--navy)' : 'var(--slate-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lang === 'ar' ? (w.name_ar || w.name_fr) : w.name_fr}
                </div>
                {w.name_ar && (
                  <div dir={lang === 'ar' ? 'ltr' : 'rtl'} lang={lang === 'ar' ? 'fr' : 'ar'} style={{ fontSize: 12.5, color: 'var(--slate-400)' }}>
                    {lang === 'ar' ? w.name_fr : w.name_ar}
                  </div>
                )}
              </div>
              <span style={{
                marginInlineStart: 'auto', width: 8, height: 8, borderRadius: 999, flexShrink: 0,
                background: w.covered ? 'var(--green, #16a34a)' : 'var(--slate-300, #cbd5e1)',
              }} />
            </div>
          )

          if (!w.covered) {
            return (
              <div key={w.code} id={w.slug} style={cardStyle}>
                {header}
                <div style={{ fontSize: 12.5, color: 'var(--slate-400)', fontStyle: 'italic' }}>{t.soon}</div>
              </div>
            )
          }

          if (soleCommune) {
            return (
              <a key={w.code} id={w.slug} href={`${basePath}/${w.slug}/${slugify(soleCommune.commune_name_fr)}`} style={cardStyle}>
                {header}
                <div style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>{t.viewPharmacies}</div>
              </a>
            )
          }

          return (
            <div key={w.code} id={w.slug} style={cardStyle}>
              {header}
              <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{t.communesLabel(w.communes.length)}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {w.communes.map(c => (
                  <a
                    key={c.commune_code}
                    href={`${basePath}/${w.slug}/${slugify(c.commune_name_fr)}`}
                    style={{
                      fontSize: 12.5, fontWeight: 600, color: 'var(--slate-700)', textDecoration: 'none',
                      background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 999,
                      padding: '4px 10px',
                    }}
                  >
                    {lang === 'ar' ? (c.commune_name_ar || c.commune_name_fr) : c.commune_name_fr}
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {query && wilayas.every(w => !isVisible(w)) && (
        <div className="alert-banner info" style={{ marginTop: 16 }}>{t.noResults}</div>
      )}
    </div>
  )
}
