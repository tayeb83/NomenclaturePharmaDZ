import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getRetraitsByAnnee, getAllRetraitAnnees } from '@/lib/queries'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { medicamentPath } from '@/lib/medicament-url'
import { PrintButton } from '@/components/ui/PrintButton'
import { GlossarySection } from '@/components/ui/GlossarySection'
import { AdInContent } from '@/components/ads/AdBanner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export async function generateStaticParams() {
  try {
    const annees = await getAllRetraitAnnees()
    return annees.map(a => ({ annee: String(a) }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: { annee: string } }): Promise<Metadata> {
  const annee = parseInt(params.annee)
  if (isNaN(annee)) return { title: 'Année invalide' }

  const canonical = `${APP_URL}/retraits/${annee}`
  const title = `Médicaments retirés en ${annee} — Algérie | DwaDZ`
  const description = `Liste complète des médicaments retirés du marché algérien en ${annee}. Source officielle MIPH.`

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

export default async function RetraitsAnneePage({ params }: { params: { annee: string } }) {
  const annee = parseInt(params.annee)
  if (isNaN(annee) || annee < 1990 || annee > 2100) notFound()

  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'

  const retraits = await getRetraitsByAnnee(annee)
  if (!retraits.length) notFound()

  // Regrouper par motif
  const byMotif: Record<string, typeof retraits> = {}
  for (const r of retraits) {
    const key = r.motif_retrait ?? 'Non précisé'
    if (!byMotif[key]) byMotif[key] = []
    byMotif[key].push(r)
  }
  const motifGroups = Object.entries(byMotif).sort((a, b) => b[1].length - a[1].length)

  const annees = await getAllRetraitAnnees()
  const currentIdx = annees.indexOf(annee)
  const prevAnnee = annees[currentIdx + 1] ?? null
  const nextAnnee = annees[currentIdx - 1] ?? null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Médicaments retirés en ${annee} — Algérie`,
    description: `${retraits.length} médicaments retirés du marché algérien en ${annee}`,
    numberOfItems: retraits.length,
    url: `${APP_URL}/retraits/${annee}`,
  }

  function motifColor(m: string) {
    if (m.includes('INTERDICTION')) return '#dc2626'
    if (m.includes('COMMERCIAL')) return '#f59e0b'
    if (m.includes("PAYS D'ORIGINE")) return '#7c3aed'
    return '#6b7280'
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #7f1d1d, #991b1b)' }}>
        <div className="container">
          <Link href="/alertes" className="detail-back-link">
            {pickLang(lang, { fr: '← Alertes & Retraits', ar: '→ التنبيهات والانسحابات' })}
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '.08em', marginBottom: 6 }}>
                {pickLang(lang, { fr: 'RETRAITS DU MARCHÉ ALGÉRIEN', ar: 'انسحابات من السوق الجزائري' })}
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'white', margin: 0 }}>
                {pickLang(lang, { fr: `🚫 Retraits ${annee}`, ar: `🚫 انسحابات ${annee}` })}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.75)', marginTop: 8, fontSize: 15 }}>
                {pickLang(lang, {
                  fr: `${retraits.length} médicament${retraits.length > 1 ? 's' : ''} retiré${retraits.length > 1 ? 's' : ''} — ${motifGroups.length} motif${motifGroups.length > 1 ? 's' : ''} différent${motifGroups.length > 1 ? 's' : ''}`,
                  ar: `${retraits.length} دواء مسحوب — ${motifGroups.length} سبب مختلف`,
                })}
              </p>
            </div>
            <PrintButton label={pickLang(lang, { fr: 'Imprimer / PDF', ar: 'طباعة / PDF' })} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>

          {/* Navigation années */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
              {pickLang(lang, { fr: 'Autres années :', ar: 'سنوات أخرى:' })}
            </span>
            {annees.slice(0, 8).map(a => (
              <Link key={a} href={`/retraits/${a}`} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none',
                background: a === annee ? '#991b1b' : '#f1f5f9',
                color: a === annee ? 'white' : '#334155',
                border: '1.5px solid',
                borderColor: a === annee ? '#991b1b' : '#e2e8f0',
              }}>
                {a}
              </Link>
            ))}
          </div>

          {/* Alerte */}
          <div className="alert-banner error" style={{ marginBottom: 28 }}>
            <strong>{pickLang(lang, { fr: '⚠️ Attention :', ar: '⚠️ تنبيه:' })}</strong>{' '}
            {pickLang(lang, {
              fr: 'Ces médicaments ne doivent plus être dispensés aux patients. Consultez les sources officielles du MIPH.',
              ar: 'لا يجب صرف هذه الأدوية للمرضى. راجع المصادر الرسمية للـ MIPH.',
            })}
          </div>

          {/* Stats par motif */}
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '20px', marginBottom: 28 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>
              📊 {pickLang(lang, { fr: 'Répartition par motif', ar: 'التوزيع حسب السبب' })}
            </div>
            {motifGroups.map(([motif, items]) => (
              <div key={motif} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: motifColor(motif), marginBottom: 4 }}>
                  <span style={{ flex: 1, paddingRight: 8 }}>{motif}</span>
                  <span style={{ color: motifColor(motif), flexShrink: 0 }}>{items.length}</span>
                </div>
                <div style={{ height: 5, background: '#f1f5f9', borderRadius: 4 }}>
                  <div style={{ height: '100%', background: motifColor(motif), width: `${Math.min(100, (items.length / retraits.length) * 100)}%`, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Liste par motif */}
          {motifGroups.map(([motif, items]) => (
            <div key={motif} style={{ marginBottom: 32 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: motifColor(motif),
                borderLeft: `4px solid ${motifColor(motif)}`,
                paddingLeft: 12, marginBottom: 12,
              }}>
                {motif} <span style={{ fontWeight: 400, color: '#475569', fontSize: 12 }}>({items.length})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {items.map(med => (
                  <Link
                    key={med.id}
                    href={medicamentPath('retrait', med.id, med)}
                    style={{
                      display: 'block', background: 'white', border: '1.5px solid #fecaca',
                      borderRadius: 9, padding: '12px 16px', textDecoration: 'none',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, marginBottom: 3 }}>{med.nom_marque}</div>
                    {med.dci && <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{med.dci}</div>}
                    {(med.forme || med.dosage) && (
                      <div style={{ fontSize: 11, color: '#475569' }}>{[med.forme, med.dosage].filter(Boolean).join(' — ')}</div>
                    )}
                    {med.labo && <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>🏭 {med.labo}</div>}
                    {med.date_retrait && (
                      <div style={{ fontSize: 10, color: '#dc2626', marginTop: 4, fontWeight: 600 }}>
                        📅 {new Date(med.date_retrait).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* ─── Glossaire des abréviations ───────────────── */}
          <GlossarySection lang={lang} />

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
            {prevAnnee && (
              <Link href={`/retraits/${prevAnnee}`} style={{
                padding: '10px 20px', background: '#f1f5f9', color: '#334155',
                borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
                border: '1.5px solid #e2e8f0',
              }}>
                ← {prevAnnee}
              </Link>
            )}
            <Link href="/alertes" style={{
              padding: '10px 20px', background: '#f1f5f9', color: '#334155',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
              border: '1.5px solid #e2e8f0',
            }}>
              {pickLang(lang, { fr: 'Toutes les alertes', ar: 'كل التنبيهات' })}
            </Link>
            {nextAnnee && (
              <Link href={`/retraits/${nextAnnee}`} style={{
                padding: '10px 20px', background: '#f1f5f9', color: '#334155',
                borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
                border: '1.5px solid #e2e8f0',
              }}>
                {nextAnnee} →
              </Link>
            )}
          </div>
        </div>
      </div>
      <AdInContent />
    </>
  )
}
