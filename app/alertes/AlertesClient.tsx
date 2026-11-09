'use client'

import Link from 'next/link'
import { DrugCard } from '@/components/drug/DrugCard'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { PrintButton } from '@/components/ui/PrintButton'
import { GlossarySection } from '@/components/ui/GlossarySection'
import { displayField } from '@/lib/translate-fields'

type Params = { annee: number | null; q: string; page: number; npage: number }

function hrefFor(p: Params, hash: string) {
  const params = new URLSearchParams()
  if (p.annee) params.set('annee', String(p.annee))
  if (p.q) params.set('q', p.q)
  if (p.page > 1) params.set('page', String(p.page))
  if (p.npage > 1) params.set('npage', String(p.npage))
  const qs = params.toString()
  return `/alertes${qs ? `?${qs}` : ''}#${hash}`
}

/** Numéros de pages à afficher : 1 … autour de la page courante … dernière */
function pageNumbers(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const around = [page - 1, page, page + 1].filter(p => p > 1 && p < totalPages)
  const out: (number | '…')[] = [1]
  if (around[0] > 2) out.push('…')
  out.push(...around)
  if (around[around.length - 1] < totalPages - 1) out.push('…')
  out.push(totalPages)
  return out
}

export function AlertesClient({
  retraits,
  nonRenouveles,
  motifStats,
  annee,
  annees,
  q,
  page,
  totalPages,
  total,
  npage,
  nTotalPages,
  nTotal,
}: {
  retraits: any[]
  nonRenouveles: any[]
  motifStats: [string, number][]
  annee: number | null
  annees: number[]
  q: string
  page: number
  totalPages: number
  total: number
  npage: number
  nTotalPages: number
  nTotal: number
}) {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr
  const cur: Params = { annee, q, page, npage }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700,
    textDecoration: 'none', border: '1.5px solid',
    background: active ? '#991b1b' : 'white',
    color: active ? 'white' : '#475569',
    borderColor: active ? '#991b1b' : '#e2e8f0',
  })

  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #7f1d1d, #991b1b)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1>🚨 {t('Alertes & Retraits', 'التنبيهات والانسحابات')}</h1>
              <p>{t(
                'Liste des médicaments retirés du marché algérien et des AMM non renouvelées — Source : MIPH',
                'قائمة الأدوية المسحوبة من السوق الجزائري والـ AMM غير المجددة — المصدر: MIPH'
              )}</p>
            </div>
            <div style={{ paddingTop: 4 }}>
              <PrintButton label={t('Imprimer / PDF', 'طباعة / PDF')} />
            </div>
          </div>
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
              <div id="retraits" className="section-title" style={{ scrollMarginTop: 90 }}>
                🚫 {annee
                  ? t(`Médicaments retirés en ${annee} (${total})`, `الأدوية المسحوبة في ${annee} (${total})`)
                  : t(`Médicaments retirés (${total})`, `الأدوية المسحوبة (${total})`)}
              </div>
              <div className="section-sub">
                {t('Liste complète, du retrait le plus récent au plus ancien', 'القائمة الكاملة، من الأحدث إلى الأقدم')}
              </div>

              {/* Recherche dans la liste des alertes */}
              <form action="/alertes" method="get" role="search" style={{ display: 'flex', gap: 8, margin: '12px 0 0', flexWrap: 'wrap' }}>
                {annee && <input type="hidden" name="annee" value={annee} />}
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  maxLength={100}
                  placeholder={t('Rechercher : nom, DCI, laboratoire, motif…', 'بحث: الاسم، DCI، المخبر، السبب…')}
                  aria-label={t('Rechercher dans les alertes', 'البحث في التنبيهات')}
                  style={{ flex: '1 1 240px', padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14 }}
                />
                <button type="submit" style={{ background: '#991b1b', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {t('Rechercher', 'بحث')}
                </button>
                {q && (
                  <Link href={hrefFor({ annee, q: '', page: 1, npage: 1 }, 'retraits')} style={{ ...chipStyle(false), alignSelf: 'center' }}>
                    ✕ {t('Effacer', 'مسح')}
                  </Link>
                )}
              </form>
              {q && (
                <div className="section-sub" style={{ marginTop: 8 }}>
                  {t(`« ${q} » : ${total} retrait(s) et ${nTotal} AMM non renouvelée(s)`, `«${q}»: ${total} سحب و ${nTotal} AMM غير مجددة`)}
                </div>
              )}

              {/* Filtre par année de retrait */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0 16px' }}>
                <Link href={hrefFor({ annee: null, q, page: 1, npage }, 'retraits')} style={chipStyle(annee === null)}>
                  {t('Toutes les années', 'كل السنوات')}
                </Link>
                {annees.map(a => (
                  <Link key={a} href={hrefFor({ annee: a, q, page: 1, npage }, 'retraits')} style={chipStyle(annee === a)}>
                    {a}
                  </Link>
                ))}
              </div>

              {retraits.length === 0 && (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  {t('Aucun retrait trouvé pour ce filtre.', 'لا توجد سحوبات لهذا الفلتر.')}
                </div>
              )}
              {retraits.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'retrait', similarity_score: 1, annee: null } as any} type="retrait" />
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <Link
                    href={hrefFor({ ...cur, page: Math.max(1, page - 1) }, 'retraits')}
                    className="page-btn"
                    style={page <= 1 ? { pointerEvents: 'none', opacity: 0.4 } : undefined}
                    aria-disabled={page <= 1}
                  >
                    ← {t('Précédent', 'السابق')}
                  </Link>
                  {pageNumbers(page, totalPages).map((p, i) => p === '…' ? (
                    <span key={`e${i}`} className="page-btn" style={{ pointerEvents: 'none', border: 'none', background: 'transparent' }}>…</span>
                  ) : (
                    <Link key={p} href={hrefFor({ ...cur, page: p }, 'retraits')} className={`page-btn${p === page ? ' active' : ''}`}>
                      {p}
                    </Link>
                  ))}
                  <Link
                    href={hrefFor({ ...cur, page: Math.min(totalPages, page + 1) }, 'retraits')}
                    className="page-btn"
                    style={page >= totalPages ? { pointerEvents: 'none', opacity: 0.4 } : undefined}
                    aria-disabled={page >= totalPages}
                  >
                    {t('Suivant', 'التالي')} →
                  </Link>
                </div>
              )}

              <div style={{ marginTop: 36 }}>
                <div id="non-renouveles" className="section-title" style={{ scrollMarginTop: 90 }}>
                  ⚠️ {t(`AMM non renouvelées (${nTotal})`, `AMM غير مجددة (${nTotal})`)}
                </div>
                <div className="section-sub">
                  {t(
                    'Autorisations de mise sur le marché expirées sans renouvellement',
                    'تصاريح طرح في السوق منتهية دون تجديد'
                  )}
                </div>
                {nonRenouveles.length === 0 && (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    {t('Aucune AMM non renouvelée trouvée.', 'لا توجد AMM غير مجددة.')}
                  </div>
                )}
                {nonRenouveles.map(d => (
                  <DrugCard key={d.id} drug={{ ...d, source: 'non_renouvele', similarity_score: 1, annee: null, date_retrait: null, motif_retrait: null } as any} type="non_renouvele" />
                ))}
                {nTotalPages > 1 && (
                  <div className="pagination">
                    <Link
                      href={hrefFor({ ...cur, npage: Math.max(1, npage - 1) }, 'non-renouveles')}
                      className="page-btn"
                      style={npage <= 1 ? { pointerEvents: 'none', opacity: 0.4 } : undefined}
                      aria-disabled={npage <= 1}
                    >
                      ← {t('Précédent', 'السابق')}
                    </Link>
                    {pageNumbers(npage, nTotalPages).map((p, i) => p === '…' ? (
                      <span key={`n${i}`} className="page-btn" style={{ pointerEvents: 'none', border: 'none', background: 'transparent' }}>…</span>
                    ) : (
                      <Link key={p} href={hrefFor({ ...cur, npage: p }, 'non-renouveles')} className={`page-btn${p === npage ? ' active' : ''}`}>
                        {p}
                      </Link>
                    ))}
                    <Link
                      href={hrefFor({ ...cur, npage: Math.min(nTotalPages, npage + 1) }, 'non-renouveles')}
                      className="page-btn"
                      style={npage >= nTotalPages ? { pointerEvents: 'none', opacity: 0.4 } : undefined}
                      aria-disabled={npage >= nTotalPages}
                    >
                      {t('Suivant', 'التالي')} →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="section-title">📊 {t('Répartition par motif', 'التوزيع حسب السبب')}</div>
              <div className="section-sub">{t('Raisons des retraits', 'أسباب الانسحابات')}</div>
              <div style={{ background: 'white', borderRadius: 10, padding: '16px', border: '1px solid #e2e8f0', marginBottom: 20 }}>
                {motifStats.map(([motif, count]) => (
                  <div key={motif} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      <span style={{ flex: 1, paddingRight: 8, lineHeight: 1.4 }}>{displayField('motif', motif, lang)}</span>
                      <span style={{ color: '#0369a1', flexShrink: 0 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#0284c7', width: `${Math.min(100, (count / motifStats[0][1]) * 100)}%`, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                background: '#f8fafc', borderRadius: 10, padding: '16px',
                border: '1.5px solid #e2e8f0', marginBottom: 16,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 24 }}>📩</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, marginBottom: 2 }}>
                      {t('Signaler une erreur ou nous contacter', 'الإبلاغ عن خطأ أو التواصل معنا')}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      {t('Pour toute question sur les alertes et retraits.', 'لأي سؤال حول التنبيهات والانسحابات.')}
                    </div>
                  </div>
                </div>
                <Link href="/contact" style={{
                  background: '#991b1b', color: '#fff', padding: '8px 16px',
                  borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  textAlign: 'center',
                }}>
                  {t('Contacter →', 'تواصل →')}
                </Link>
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

          {/* ─── Glossaire des abréviations ─────────────────── */}
          <GlossarySection lang={lang} />
        </div>
      </div>
    </>
  )
}
