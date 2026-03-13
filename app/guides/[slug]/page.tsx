import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { seoIntentPages, seoIntentPagesBySlug } from '@/lib/seo-intent-pages'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

type Props = {
  params: { slug: string }
}

export function generateStaticParams() {
  return seoIntentPages.map(page => ({ slug: page.slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const page = seoIntentPagesBySlug[params.slug]
  if (!page) return {}

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `${APP_URL}/guides/${page.slug}` },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${APP_URL}/guides/${page.slug}`,
      type: 'article',
    },
  }
}

export default function SeoGuidePage({ params }: Props) {
  const page = seoIntentPagesBySlug[params.slug]

  if (!page) {
    notFound()
  }

  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0369a1, #0f766e)' }}>
        <div className="container">
          <h1>📌 {page.h1}</h1>
          <p>{page.description}</p>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 920 }}>
          <div className="alert-banner info" style={{ marginBottom: 20 }}>
            <strong>Guide local Algérie :</strong> {page.intro}
          </div>

          <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 20, color: '#0f172a' }}>Ce que vous trouverez ici</h2>
            <ul style={{ marginBottom: 0, color: '#334155', lineHeight: 1.8 }}>
              {page.bullets.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section style={{ marginTop: 20, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 20, color: '#0f172a' }}>Passez à l’action</h2>
            <p style={{ color: '#475569', marginBottom: 16 }}>
              Utilisez la fonctionnalité dédiée pour obtenir les données à jour et vérifier les informations officielles.
            </p>
            <Link
              href={page.ctaHref}
              style={{
                display: 'inline-block',
                background: '#0284c7',
                color: 'white',
                textDecoration: 'none',
                fontWeight: 700,
                borderRadius: 8,
                padding: '10px 16px',
              }}
            >
              {page.ctaLabel} →
            </Link>
          </section>
        </div>
      </div>
    </>
  )
}
