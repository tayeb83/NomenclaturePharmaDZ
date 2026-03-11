'use client'

import Link from 'next/link'
import { DrugCard } from '@/components/drug/DrugCard'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { SearchClient } from './recherche/SearchClient'
import { AdHorizontal } from '@/components/ads/AdBanner'
import type { SearchResult } from '@/lib/db'
import { useState } from 'react'

// Remplacez ces IDs par vos vrais slots AdSense (disponibles dans Google AdSense > Annonces > Par bloc)
const AD_SLOT_HOME_TOP = process.env.NEXT_PUBLIC_AD_SLOT_HOME_TOP || '1234567890'
const AD_SLOT_HOME_MIDDLE = process.env.NEXT_PUBLIC_AD_SLOT_HOME_MIDDLE || '0987654321'

function formatDate(d: string | null): string | null {
  if (!d) return null
  const parts = d.slice(0, 10).split('-')
  if (parts.length !== 3) return null
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

type Stats = {
  total_enregistrements: number | null
  total_nouveautes: number | null
  total_retraits: number | null
  total_non_renouveles: number | null
  last_version: string | null
}

type AdvancedSearchCondition = {
  field: string
  operator: string
  value: string
  bool?: 'AND' | 'OR'
}

export function HomeClient({
  stats,
  nouveautes,
  retraits,
  lastVersionDate,
  initialQuery,
  initialScope,
  initialResults,
  initialLabo,
  initialSubstance,
  initialActiveOnly,
  initialAdvanced,
  initialAlgerieOnly,
}: {
  stats: Stats | null
  nouveautes: any[]
  retraits: any[]
  lastVersionDate: string | null
  initialQuery: string
  initialScope: string
  initialResults: SearchResult[]
  initialLabo: string
  initialSubstance: string
  initialActiveOnly: boolean
  initialAdvanced: AdvancedSearchCondition[]
  initialAlgerieOnly: boolean
}) {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr
  const formattedDate = formatDate(lastVersionDate)
  const [showSearch, setShowSearch] = useState(initialQuery.trim().length > 0)

  const quickLinks = [
    {
      href: '/diff',
      icon: '🔄',
      title: t('Diff versions', 'الفروقات'),
      sub: t('Ajoutés & supprimés', 'مضاف ومحذوف'),
    },
    {
      href: '/substitution',
      icon: '♻️',
      title: t('Substitution', 'الاستبدال'),
      sub: t('Trouver un générique', 'البحث عن بديل جنيس'),
    },
    {
      href: '/alertes',
      icon: '🚨',
      title: t('Alertes !', 'التنبيهات !'),
      sub: t('Retraits & non renouvelés', 'الانسحابات وغير المجددة'),
    },
    {
      href: '/veille',
      icon: '📡',
      title: t('Veille', 'المراقبة'),
      sub: t('Nouveaux enregistrements', 'التسجيلات الجديدة'),
    },
  ]

  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <h1>
            {t('La nomenclature pharmaceutique', 'التسمية الصيدلانية')}<br />
            <span>{t('algérienne', 'الجزائرية')}</span> {t('en un clic', 'بنقرة واحدة')}
          </h1>
          <p>
            {t(
              `Recherchez parmi ${stats?.total_enregistrements?.toLocaleString('fr') || '—'} médicaments, consultez les alertes officielles et trouvez des alternatives de substitution.`,
              `ابحث بين ${stats?.total_enregistrements?.toLocaleString('fr') || '—'} دواء، اطّلع على التنبيهات الرسمية وابحث عن بدائل الاستبدال.`
            )}
          </p>
        </div>
      </section>

      <div style={{ background: '#f0f9ff', borderBottom: '1px solid #bae6fd', padding: '9px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#0369a1' }}>
          <span style={{ fontSize: 15 }}>📋</span>
          {lang === 'ar' ? (
            <span>بيانات مستمدة من <strong>التسمية الرسمية للـ MIPH</strong> — يتم تحديثها تلقائيًا مع كل إصدار جديد.</span>
          ) : (
            <span>Données issues de la <strong>nomenclature officielle du MIPH</strong> — automatiquement mise à jour à chaque nouvelle version publiée.</span>
          )}
        </div>
      </div>

      {/* Bannière pub — entre le hero et les stats */}
      <div className="container" style={{ paddingTop: 8 }}>
        <AdHorizontal slot={AD_SLOT_HOME_TOP} />
      </div>

      <div className="container">
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats?.total_enregistrements?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">{t('Enregistrements actifs', 'التسجيلات النشطة')}</div>
            <div className="stat-sub">
              {t('Version', 'الإصدار')} {stats?.last_version || '—'}
              {formattedDate && (
                <> · {t('MàJ', 'تحديث')} <strong style={{ color: '#0284c7' }}>{formattedDate}</strong></>
              )}
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">🆕</div>
            <div className="stat-value">{stats?.total_nouveautes != null ? stats.total_nouveautes.toLocaleString('fr') : '—'}</div>
            <div className="stat-label">{t('Nouveautés', 'جديد')}</div>
            <div className="stat-sub">{t('vs version précédente', 'مقارنة بالإصدار السابق')}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon">🚫</div>
            <div className="stat-value">{stats?.total_retraits?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">{t('Médicaments retirés', 'أدوية مسحوبة')}</div>
            <div className="stat-sub">{t('Source MIPH', 'المصدر: MIPH')}</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">{stats?.total_non_renouveles?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">{t('AMM non renouvelées', 'AMM غير مجددة')}</div>
            <div className="stat-sub">{t('Source MIPH', 'المصدر: MIPH')}</div>
          </div>
        </div>
      </div>

      {/* Section recherche intégrée */}
      <div className="page-body" style={{ paddingTop: 0 }}>
        <div className="container">

          {/* Toggle pour afficher/masquer la recherche */}
          {!showSearch ? (
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <button
                onClick={() => setShowSearch(true)}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: 'white', border: 'none', borderRadius: 12,
                  padding: '14px 32px', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 4px 14px rgba(2,132,199,0.3)',
                }}
              >
                🔍 {t('Rechercher un médicament', 'ابحث عن دواء')}
              </button>
            </div>
          ) : (
            <div style={{
              background: 'white', borderRadius: 14, border: '1px solid #e2e8f0',
              padding: '20px 24px', marginBottom: 28,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  🔍 {t('Recherche', 'البحث')}
                </h2>
                <button
                  onClick={() => setShowSearch(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}
                  title={t('Masquer la recherche', 'إخفاء البحث')}
                >
                  ✕
                </button>
              </div>
              <SearchClient
                initialQuery={initialQuery}
                initialScope={initialScope}
                initialResults={initialResults}
                initialLabo={initialLabo}
                initialSubstance={initialSubstance}
                initialActiveOnly={initialActiveOnly}
                initialAdvanced={initialAdvanced}
                initialAlgerieOnly={initialAlgerieOnly}
                basePath="/"
              />
            </div>
          )}

          {/* Nouveautés + Retraits + Accès rapide */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <div className="section-title">
                🆕 {t(
                  `Nouveautés (${stats?.last_version || 'dernière version'})`,
                  `جديد (${stats?.last_version || 'آخر إصدار'})`
                )}
              </div>
              <div className="section-sub">
                {t(
                  'Comparaison automatique avec la version précédente de la nomenclature',
                  'مقارنة تلقائية مع الإصدار السابق من التسمية'
                )}
              </div>
              {nouveautes.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'enregistrement', similarity_score: 1 } as any} type="enregistrement" />
              ))}
              <Link
                href="/diff"
                style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#f0fdf4', borderRadius: 8, color: '#16a34a', fontWeight: 700, textDecoration: 'none', marginTop: 8 }}
              >
                {t('Voir le diff complet →', '← عرض الفروقات الكاملة')}
              </Link>
            </div>

            <div>
              <div className="section-title">🚨 {t('Derniers retraits', 'آخر الانسحابات')}</div>
              <div className="section-sub">
                {t('Médicaments retirés du marché (feuille Retraits)', 'الأدوية المسحوبة من السوق')}
              </div>
              {retraits.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'retrait', similarity_score: 1 } as any} type="retrait" />
              ))}
              <Link
                href="/alertes"
                style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontWeight: 700, textDecoration: 'none', marginTop: 8 }}
              >
                {t('Voir toutes les alertes →', '← عرض كل التنبيهات')}
              </Link>

              <div style={{ marginTop: 28 }}>
                <div className="section-title">⚡ {t('Accès rapide', 'وصول سريع')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  {quickLinks.map(f => (
                    <Link
                      key={f.href}
                      href={f.href}
                      style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', textDecoration: 'none', display: 'block' }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{f.title}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{f.sub}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <AdHorizontal slot={AD_SLOT_HOME_MIDDLE} />
        </div>
      </div>
    </>
  )
}
