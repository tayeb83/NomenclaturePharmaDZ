'use client'

import { useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import type { MarketComparatorData } from '@/lib/queries'

// ─── Types helpers ────────────────────────────────────────────
const TYPE_LABELS_FR: Record<string, string> = {
  GE: 'Génériques', 'Gé': 'Génériques',
  RE: 'Réf. étrangères', 'Ré': 'Réf. étrangères',
  BIO: 'Biologiques',
  I: 'Innovateurs',
}
const TYPE_LABELS_AR: Record<string, string> = {
  GE: 'جنيسة', 'Gé': 'جنيسة',
  RE: 'مرجعية أجنبية', 'Ré': 'مرجعية أجنبية',
  BIO: 'بيولوجية',
  I: 'مبتكرة',
}
const TYPE_COLORS: Record<string, string> = {
  GE: '#0284c7', 'Gé': '#0284c7',
  RE: '#7c3aed', 'Ré': '#7c3aed',
  BIO: '#059669',
  I: '#ea580c',
}

// ─── Sub-components ───────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function HBar({
  label, value, max, color = '#0284c7', subLabel,
}: {
  label: string; value: number; max: number; color?: string; subLabel?: string
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
        <span style={{ flex: 1, paddingRight: 8, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ color, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</span>
      </div>
      {subLabel && (
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 3 }}>{subLabel}</div>
      )}
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, width: `${pct}%`, borderRadius: 4, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ─── Section 1 – Local vs Importé ────────────────────────────

function LocalImporteSection({ data, lang }: { data: MarketComparatorData['localImporte']; lang: string }) {
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr
  const total = data.local + data.importe + data.inconnu
  const localPct = total > 0 ? Math.round((data.local / total) * 100) : 0
  const importePct = total > 0 ? Math.round((data.importe / total) * 100) : 0

  return (
    <SectionCard title={`🇩🇿 ${t('Local vs Importé', 'محلي vs مستورد')}`}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <StatPill label={t('Fabrication locale', 'تصنيع محلي')} value={data.local} color="#059669" />
        <div style={{ width: 1, background: '#e2e8f0', flexShrink: 0 }} />
        <StatPill label={t('Importé', 'مستورد')} value={data.importe} color="#7c3aed" />
        {data.inconnu > 0 && (
          <>
            <div style={{ width: 1, background: '#e2e8f0', flexShrink: 0 }} />
            <StatPill label={t('Non renseigné', 'غير محدد')} value={data.inconnu} color="#475569" />
          </>
        )}
      </div>

      {/* Split bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', height: 24, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
          <div style={{ flex: data.local, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {localPct >= 10 && <span style={{ fontSize: 11, color: 'white', fontWeight: 700 }}>{localPct}%</span>}
          </div>
          <div style={{ flex: data.importe, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {importePct >= 10 && <span style={{ fontSize: 11, color: 'white', fontWeight: 700 }}>{importePct}%</span>}
          </div>
          {data.inconnu > 0 && <div style={{ flex: data.inconnu, background: '#cbd5e1' }} />}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#64748b' }}>
          <span>🟢 {t('Local', 'محلي')} {localPct}%</span>
          <span>🟣 {t('Importé', 'مستورد')} {importePct}%</span>
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Section 2 – Référence vs Générique ──────────────────────

function TypeBreakdownSection({ data, lang }: { data: MarketComparatorData['typeBreakdown']; lang: string }) {
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr
  const typeLabels = lang === 'ar' ? TYPE_LABELS_AR : TYPE_LABELS_FR
  const total = data.reduce((s, r) => s + r.nb, 0)
  const maxNb = data[0]?.nb ?? 1

  return (
    <SectionCard title={`💊 ${t('Référence vs Générique', 'مرجعي vs جنيسة')}`}>
      <div style={{ marginBottom: 12, fontSize: 12, color: '#64748b' }}>
        {t('Total enregistrements analysés :', 'إجمالي التسجيلات المحللة :')} <strong>{total.toLocaleString()}</strong>
      </div>
      {data.map(row => {
        const label = typeLabels[row.type_prod] || row.type_prod
        const color = TYPE_COLORS[row.type_prod] || '#64748b'
        const pct = total > 0 ? Math.round((row.nb / total) * 100) : 0
        return (
          <HBar
            key={row.type_prod}
            label={`${label} (${pct}%)`}
            value={row.nb}
            max={maxNb}
            color={color}
          />
        )
      })}
    </SectionCard>
  )
}

// ─── Section 3 – Top Labos ───────────────────────────────────

function TopLabosSection({ data, lang }: { data: MarketComparatorData['topLabos']; lang: string }) {
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr
  const [showLocal, setShowLocal] = useState<boolean | null>(null)

  const filtered = showLocal === null
    ? data
    : data.filter((l) => showLocal ? l.algerie >= l.etranger : l.etranger > l.algerie)

  return (
    <SectionCard title={`🏭 ${t('Top laboratoires', 'أبرز المخابر')} — ${t('par enregistrements', 'حسب التسجيلات')}`}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: null, label: t('Tous', 'الكل') },
          { key: true, label: `🇩🇿 ${t('Labos locaux (Algérie)', 'مخابر محلية (الجزائر)')}` },
          { key: false, label: `🌍 ${t('Labos étrangers (hors Algérie)', 'مخابر أجنبية (خارج الجزائر)')}` },
        ].map(opt => (
          <button
            key={String(opt.key)}
            onClick={() => setShowLocal(opt.key)}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: '1.5px solid',
              borderColor: showLocal === opt.key ? '#0284c7' : '#e2e8f0',
              background: showLocal === opt.key ? '#0284c7' : 'white',
              color: showLocal === opt.key ? 'white' : '#475569',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {filtered.map((labo, i) => {
        const algeriePct = labo.nb > 0 ? Math.round((labo.algerie / labo.nb) * 100) : 0
        const etrangerPct = labo.nb > 0 ? Math.round((labo.etranger / labo.nb) * 100) : 0
        return (
          <div key={labo.labo} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 3 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                <span style={{ color: '#475569', marginRight: 6, fontSize: 11 }}>#{i + 1}</span>
                {labo.labo}
              </span>
              <span style={{ color: '#0284c7', flexShrink: 0 }}>{labo.nb.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 2 }}>
              <div style={{ flex: labo.algerie, background: '#059669' }} />
              <div style={{ flex: labo.etranger, background: '#7c3aed' }} />
              {labo.inconnu > 0 && <div style={{ flex: labo.inconnu, background: '#cbd5e1' }} />}
            </div>
            <div style={{ fontSize: 11, color: '#475569' }}>
              🟢 {algeriePct}% {t('local (Algérie)', 'محلي (الجزائر)')} · 🟣 {etrangerPct}% {t('étranger (hors Algérie)', 'أجنبي (خارج الجزائر)')}
              {labo.inconnu > 0 && ` · ⚪ ${100 - algeriePct - etrangerPct}% ${t('non renseigné', 'غير محدد')}`}
            </div>
          </div>
        )
      })}
    </SectionCard>
  )
}

// ─── Section 4 – Top DCI par concurrence ─────────────────────

function TopDciSection({ data, lang }: { data: MarketComparatorData['topDciConcurrence']; lang: string }) {
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr
  const maxMarques = data[0]?.nb_marques ?? 1

  return (
    <SectionCard title={`🔬 ${t('DCI les plus concurrentielles', 'DCI الأكثر تنافسية')}`}>
      <div style={{ marginBottom: 12, fontSize: 12, color: '#64748b' }}>
        {t('Substances actives avec le plus de spécialités distinctes', 'المواد الفعالة ذات أكبر عدد من التخصصات المختلفة')}
      </div>
      {data.map((row, i) => (
        <HBar
          key={row.dci}
          label={`#${i + 1} ${row.dci}`}
          value={row.nb_marques}
          max={maxMarques}
          color="#ea580c"
          subLabel={`${row.nb_enreg.toLocaleString()} ${t('enregistrements au total', 'تسجيل في المجموع')}`}
        />
      ))}
    </SectionCard>
  )
}

// ─── Main component ───────────────────────────────────────────

export function ComparateurClient({ data }: { data: MarketComparatorData }) {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr

  const totalEnreg = data.localImporte.local + data.localImporte.importe + data.localImporte.inconnu

  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e1b4b, #4f46e5)' }}>
        <div className="container">
          <h1>📊 {t('Comparateur marché', 'مقارنة السوق')}</h1>
          <p>{t(
            'Analyse comparative du marché pharmaceutique algérien — local vs importé, génériques, concurrence, évolution',
            'تحليل مقارن للسوق الصيدلاني الجزائري — محلي vs مستورد، جنيسة، تنافسية، تطور'
          )}</p>
        </div>
      </div>

      <div className="page-body">
        <div className="container">

          {/* Global summary */}
          <div style={{
            background: 'white', borderRadius: 12, padding: '16px 24px',
            border: '1px solid #e2e8f0', marginBottom: 28,
            display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
          }}>
            <div style={{ fontSize: 13, color: '#64748b', flex: 1 }}>
              {t('Base d\'analyse :', 'قاعدة التحليل :')}
              {' '}
              <strong style={{ color: '#0f172a' }}>{totalEnreg.toLocaleString()}</strong>
              {' '}
              {t('enregistrements actifs', 'تسجيل نشط')}
            </div>
            <div style={{ fontSize: 12, color: '#475569' }}>
              {t('Données MIPH — Nomenclature officielle', 'بيانات MIPH — التسمية الرسمية')}
            </div>
          </div>

          {/* Grid layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginBottom: 24 }}>
            <LocalImporteSection data={data.localImporte} lang={lang} />
            <TypeBreakdownSection data={data.typeBreakdown} lang={lang} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
            <TopLabosSection data={data.topLabos} lang={lang} />
            <TopDciSection data={data.topDciConcurrence} lang={lang} />
          </div>

        </div>
      </div>
    </>
  )
}
