import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  findGardeLocation,
  getGardeCoverage,
  getGardeNow,
  getGardeMonth,
  slugify,
  isValidGardeMonth,
} from '@/lib/garde'
import { GardeCommuneClient } from '@/app/pharmacie-de-garde/GardeCommuneClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'
const VALID_MODES = new Set(['now', 'tonight', 'friday', 'month'])

type Params = { wilaya: string; commune: string }
type SearchParams = { mode?: string; month?: string }

function algiersDateStr(d?: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(d || new Date())
}

function nextFridayStr() {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Algiers', weekday: 'short' })
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86400000)
    if (fmt.format(d) === 'Fri') return algiersDateStr(d)
  }
  return algiersDateStr(now)
}

function formatTodayAr() {
  return new Intl.DateTimeFormat('ar-DZ', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date())
}

export async function generateStaticParams() {
  const coverage = await getGardeCoverage()
  return coverage.map(c => ({ wilaya: slugify(c.wilaya_name_fr), commune: slugify(c.commune_name_fr) }))
}

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { wilaya: wilayaSlug, commune: communeSlug } = await params
  const location = await findGardeLocation(wilayaSlug, communeSlug)
  if (!location) return { title: 'صيدلية المناوبة غير موجودة' }

  const communeAr = location.commune_name_ar || location.commune_name_fr
  const wilayaAr = location.wilaya_name_ar || location.wilaya_name_fr
  const today = formatTodayAr()
  const frUrl = `${APP_URL}/pharmacie-de-garde/${wilayaSlug}/${communeSlug}`
  const arUrl = `${APP_URL}/ar/pharmacie-de-garde/${wilayaSlug}/${communeSlug}`

  const title = `صيدلية المناوبة اليوم في ${communeAr} (${today}) | DwaDZ`
  const description = `قائمة محدّثة لصيدليات المناوبة في ${communeAr}، ولاية ${wilayaAr} — الأسماء، العناوين، أرقام الهاتف وأوقات المناوبة. مصدر رسمي (مديرية الصحة والسكان)، تحديث دوري.`

  return {
    title,
    description,
    keywords: [
      `صيدلية المناوبة ${communeAr}`,
      `صيدلية مناوبة ${communeAr}`,
      `صيدلية الليل ${communeAr}`,
      `حراسة صيدلية ${wilayaAr}`,
    ],
    alternates: {
      canonical: arUrl,
      languages: { fr: frUrl, ar: arUrl, 'x-default': frUrl },
    },
    openGraph: { title, description, url: arUrl, type: 'website', locale: 'ar_DZ' },
  }
}

export default async function GardeCommunePageAr({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}) {
  const { wilaya: wilayaSlug, commune: communeSlug } = await params
  const sp = await searchParams
  const mode = VALID_MODES.has(sp.mode || '') ? (sp.mode as 'now' | 'tonight' | 'friday' | 'month') : 'now'
  const month = isValidGardeMonth(sp.month || '') ? sp.month! : ''

  const location = await findGardeLocation(wilayaSlug, communeSlug)
  if (!location) notFound()

  const { wilaya_code: wilayaCode, commune_code: communeCode, wilaya_name_fr: wilayaName, commune_name_fr: communeName } = location
  const wilayaAr = location.wilaya_name_ar || wilayaName
  const communeAr = location.commune_name_ar || communeName

  const dateForMode = mode === 'tonight' ? algiersDateStr() : mode === 'friday' ? nextFridayStr() : ''

  const [coverage, initialData, initialMonthData] = await Promise.all([
    getGardeCoverage(),
    getGardeNow(wilayaCode, communeCode, { date: dateForMode }),
    mode === 'month' ? getGardeMonth(wilayaCode, communeCode, month) : Promise.resolve(null),
  ])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `صيدليات المناوبة في ${communeAr}`,
    itemListElement: initialData.day_schedule.map((shift, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Pharmacy',
        name: shift.name_ar || shift.name_fr,
        address: {
          '@type': 'PostalAddress',
          streetAddress: shift.address_ar || shift.address_fr || undefined,
          addressLocality: communeAr,
          addressRegion: wilayaAr,
          addressCountry: 'DZ',
        },
        ...(shift.phone_e164 ? { telephone: shift.phone_e164 } : {}),
        ...(shift.lat != null && shift.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: shift.lat, longitude: shift.lng } } : {}),
      },
    })),
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'صيدليات المناوبة', item: `${APP_URL}/ar/pharmacie-de-garde` },
      { '@type': 'ListItem', position: 3, name: wilayaAr, item: `${APP_URL}/ar/pharmacie-de-garde#${wilayaSlug}` },
      { '@type': 'ListItem', position: 4, name: communeAr, item: `${APP_URL}/ar/pharmacie-de-garde/${wilayaSlug}/${communeSlug}` },
    ],
  }

  return (
    <div className="container" dir="rtl" lang="ar" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav aria-label="مسار التصفح" style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 16 }}>
        <a href="/" style={{ color: 'var(--slate-500)' }}>الرئيسية</a> {' › '}
        <a href="/ar/pharmacie-de-garde" style={{ color: 'var(--slate-500)' }}>صيدليات المناوبة</a> {' › '}
        <span>{wilayaAr}</span> {' › '}
        <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{communeAr}</span>
      </nav>

      <p style={{ fontSize: 13, marginBottom: 8 }}>
        <a href={`/pharmacie-de-garde/${wilayaSlug}/${communeSlug}`} style={{ color: 'var(--blue)' }}>
          En français — version française
        </a>
      </p>

      <GardeCommuneClient
        lang="ar"
        basePath="/ar/pharmacie-de-garde"
        wilayaSlug={wilayaSlug}
        communeSlug={communeSlug}
        wilayaCode={wilayaCode}
        communeCode={communeCode}
        communeName={communeAr}
        wilayaName={wilayaAr}
        initialCoverage={coverage}
        initialData={initialData}
        initialMode={mode}
        initialMonth={month}
        initialMonthData={initialMonthData}
      />
    </div>
  )
}
