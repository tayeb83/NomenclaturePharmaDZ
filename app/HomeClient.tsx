'use client'

import Link from 'next/link'
import { DrugCard } from '@/components/drug/DrugCard'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { AdHorizontal } from '@/components/ads/AdBanner'
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

export function HomeClient({
  stats,
  nouveautes,
  retraits,
  lastVersionDate,
}: {
  stats: Stats | null
  nouveautes: any[]
  retraits: any[]
  lastVersionDate: string | null
}) {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr
  const formattedDate = formatDate(lastVersionDate)

  const featuredArticles = getFeaturedArticles(lang, 3)

  const services = [
    {
      href: '/substitution',
      icon: '♻️',
      title: t('Trouver un générique', 'البحث عن بديل جنيس'),
      text: t('Trouvez une alternative générique à un médicament.', 'اعثر على بديل جنيس لدواء ما.'),
    },
    {
      href: '/alertes',
      icon: '🚨',
      title: t('Consulter les alertes', 'الاطلاع على التنبيهات'),
      text: t('Retraits et AMM non renouvelées.', 'الأدوية المسحوبة وغير المجددة.'),
    },
    {
      href: '/pharmacies',
      icon: '📍',
      title: t('Annuaire des pharmacies', 'دليل الصيدليات'),
      text: t('Toutes les pharmacies par wilaya et commune.', 'كل الصيدليات حسب الولاية والبلدية.'),
    },
    {
      href: '/diff',
      icon: '🆕',
      title: t('Nouveaux médicaments', 'أدوية جديدة'),
      text: t('Les derniers médicaments enregistrés.', 'آخر الأدوية المسجلة.'),
    },
  ]

  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <h1>
            {t('Trouvez un médicament ou une pharmacie de garde en Algérie', 'ابحث عن دواء أو صيدلية مناوبة في الجزائر')}
          </h1>
          <p>
            {t(
              'Accédez rapidement aux pharmacies ouvertes et aux informations sur les médicaments disponibles en Algérie.',
              'اعثر بسرعة على الصيدليات المناوبة ومعلومات الأدوية المتوفرة في الجزائر.',
            )}
          </p>
        </div>
      </section>

      {/* SEO anchor — visually minimal, preserved for search engine indexing */}
      <div aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        <h2>{t('Pharma DZ : votre guide médicaments en Algérie', 'Pharma DZ: دليلك لأدوية الجزائر')}</h2>
        <p>
          {lang === 'ar' ? (
            <>إذا كنت تبحث عن <strong>Pharma DZ</strong> أو <strong>صيدلية الجزائر</strong> أو <strong>أدوية الجزائر</strong>، يوفر لك DwaDZ البحث السريع في التسمية الرسمية مع صفحات مخصصة لـ <Link href="/recherche">الأدوية</Link> و<Link href="/alertes">التنبيهات</Link> و<Link href="/substitution">البدائل الجنيسة</Link>.</>
          ) : (
            <>Si vous cherchez <strong>Pharma DZ</strong>, <strong>pharmacie Algérie</strong> ou <strong>médicaments Algérie</strong>, DwaDZ centralise la nomenclature officielle avec des pages dédiées à la <Link href="/recherche">recherche de médicaments</Link>, aux <Link href="/alertes">alertes</Link> et à la <Link href="/substitution">substitution générique</Link>.</>
          )}
        </p>
      </div>

      {/* Deux actions principales : pharmacie de garde + recherche de médicament */}
      <div className="container">
        <div className="home-actions">
          <div className="home-action-card primary">
            <div className="home-action-icon">🏥</div>
            <div className="home-action-title">{t('Pharmacie de garde', 'صيدليات المناوبة')}</div>
            <p className="home-action-text">
              {t(
                'Trouvez une pharmacie ouverte maintenant, cette nuit ou vendredi.',
                'اعثر على صيدلية مناوبة الآن أو هذه الليلة أو يوم الجمعة.',
              )}
            </p>
            <div className="home-action-buttons">
              <Link href="/garde" className="home-action-btn solid">
                📍 {t('Autour de moi', 'بالقرب مني')}
              </Link>
              <Link href="/pharmacie-de-garde" className="home-action-btn outline">
                🏘️ {t('Choisir une commune', 'اختيار البلدية')}
              </Link>
            </div>
          </div>

          <div className="home-action-card secondary">
            <div className="home-action-icon">🔍</div>
            <div className="home-action-title">{t('Rechercher un médicament', 'البحث عن دواء')}</div>
            <p className="home-action-text">
              {t(
                'Recherchez par nom commercial, substance active ou laboratoire.',
                'ابحث بالاسم التجاري أو المادة الفعالة أو المخبر.',
              )}
            </p>
            <div className="home-action-buttons">
              <Link href="/recherche" className="home-action-btn solid">
                🔍 {t('Rechercher', 'ابحث')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <AdHorizontal slot={AD_SLOT_HOME_TOP} />
      </div>

      <div className="page-body" style={{ paddingTop: 0 }}>
        <div className="container">

          {/* Services utiles */}
          <section style={{ marginBottom: 36 }}>
            <div className="section-title">⚡ {t('Services utiles', 'خدمات مفيدة')}</div>
            <div className="home-services-grid">
              {services.map(s => (
                <Link key={s.href} href={s.href} className="home-service-card">
                  <div className="home-service-icon">{s.icon}</div>
                  <div className="home-service-title">{s.title}</div>
                  <div className="home-service-text">{s.text}</div>
                </Link>
              ))}
            </div>
          </section>

          {/* Nouveautés + Retraits */}
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
                {t('Voir tout →', '← عرض الكل')}
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
                {t('Voir tout →', '← عرض الكل')}
              </Link>
            </div>
          </div>

          <section style={{ marginTop: 36 }}>
            <div className="section-title">📰 {t('Articles & dossiers', 'مقالات ودراسات')}</div>
            <div className="section-sub">
              {t(
                'Guides pratiques et actualités pharmaceutiques en Algérie.',
                'أدلة عملية وأخبار صيدلانية في الجزائر.'
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

          {/* Les données DwaDZ — statistiques secondaires */}
          <section style={{ marginTop: 36 }}>
            <div className="home-data-section">
              <div className="section-title" style={{ marginBottom: 0 }}>{t('Les données DwaDZ', 'بيانات DwaDZ')}</div>
              <div className="home-data-grid">
                <Link href="/medicaments" className="home-data-item" style={{ textDecoration: 'none' }}>
                  <div className="home-data-value">{stats?.total_enregistrements?.toLocaleString('fr') || '—'}</div>
                  <div className="home-data-label">{t('Enregistrements actifs', 'التسجيلات النشطة')}</div>
                </Link>
                <Link href="/diff" className="home-data-item" style={{ textDecoration: 'none' }}>
                  <div className="home-data-value">{stats?.total_nouveautes != null ? stats.total_nouveautes.toLocaleString('fr') : '—'}</div>
                  <div className="home-data-label">{t('Nouveautés', 'جديد')}</div>
                </Link>
                <Link href="/retraits" className="home-data-item" style={{ textDecoration: 'none' }}>
                  <div className="home-data-value">{stats?.total_retraits?.toLocaleString('fr') || '—'}</div>
                  <div className="home-data-label">{t('Médicaments retirés', 'أدوية مسحوبة')}</div>
                </Link>
              </div>

              <div className="home-trust">
                <div className="home-trust-title">{t('Des données utiles et actualisées', 'بيانات مفيدة ومحدّثة')}</div>
                <p className="home-trust-text">
                  {t(
                    'Les informations sont collectées à partir de sources pharmaceutiques et institutionnelles algériennes.',
                    'يتم جمع المعلومات من مصادر صيدلانية ومؤسساتية جزائرية.',
                  )}
                </p>
                {formattedDate && (
                  <div className="home-trust-updated">
                    {t('Dernière mise à jour', 'آخر تحديث')} ({stats?.last_version || '—'}) : <strong>{formattedDate}</strong>
                  </div>
                )}
              </div>
            </div>
          </section>
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
