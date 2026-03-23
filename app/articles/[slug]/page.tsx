import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { getArticleBySlug, getRelatedArticles, type ArticleSection } from '@/lib/articles'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

// Force dynamic rendering — cookies() requires request context
export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const article = getArticleBySlug(params.slug)
  if (!article) return { title: 'Article introuvable' }

  const canonical = `${APP_URL}/articles/${article.slug}`
  return {
    title: `${article.title} | PharmaVeille DZ`,
    description: article.description,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.date,
      siteName: 'PharmaVeille DZ',
      locale: article.lang === 'ar' ? 'ar_DZ' : 'fr_DZ',
      url: canonical,
      tags: article.tags,
    },
  }
}

// ─── Section Renderers ──────────────────────────────────────────

function renderBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

function RenderSection({ section, isRtl }: { section: ArticleSection; isRtl: boolean }) {
  const dir = isRtl ? 'rtl' : 'ltr'

  if (section.type === 'intro') {
    return (
      <p style={{ fontSize: 15.5, color: '#334155', lineHeight: 1.8, direction: dir, marginBottom: 28 }}>
        {section.text}
      </p>
    )
  }

  if (section.type === 'h2') {
    return (
      <div style={{ marginTop: 32, marginBottom: 12 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800,
          color: '#0f172a', direction: dir, margin: '0 0 8px',
        }}>
          {section.title}
        </h2>
        {section.text && (
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, direction: dir, margin: 0 }}>
            {section.text}
          </p>
        )}
      </div>
    )
  }

  if (section.type === 'h3') {
    return (
      <h3 style={{
        fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700,
        color: '#1e293b', direction: dir, margin: '20px 0 8px',
      }}>
        {section.title}
      </h3>
    )
  }

  if (section.type === 'paragraph') {
    return (
      <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, direction: dir, marginBottom: 16 }}>
        {section.text}
      </p>
    )
  }

  if (section.type === 'list' && section.items) {
    return (
      <ul style={{ paddingInlineStart: 20, margin: '12px 0 20px', direction: dir }}>
        {section.items.map((item, i) => (
          <li key={i} style={{ fontSize: 15, color: '#334155', lineHeight: 1.7, marginBottom: 8 }}>
            {renderBold(item)}
          </li>
        ))}
      </ul>
    )
  }

  if (section.type === 'table' && section.headers && section.rows) {
    return (
      <div style={{ overflowX: 'auto', margin: '16px 0 24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, direction: dir }}>
          <thead>
            <tr>
              {section.headers.map((h, i) => (
                <th key={i} style={{
                  background: '#0f172a', color: 'white', padding: '10px 14px',
                  textAlign: isRtl ? 'right' : 'left', fontWeight: 700,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? '#f8fafc' : 'white' }}>
                {row.cells.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: '10px 14px', border: '1px solid #e2e8f0',
                    color: '#334155', textAlign: isRtl ? 'right' : 'left',
                  }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (section.type === 'callout') {
    const styles: Record<string, { bg: string; border: string; color: string }> = {
      warning: { bg: '#fef3c7', border: '#f59e0b', color: '#92400e' },
      tip: { bg: '#eff6ff', border: '#0284c7', color: '#1e40af' },
      info: { bg: '#f0fdf4', border: '#16a34a', color: '#14532d' },
    }
    const s = styles[section.variant ?? 'info']
    return (
      <div style={{
        background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 10,
        padding: '14px 18px', margin: '20px 0', direction: dir,
      }}>
        <p style={{ margin: 0, fontSize: 14.5, color: s.color, lineHeight: 1.7 }}>
          {section.text}
        </p>
      </div>
    )
  }

  if (section.type === 'qcm' && section.questions) {
    return (
      <div style={{ margin: '20px 0' }}>
        {section.questions.map((q, qi) => (
          <div key={qi} style={{
            background: '#f8fafc', border: '1.5px solid #e2e8f0',
            borderRadius: 10, padding: '16px 20px', marginBottom: 16, direction: dir,
          }}>
            <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 10px', fontSize: 15 }}>
              {qi + 1}. {q.question}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px' }}>
              {q.options.map(opt => (
                <li key={opt.label} style={{
                  padding: '6px 12px', borderRadius: 6, marginBottom: 4, fontSize: 14,
                  background: opt.label === q.answer ? '#d1fae5' : 'white',
                  border: `1px solid ${opt.label === q.answer ? '#16a34a' : '#e2e8f0'}`,
                  color: opt.label === q.answer ? '#065f46' : '#334155',
                  fontWeight: opt.label === q.answer ? 700 : 400,
                }}>
                  {opt.label}) {opt.text}
                  {opt.label === q.answer && (
                    <span style={{ marginInlineStart: 8, fontSize: 12 }}>✅ {isRtl ? 'الجواب الصحيح' : 'Bonne réponse'}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  return null
}

export default async function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'

  const article = getArticleBySlug(params.slug)
  if (!article) notFound()

  const related = getRelatedArticles(params.slug, article.lang)
  const isRtl = article.lang === 'ar'

  // Alternate language article (same audience, other lang)
  const altSlug = article.slug.endsWith('-ar')
    ? article.slug.replace(/-ar$/, '')
    : `${article.slug}-ar`
  const altArticle = getArticleBySlug(altSlug)

  const AUDIENCE_LABEL: Record<string, { fr: string; ar: string; color: string }> = {
    professionnel: { fr: 'Professionnel', ar: 'مهني', color: '#0284c7' },
    etudiant: { fr: 'Étudiant', ar: 'طالب', color: '#16a34a' },
  }
  const aud = AUDIENCE_LABEL[article.audience]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    inLanguage: article.lang,
    keywords: article.tags.join(', '),
    publisher: {
      '@type': 'Organization',
      name: 'PharmaVeille DZ',
      url: APP_URL,
    },
    url: `${APP_URL}/articles/${article.slug}`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0f172a, #0c2340)' }}>
        <div className="container">
          <Link href="/articles" className="detail-back-link">
            {pickLang(lang, { fr: '← Retour aux articles', ar: '→ العودة إلى المقالات' })}
          </Link>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: aud?.color ?? '#64748b', color: 'white',
              }}>
                {article.lang === 'ar' ? aud?.ar : aud?.fr}
              </span>
              {article.tags.slice(0, 3).map(tag => (
                <span key={tag} style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11,
                  background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
                }}>{tag}</span>
              ))}
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'white',
              margin: '0 0 8px', direction: isRtl ? 'rtl' : 'ltr', lineHeight: 1.3,
            }}>
              {article.title}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '0 0 8px', direction: isRtl ? 'rtl' : 'ltr' }}>
              {article.subtitle}
            </p>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              <span>🗓 {new Date(article.date).toLocaleDateString(article.lang === 'ar' ? 'ar-DZ' : 'fr-DZ', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span>⏱ {article.readingTime} {article.lang === 'ar' ? 'دقائق' : 'min de lecture'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Body ───────────────────────────────────────────── */}
      <div className="page-body">
        <div className="container" style={{ maxWidth: 780 }}>

          {/* Language switcher */}
          {altArticle && (
            <div style={{
              background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8,
              padding: '10px 16px', marginBottom: 28, display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
              <span style={{ fontSize: 13, color: '#1e40af' }}>
                {article.lang === 'fr'
                  ? '🌐 Cet article est disponible en arabe'
                  : '🌐 هذا المقال متاح باللغة الفرنسية'}
              </span>
              <Link href={`/articles/${altArticle.slug}`} style={{
                fontSize: 13, fontWeight: 700, color: '#0284c7', textDecoration: 'none',
                padding: '4px 12px', background: 'white', borderRadius: 6, border: '1.5px solid #bfdbfe',
              }}>
                {article.lang === 'fr' ? 'النسخة العربية ←' : '→ Version française'}
              </Link>
            </div>
          )}

          {/* Article content */}
          <article style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
            {article.content.map((section, i) => (
              <RenderSection key={i} section={section} isRtl={isRtl} />
            ))}
          </article>

          {/* Tags */}
          <div style={{ marginTop: 32, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {article.tags.map(tag => (
              <span key={tag} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
              }}>{tag}</span>
            ))}
          </div>

          {/* Back link */}
          <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/articles" style={{
              padding: '10px 20px', background: '#f1f5f9', color: '#334155',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
              border: '1.5px solid #e2e8f0',
            }}>
              {pickLang(lang, { fr: '← Tous les articles', ar: '→ كل المقالات' })}
            </Link>
            <Link href="/recherche" style={{
              padding: '10px 20px', background: '#0284c7', color: 'white',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
            }}>
              🔍 {pickLang(lang, { fr: 'Rechercher un médicament', ar: 'البحث عن دواء' })}
            </Link>
          </div>

          {/* Related articles */}
          {related.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <div className="section-title">
                {pickLang(lang, { fr: '📚 Articles connexes', ar: '📚 مقالات ذات صلة' })}
              </div>
              <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
                {related.map(rel => (
                  <Link key={rel.slug} href={`/articles/${rel.slug}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10,
                      padding: '14px 18px', transition: 'border-color .15s',
                    }} className="article-card">
                      <div style={{
                        fontWeight: 700, color: '#0f172a', fontSize: 15, marginBottom: 4,
                        direction: rel.lang === 'ar' ? 'rtl' : 'ltr',
                      }}>
                        {rel.title}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', direction: rel.lang === 'ar' ? 'rtl' : 'ltr' }}>
                        {rel.subtitle}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        .article-card:hover { border-color: #0284c7 !important; }
      `}</style>
    </>
  )
}
