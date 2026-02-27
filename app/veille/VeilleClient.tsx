'use client'

import { DrugCard } from '@/components/drug/DrugCard'
import { useLanguage } from '@/components/i18n/LanguageProvider'

const TYPE_LABELS_FR: Record<string, string> = {
  GE: 'Génériques', 'Gé': 'Génériques', RE: 'Réf. étrangères',
  BIO: 'Biologiques', I: 'Innovateurs', 'Ré': 'Réf. étrangères',
}
const TYPE_LABELS_AR: Record<string, string> = {
  GE: 'جنيسة', 'Gé': 'جنيسة', RE: 'مرجعية أجنبية',
  BIO: 'بيولوجية', I: 'مبتكرة', 'Ré': 'مرجعية أجنبية',
}

export function VeilleClient({
  drugs,
  stats,
  annee,
  anneesDisponibles,
}: {
  drugs: any[]
  stats: { types: Record<string, number>; statuts: Record<string, number>; topPays: [string, number][] }
  annee: number
  anneesDisponibles: number[]
}) {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr
  const typeLabels = lang === 'ar' ? TYPE_LABELS_AR : TYPE_LABELS_FR

  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0284c7)' }}>
        <div className="container">
          <h1>📋 {t('Veille réglementaire', 'المراقبة التنظيمية')}</h1>
          <p>{t(
            'Nouveaux médicaments enregistrés sur le marché algérien — Données MIPH',
            'الأدوية الجديدة المسجلة في السوق الجزائري — بيانات MIPH'
          )}</p>
        </div>
      </div>
      <div className="page-body">
        <div className="container">
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            {(anneesDisponibles.length > 0 ? anneesDisponibles : [annee]).map(y => (
              <a key={y} href={`/veille?annee=${y}`} style={{
                padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14,
                textDecoration: 'none', border: '1.5px solid',
                borderColor: annee === y ? '#0284c7' : '#e2e8f0',
                background: annee === y ? '#0284c7' : 'white',
                color: annee === y ? 'white' : '#475569',
              }}>
                {y} {annee === y ? (lang === 'ar' ? '→' : '←') : ''}
              </a>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
            <div>
              <div className="section-title">
                {t(`Enregistrements ${annee} (${drugs.length} affichés)`, `تسجيلات ${annee} (${drugs.length} معروض)`)}
              </div>
              <div className="section-sub">
                {t("Triés par date d'enregistrement décroissante", 'مرتبة حسب تاريخ التسجيل تنازليًا')}
              </div>
              {drugs.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'enregistrement', similarity_score: 1 } as any} type="enregistrement" />
              ))}
            </div>

            <div>
              <div style={{ background: 'white', borderRadius: 10, padding: '18px', border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
                  📊 {t(`Stats ${annee}`, `إحصاءات ${annee}`)}
                </div>

                <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                  {t('Par type', 'حسب النوع')}
                </div>
                {Object.entries(stats.types).sort((a, b) => b[1] - a[1]).map(([type, n]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span>{typeLabels[type] || type}</span>
                    <span style={{ fontWeight: 700, color: '#0284c7' }}>{n}</span>
                  </div>
                ))}

                <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', margin: '14px 0 8px' }}>
                  {t('Fabrication', 'التصنيع')}
                </div>
                {Object.entries(stats.statuts).map(([s, n]) => (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span>{s === 'F' ? t('🇩🇿 Algérie', '🇩🇿 الجزائر') : t('🌍 Importé', '🌍 مستورد')}</span>
                    <span style={{ fontWeight: 700, color: s === 'F' ? '#059669' : '#7c3aed' }}>{n}</span>
                  </div>
                ))}

                {stats.topPays.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', margin: '14px 0 8px' }}>
                      {t('Top pays', 'أبرز البلدان')}
                    </div>
                    {stats.topPays.map(([pays, n]) => (
                      <div key={pays} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: '#334155' }}>{pays}</span>
                        <span style={{ fontWeight: 700, color: '#64748b' }}>{n}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
