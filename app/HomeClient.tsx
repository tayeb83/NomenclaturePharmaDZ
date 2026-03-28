'use client'

import Link from 'next/link'
import Image from 'next/image'
import { DrugCard } from '@/components/drug/DrugCard'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { SearchClient } from './recherche/SearchClient'
import { AdHorizontal } from '@/components/ads/AdBanner'
import type { SearchResult } from '@/lib/db-types'
import { useState } from 'react'
import { getFeaturedArticles } from '@/lib/articles'

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

  const featuredArticles = getFeaturedArticles(lang, 3)

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
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.75)',
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.35)',
              backdropFilter: 'blur(2px)',
            }}>
              <Image src="/algeria-flag.svg" alt={t('Drapeau algérien', 'علم الجزائر')} width={38} height={26} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>{t('Algérie', 'الجزائر')}</span>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.75)',
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.35)',
              backdropFilter: 'blur(2px)',
            }}>
              <Image src="/algeria-pharma-symbol.svg" alt={t('Symbole de la pharmacie algérienne', 'رمز الصيدلة الجزائرية')} width={28} height={28} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e' }}>{t('Pharmacie DZ', 'صيدلة DZ')}</span>
            </div>
          </div>
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
          <Link href="/medicaments" className="stat-card blue stat-card-link">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats?.total_enregistrements?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">{t('Enregistrements actifs', 'التسجيلات النشطة')}</div>
            <div className="stat-sub">
              {t('Version', 'الإصدار')} {stats?.last_version || '—'}
              {formattedDate && (
                <> · {t('MàJ', 'تحديث')} <strong style={{ color: '#0284c7' }}>{formattedDate}</strong></>
              )}
            </div>
            <div className="stat-cta">{t('Voir les médicaments →', 'عرض الأدوية →')}</div>
          </Link>
          <Link href="/diff" className="stat-card green stat-card-link">
            <div className="stat-icon">🆕</div>
            <div className="stat-value">{stats?.total_nouveautes != null ? stats.total_nouveautes.toLocaleString('fr') : '—'}</div>
            <div className="stat-label">{t('Nouveautés', 'جديد')}</div>
            <div className="stat-sub">{t('vs version précédente', 'مقارنة بالإصدار السابق')}</div>
            <div className="stat-cta">{t('Voir les nouveautés →', 'عرض الجديد →')}</div>
          </Link>
          <Link href="/alertes#retraits" className="stat-card red stat-card-link">
            <div className="stat-icon">🚫</div>
            <div className="stat-value">{stats?.total_retraits?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">{t('Médicaments retirés', 'أدوية مسحوبة')}</div>
            <div className="stat-sub">{t('Source MIPH', 'المصدر: MIPH')}</div>
            <div className="stat-cta">{t('Voir les retraits →', 'عرض المسحوبات →')}</div>
          </Link>
          <Link href="/alertes#non-renouveles" className="stat-card amber stat-card-link">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">{stats?.total_non_renouveles?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">{t('AMM non renouvelées', 'AMM غير مجددة')}</div>
            <div className="stat-sub">{t('Source MIPH', 'المصدر: MIPH')}</div>
            <div className="stat-cta">{t('Voir les non renouvelées →', 'عرض غير المجددة →')}</div>
          </Link>
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
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 18 }}
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

          <section style={{ marginTop: 36, marginBottom: 8 }}>
            <div className="section-title">📰 {t('Articles SEO & dossiers', 'مقالات ودراسات محسّنة للسيو')}</div>
            <div className="section-sub">
              {t(
                'Des contenus FR/AR pour capter les requêtes réglementaires et renvoyer vers les pages clés du site.',
                'محتوى فرنسي/عربي لالتقاط الكلمات المفتاحية التنظيمية وربط الزائر بالصفحات الأساسية.'
              )}
            </div>
            <div className="home-articles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 14 }}>
              {featuredArticles.map(article => (
                <Link
                  key={article.slug}
                  href={`/articles/${article.slug}`}
                  style={{
                    textDecoration: 'none',
                    background: 'white',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '16px 18px',
                    display: 'block',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ background: '#dbeafe', color: '#0369a1', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                      {article.audience === 'professionnel' ? t('Professionnel', 'مهني') : t('Étudiant', 'طالب')}
                    </span>
                    <span style={{ color: '#64748b', fontSize: 11.5 }}>{article.readingTime} {lang === 'ar' ? 'دقائق' : 'min'}</span>
                  </div>
                  <div style={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.5, marginBottom: 8, direction: article.lang === 'ar' ? 'rtl' : 'ltr' }}>
                    {article.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, direction: article.lang === 'ar' ? 'rtl' : 'ltr' }}>
                    {article.description}
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <Link
                href="/articles"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '10px 16px', borderRadius: 10, background: '#eff6ff', color: '#0369a1', fontWeight: 700 }}
              >
                📰 {t('Voir tous les articles', 'عرض كل المقالات')}
              </Link>
            </div>
          </section>

          <AdHorizontal slot={AD_SLOT_HOME_MIDDLE} />
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .home-articles-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}
