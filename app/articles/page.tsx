import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { ARTICLES } from '@/lib/articles'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Articles & Veille Réglementaire | PharmaVeille DZ',
  description:
    'Articles de fond sur la réglementation pharmaceutique en Algérie : Loi 18-11, exercice officinal, fiches de révision pour étudiants en pharmacie. مقالات حول التشريع الصيدلاني في الجزائر.',
  alternates: { canonical: `${APP_URL}/articles` },
  openGraph: {
    title: 'Articles & Veille Réglementaire | PharmaVeille DZ',
    description: 'Loi 18-11, réglementation officine, fiches de révision — PharmaVeille DZ.',
    url: `${APP_URL}/articles`,
    siteName: 'PharmaVeille DZ',
    locale: 'fr_DZ',
    type: 'website',
  },
}

const AUDIENCE_LABEL: Record<string, { fr: string; ar: string; color: string }> = {
  professionnel: { fr: 'Professionnel', ar: 'مهني', color: '#0284c7' },
  etudiant: { fr: 'Étudiant', ar: 'طالب', color: '#16a34a' },
}

const LANG_LABEL: Record<string, { badge: string; color: string }> = {
  fr: { badge: '🇫🇷 FR', color: '#4f46e5' },
  ar: { badge: '🇩🇿 AR', color: '#0891b2' },
}

export default async function ArticlesPage() {
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'

  // Show all articles, sorted so current language comes first
  const allArticles = [
    ...ARTICLES.filter(a => a.lang === lang),
    ...ARTICLES.filter(a => a.lang !== lang),
  ]

  return (
    <>
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0f172a, #0c2340)' }}>
        <div className="container">
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '.06em', marginBottom: 4 }}>
            {pickLang(lang, { fr: 'VEILLE RÉGLEMENTAIRE & RESSOURCES', ar: 'مراقبة تنظيمية وموارد' })}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'white', margin: 0 }}>
            {pickLang(lang, { fr: '📰 Articles & Dossiers', ar: '📰 مقالات ودراسات' })}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 8, marginBottom: 0 }}>
            {pickLang(lang, {
              fr: 'Analyses réglementaires, fiches de révision et actualités pharmaceutiques en Algérie',
              ar: 'تحليلات تنظيمية، بطاقات مراجعة وأخبار صيدلانية في الجزائر',
            })}
          </p>
        </div>
      </div>

      {/* ─── Body ───────────────────────────────────────────── */}
      <div className="page-body">
        <div className="container" style={{ maxWidth: 960 }}>
          <div style={{ display: 'grid', gap: 20, marginTop: 8 }}>
            {allArticles.map(article => {
              const aud = AUDIENCE_LABEL[article.audience]
              const langBadge = LANG_LABEL[article.lang]
              return (
                <Link
                  key={article.slug}
                  href={`/articles/${article.slug}`}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div style={{
                    background: 'white',
                    border: `1.5px solid ${article.lang === lang ? '#bfdbfe' : '#e2e8f0'}`,
                    borderRadius: 12,
                    padding: '20px 24px',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: langBadge?.color ?? '#64748b', color: 'white',
                      }}>
                        {langBadge?.badge}
                      </span>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: aud?.color ?? '#64748b', color: 'white',
                      }}>
                        {article.lang === 'ar' ? aud?.ar : aud?.fr}
                      </span>
                      {article.tags.slice(0, 2).map(tag => (
                        <span key={tag} style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: '#f1f5f9', color: '#475569',
                        }}>{tag}</span>
                      ))}
                    </div>

                    <h2 style={{
                      fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800,
                      color: '#0f172a', margin: '0 0 6px',
                      direction: article.lang === 'ar' ? 'rtl' : 'ltr',
                    }}>
                      {article.title}
                    </h2>
                    <p style={{
                      color: '#475569', fontSize: 14, margin: '0 0 12px', lineHeight: 1.6,
                      direction: article.lang === 'ar' ? 'rtl' : 'ltr',
                    }}>
                      {article.description}
                    </p>

                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, color: '#94a3b8' }}>
                      <span>🗓 {new Date(article.date).toLocaleDateString(article.lang === 'ar' ? 'ar-DZ' : 'fr-DZ', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span>⏱ {article.readingTime} {article.lang === 'ar' ? 'دقائق' : 'min'}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
