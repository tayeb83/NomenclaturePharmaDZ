'use client'

import Link from 'next/link'
import { DrugCard } from '@/components/drug/DrugCard'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { AdHorizontal } from '@/components/ads/AdBanner'
import { SearchBox } from '@/components/search/SearchBox'
import { getFeaturedArticles } from '@/lib/articles'
import type { PopularPage, PopularSearch } from '@/lib/queries'

export type HomeSpecialite = {
  slug: string
  titre_fr: string
  titre_ar: string | null
  nb_classes: number
  nb_dci: number
  nb_produits: number
}

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

/** Étoile à huit branches (khatam), points pour <polygon>. */
function starPoints(cx: number, cy: number, outer: number, inner: number) {
  return Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI * i) / 8 - Math.PI / 2
    const r = i % 2 ? inner : outer
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

/** Arc outrepassé (style Casbah) abritant le symbole des pharmacies algériennes. */
function HeroNiche() {
  const arch = 'M14 134V66A40 40 0 1 1 86 66V134Z'
  const inner = 'M21 134V67A33 33 0 1 1 79 67V134Z'
  return (
    <div className="hero-niche" aria-hidden="true">
      <svg viewBox="0 0 100 134">
        <defs>
          <pattern id="hero-zellige" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
            <polygon points={starPoints(28, 28, 25, 13.5)} fill="var(--blue)" fillOpacity=".11" stroke="var(--blue)" strokeOpacity=".4" strokeWidth="1.4" />
            <circle cx="28" cy="28" r="3.6" fill="var(--blue)" fillOpacity=".4" />
          </pattern>
        </defs>
        <path d={arch} fill="var(--blue)" />
        <path d={inner} fill="#fff" />
        <path d={inner} fill="url(#hero-zellige)" />
        <path d={inner} fill="none" stroke="var(--brass)" strokeWidth="1.4" />
        <circle cx="50" cy="84" r="26" fill="#fff" stroke="var(--brass)" strokeWidth="1.4" />
        <image href="/emblem-pharma-dz.svg" x="29" y="63" width="42" height="42" />
        <path d="M14 134h72" stroke="var(--brass)" strokeWidth="2" />
      </svg>
    </div>
  )
}

export function HomeClient({
  stats,
  nouveautes,
  retraits,
  lastVersionDate,
  popularPages = [],
  popularSearches = [],
  specialites = [],
}: {
  stats: Stats | null
  nouveautes: any[]
  retraits: any[]
  lastVersionDate: string | null
  popularPages?: PopularPage[]
  popularSearches?: PopularSearch[]
  specialites?: HomeSpecialite[]
}) {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr
  const formattedDate = formatDate(lastVersionDate)
  const num = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('fr'))
  const arrow = lang === 'ar' ? '←' : '→'

  const featuredArticles = getFeaturedArticles(lang, 3)

  const services = [
    { href: '/pharmacie-de-garde', icon: '🌙', tone: 't-teal', title: t('Pharmacie de garde', 'صيدلية المناوبة'), text: t('Ouverte maintenant, cette nuit ou vendredi.', 'مفتوحة الآن أو هذه الليلة أو يوم الجمعة.') },
    { href: '/substitution', icon: '♻️', tone: 't-green', title: t('Trouver un générique', 'البحث عن بديل جنيس'), text: t('Une alternative à un médicament, avec les prix.', 'بديل لدواء ما، مع الأسعار.') },
    { href: '/specialites', icon: '🗂️', tone: 't-brass', title: t('Par spécialité', 'حسب التخصص'), text: t('Dentisterie et autres : les classes utiles.', 'طب الأسنان وغيره: الأصناف المفيدة.') },
    { href: '/training', icon: '✍️', tone: '', title: t('S\'entraîner (QCM)', 'التدرّب (QCM)'), text: t('Pour les étudiants, en français et en arabe.', 'للطلبة، بالفرنسية والعربية.') },
    { href: '/alertes', icon: '🚨', tone: 't-red', title: t('Alertes et retraits', 'التنبيهات والسحب'), text: t('Retraits et AMM non renouvelées.', 'الأدوية المسحوبة وغير المجددة.') },
    { href: '/classes-therapeutiques', icon: '🧬', tone: '', title: t('Classes ATC', 'الأصناف العلاجية'), text: t('Naviguer de la classe à la substance.', 'من الصنف إلى المادة الفعالة.') },
    { href: '/pharmacies', icon: '📍', tone: 't-teal', title: t('Annuaire des pharmacies', 'دليل الصيدليات'), text: t('Par wilaya et commune.', 'حسب الولاية والبلدية.') },
    { href: '/diff', icon: '🆕', tone: 't-green', title: t('Nouveaux médicaments', 'أدوية جديدة'), text: t('Les derniers enregistrements.', 'آخر التسجيلات.') },
  ]

  return (
    <>
      <section className="hero home-hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <span className="hero-eyebrow">
              {formattedDate
                ? t(`Nomenclature officielle · mise à jour du ${formattedDate}`, `التسمية الرسمية · آخر تحديث ${formattedDate}`)
                : t('Nomenclature officielle des médicaments', 'التسمية الرسمية للأدوية')}
            </span>
            <h1>
              {t('Trouvez un médicament ou une pharmacie de garde en Algérie', 'ابحث عن دواء أو صيدلية مناوبة في الجزائر')}
            </h1>
            <p className="hero-lead">
              {stats?.total_enregistrements
                ? t(
                    `${num(stats.total_enregistrements)} médicaments, leurs prix, les alertes de retrait et les pharmacies ouvertes, en français et en arabe.`,
                    `${num(stats.total_enregistrements)} دواءً وأسعارها وتنبيهات السحب والصيدليات المفتوحة، بالفرنسية والعربية.`,
                  )
                : t(
                    'Les médicaments, leurs prix, les alertes de retrait et les pharmacies ouvertes, en français et en arabe.',
                    'الأدوية وأسعارها وتنبيهات السحب والصيدليات المفتوحة، بالفرنسية والعربية.',
                  )}
            </p>

            <SearchBox />

            {popularSearches.length > 0 && (
              <div className="home-search-chips">
                <span>{t('Souvent recherchés :', 'الأكثر بحثًا:')}</span>
                {popularSearches.slice(0, 5).map(search => (
                  <Link key={search.query} href={`/recherche?q=${encodeURIComponent(search.query)}`} className="home-chip">
                    {search.query}
                  </Link>
                ))}
              </div>
            )}

            <div className="home-hero-cta">
              <Link href="/garde" className="home-action-btn solid">📍 {t('Pharmacie de garde près de moi', 'صيدلية مناوبة قربي')}</Link>
              <Link href="/pharmacie-de-garde" className="home-action-btn outline">🏘️ {t('Choisir une commune', 'اختيار البلدية')}</Link>
            </div>
          </div>
          <HeroNiche />
        </div>
      </section>

      <div className="container">
        <div className="home-strip">
          <Link href="/medicaments" className="home-strip-item">
            <span className="home-strip-value">{num(stats?.total_enregistrements)}</span>
            <span className="home-strip-label">{t('Médicaments enregistrés', 'أدوية مسجلة')}</span>
          </Link>
          <Link href="/diff" className="home-strip-item">
            <span className="home-strip-value">{num(stats?.total_nouveautes)}</span>
            <span className="home-strip-label">{t('Nouveautés de la version', 'مستجدات الإصدار')}</span>
          </Link>
          <Link href="/retraits" className="home-strip-item">
            <span className="home-strip-value">{num(stats?.total_retraits)}</span>
            <span className="home-strip-label">{t('Médicaments retirés', 'أدوية مسحوبة')}</span>
          </Link>
        </div>
      </div>

      <div className="page-body" style={{ paddingTop: 0 }}>
        <div className="container">

          <section className="home-block">
            <div className="home-block-head">
              <div className="section-title">{t('Que cherchez-vous ?', 'عمَّ تبحث؟')}</div>
            </div>
            <div className="home-services-grid">
              {services.map(s => (
                <Link key={s.href} href={s.href} className={`home-service-card ${s.tone}`}>
                  <div className="home-service-icon" aria-hidden="true">{s.icon}</div>
                  <div className="home-service-title">{s.title}</div>
                  <div className="home-service-text">{s.text}</div>
                </Link>
              ))}
            </div>
          </section>

          {specialites.length > 0 && (
            <section className="home-block">
              <div className="home-spec">
                <div className="home-block-head">
                  <div>
                    <div className="section-title">{t('Les médicaments de votre spécialité', 'أدوية تخصصك')}</div>
                    <div className="section-sub">{t('Médecins, dentistes, étudiants : retrouvez vos classes en un clic.', 'أطباء وأطباء أسنان وطلبة: اعثروا على أصنافكم بنقرة واحدة.')}</div>
                  </div>
                  <Link href="/specialites" className="home-more">{t('Toutes les spécialités', 'كل التخصصات')} {arrow}</Link>
                </div>
                <div className="home-spec-grid">
                  {specialites.slice(0, 4).map(sp => (
                    <Link key={sp.slug} href={`/specialites/${sp.slug}`} className="home-spec-card">
                      <b>{lang === 'ar' && sp.titre_ar ? sp.titre_ar : sp.titre_fr}</b>
                      <span>
                        {sp.nb_classes} {t(sp.nb_classes > 1 ? 'classes' : 'classe', 'أصناف')} · {sp.nb_produits.toLocaleString('fr')} {t('fiches', 'بطاقة')}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          <AdHorizontal slot={AD_SLOT_HOME_TOP} />

          {/* Index des pages les plus consultées — alimenté par le trafic réel */}
          {popularPages.length > 0 && (
            <section className="home-block">
              <div className="section-title">
                🔥 {t(
                  `Top ${popularPages.length} des pages les plus recherchées`,
                  `أكثر ${popularPages.length} صفحات بحثًا`
                )}
              </div>
              <div className="section-sub">
                {t(
                  'Le classement des pages les plus consultées par les visiteurs sur les 30 derniers jours.',
                  'ترتيب الصفحات الأكثر زيارة من طرف المستخدمين خلال آخر 30 يومًا.'
                )}
              </div>

              <ol className="home-popular-list">
                {popularPages.map((page, index) => (
                  <li key={page.path} className="home-popular-row">
                    <Link href={page.path} className="home-popular-item">
                      <span className="home-popular-rank">{index + 1}</span>
                      <span className="home-popular-label">{page.label}</span>
                      <span className="home-popular-count">
                        {page.visits.toLocaleString('fr')} {t('vues', 'مشاهدة')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>

              {popularSearches.length > 0 && (
                <div className="home-popular-searches">
                  <div className="home-popular-searches-title">
                    🔎 {t('Recherches populaires', 'عمليات البحث الشائعة')}
                  </div>
                  <div className="home-popular-chips">
                    {popularSearches.map(search => (
                      <Link
                        key={search.query}
                        href={`/recherche?q=${encodeURIComponent(search.query)}`}
                        className="home-popular-chip"
                      >
                        {search.query}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Nouveautés + Retraits */}
          <section className="home-block home-two-cols">
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
              <Link href="/diff" className="home-all-link green">{t('Voir tout', 'عرض الكل')} {arrow}</Link>
            </div>

            <div>
              <div className="section-title">🚨 {t('Derniers retraits', 'آخر الانسحابات')}</div>
              <div className="section-sub">
                {t('Médicaments retirés du marché (feuille Retraits)', 'الأدوية المسحوبة من السوق')}
              </div>
              {retraits.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'retrait', similarity_score: 1 } as any} type="retrait" />
              ))}
              <Link href="/alertes" className="home-all-link red">{t('Voir tout', 'عرض الكل')} {arrow}</Link>
            </div>
          </section>

          <section className="home-block">
            <div className="home-block-head">
              <div>
                <div className="section-title">📰 {t('Articles & dossiers', 'مقالات ودراسات')}</div>
                <div className="section-sub">
                  {t('Guides pratiques et actualités pharmaceutiques en Algérie.', 'أدلة عملية وأخبار صيدلانية في الجزائر.')}
                </div>
              </div>
              <Link href="/articles" className="home-more">{t('Voir tous les articles', 'عرض كل المقالات')} {arrow}</Link>
            </div>
            <div className="home-articles-grid">
              {featuredArticles.map(article => (
                <Link key={article.slug} href={`/articles/${article.slug}`} className="home-article">
                  <div className="home-article-meta">
                    <span className="home-article-tag">
                      {article.audience === 'professionnel' ? t('Professionnel', 'مهني') : t('Étudiant', 'طالب')}
                    </span>
                    <span className="home-article-time">{article.readingTime} {lang === 'ar' ? 'دقائق' : 'min'}</span>
                  </div>
                  <div className="home-article-title" dir={article.lang === 'ar' ? 'rtl' : 'ltr'}>{article.title}</div>
                  <div className="home-article-desc" dir={article.lang === 'ar' ? 'rtl' : 'ltr'}>{article.description}</div>
                </Link>
              ))}
            </div>
          </section>

          <AdHorizontal slot={AD_SLOT_HOME_MIDDLE} />

          <section className="home-block">
            <div className="home-data-section">
              <div className="home-trust" style={{ marginTop: 0 }}>
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

          {/* Présentation courte, VISIBLE : le texte masqué est traité comme du spam par Google
              (classement, validation AdSense). */}
          <section className="home-about">
            <h2>{t('Pharma DZ : votre guide médicaments en Algérie', 'Pharma DZ: دليلك لأدوية الجزائر')}</h2>
            <p>
              {lang === 'ar' ? (
                <>إذا كنت تبحث عن <strong>Pharma DZ</strong> أو <strong>صيدلية الجزائر</strong> أو <strong>أدوية الجزائر</strong>، يوفر لك DwaDZ البحث السريع في التسمية الرسمية مع صفحات مخصصة لـ <Link href="/recherche">الأدوية</Link> و<Link href="/alertes">التنبيهات</Link> و<Link href="/substitution">البدائل الجنيسة</Link>.</>
              ) : (
                <>Si vous cherchez <strong>Pharma DZ</strong>, <strong>pharmacie Algérie</strong> ou <strong>médicaments Algérie</strong>, DwaDZ centralise la nomenclature officielle avec des pages dédiées à la <Link href="/recherche">recherche de médicaments</Link>, aux <Link href="/alertes">alertes</Link> et à la <Link href="/substitution">substitution générique</Link>.</>
              )}
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
