'use client'

import { DrugCard } from '@/components/drug/DrugCard'
import { useLanguage } from '@/components/i18n/LanguageProvider'

export function AlertesClient({
  retraits,
  nonRenouveles,
  motifStats,
}: {
  retraits: any[]
  nonRenouveles: any[]
  motifStats: [string, number][]
}) {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr

  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #7f1d1d, #991b1b)' }}>
        <div className="container">
          <h1>🚨 {t('Alertes & Retraits', 'التنبيهات والانسحابات')}</h1>
          <p>{t(
            'Liste des médicaments retirés du marché algérien et des AMM non renouvelées — Source : MIPH',
            'قائمة الأدوية المسحوبة من السوق الجزائري والـ AMM غير المجددة — المصدر: MIPH'
          )}</p>
        </div>
      </div>

      <div className="page-body">
        <div className="container">
          <div className="alert-banner error" style={{ marginBottom: 24 }}>
            {lang === 'ar' ? (
              <><strong>⚠️ تنبيه:</strong> لا يجب صرف أي دواء مدرج في هذه القائمة للمرضى. في حالة الشك، راجع المصادر الرسمية للـ MIPH.</>
            ) : (
              <><strong>⚠️ Attention :</strong> Un médicament apparaissant sur cette liste ne doit plus être dispensé aux patients. En cas de doute, consultez les sources officielles du MIPH.</>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
            <div>
              <div className="section-title">
                🚫 {t(`Médicaments retirés (${retraits.length} affichés)`, `الأدوية المسحوبة (${retraits.length} معروض)`)}
              </div>
              <div className="section-sub">{t('Dernier retrait en date', 'آخر انسحاب')}</div>
              {retraits.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'retrait', similarity_score: 1, annee: null } as any} type="retrait" />
              ))}

              <div style={{ marginTop: 36 }}>
                <div className="section-title">
                  ⚠️ {t(`AMM non renouvelées (${nonRenouveles.length} affichés)`, `AMM غير مجددة (${nonRenouveles.length} معروض)`)}
                </div>
                <div className="section-sub">
                  {t(
                    'Autorisations de mise sur le marché expirées sans renouvellement',
                    'تصاريح طرح في السوق منتهية دون تجديد'
                  )}
                </div>
                {nonRenouveles.map(d => (
                  <DrugCard key={d.id} drug={{ ...d, source: 'non_renouvele', similarity_score: 1, annee: null, date_retrait: null, motif_retrait: null } as any} type="non_renouvele" />
                ))}
              </div>
            </div>

            <div>
              <div className="section-title">📊 {t('Répartition par motif', 'التوزيع حسب السبب')}</div>
              <div className="section-sub">{t('Raisons des retraits', 'أسباب الانسحابات')}</div>
              <div style={{ background: 'white', borderRadius: 10, padding: '16px', border: '1px solid #e2e8f0', marginBottom: 20 }}>
                {motifStats.map(([motif, count]) => (
                  <div key={motif} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      <span style={{ flex: 1, paddingRight: 8, lineHeight: 1.4 }}>{motif}</span>
                      <span style={{ color: '#0284c7', flexShrink: 0 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#0284c7', width: `${Math.min(100, (count / motifStats[0][1]) * 100)}%`, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '16px', fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                  ℹ️ {t('Que faire face à un retrait ?', 'ماذا تفعل عند الانسحاب؟')}
                </div>
                <ul style={{ color: '#78716c', paddingLeft: lang === 'ar' ? 0 : 16, paddingRight: lang === 'ar' ? 16 : 0, lineHeight: 1.8 }}>
                  <li>{t('Ne plus délivrer le médicament', 'إيقاف صرف الدواء')}</li>
                  <li>{t('Retirer les stocks en rayon', 'سحب المخزون من الرفوف')}</li>
                  <li>{t('Informer les patients concernés', 'إبلاغ المرضى المعنيين')}</li>
                  <li>{t('Proposer une alternative thérapeutique', 'اقتراح بديل علاجي')}</li>
                  <li>{t('Contacter le laboratoire titulaire', 'الاتصال بالمختبر المالك')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
