import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getMedicamentsByDci, getAllDciList } from '@/lib/queries'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { getCountryFlag } from '@/lib/countryFlag'
import { AdInContent } from '@/components/ads/AdBanner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

// Génère les paths statiques pour les 500 DCI les plus fréquentes
export async function generateStaticParams() {
  try {
    const list = await getAllDciList(500)
    return list.map(d => ({ slug: encodeURIComponent(d.dci.toLowerCase()) }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const dci = decodeURIComponent(params.slug)
  const meds = await getMedicamentsByDci(dci, 5)
  if (!meds.length) return { title: 'DCI introuvable' }

  const canonical = `${APP_URL}/dci/${params.slug}`
  const dciUpper = dci.toUpperCase()
  const title = `${dciUpper} en Algérie — prix, génériques et disponibilité | DwaDZ`
  const description = `${dciUpper} en Algérie : ${meds.length}+ médicaments enregistrés dans la nomenclature officielle MIPH. Génériques disponibles, laboratoires, formes et dosages. Données officielles mises à jour.`

  return {
    title,
    description,
    keywords: [
      `${dci} algérie`, `${dci} prix algérie`, `${dci} disponible algérie`,
      `${dci} générique algérie`, `médicament ${dci} algérie`, `${dci} dz`,
      `${dci} nomenclature algérie`, `${dci} MIPH`,
    ],
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

export const revalidate = 86400 // 24h

export default async function DciPage({ params }: { params: { slug: string } }) {
  const dci = decodeURIComponent(params.slug)
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'

  const meds = await getMedicamentsByDci(dci, 300)
  if (!meds.length) notFound()

  const locaux = meds.filter(m => m.statut === 'F')
  const importes = meds.filter(m => m.statut !== 'F')
  const generiques = meds.filter(m => ['GE', 'Gé'].includes(m.type_prod ?? ''))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Drug',
    name: dci.toUpperCase(),
    nonproprietaryName: dci.toUpperCase(),
    activeIngredient: dci.toUpperCase(),
    description: `${dci.toUpperCase()} — ${meds.length} médicaments enregistrés en Algérie dans la nomenclature officielle MIPH. Génériques, formes et dosages disponibles.`,
    url: `${APP_URL}/dci/${params.slug}`,
    availableIn: {
      '@type': 'Country',
      name: 'Algeria',
      identifier: 'DZ',
    },
    brand: meds.slice(0, 5).map(m => ({
      '@type': 'Brand',
      name: m.nom_marque,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
        <div className="container">
          <Link href="/medicaments" className="detail-back-link">
            {pickLang(lang, { fr: '← Médicaments', ar: '→ الأدوية' })}
          </Link>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '.08em', marginBottom: 6 }}>
              {pickLang(lang, { fr: 'DÉNOMINATION COMMUNE INTERNATIONALE', ar: 'الاسم العام الدولي' })}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'white', margin: 0, textTransform: 'uppercase' }}>
              {dci}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 8, fontSize: 15 }}>
              {pickLang(lang, {
                fr: `${meds.length} médicament${meds.length > 1 ? 's' : ''} enregistré${meds.length > 1 ? 's' : ''} — dont ${generiques.length} générique${generiques.length > 1 ? 's' : ''} — ${locaux.length} fabriqué${locaux.length > 1 ? 's' : ''} en Algérie`,
                ar: `${meds.length} دواء مسجل — منها ${generiques.length} جنيس — ${locaux.length} مصنع في الجزائر`,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>

          {/* Stats rapides */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              { label: pickLang(lang, { fr: 'Total', ar: 'المجموع' }), value: meds.length, color: '#0284c7' },
              { label: pickLang(lang, { fr: 'Génériques', ar: 'جنيسات' }), value: generiques.length, color: '#16a34a' },
              { label: pickLang(lang, { fr: 'Fabriqués DZ', ar: 'صُنع في DZ' }), value: locaux.length, color: '#059669' },
              { label: pickLang(lang, { fr: 'Importés', ar: 'مستوردة' }), value: importes.length, color: '#9333ea' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Lien substitution */}
          {generiques.length > 0 && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '14px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 20 }}>🔄</span>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#15803d' }}>
                  {pickLang(lang, { fr: `${generiques.length} générique(s) disponible(s)`, ar: `${generiques.length} جنيس(ات) متاحة` })}
                </strong>
                <span style={{ color: '#166534', fontSize: 13, marginLeft: 8 }}>
                  {pickLang(lang, { fr: 'Voir les options de substitution', ar: 'عرض خيارات الاستبدال' })}
                </span>
              </div>
              <Link href={`/substitution/${encodeURIComponent(dci.toLowerCase())}`} style={{
                padding: '8px 16px', background: '#16a34a', color: 'white',
                borderRadius: 7, fontSize: 13, fontWeight: 700, textDecoration: 'none',
              }}>
                {pickLang(lang, { fr: 'Voir la substitution', ar: 'الاستبدال' })}
              </Link>
            </div>
          )}

          {/* Liste des médicaments */}
          <div className="section-title">
            {pickLang(lang, { fr: `💊 Médicaments enregistrés avec ${dci}`, ar: `💊 الأدوية المسجلة بـ ${dci}` })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, marginTop: 16 }}>
            {meds.map(med => (
              <Link
                key={med.id}
                href={`/medicament/enregistrement/${med.id}`}
                style={{
                  display: 'block', background: 'white', border: '1.5px solid #e2e8f0',
                  borderRadius: 10, padding: '14px 16px', textDecoration: 'none',
                  transition: 'border-color .15s, box-shadow .15s',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginBottom: 4 }}>{med.nom_marque}</div>
                {(med.forme || med.dosage) && (
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                    {[med.forme, med.dosage].filter(Boolean).join(' — ')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {med.type_prod && (
                    <span className={`badge ${['GE', 'Gé'].includes(med.type_prod) ? 'badge-green' : med.type_prod === 'BIO' ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize: 11 }}>
                      {['GE', 'Gé'].includes(med.type_prod) ? (lang === 'ar' ? 'جنيس' : 'Générique') : med.type_prod}
                    </span>
                  )}
                  {med.statut === 'F' && (
                    <span className="badge badge-green" style={{ fontSize: 11 }}>🇩🇿 {lang === 'ar' ? 'جزائري' : 'DZ'}</span>
                  )}
                  {med.labo && <span style={{ fontSize: 11, color: '#475569' }}>🏭 {med.labo}</span>}
                  {med.pays && med.statut !== 'F' && (
                    <span style={{ fontSize: 11, color: '#475569' }}>{getCountryFlag(med.pays)} {med.pays}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/medicaments" style={{
              padding: '10px 20px', background: '#f1f5f9', color: '#334155',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
              border: '1.5px solid #e2e8f0',
            }}>
              {pickLang(lang, { fr: '← Tous les médicaments', ar: '→ كل الأدوية' })}
            </Link>
            <Link href={`/recherche?q=${encodeURIComponent(dci)}`} style={{
              padding: '10px 20px', background: '#0284c7', color: 'white',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
            }}>
              🔍 {pickLang(lang, { fr: 'Rechercher cette DCI', ar: 'البحث عن هذا الـ DCI' })}
            </Link>
          </div>
        </div>
      </div>
      <AdInContent />
    </>
  )
}
