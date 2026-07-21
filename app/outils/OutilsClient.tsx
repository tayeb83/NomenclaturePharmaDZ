'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'

type VeilleRow = { nom_marque: string; dci: string; labo: string | null; date_init: string | null }
type CriticalRow = {
  dci_critique: string
  forme_critique: string | null
  dosage_critique: string | null
  classe_therapeutique: string | null
  marque: string | null
}

const cardStyle: React.CSSProperties = {
  background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14,
  padding: '22px 22px 18px', display: 'flex', flexDirection: 'column',
}
const previewStyle: React.CSSProperties = {
  background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10,
  padding: '12px 14px', margin: '14px 0 16px', flex: 1,
}
const previewLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
  color: '#94a3b8', marginBottom: 8,
}
const ctaStyle: React.CSSProperties = {
  background: '#0284c7', color: 'white', borderRadius: 8, padding: '10px 16px',
  fontSize: 13.5, fontWeight: 700, textDecoration: 'none', textAlign: 'center',
}
const miniTh: React.CSSProperties = {
  textAlign: 'start', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '.04em', color: '#94a3b8', padding: '4px 6px',
}
const miniTd: React.CSSProperties = {
  fontSize: 12.5, color: '#334155', padding: '5px 6px', borderTop: '1px solid #e2e8f0',
}

function fmtDate(d: string | null, lang: string) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR')
  } catch {
    return d
  }
}

export function OutilsClient({
  localImporte,
  topLabos,
  veilleAnnee,
  veilleSample,
  criticalCount,
  criticalSample,
}: {
  localImporte: { local: number; importe: number; inconnu: number }
  topLabos: { labo: string; nb: number }[]
  veilleAnnee: number
  veilleSample: VeilleRow[]
  criticalCount: number
  criticalSample: CriticalRow[]
}) {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr

  const totalMarche = localImporte.local + localImporte.importe + localImporte.inconnu
  const pctLocal = totalMarche ? Math.round((localImporte.local / totalMarche) * 100) : 0

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f766e)' }}>
        <div className="container">
          <h1>🧰 {t('Outils & analyses', 'الأدوات والتحليلات')}</h1>
          <p style={{ maxWidth: 720 }}>
            {t(
              'Des outils avancés pour explorer la nomenclature pharmaceutique algérienne. Un aperçu de chaque outil est affiché ci-dessous : ouvrez-le pour la version complète.',
              'أدوات متقدمة لاستكشاف التسمية الصيدلانية الجزائرية. تظهر لمحة عن كل أداة أدناه: افتحها للنسخة الكاملة.'
            )}
          </p>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 16 }}>

            {/* ─── Comparateur marché ─────────────────────── */}
            <div style={cardStyle}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>⚖️</div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>
                {t('Comparateur du marché', 'مقارنة السوق')}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {t(
                  'Production locale vs importation, top laboratoires, DCI les plus concurrentielles, évolution annuelle.',
                  'الإنتاج المحلي مقابل الاستيراد، أكبر المخابر، أكثر المواد الفعالة تنافسًا، والتطور السنوي.'
                )}
              </div>
              <div style={previewStyle}>
                <div style={previewLabelStyle}>{t('Aperçu', 'لمحة')}</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0f766e' }}>{localImporte.local.toLocaleString('fr-FR')}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>{t(`Fabriqués en Algérie (${pctLocal}%)`, `مصنّعة في الجزائر (${pctLocal}%)`)}</div>
                  </div>
                  <div style={{ flex: 1, background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#b45309' }}>{localImporte.importe.toLocaleString('fr-FR')}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>{t('Importés', 'مستوردة')}</div>
                  </div>
                </div>
                {topLabos.map(l => (
                  <div key={l.labo} style={{ marginBottom: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 3 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingInlineEnd: 8 }}>{l.labo}</span>
                      <span style={{ color: '#0369a1', flexShrink: 0 }}>{l.nb}</span>
                    </div>
                    <div style={{ height: 4, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#0284c7', width: `${Math.min(100, (l.nb / (topLabos[0]?.nb || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/comparateur" style={ctaStyle}>
                {t('Ouvrir le comparateur →', 'افتح المقارنة ←')}
              </Link>
            </div>

            {/* ─── Veille réglementaire ───────────────────── */}
            <div style={cardStyle}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>📡</div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>
                {t('Veille réglementaire', 'المراقبة التنظيمية')}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {t(
                  'Suivi des nouveaux médicaments enregistrés dans la nomenclature officielle MIPH, année par année.',
                  'متابعة الأدوية الجديدة المسجلة في التسمية الرسمية MIPH، سنة بسنة.'
                )}
              </div>
              <div style={previewStyle}>
                <div style={previewLabelStyle}>
                  {t(`Aperçu — derniers enregistrements ${veilleAnnee}`, `لمحة — آخر تسجيلات ${veilleAnnee}`)}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={miniTh}>{t('Marque', 'العلامة')}</th>
                      <th style={miniTh}>DCI</th>
                      <th style={miniTh}>{t('Date', 'التاريخ')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {veilleSample.map((d, i) => (
                      <tr key={i}>
                        <td style={{ ...miniTd, fontWeight: 700 }}>{d.nom_marque}</td>
                        <td style={miniTd}>{d.dci}</td>
                        <td style={{ ...miniTd, whiteSpace: 'nowrap' }}>{fmtDate(d.date_init, lang)}</td>
                      </tr>
                    ))}
                    {veilleSample.length === 0 && (
                      <tr><td style={miniTd} colSpan={3}>{t('Aucune donnée disponible.', 'لا توجد بيانات متاحة.')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Link href="/veille" style={ctaStyle}>
                {t('Ouvrir la veille →', 'افتح المراقبة ←')}
              </Link>
            </div>

            {/* ─── Médicaments critiques ──────────────────── */}
            <div style={cardStyle}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>🚨</div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>
                {t('Médicaments critiques', 'الأدوية الحرجة')}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {criticalCount > 0
                  ? t(
                      `${criticalCount} entrées critiques (DCI + forme + dosage) publiées par les autorités, avec leurs correspondances dans la nomenclature.`,
                      `${criticalCount} مدخلاً حرجًا (DCI + الشكل + الجرعة) صادرة عن السلطات، مع مطابقاتها في التسمية.`
                    )
                  : t(
                      'Liste des médicaments critiques publiée par les autorités sanitaires, avec correspondances dans la nomenclature.',
                      'قائمة الأدوية الحرجة الصادرة عن السلطات الصحية، مع المطابقات في التسمية.'
                    )}
              </div>
              <div style={previewStyle}>
                <div style={previewLabelStyle}>{t('Aperçu', 'لمحة')}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={miniTh}>{t('DCI critique', 'DCI الحرجة')}</th>
                      <th style={miniTh}>{t('Dosage', 'الجرعة')}</th>
                      <th style={miniTh}>{t('Correspondance', 'المطابقة')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalSample.map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...miniTd, fontWeight: 700 }}>{r.dci_critique}</td>
                        <td style={miniTd}>{[r.forme_critique, r.dosage_critique].filter(Boolean).join(' · ') || '—'}</td>
                        <td style={miniTd}>{r.marque || '—'}</td>
                      </tr>
                    ))}
                    {criticalSample.length === 0 && (
                      <tr><td style={miniTd} colSpan={3}>{t('Aucune donnée disponible.', 'لا توجد بيانات متاحة.')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Link href="/medicaments-critiques" style={ctaStyle}>
                {t('Ouvrir la liste complète →', 'افتح القائمة الكاملة ←')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
