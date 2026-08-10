import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getNouveautesByAnneeMois, getAllNouveauteAnneeMois } from '@/lib/queries'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { medicamentPath } from '@/lib/medicament-url'
import { AdInContent } from '@/components/ads/AdBanner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

const MOIS_FR = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MOIS_AR = ['', 'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export async function generateStaticParams() {
  try {
    const list = await getAllNouveauteAnneeMois()
    return list.map(({ annee, mois }) => ({ annee: String(annee), mois: String(mois).padStart(2, '0') }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: { annee: string; mois: string } }): Promise<Metadata> {
  const annee = parseInt(params.annee)
  const mois = parseInt(params.mois)
  if (isNaN(annee) || isNaN(mois)) return { title: 'Période invalide' }

  const canonical = `${APP_URL}/nouveautes/${annee}/${String(mois).padStart(2, '0')}`
  const moisLabel = MOIS_FR[mois] ?? String(mois)
  const title = `Nouveaux médicaments — ${moisLabel} ${annee} — Algérie | DwaDZ`
  const description = `Liste des nouveaux médicaments enregistrés en Algérie en ${moisLabel} ${annee}. Nomenclature officielle MIPH.`

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

export const revalidate = 3600

export default async function NouveautesAnneeMoisPage({ params }: { params: { annee: string; mois: string } }) {
  const annee = parseInt(params.annee)
  const mois = parseInt(params.mois)
  if (isNaN(annee) || isNaN(mois) || mois < 1 || mois > 12) notFound()

  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'

  const meds = await getNouveautesByAnneeMois(annee, mois, 300)
  if (!meds.length) notFound()

  const allPeriodes = await getAllNouveauteAnneeMois()
  const currentIdx = allPeriodes.findIndex(p => p.annee === annee && p.mois === mois)
  const prevPeriode = allPeriodes[currentIdx + 1] ?? null
  const nextPeriode = allPeriodes[currentIdx - 1] ?? null

  const moisLabelFr = MOIS_FR[mois] ?? String(mois)
  const moisLabelAr = MOIS_AR[mois] ?? String(mois)

  const locaux = meds.filter(m => m.statut === 'F')
  const generiques = meds.filter(m => ['GE', 'Gé'].includes(m.type_prod ?? ''))

  // Grouper par laboratoire
  const byLabo: Record<string, typeof meds> = {}
  for (const m of meds) {
    const key = m.labo ?? 'Autre'
    if (!byLabo[key]) byLabo[key] = []
    byLabo[key].push(m)
  }
  const topLabos = Object.entries(byLabo).sort((a, b) => b[1].length - a[1].length).slice(0, 5)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Nouveaux médicaments ${moisLabelFr} ${annee} — Algérie`,
    description: `${meds.length} nouveaux médicaments enregistrés en Algérie en ${moisLabelFr} ${annee}`,
    numberOfItems: meds.length,
    url: `${APP_URL}/nouveautes/${annee}/${String(mois).padStart(2, '0')}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #14532d, #166534)' }}>
        <div className="container">
          <Link href="/veille" className="detail-back-link">
            {pickLang(lang, { fr: '← Veille pharmaceutique', ar: '→ اليقظة الصيدلانية' })}
          </Link>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '.08em', marginBottom: 6 }}>
              {pickLang(lang, { fr: 'NOUVELLES INSCRIPTIONS — NOMENCLATURE MIPH', ar: 'تسجيلات جديدة — نومنكلاتور MIPH' })}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'white', margin: 0 }}>
              {lang === 'ar'
                ? `✨ ${moisLabelAr} ${annee}`
                : `✨ ${moisLabelFr} ${annee}`}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 8, fontSize: 15 }}>
              {pickLang(lang, {
                fr: `${meds.length} nouveaux médicaments — ${generiques.length} génériques — ${locaux.length} fabriqués en Algérie`,
                ar: `${meds.length} دواء جديد — ${generiques.length} جنيس — ${locaux.length} مصنع في الجزائر`,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>

          {/* Navigation périodes */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
              {pickLang(lang, { fr: 'Autres mois :', ar: 'أشهر أخرى:' })}
            </span>
            {allPeriodes.slice(0, 10).map(p => {
              const label = `${MOIS_FR[p.mois]?.slice(0, 3)} ${p.annee}`
              const isActive = p.annee === annee && p.mois === mois
              return (
                <Link key={`${p.annee}-${p.mois}`} href={`/nouveautes/${p.annee}/${String(p.mois).padStart(2, '0')}`} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none',
                  background: isActive ? '#166534' : '#f1f5f9',
                  color: isActive ? 'white' : '#334155',
                  border: '1.5px solid',
                  borderColor: isActive ? '#166534' : '#e2e8f0',
                }}>
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Stats rapides */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              { label: pickLang(lang, { fr: 'Nouveaux', ar: 'جدد' }), value: meds.length, color: '#16a34a' },
              { label: pickLang(lang, { fr: 'Génériques', ar: 'جنيسات' }), value: generiques.length, color: '#0284c7' },
              { label: pickLang(lang, { fr: 'Fabriqués DZ', ar: 'صُنع في DZ' }), value: locaux.length, color: '#059669' },
              { label: pickLang(lang, { fr: 'Labos', ar: 'مخابر' }), value: Object.keys(byLabo).length, color: '#9333ea' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Top labos */}
          {topLabos.length > 0 && (
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 12 }}>
                🏭 {pickLang(lang, { fr: 'Top laboratoires ce mois', ar: 'أبرز المخابر هذا الشهر' })}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {topLabos.map(([labo, items]) => (
                  <span key={labo} style={{
                    padding: '4px 12px', borderRadius: 6, background: 'white',
                    border: '1.5px solid #e2e8f0', fontSize: 12, color: '#334155', fontWeight: 600,
                  }}>
                    {labo} <span style={{ color: '#0284c7', fontWeight: 800 }}>{items.length}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Liste médicaments */}
          <div className="section-title">
            {pickLang(lang, {
              fr: `💊 Nouveaux médicaments — ${moisLabelFr} ${annee}`,
              ar: `💊 أدوية جديدة — ${moisLabelAr} ${annee}`,
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
            {meds.map(med => (
              <Link
                key={med.id}
                href={medicamentPath('enregistrement', med.id, med)}
                style={{
                  display: 'block', background: 'white', border: '1.5px solid #e2e8f0',
                  borderRadius: 10, padding: '14px 16px', textDecoration: 'none',
                  borderTop: '3px solid #16a34a',
                }}
              >
                {med.dci && <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>{med.dci}</div>}
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginBottom: 4 }}>{med.nom_marque}</div>
                {(med.forme || med.dosage) && (
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{[med.forme, med.dosage].filter(Boolean).join(' — ')}</div>
                )}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {['GE', 'Gé'].includes(med.type_prod ?? '') && (
                    <span className="badge badge-green" style={{ fontSize: 11 }}>{lang === 'ar' ? 'جنيس' : 'Générique'}</span>
                  )}
                  {med.type_prod === 'BIO' && <span className="badge badge-purple" style={{ fontSize: 11 }}>Bio</span>}
                  {med.statut === 'F' && <span className="badge badge-green" style={{ fontSize: 11 }}>🇩🇿</span>}
                  {med.labo && <span style={{ fontSize: 10, color: '#475569' }}>🏭 {med.labo}</span>}
                </div>
              </Link>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 40 }}>
            {prevPeriode && (
              <Link href={`/nouveautes/${prevPeriode.annee}/${String(prevPeriode.mois).padStart(2, '0')}`} style={{
                padding: '10px 20px', background: '#f1f5f9', color: '#334155',
                borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
                border: '1.5px solid #e2e8f0',
              }}>
                ← {MOIS_FR[prevPeriode.mois]} {prevPeriode.annee}
              </Link>
            )}
            <Link href="/veille" style={{
              padding: '10px 20px', background: '#f1f5f9', color: '#334155',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
              border: '1.5px solid #e2e8f0',
            }}>
              {pickLang(lang, { fr: 'Veille pharmaceutique', ar: 'اليقظة الصيدلانية' })}
            </Link>
            {nextPeriode && (
              <Link href={`/nouveautes/${nextPeriode.annee}/${String(nextPeriode.mois).padStart(2, '0')}`} style={{
                padding: '10px 20px', background: '#f1f5f9', color: '#334155',
                borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
                border: '1.5px solid #e2e8f0',
              }}>
                {MOIS_FR[nextPeriode.mois]} {nextPeriode.annee} →
              </Link>
            )}
          </div>
        </div>
      </div>
      <AdInContent />
    </>
  )
}
