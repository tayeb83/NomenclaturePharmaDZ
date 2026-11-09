import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { getPublishedVideo, getPublishedVtts, listPublishedVideos, videoJsonLd, vttToLines, formatDuree, withUtm } from '@/lib/videos'
import ShareBar from '@/components/drug/ShareBar'
import { hashtagsArticle, ligneSuivre, texteACopier } from '@/lib/article-share'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const v = await getPublishedVideo(params.slug)
  if (!v) return { title: 'Vidéo introuvable' }
  const canonical = `${APP_URL}/videos/${v.slug}`
  const description = v.description_fr || v.titre_fr
  return {
    title: v.titre_fr,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${v.titre_fr} — ${v.titre_ar}`, description, url: canonical, siteName: 'DwaDZ', type: 'video.other',
      videos: [{ url: v.video_url, type: 'video/mp4', width: 720, height: 1280 }],
      ...(v.poster_url ? { images: [{ url: v.poster_url }] } : {}),
    },
  }
}

export default async function VideoPage({ params }: { params: { slug: string } }) {
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'
  const v = await getPublishedVideo(params.slug)
  if (!v) notFound()

  const [vtts, all] = await Promise.all([getPublishedVtts(v.slug), listPublishedVideos()])
  const titre = lang === 'ar' ? v.titre_ar : v.titre_fr
  const description = lang === 'ar' ? v.description_ar : v.description_fr
  const url = `${APP_URL}/videos/${v.slug}`
  const hashtags = hashtagsArticle(['DwaDZ', ...v.tags], lang)
  const lignesAr = vttToLines(vtts.ar)
  const lignesFr = vttToLines(vtts.fr)
  const autres = all.filter((o) => o.slug !== v.slug).slice(0, 3)
  const tracks = !v.sous_titres_incrustes
    ? ([['ar', 'العربية', vtts.ar], ['fr', 'Français', vtts.fr]] as const).filter(([, , t]) => !!t)
    : []

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd(v, APP_URL, lang)) }} />
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0f172a, #0c2340)' }}>
        <div className="container">
          <Link href="/videos" style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, textDecoration: 'none' }}>
            {pickLang(lang, { fr: '← Toutes les vidéos', ar: 'جميع الفيديوهات ←' })}
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'white', margin: '8px 0 0', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>{titre}</h1>
        </div>
      </div>
      <div className="page-body">
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 20px' }}>
            <video controls playsInline preload="metadata" poster={v.poster_url ?? undefined} style={{ width: '100%', maxWidth: 420, borderRadius: 14, background: '#000' }}>
              <source src={v.video_url} type="video/mp4" />
              {tracks.map(([code, label], i) => (
                <track key={code} kind="subtitles" srcLang={code} label={label} src={`/api/videos/${v.slug}/captions/${code}`} default={code === lang || (i === 0 && !tracks.some(([c]) => c === lang))} />
              ))}
            </video>
          </div>
          {v.duree_sec ? <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: -8 }}>{formatDuree(v.duree_sec)}</p> : null}
          {description && <p style={{ fontSize: 16, lineHeight: 1.8, color: '#334155', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>{description}</p>}

          {v.cta_url && (
            <p style={{ textAlign: 'center', margin: '4px 0 20px' }}>
              <a
                href={withUtm(v.cta_url, { source: 'site', medium: 'video', campaign: v.slug })}
                style={{ display: 'inline-block', background: '#0f4c5c', color: '#fff', padding: '12px 26px', borderRadius: 999, fontWeight: 800, fontSize: 16, textDecoration: 'none', border: '2px solid #ffd166' }}
              >
                👉 {(lang === 'ar' ? v.cta_label_ar || v.cta_label_fr : v.cta_label_fr || v.cta_label_ar) || pickLang(lang, { fr: 'Essayer sur DwaDZ', ar: 'جرّب في DwaDZ' })}
              </a>
            </p>
          )}

          <ShareBar
            url={url} title={titre} text={`${titre}\n${description}`.trim()} lang={lang} hashtags={hashtags}
            libelle={pickLang(lang, { fr: 'Partager cette vidéo', ar: 'شارك هذا الفيديو' })}
            texteComplet={texteACopier({ text: `${titre}\n${description}`.trim(), url, hashtags, lang })} suivi={ligneSuivre(lang)}
          />

          {(lignesAr.length > 0 || lignesFr.length > 0) && (
            <details style={{ margin: '24px 0', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', background: '#f8fafc' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{pickLang(lang, { fr: 'Transcription', ar: 'النص الكامل' })}</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 12 }}>
                {lignesAr.length > 0 && <ol dir="rtl" style={{ margin: 0, lineHeight: 1.9, fontSize: 15 }}>{lignesAr.map((l, i) => <li key={i}>{l}</li>)}</ol>}
                {lignesFr.length > 0 && <ol style={{ margin: 0, lineHeight: 1.9, fontSize: 14.5, color: '#475569' }}>{lignesFr.map((l, i) => <li key={i}>{l}</li>)}</ol>}
              </div>
            </details>
          )}

          {v.reviewed_by && (
            <p style={{ fontSize: 12.5, color: '#64748b' }}>
              {pickLang(lang, { fr: 'Contenu relu par', ar: 'روجع المحتوى من طرف' })} {v.reviewed_by}.{' '}
              {pickLang(lang, { fr: 'Information générale : elle ne remplace pas l’avis du médecin ou du pharmacien.', ar: 'معلومة عامة لا تغني عن رأي الطبيب أو الصيدلي.' })}
            </p>
          )}
          {v.sources && (
            <details style={{ fontSize: 12.5, color: '#64748b', marginBottom: 24 }}>
              <summary style={{ cursor: 'pointer' }}>{pickLang(lang, { fr: 'Sources', ar: 'المصادر' })}</summary>
              <div style={{ whiteSpace: 'pre-line', marginTop: 6 }}>{v.sources}</div>
            </details>
          )}

          {autres.length > 0 && (
            <>
              <h2 style={{ fontSize: 18 }}>{pickLang(lang, { fr: 'À voir aussi', ar: 'شاهد أيضاً' })}</h2>
              <ul style={{ paddingInlineStart: 18, lineHeight: 2 }}>
                {autres.map((o) => <li key={o.slug}><Link href={`/videos/${o.slug}`}>{lang === 'ar' ? o.titre_ar : o.titre_fr}</Link></li>)}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  )
}
