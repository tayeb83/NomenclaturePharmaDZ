import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getMedicamentsByForme, getAllFormeList } from '@/lib/queries'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { AdInContent } from '@/components/ads/AdBanner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export async function generateStaticParams() {
  try {
    const list = await getAllFormeList(200)
    return list.map(f => ({ slug: encodeURIComponent(f.forme.toLowerCase()) }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const forme = decodeURIComponent(params.slug)
  const meds = await getMedicamentsByForme(forme, 3)
  if (!meds.length) return { title: 'Forme introuvable' }

  const canonical = `${APP_URL}/forme/${params.slug}`
  const title = `${forme} — médicaments enregistrés en Algérie | DwaDZ`
  const description = `Tous les médicaments sous forme de ${forme} enregistrés dans la nomenclature officielle MIPH Algérie.`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'DwaDZ',
      locale: 'fr_DZ',
      url: canonical,
    },
  }
}

export const revalidate = 86400

// Traduction arabe de quelques formes fréquentes
const FORME_AR: Record<string, string> = {
  comprimé: 'قرص',
  'comprimé pelliculé': 'قرص مغلف',
  'comprimé effervescent': 'قرص فوار',
  gélule: 'كبسولة',
  sirop: 'شراب',
  solution: 'محلول',
  'solution injectable': 'محلول للحقن',
  suspension: 'معلق',
  pommade: 'مرهم',
  crème: 'كريم',
  suppositoire: 'تحميلة',
  sachet: 'كيس',
  gouttes: 'قطرات',
  'poudre pour solution': 'مسحوق للمحلول',
  ovule: 'لقاح مهبلي',
  patch: 'لصقة',
  spray: 'بخاخ',
  collyre: 'قطرة للعين',
  'lyophilisat pour usage parentéral': 'مجفف بالتبريد للحقن',
}

export default async function FormePage({ params }: { params: { slug: string } }) {
  const forme = decodeURIComponent(params.slug)
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'

  const meds = await getMedicamentsByForme(forme, 300)
  if (!meds.length) notFound()

  const formeAr = FORME_AR[forme.toLowerCase()] ?? forme

  // Grouper par DCI pour une navigation utile
  const byDci: Record<string, typeof meds> = {}
  for (const m of meds) {
    const key = m.dci ?? 'Autre'
    if (!byDci[key]) byDci[key] = []
    byDci[key].push(m)
  }
  const dciGroups = Object.entries(byDci).sort((a, b) => b[1].length - a[1].length)

  const locaux = meds.filter(m => m.statut === 'F')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Médicaments ${forme} — Algérie`,
    description: `${meds.length} médicaments sous forme ${forme} dans la nomenclature MIPH Algérie`,
    numberOfItems: meds.length,
    url: `${APP_URL}/forme/${params.slug}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #164e63, #0e7490)' }}>
        <div className="container">
          <Link href="/medicaments" className="detail-back-link">
            {pickLang(lang, { fr: '← Médicaments', ar: '→ الأدوية' })}
          </Link>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '.08em', marginBottom: 6 }}>
              {pickLang(lang, { fr: 'FORME PHARMACEUTIQUE', ar: 'الشكل الصيدلاني' })}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'white', margin: 0 }}>
              {lang === 'ar' ? formeAr : forme.charAt(0).toUpperCase() + forme.slice(1)}
            </h1>
            {lang === 'ar' && (
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 4 }}>{forme}</div>
            )}
            <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 8, fontSize: 15 }}>
              {pickLang(lang, {
                fr: `${meds.length} médicament${meds.length > 1 ? 's' : ''} — ${dciGroups.length} DCI — ${locaux.length} fabriqué${locaux.length > 1 ? 's' : ''} en Algérie`,
                ar: `${meds.length} دواء — ${dciGroups.length} مادة فعالة — ${locaux.length} مصنع في الجزائر`,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              { label: pickLang(lang, { fr: 'Total', ar: 'المجموع' }), value: meds.length, color: '#0891b2' },
              { label: pickLang(lang, { fr: 'Substances', ar: 'مواد فعالة' }), value: dciGroups.length, color: '#0284c7' },
              { label: pickLang(lang, { fr: 'Fabriqués DZ', ar: 'صُنع في DZ' }), value: locaux.length, color: '#059669' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Groupés par DCI */}
          {dciGroups.map(([dci, drugs]) => (
            <div key={dci} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Link href={`/dci/${encodeURIComponent(dci.toLowerCase())}`} style={{
                  fontSize: 14, fontWeight: 700, color: '#0284c7', textDecoration: 'none',
                  background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 6,
                  padding: '3px 10px',
                }}>
                  {dci}
                </Link>
                <span style={{ fontSize: 12, color: '#475569' }}>{drugs.length} méd.</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                {drugs.map(med => (
                  <Link
                    key={med.id}
                    href={`/medicament/enregistrement/${med.id}`}
                    style={{
                      display: 'block', background: 'white', border: '1.5px solid #e2e8f0',
                      borderRadius: 8, padding: '10px 14px', textDecoration: 'none',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{med.nom_marque}</div>
                    {med.dosage && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{med.dosage}</div>}
                    <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                      {['GE', 'Gé'].includes(med.type_prod ?? '') && (
                        <span className="badge badge-green" style={{ fontSize: 10 }}>
                          {lang === 'ar' ? 'جنيس' : 'GÉ'}
                        </span>
                      )}
                      {med.statut === 'F' && <span className="badge badge-green" style={{ fontSize: 10 }}>🇩🇿</span>}
                      {med.labo && <span style={{ fontSize: 10, color: '#475569' }}>🏭 {med.labo}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/medicaments" style={{
              padding: '10px 20px', background: '#f1f5f9', color: '#334155',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
              border: '1.5px solid #e2e8f0',
            }}>
              {pickLang(lang, { fr: '← Tous les médicaments', ar: '→ كل الأدوية' })}
            </Link>
            <Link href={`/recherche?q=${encodeURIComponent(forme)}`} style={{
              padding: '10px 20px', background: '#0891b2', color: 'white',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
            }}>
              🔍 {pickLang(lang, { fr: 'Rechercher cette forme', ar: 'البحث عن هذا الشكل' })}
            </Link>
          </div>
        </div>
      </div>
      <AdInContent />
    </>
  )
}
