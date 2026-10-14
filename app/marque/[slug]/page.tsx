import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getCachedMedicamentsByMarque } from '@/lib/medicament-cache'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { medicamentPath } from '@/lib/medicament-url'
import { medicalPageJsonLd, breadcrumbJsonLd } from '@/lib/schema'
import { groupByMarque } from '@/lib/dci-groups'
import { MIN_FAMILY_SIZE } from '@/lib/marque'
import { MarqueBlocks } from '@/components/MarqueBlocks'
import { AdInContent } from '@/components/ads/AdBanner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const revalidate = 86400 // 24h

const uniq = (xs: Array<string | null | undefined>) =>
  Array.from(new Set(xs.map(x => (x ?? '').trim()).filter(Boolean)))

// Nom d'affichage de la famille : premier mot du nom commercial, tel que publié.
const familyName = (meds: Array<{ nom_marque: string }>, slug: string) =>
  (meds[0]?.nom_marque.trim().split(/\s+/)[0] ?? slug).toUpperCase()

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const meds = await getCachedMedicamentsByMarque(params.slug)
  if (!meds.length) return { title: 'Marque introuvable' }

  const nom = familyName(meds, params.slug)
  const dcis = uniq(meds.map(m => m.dci))
  const nbDosages = uniq(meds.map(m => m.dosage)).length
  const labos = uniq(meds.map(m => m.labo))
  const title = `${nom} : dosages, formes et génériques en Algérie`.length <= 52
    ? `${nom} : dosages, formes et génériques en Algérie`
    : `${nom} : dosages, formes, génériques`
  const description =
    `${nom} en Algérie : ${meds.length} présentation${meds.length > 1 ? 's' : ''}` +
    `${dcis.length ? ` (${dcis.slice(0, 2).join(', ')})` : ''}` +
    `${nbDosages > 1 ? `, ${nbDosages} dosages` : ''}` +
    `${labos.length ? `, laboratoire${labos.length > 1 ? 's' : ''} ${labos.slice(0, 2).join(', ')}` : ''}.` +
    ' Fiches détaillées et génériques — nomenclature MIPH.'
  const canonical = `${APP_URL}/marque/${params.slug}`

  return {
    title,
    description: description.length > 158 ? description.slice(0, 157).replace(/[\s,;(]+\S*$/, '') + '…' : description,
    // Une famille d'une seule présentation reproduirait sa fiche : on la
    // laisse consultable sans lui demander d'index.
    ...(meds.length < MIN_FAMILY_SIZE ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical },
    openGraph: { title, description, type: 'website', siteName: 'DwaDZ', locale: 'fr_DZ', url: canonical },
  }
}

export default async function MarquePage({ params }: { params: { slug: string } }) {
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'

  const meds = await getCachedMedicamentsByMarque(params.slug)
  if (!meds.length) notFound()

  const nom = familyName(meds, params.slug)
  const dcis = uniq(meds.map(m => m.dci))
  const labos = uniq(meds.map(m => m.labo))
  const marques = groupByMarque(meds)
  const url = `${APP_URL}/marque/${params.slug}`

  const jsonLd = medicalPageJsonLd({
    name: `${nom} — présentations enregistrées en Algérie`,
    description: `${nom} : ${meds.length} présentations enregistrées en Algérie dans la nomenclature officielle MIPH.`,
    url,
    about: { name: nom, activeIngredient: dcis.join(', ') || null, url },
    mentions: [{ '@type': 'Country', name: 'Algeria', identifier: 'DZ' }],
    extra: {
      mainEntity: {
        '@type': 'ItemList',
        name: `Présentations de ${nom}`,
        numberOfItems: meds.length,
        itemListElement: meds.slice(0, 20).map((m, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: [m.nom_marque, m.dosage, m.forme].filter(Boolean).join(' '),
          url: `${APP_URL}${medicamentPath('enregistrement', m.id, m)}`,
        })),
      },
    },
  })
  const breadcrumb = breadcrumbJsonLd([
    { name: pickLang(lang, { fr: 'Accueil', ar: 'الرئيسية' }), url: APP_URL },
    { name: pickLang(lang, { fr: 'Médicaments', ar: 'الأدوية' }), url: `${APP_URL}/medicaments` },
    { name: nom, url },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
        <div className="container">
          <Link href="/medicaments" className="detail-back-link">
            {pickLang(lang, { fr: '← Médicaments', ar: '→ الأدوية' })}
          </Link>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '.08em', marginBottom: 6 }}>
              {pickLang(lang, { fr: 'NOM COMMERCIAL', ar: 'الاسم التجاري' })}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'white', margin: 0 }}>
              {nom}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 8, fontSize: 15 }}>
              {pickLang(lang, {
                fr: `${meds.length} présentation${meds.length > 1 ? 's' : ''} enregistrée${meds.length > 1 ? 's' : ''} en Algérie`,
                ar: `${meds.length} تقديم مسجل في الجزائر`,
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>
          <p style={{ color: '#334155', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
            {pickLang(lang, {
              fr: `${nom} regroupe ${meds.length} présentation${meds.length > 1 ? 's' : ''} de la nomenclature nationale${dcis.length ? `, à base de ${dcis.join(', ')}` : ''}${labos.length ? `, produite${labos.length > 1 ? 's' : ''} par ${labos.slice(0, 3).join(', ')}${labos.length > 3 ? '…' : ''}` : ''}. Choisissez la forme et le dosage recherchés pour ouvrir la fiche détaillée.`,
              ar: `يضم ${nom} ${meds.length} تقديم في التسمية الوطنية${dcis.length ? `، بمادة فعالة ${dcis.join('، ')}` : ''}${labos.length ? `، من إنتاج ${labos.slice(0, 3).join('، ')}` : ''}. اختاروا الشكل والجرعة المطلوبين لفتح البطاقة.`,
            })}
          </p>

          {dcis.length > 0 && (
            <p style={{ fontSize: 13, margin: '0 0 24px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong>{pickLang(lang, { fr: 'Substance active :', ar: 'المادة الفعالة:' })}</strong>
              {dcis.map(d => (
                <Link key={d} href={`/dci/${encodeURIComponent(d.toLowerCase())}`} className="badge badge-blue" style={{ textDecoration: 'none' }}>
                  {d}
                </Link>
              ))}
            </p>
          )}

          <AdInContent style={{ margin: '0 auto 28px' }} />

          <div className="section-title">
            {pickLang(lang, { fr: `💊 Présentations de ${nom}`, ar: `💊 تقديمات ${nom}` })}
          </div>
          <MarqueBlocks marques={marques} lang={lang} />
        </div>
      </div>
    </>
  )
}
