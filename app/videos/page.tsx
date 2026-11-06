import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { formatDuree, listPublishedVideos, videoJsonLd } from '@/lib/videos'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vidéos pédagogiques — médicaments, DCI, ATC, interactions',
  description: 'Courtes vidéos animées en arabe, sous-titrées en français : comprendre la DCI, la classification ATC, les interactions médicamenteuses.',
  alternates: { canonical: `${APP_URL}/videos` },
  openGraph: { title: 'Vidéos pédagogiques DwaDZ', description: 'Comprendre les médicaments en quelques minutes : DCI, ATC, interactions.', url: `${APP_URL}/videos`, siteName: 'DwaDZ', locale: 'fr_DZ', type: 'website' },
}

export default async function VideosPage() {
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'
  const videos = await listPublishedVideos()
  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: videos.map((v, i) => ({ '@type': 'ListItem', position: i + 1, url: `${APP_URL}/videos/${v.slug}`, name: v.titre_fr })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {videos.map((v) => (
        <script key={v.slug} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd(v, APP_URL, lang)) }} />
      ))}
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0f172a, #0c2340)' }}>
        <div className="container">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'white', margin: 0 }}>
            {pickLang(lang, { fr: '🎬 Vidéos pédagogiques', ar: '🎬 فيديوهات تعليمية' })}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8, marginBottom: 0, maxWidth: 720 }}>
            {pickLang(lang, {
              fr: 'Courtes vidéos animées, commentées en arabe et sous-titrées en français, pour comprendre les médicaments.',
              ar: 'فيديوهات قصيرة متحركة بالعربية مع ترجمة فرنسية لفهم الأدوية.',
            })}
          </p>
        </div>
      </div>
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1040 }}>
          {videos.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>
              {pickLang(lang, { fr: 'Les premières vidéos arrivent bientôt.', ar: 'الفيديوهات الأولى قريباً.' })}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 20, marginBottom: 40 }}>
              {videos.map((v) => {
                const titre = lang === 'ar' ? v.titre_ar : v.titre_fr
                const autre = lang === 'ar' ? v.titre_fr : v.titre_ar
                return (
                  <Link key={v.slug} href={`/videos/${v.slug}`} style={{ textDecoration: 'none' }}>
                    <article style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', background: 'white', height: '100%' }}>
                      <div style={{ position: 'relative', aspectRatio: '9 / 12', background: 'linear-gradient(160deg, #0f4c5c, #071f29)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {v.poster_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={v.poster_url} alt={titre} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 56 }}>🎬</span>}
                        <span style={{ position: 'absolute', insetInlineEnd: 8, bottom: 8, background: 'rgba(0,0,0,.7)', color: 'white', fontSize: 12, padding: '2px 8px', borderRadius: 99 }}>
                          ▶ {formatDuree(v.duree_sec)}
                        </span>
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        {v.episode ? <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 800 }}>{pickLang(lang, { fr: 'ÉPISODE', ar: 'الحلقة' })} {v.episode}</div> : null}
                        <h2 style={{ fontSize: 16, margin: '4px 0', color: '#0f172a', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>{titre}</h2>
                        <div style={{ fontSize: 12.5, color: '#64748b', direction: lang === 'ar' ? 'ltr' : 'rtl' }}>{autre}</div>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
