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
import { GardeCommuneClient } from '../../GardeCommuneClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'
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

function formatTodayFr() {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date())
}

export async function generateStaticParams() {
  const coverage = await getGardeCoverage()
  return coverage.map(c => ({ wilaya: slugify(c.wilaya_name_fr), commune: slugify(c.commune_name_fr) }))
}

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { wilaya: wilayaSlug, commune: communeSlug } = await params
  const location = await findGardeLocation(wilayaSlug, communeSlug)
  if (!location) return { title: 'Pharmacie de garde introuvable' }

  const commune = location.commune_name_fr
  const wilayaName = location.wilaya_name_fr
  const today = formatTodayFr()
  const frUrl = `${APP_URL}/pharmacie-de-garde/${wilayaSlug}/${communeSlug}`
  const arUrl = `${APP_URL}/ar/pharmacie-de-garde/${wilayaSlug}/${communeSlug}`

  const title = `Pharmacie de garde à ${commune} aujourd'hui (${today}) | DwaDZ`
  const description = `Liste à jour des pharmacies de garde à ${commune}, wilaya de ${wilayaName} — noms, adresses, téléphones et horaires. Source officielle DSP, mise à jour régulièrement.`

  return {
    title,
    description,
    keywords: [
      `pharmacie de garde ${commune}`,
      `pharmacie de garde à ${commune}`,
      `pharmacie de nuit ${commune}`,
      `garde pharmacie ${wilayaName}`,
      `pharmacie ouverte ${commune}`,
      ...(location.commune_name_ar ? [`صيدلية المناوبة ${location.commune_name_ar}`] : []),
    ],
    alternates: {
      canonical: frUrl,
      languages: { fr: frUrl, ar: arUrl, 'x-default': frUrl },
    },
    openGraph: { title, description, url: frUrl, type: 'website', locale: 'fr_DZ' },
  }
}

export default async function GardeCommunePage({
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

  const dateForMode = mode === 'tonight' ? algiersDateStr() : mode === 'friday' ? nextFridayStr() : ''

  const [coverage, initialData, initialMonthData] = await Promise.all([
    getGardeCoverage(),
    getGardeNow(wilayaCode, communeCode, { date: dateForMode }),
    mode === 'month' ? getGardeMonth(wilayaCode, communeCode, month) : Promise.resolve(null),
  ])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Pharmacies de garde à ${communeName}`,
    itemListElement: initialData.day_schedule.map((shift, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Pharmacy',
        name: shift.name_fr || shift.name_ar,
        address: {
          '@type': 'PostalAddress',
          streetAddress: shift.address_fr || shift.address_ar || undefined,
          addressLocality: communeName,
          addressRegion: wilayaName,
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
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Pharmacies de garde', item: `${APP_URL}/pharmacie-de-garde` },
      { '@type': 'ListItem', position: 3, name: wilayaName, item: `${APP_URL}/pharmacie-de-garde#${wilayaSlug}` },
      { '@type': 'ListItem', position: 4, name: communeName, item: `${APP_URL}/pharmacie-de-garde/${wilayaSlug}/${communeSlug}` },
    ],
  }

  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav aria-label="Fil d'Ariane" style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 16 }}>
        <a href="/" style={{ color: 'var(--slate-500)' }}>Accueil</a> {' › '}
        <a href="/pharmacie-de-garde" style={{ color: 'var(--slate-500)' }}>Pharmacies de garde</a> {' › '}
        <span>{wilayaName}</span> {' › '}
        <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{communeName}</span>
      </nav>

      <p style={{ fontSize: 13, marginBottom: 8 }}>
        <a href={`/ar/pharmacie-de-garde/${wilayaSlug}/${communeSlug}`} style={{ color: 'var(--blue)' }}>
          بالعربية — النسخة العربية
        </a>
      </p>

      <GardeCommuneClient
        lang="fr"
        basePath="/pharmacie-de-garde"
        wilayaSlug={wilayaSlug}
        communeSlug={communeSlug}
        wilayaCode={wilayaCode}
        communeCode={communeCode}
        communeName={communeName}
        wilayaName={wilayaName}
        initialCoverage={coverage}
        initialData={initialData}
        initialMode={mode}
        initialMonth={month}
        initialMonthData={initialMonthData}
      />
    </div>
  )
}
