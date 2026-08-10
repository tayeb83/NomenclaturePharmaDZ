import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getMedicamentsDciSubstitution, getAllDciList } from '@/lib/queries'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { getCountryFlag } from '@/lib/countryFlag'
import { medicamentPath } from '@/lib/medicament-url'
import { medicalPageJsonLd } from '@/lib/schema'
import { AdInContent } from '@/components/ads/AdBanner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

// Génère les paths statiques pour les 500 DCI les plus fréquentes
export async function generateStaticParams() {
  try {
    const list = await getAllDciList(500)
    return list.map(d => ({ dci: encodeURIComponent(d.dci.toLowerCase()) }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: { dci: string } }): Promise<Metadata> {
  const dci = decodeURIComponent(params.dci).toUpperCase()
  const canonical = `${APP_URL}/substitution/${params.dci}`
  const title = `Substitution ${dci} — génériques enregistrés en Algérie | DwaDZ`
  const description = `Tous les génériques de ${dci} enregistrés dans la nomenclature officielle MIPH Algérie. Trouvez les équivalents disponibles.`

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

export default async function SubstitutionDciPage({ params }: { params: { dci: string } }) {
  const dci = decodeURIComponent(params.dci).toUpperCase()
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'

  const { reference, generiques } = await getMedicamentsDciSubstitution(dci)
  const total = reference.length + generiques.length

  if (!total) notFound()

  const substitutionUrl = `${APP_URL}/substitution/${params.dci}`
  const jsonLd = medicalPageJsonLd({
    name: `${dci} — génériques et équivalents en Algérie`,
    description: `${dci} — ${generiques.length} générique(s) enregistré(s) en Algérie. Nomenclature MIPH.`,
    url: substitutionUrl,
    about: {
      name: dci,
      activeIngredient: dci,
      url: substitutionUrl,
    },
  })

  function TypeBadge({ typeProd }: { typeProd: string | null }) {
    if (!typeProd) return null
    const isGe = ['GE', 'Gé'].includes(typeProd)
    const isBio = typeProd === 'BIO'
    const isRef = ['RE', 'Ré', 'I'].includes(typeProd)
    const label = isGe
      ? pickLang(lang, { fr: 'Générique', ar: 'جنيس' })
      : isBio
        ? 'Biologique'
        : isRef
          ? pickLang(lang, { fr: 'Référence', ar: 'مرجعي' })
          : typeProd
    return (
      <span className={`badge ${isGe ? 'badge-green' : isBio ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize: 11 }}>
        {label}
      </span>
    )
  }

  function MedCard({ med }: { med: (typeof generiques)[0] }) {
    return (
      <Link
        href={medicamentPath('enregistrement', med.id, med)}
        style={{
          display: 'block', background: 'white', borderRadius: 10,
          padding: '14px 16px', textDecoration: 'none',
          border: '1.5px solid #e2e8f0',
          borderTop: ['GE', 'Gé'].includes(med.type_prod ?? '') ? '3px solid #16a34a' : '3px solid #0284c7',
        }}
      >
        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginBottom: 4 }}>{med.nom_marque}</div>
        {(med.forme || med.dosage) && (
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{[med.forme, med.dosage].filter(Boolean).join(' — ')}</div>
        )}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TypeBadge typeProd={med.type_prod} />
          {med.statut === 'F'
            ? <span className="badge badge-green" style={{ fontSize: 11 }}>🇩🇿 {lang === 'ar' ? 'جزائري' : 'DZ'}</span>
            : med.pays && <span style={{ fontSize: 11, color: '#475569' }}>{getCountryFlag(med.pays)} {med.pays}</span>
          }
          {med.labo && <span style={{ fontSize: 11, color: '#475569' }}>🏭 {med.labo}</span>}
          {med.conditionnement && <span style={{ fontSize: 10, color: '#cbd5e1' }}>{med.conditionnement}</span>}
        </div>
      </Link>
    )
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}>
        <div className="container">
          <Link href="/substitution" className="detail-back-link">
            {pickLang(lang, { fr: '← Substitution générique', ar: '→ الاستبدال الجنيسي' })}
          </Link>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '.08em', marginBottom: 6 }}>
              {pickLang(lang, { fr: 'SUBSTITUTION — DÉNOMINATION COMMUNE INTERNATIONALE', ar: 'الاستبدال — الاسم العام الدولي' })}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'white', margin: 0, textTransform: 'uppercase' }}>
              ♻️ {dci}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 8, fontSize: 15 }}>
              {pickLang(lang, {
                fr: `${generiques.length} générique${generiques.length > 1 ? 's' : ''} · ${reference.length} référence${reference.length > 1 ? 's' : ''} — enregistrés en Algérie`,
                ar: `${generiques.length} جنيس · ${reference.length} مرجعي — مسجل في الجزائر`,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>

          {/* Disclaimer */}
          <div className="alert-banner info" style={{ marginBottom: 28 }}>
            💡 {pickLang(lang, {
              fr: 'Ces données proviennent de la nomenclature officielle MIPH. Vérifiez toujours la disponibilité réelle sur le marché algérien.',
              ar: 'هذه البيانات مستمدة من التسمية الرسمية للـ MIPH. تحقق دائمًا من التوفر الفعلي في السوق الجزائري.',
            })}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              { label: pickLang(lang, { fr: 'Total', ar: 'المجموع' }), value: total, color: '#0284c7' },
              { label: pickLang(lang, { fr: 'Génériques', ar: 'جنيسات' }), value: generiques.length, color: '#16a34a' },
              { label: pickLang(lang, { fr: 'Références', ar: 'مراجع' }), value: reference.length, color: '#0284c7' },
              { label: pickLang(lang, { fr: 'Fabriqués DZ', ar: 'مصنع DZ' }), value: [...generiques, ...reference].filter(m => m.statut === 'F').length, color: '#059669' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Génériques */}
          {generiques.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div className="section-title">
                🟢 {pickLang(lang, { fr: `Génériques (${generiques.length})`, ar: `جنيسات (${generiques.length})` })}
              </div>
              <div className="section-sub">
                {pickLang(lang, {
                  fr: 'Médicaments de même substance active, forme et dosage — échangeables sous contrôle médical',
                  ar: 'أدوية بنفس المادة الفعالة والشكل والجرعة — قابلة للتبادل تحت إشراف طبي',
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 14 }}>
                {generiques.map(med => <MedCard key={med.id} med={med} />)}
              </div>
            </div>
          )}

          {/* Références */}
          {reference.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div className="section-title">
                🔵 {pickLang(lang, { fr: `Médicaments de référence (${reference.length})`, ar: `أدوية مرجعية (${reference.length})` })}
              </div>
              <div className="section-sub">
                {pickLang(lang, {
                  fr: 'Médicaments princeps et références étrangères enregistrés avec cette DCI',
                  ar: 'الأدوية الأصلية والمراجع الأجنبية المسجلة بهذا الـ DCI',
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 14 }}>
                {reference.map(med => <MedCard key={med.id} med={med} />)}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/substitution" style={{
              padding: '10px 20px', background: '#f1f5f9', color: '#334155',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
              border: '1.5px solid #e2e8f0',
            }}>
              {pickLang(lang, { fr: '← Toutes les substitutions', ar: '→ كل الاستبدالات' })}
            </Link>
            <Link href={`/dci/${encodeURIComponent(dci.toLowerCase())}`} style={{
              padding: '10px 20px', background: '#0284c7', color: 'white',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
            }}>
              📋 {pickLang(lang, { fr: `Fiche DCI ${dci}`, ar: `بطاقة DCI ${dci}` })}
            </Link>
          </div>
        </div>
      </div>
      <AdInContent />
    </>
  )
}
