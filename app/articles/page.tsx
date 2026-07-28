import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { ARTICLES, getFeaturedArticles } from '@/lib/articles'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Articles & Veille Réglementaire | DwaDZ',
  description:
    'Articles de fond sur la réglementation pharmaceutique en Algérie : Loi 18-11, exercice officinal, Data Matrix, pharmacovigilance et fiches de révision pour étudiants en pharmacie.',
  alternates: { canonical: `${APP_URL}/articles` },
  openGraph: {
    title: 'Articles & Veille Réglementaire | DwaDZ',
    description: 'Loi 18-11, réglementation officine, Data Matrix, pharmacovigilance et fiches de révision — DwaDZ.',
    url: `${APP_URL}/articles`,
    siteName: 'DwaDZ',
    locale: 'fr_DZ',
    type: 'website',
  },
}

const AUDIENCE_LABEL: Record<string, { fr: string; ar: string; color: string }> = {
  professionnel: { fr: 'Professionnel', ar: 'مهني', color: '#0284c7' },
  etudiant: { fr: 'Étudiant', ar: 'طالب', color: '#16a34a' },
}

export default async function ArticlesPage() {
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'

  const visibleArticles = ARTICLES.filter(a => a.lang === lang)
  const otherLangArticles = ARTICLES.filter(a => a.lang !== lang)
  const featuredArticles = getFeaturedArticles(lang, 3)

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: lang === 'ar' ? 'مقالات DwaDZ' : 'Articles DwaDZ',
    itemListElement: visibleArticles.map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${APP_URL}/articles/${article.slug}`,
      name: article.title,
      description: article.description,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0f172a, #0c2340)' }}>
        <div className="container">
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '.06em', marginBottom: 4 }}>
            {pickLang(lang, { fr: 'VEILLE RÉGLEMENTAIRE & CONTENU SEO', ar: 'مراقبة تنظيمية ومحتوى محسّن للسيو' })}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'white', margin: 0 }}>
            {pickLang(lang, { fr: '📰 Articles & Dossiers', ar: '📰 مقالات ودراسات' })}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8, marginBottom: 0, maxWidth: 760 }}>
            {pickLang(lang, {
              fr: 'Une bibliothèque éditoriale pensée pour le SEO pharmaceutique en Algérie : réglementation officinale, traçabilité, pharmacovigilance, fiches de révision et maillage interne vers les pages stratégiques du site.',
              ar: 'مكتبة تحريرية موجّهة لتحسين الظهور في محركات البحث داخل المجال الصيدلاني بالجزائر: التنظيم، التتبع، اليقظة الدوائية، وبطاقات مراجعة مع ربط داخلي نحو الصفحات الأساسية في الموقع.',
            })}
          </p>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 1040 }}>
          <section style={{
            background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
            border: '1.5px solid #dbeafe',
            borderRadius: 16,
            padding: '22px 24px',
            marginBottom: 28,
          }}>
            <div className="articles-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 20, alignItems: 'start' }}>
              <div>
                <h2 style={{ margin: '0 0 10px', fontSize: 20, color: '#0f172a', fontWeight: 800 }}>
                  {pickLang(lang, { fr: 'Pourquoi cette section aide votre SEO ?', ar: 'كيف تساعد هذه الصفحة في تحسين السيو؟' })}
                </h2>
                <ul style={{ margin: 0, paddingInlineStart: 18, color: '#334155', lineHeight: 1.8, fontSize: 14.5 }}>
                  <li>{pickLang(lang, { fr: 'Couvre des requêtes longue traîne recherchées par les pharmaciens et les étudiants.', ar: 'تغطي كلمات مفتاحية طويلة يبحث عنها الصيادلة والطلبة.' })}</li>
                  <li>{pickLang(lang, { fr: 'Renforce le maillage interne vers la recherche, les alertes, la veille et les médicaments.', ar: 'تعزز الربط الداخلي نحو البحث والتنبيهات والمراقبة وصفحات الأدوية.' })}</li>
                  <li>{pickLang(lang, { fr: 'Ajoute des contenus bilingues FR/AR avec balisage structuré pour une meilleure indexation.', ar: 'تضيف محتوى ثنائي اللغة مع بيانات منظمة لتحسين الفهرسة.' })}</li>
                </ul>
              </div>
              <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '18px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0369a1', marginBottom: 10 }}>
                  {pickLang(lang, { fr: 'ARTICLES MIS EN AVANT', ar: 'مقالات بارزة' })}
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {featuredArticles.map(article => (
                    <Link key={article.slug} href={`/articles/${article.slug}`} style={{ textDecoration: 'none' }}>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', background: '#f8fafc' }}>
                        <div style={{ fontSize: 13.5, color: '#0f172a', fontWeight: 700, marginBottom: 4, direction: article.lang === 'ar' ? 'rtl' : 'ltr' }}>
                          {article.title}
                        </div>
                        <div style={{ fontSize: 12.5, color: '#64748b' }}>{article.readingTime} {lang === 'ar' ? 'دقائق' : 'min'}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div style={{ marginBottom: 40 }}>
            {visibleArticles.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>
                {pickLang(lang, { fr: 'Aucun article disponible pour le moment.', ar: 'لا توجد مقالات متاحة حالياً.' })}
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 20 }}>
                {visibleArticles.map(article => {
                  const aud = AUDIENCE_LABEL[article.audience]
                  return (
                    <Link
                      key={article.slug}
                      href={`/articles/${article.slug}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        style={{
                          background: 'white',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: 14,
                          padding: '22px 24px',
                          transition: 'box-shadow .15s, border-color .15s',
                          cursor: 'pointer',
                        }}
                        className="article-card"
                      >
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: aud?.color ?? '#64748b', color: 'white',
                          }}>
                            {lang === 'ar' ? aud?.ar : aud?.fr}
                          </span>
                          {article.tags.slice(0, 4).map(tag => (
                            <span key={tag} style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: '#f1f5f9', color: '#475569',
                            }}>{tag}</span>
                          ))}
                        </div>

                        <h2 style={{
                          fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800,
                          color: '#0f172a', margin: '0 0 6px',
                          direction: article.lang === 'ar' ? 'rtl' : 'ltr',
                        }}>
                          {article.title}
                        </h2>
                        <p style={{
                          color: '#475569', fontSize: 14.5, margin: '0 0 12px', lineHeight: 1.7,
                          direction: article.lang === 'ar' ? 'rtl' : 'ltr',
                        }}>
                          {article.description}
                        </p>

                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: '#94a3b8' }}>
                          <span>🗓 {new Date(article.date).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          <span>⏱ {article.readingTime} {lang === 'ar' ? 'دقائق' : 'min'}</span>
                          {article.seoKeywords?.length ? <span>🔎 {article.seoKeywords.slice(0, 2).join(' • ')}</span> : null}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {otherLangArticles.length > 0 && (
            <div style={{
              background: '#f8fafc', border: '1.5px solid #e2e8f0',
              borderRadius: 10, padding: '16px 20px', marginBottom: 32,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                {pickLang(lang, {
                  fr: '🌐 Ces articles sont aussi disponibles en arabe. Utilisez le sélecteur de langue pour accéder aux versions traduites et renforcer le maillage bilingue.',
                  ar: '🌐 هذه المقالات متاحة أيضاً بالفرنسية. استخدموا مبدّل اللغة للوصول إلى النسخ المترجمة وتعزيز الربط الثنائي اللغة.',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .article-card:hover {
          box-shadow: 0 4px 24px rgba(0,0,0,0.09);
          border-color: #0284c7 !important;
        }
        @media (max-width: 800px) {
          .articles-hero-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}
