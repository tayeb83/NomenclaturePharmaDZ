/**
 * Publication Facebook des pharmacies de garde — automatique et manuelle.
 *
 * Automatique : crons Vercel → /api/cron/garde-daily (garde du jour, du
 * vendredi suivant, ou du mois). Manuelle : écran admin
 * /admin/garde/publication → /api/admin/garde/publish.
 *
 * Pour chaque cible (wilaya entière ou commune précise) on génère une image
 * récapitulative (next/og — pas de dépendance supplémentaire) puis on la
 * publie sur la Page Facebook avec la liste détaillée en légende.
 *
 * L'image est uploadée en multipart directement à l'API Graph (champ
 * `source`) plutôt que passée par URL : le crawler Meta-ExternalFetcher
 * est bloqué par notre middleware anti-bot et ne pourrait pas la récupérer.
 */
import { readFile } from 'fs/promises'
import path from 'path'
import { ImageResponse } from 'next/og'
import { query, queryOne } from '@/lib/db'
import { postFacebookPhoto, postToFacebook } from '@/lib/social'
import { getWilayaLogoDataUri } from '@/lib/garde-wilaya-logo'
import { slugify } from '@/lib/slug'

// ─── DONNÉES ──────────────────────────────────────────────────

export type Locale = 'fr' | 'ar'

/**
 * Période publiée :
 *  - `day`    : une date précise (par défaut aujourd'hui) ;
 *  - `friday` : le prochain vendredi (jour de garde le plus consulté) ;
 *  - `month`  : le planning complet d'un mois calendaire.
 */
export type GardePeriod = 'day' | 'friday' | 'month'

export const GARDE_PERIODS: GardePeriod[] = ['day', 'friday', 'month']

export function isGardePeriod(value: unknown): value is GardePeriod {
  return typeof value === 'string' && (GARDE_PERIODS as string[]).includes(value)
}

type GardeDutyRow = {
  duty_date?: string
  wilaya_code: string
  wilaya_name_fr: string
  wilaya_name_ar: string | null
  commune_code: string
  commune_name_fr: string
  commune_name_ar: string | null
  shift: string
  name: string
  name_ar: string
  address_fr: string | null
  address_ar: string | null
  phone_e164: string | null
}

export type GardePharmacyDay = {
  name: string
  name_ar: string
  address: string | null
  address_ar: string | null
  phone: string | null
  shifts: string[]
}

export type GardeCommuneDay = {
  commune_code: string
  commune_name_fr: string
  commune_name_ar: string
  pharmacies: GardePharmacyDay[]
}

export type GardeWilayaDay = {
  wilaya_code: string
  wilaya_name_fr: string
  wilaya_name_ar: string
  date: string
  total: number
  communes: GardeCommuneDay[]
}

/** Une journée du planning mensuel (mêmes communes/officines qu'un jour). */
export type GardeMonthDay = {
  date: string
  total: number
  communes: GardeCommuneDay[]
}

export type GardeWilayaMonth = {
  wilaya_code: string
  wilaya_name_fr: string
  wilaya_name_ar: string
  /** YYYY-MM */
  month: string
  /** Commune ciblée quand le planning ne concerne qu'elle. */
  commune_code: string | null
  commune_name_fr: string | null
  commune_name_ar: string | null
  /** Nombre total de vacations d'officines sur le mois. */
  total: number
  days: GardeMonthDay[]
}

/** Date du jour (YYYY-MM-DD) dans le fuseau Africa/Algiers. */
export function todayInAlgiers(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

/** Mois courant (YYYY-MM) dans le fuseau Africa/Algiers. */
export function currentMonthInAlgiers(): string {
  return todayInAlgiers().slice(0, 7)
}

/**
 * Prochain vendredi (YYYY-MM-DD). Le vendredi étant le jour de garde le
 * plus consulté en Algérie, il fait l'objet d'une publication dédiée
 * publiée en amont (jeudi). Appelé un vendredi, renvoie le vendredi
 * suivant — on annonce toujours une garde à venir, jamais celle du jour
 * (déjà couverte par la publication quotidienne).
 */
export function nextFridayInAlgiers(from?: string): string {
  const base = from || todayInAlgiers()
  const d = new Date(`${base}T12:00:00Z`)
  const delta = (5 - d.getUTCDay() + 7) % 7 || 7
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** Résout la date visée par une période « jour » ou « vendredi ». */
export function resolveGardeDate(period: GardePeriod, date?: string): string {
  if (period === 'friday') return nextFridayInAlgiers(date)
  return date || todayInAlgiers()
}

function formatDateFr(isoDate: string): string {
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Algiers', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00Z`))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function formatMonthFr(month: string): string {
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', month: 'long', year: 'numeric',
  }).format(new Date(`${month}-01T12:00:00Z`))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function formatMonthAr(month: string): string {
  return new Intl.DateTimeFormat('ar-DZ', {
    timeZone: 'UTC', month: 'long', year: 'numeric', numberingSystem: 'latn',
  }).format(new Date(`${month}-01T12:00:00Z`))
}

/** « Ven. 14 » — libellé compact d'une ligne du planning mensuel. */
function formatDayShort(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : 'fr-FR', {
    timeZone: 'UTC', weekday: 'short', day: '2-digit',
    ...(locale === 'ar' ? { numberingSystem: 'latn' as const } : {}),
  }).format(new Date(`${isoDate}T12:00:00Z`))
}

const DUTY_SELECT = `
  SELECT dp.duty_date, dp.wilaya_code, r.wilaya_name_fr, r.wilaya_name_ar,
    dp.commune_code, r.commune_name_fr, r.commune_name_ar, dp.shift,
    COALESCE(ph.name_fr, ph.name_ar) AS name,
    COALESCE(ph.name_ar, ph.name_fr) AS name_ar,
    ph.address_fr, ph.address_ar, ph.phone_e164
  FROM garde_duty_periods dp
  JOIN garde_pharmacies ph ON ph.id = dp.pharmacy_id
  JOIN garde_rosters r ON r.id = dp.roster_id
`

/** Ajoute une officine à la liste d'une commune, en fusionnant les vacations. */
function upsertPharmacy(
  communes: GardeCommuneDay[],
  index: Map<string, GardePharmacyDay>,
  keyPrefix: string,
  row: GardeDutyRow
): boolean {
  let commune = communes.find(c => c.commune_code === row.commune_code)
  if (!commune) {
    commune = {
      commune_code: row.commune_code,
      commune_name_fr: row.commune_name_fr,
      commune_name_ar: row.commune_name_ar || row.commune_name_fr,
      pharmacies: [],
    }
    communes.push(commune)
  }

  const key = `${keyPrefix}|${row.commune_code}|${row.name}`
  const existing = index.get(key)
  if (existing) {
    if (!existing.shifts.includes(row.shift)) existing.shifts.push(row.shift)
    return false
  }

  const pharmacy: GardePharmacyDay = {
    name: row.name,
    name_ar: row.name_ar,
    address: row.address_fr,
    address_ar: row.address_ar || row.address_fr,
    phone: row.phone_e164,
    shifts: [row.shift],
  }
  index.set(key, pharmacy)
  commune.pharmacies.push(pharmacy)
  return true
}

/**
 * Officines de garde pour une date, regroupées wilaya → commune.
 * Une officine présente sur plusieurs vacations (jour + nuit) n'apparaît
 * qu'une fois, avec l'ensemble de ses vacations.
 */
export async function getGardeDayByWilaya(
  date: string,
  wilayaCode?: string,
  communeCode?: string
): Promise<GardeWilayaDay[]> {
  const params: any[] = [date]
  const filters: string[] = []
  if (wilayaCode) { params.push(wilayaCode); filters.push(`AND dp.wilaya_code = $${params.length}`) }
  if (communeCode) { params.push(communeCode); filters.push(`AND dp.commune_code = $${params.length}`) }

  const rows = await query<GardeDutyRow>(`
    ${DUTY_SELECT}
    WHERE dp.duty_date = $1 ${filters.join(' ')}
    ORDER BY dp.wilaya_code, r.commune_name_fr, dp.starts_at, name
  `, params)

  const wilayas = new Map<string, GardeWilayaDay>()
  const pharmacyIndex = new Map<string, GardePharmacyDay>()

  for (const row of rows) {
    let wilaya = wilayas.get(row.wilaya_code)
    if (!wilaya) {
      wilaya = {
        wilaya_code: row.wilaya_code,
        wilaya_name_fr: row.wilaya_name_fr,
        wilaya_name_ar: row.wilaya_name_ar || row.wilaya_name_fr,
        date, total: 0, communes: [],
      }
      wilayas.set(row.wilaya_code, wilaya)
    }

    if (upsertPharmacy(wilaya.communes, pharmacyIndex, row.wilaya_code, row)) wilaya.total++
  }

  return Array.from(wilayas.values()).sort((a, b) => a.wilaya_code.localeCompare(b.wilaya_code))
}

/**
 * Planning d'un mois calendaire (YYYY-MM), regroupé wilaya → jour → commune.
 * Sert au visuel « planning du mois », l'équivalent publiable des tableaux
 * mensuels affichés en vitrine des officines.
 */
export async function getGardeMonthByWilaya(
  month: string,
  wilayaCode?: string,
  communeCode?: string
): Promise<GardeWilayaMonth[]> {
  const params: any[] = [month]
  const filters: string[] = []
  if (wilayaCode) { params.push(wilayaCode); filters.push(`AND dp.wilaya_code = $${params.length}`) }
  if (communeCode) { params.push(communeCode); filters.push(`AND dp.commune_code = $${params.length}`) }

  const rows = await query<GardeDutyRow & { duty_date: string }>(`
    ${DUTY_SELECT}
    WHERE to_char(dp.duty_date, 'YYYY-MM') = $1 ${filters.join(' ')}
    ORDER BY dp.wilaya_code, dp.duty_date, r.commune_name_fr, dp.starts_at, name
  `, params)

  const wilayas = new Map<string, GardeWilayaMonth>()
  const pharmacyIndex = new Map<string, GardePharmacyDay>()

  for (const row of rows) {
    let wilaya = wilayas.get(row.wilaya_code)
    if (!wilaya) {
      wilaya = {
        wilaya_code: row.wilaya_code,
        wilaya_name_fr: row.wilaya_name_fr,
        wilaya_name_ar: row.wilaya_name_ar || row.wilaya_name_fr,
        month,
        commune_code: null, commune_name_fr: null, commune_name_ar: null,
        total: 0, days: [],
      }
      wilayas.set(row.wilaya_code, wilaya)
    }

    const dutyDate = String(row.duty_date).slice(0, 10)
    let day = wilaya.days.find(d => d.date === dutyDate)
    if (!day) {
      day = { date: dutyDate, total: 0, communes: [] }
      wilaya.days.push(day)
    }

    if (upsertPharmacy(day.communes, pharmacyIndex, `${row.wilaya_code}|${dutyDate}`, row)) {
      day.total++
      wilaya.total++
    }
  }

  // Un planning mensuel ne se lit que commune par commune : quand une seule
  // commune est présente (cas d'un ciblage explicite, ou d'une wilaya à
  // commune unique), on la mémorise pour l'afficher en titre.
  for (const wilaya of wilayas.values()) {
    const communes = new Map<string, GardeCommuneDay>()
    for (const day of wilaya.days) {
      for (const c of day.communes) if (!communes.has(c.commune_code)) communes.set(c.commune_code, c)
    }
    if (communes.size === 1) {
      const only = Array.from(communes.values())[0]
      wilaya.commune_code = only.commune_code
      wilaya.commune_name_fr = only.commune_name_fr
      wilaya.commune_name_ar = only.commune_name_ar
    }
  }

  return Array.from(wilayas.values()).sort((a, b) => a.wilaya_code.localeCompare(b.wilaya_code))
}

/** Éclate une journée wilaya en une journée par commune (publication ciblée). */
export function splitDayByCommune(day: GardeWilayaDay): GardeWilayaDay[] {
  return day.communes.map(commune => ({
    ...day,
    total: commune.pharmacies.length,
    communes: [commune],
  }))
}

/** Éclate un planning mensuel wilaya en un planning par commune. */
export function splitMonthByCommune(month: GardeWilayaMonth): GardeWilayaMonth[] {
  const communeCodes = new Map<string, GardeCommuneDay>()
  for (const day of month.days) {
    for (const c of day.communes) if (!communeCodes.has(c.commune_code)) communeCodes.set(c.commune_code, c)
  }

  return Array.from(communeCodes.entries()).map(([code, ref]) => {
    const days = month.days
      .map(day => {
        const commune = day.communes.find(c => c.commune_code === code)
        return commune ? { date: day.date, total: commune.pharmacies.length, communes: [commune] } : null
      })
      .filter((d): d is GardeMonthDay => d !== null)

    return {
      ...month,
      commune_code: code,
      commune_name_fr: ref.commune_name_fr,
      commune_name_ar: ref.commune_name_ar,
      total: days.reduce((sum, d) => sum + d.total, 0),
      days,
    }
  })
}

// ─── LÉGENDE FACEBOOK ─────────────────────────────────────────

const CAPTION_MAX_PHARMACIES = 40

function shiftSuffix(shifts: string[], locale: Locale = 'fr'): string {
  const hasNuit = shifts.includes('nuit')
  const hasJour = shifts.some(s => s !== 'nuit')
  if (locale === 'ar') {
    if (hasNuit && hasJour) return ' (24/24)'
    if (hasNuit) return ' (ليلية)'
    return ''
  }
  if (hasNuit && hasJour) return ' (24h/24)'
  if (hasNuit) return ' (nuit)'
  return ''
}

/**
 * Date en arabe algérien (mois « جويلية », « أوت »… hérités du français) et
 * chiffres latins, comme sur le site et les documents DSP.
 */
function formatDateAr(isoDate: string): string {
  return new Intl.DateTimeFormat('ar-DZ', {
    timeZone: 'Africa/Algiers', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    numberingSystem: 'latn',
  }).format(new Date(`${isoDate}T12:00:00Z`))
}

// Domaine de repli si NEXT_PUBLIC_APP_URL n'est pas défini. En production
// c'est la variable d'environnement qui prime (voir Vercel).
const DEFAULT_APP_URL = 'https://dzair-pharma.net'

/**
 * Lien vers la page de garde la plus pertinente pour une wilaya :
 * - une seule commune (ex. Saïda) → page directe /pharmacie-de-garde/<wilaya>/<commune>
 * - plusieurs communes → hub ancré sur la wilaya (pas de page « wilaya seule »)
 * Les slugs sont dérivés du nom français (identiques en FR et AR) ; en arabe
 * on préfixe simplement par /ar pour pointer vers la version arabe du site.
 */
export function gardeWilayaUrl(appUrl: string, day: GardeWilayaDay, locale: Locale = 'fr'): string {
  return gardeUrl(appUrl, day.wilaya_name_fr, day.communes.length === 1 ? day.communes[0].commune_name_fr : null, locale)
}

function gardeUrl(appUrl: string, wilayaNameFr: string, communeNameFr: string | null, locale: Locale): string {
  const prefix = locale === 'ar' ? '/ar' : ''
  const base = `${appUrl}${prefix}/pharmacie-de-garde`
  const wilayaSlug = slugify(wilayaNameFr)
  if (communeNameFr) return `${base}/${wilayaSlug}/${slugify(communeNameFr)}`
  return `${base}#${wilayaSlug}`
}

function gardeMonthUrl(appUrl: string, month: GardeWilayaMonth, locale: Locale): string {
  return gardeUrl(appUrl, month.wilaya_name_fr, month.commune_name_fr, locale)
}

/** Une publication anticipée (vendredi) doit dire qu'elle ne concerne pas aujourd'hui. */
export type CaptionOptions = { upcoming?: boolean }

/**
 * « BAB EL OUED (Alger) », ou « SAÏDA » seul quand le chef-lieu porte le
 * nom de sa wilaya.
 */
function captionScope(wilayaName: string, communeName: string | null | undefined, upper: boolean): string {
  const wilaya = upper ? wilayaName.toUpperCase() : wilayaName
  if (!communeName) return wilaya
  const commune = upper ? communeName.toUpperCase() : communeName
  if (communeName.localeCompare(wilayaName, undefined, { sensitivity: 'base' }) === 0) return commune
  return `${commune} (${wilayaName})`
}

export function formatGardeCaption(day: GardeWilayaDay, locale: Locale = 'fr', opts: CaptionOptions = {}): string {
  if (locale === 'ar') return formatGardeCaptionAr(day, opts)

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '')
  // Une commune unique est nommée dans le titre : c'est l'information que
  // cherche le lecteur, la wilaya seule ne suffit pas dans les grandes wilayas.
  const scope = captionScope(
    day.wilaya_name_fr,
    day.communes.length === 1 ? day.communes[0].commune_name_fr : null,
    true
  )
  const lines: string[] = [
    `🟢 PHARMACIES DE GARDE — ${scope}`,
    `📅 ${formatDateFr(day.date)}${opts.upcoming ? ' (à venir)' : ''}`,
    '',
  ]

  // Une seule commune : elle est déjà dans le titre, pas de sous-titre.
  const showCommunes = day.communes.length > 1
  let listed = 0
  let truncated = false
  for (const commune of day.communes) {
    if (truncated) break
    if (showCommunes) lines.push(`📍 ${commune.commune_name_fr}`)
    for (const ph of commune.pharmacies) {
      if (listed >= CAPTION_MAX_PHARMACIES) { truncated = true; break }
      const parts = [ph.name]
      if (ph.address) parts.push(ph.address)
      if (ph.phone) parts.push(`☎ ${ph.phone}`)
      lines.push(`• ${parts.join(' — ')}${shiftSuffix(ph.shifts)}`)
      listed++
    }
    lines.push('')
  }
  if (truncated) {
    lines.push(`… et ${day.total - listed} autres officines (liste complète sur le site)`, '')
  }

  const hashtagWilaya = day.wilaya_name_fr.replace(/[^A-Za-zÀ-ÿ0-9]/g, '')
  // URL complète (avec https://) pour que Facebook la rende cliquable dans
  // la légende — un lien sans protocole n'est pas toujours auto-lié.
  lines.push(
    'ℹ️ Horaires, carte et itinéraires :',
    `👉 ${gardeWilayaUrl(appUrl, day)}`,
    '',
    `#PharmacieDeGarde #${hashtagWilaya} #Algérie #DwaDZ`
  )

  return lines.join('\n')
}

/** Légende en arabe (RTL), pointant vers la version arabe du site (/ar/...). */
function formatGardeCaptionAr(day: GardeWilayaDay, opts: CaptionOptions = {}): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '')
  const scope = captionScope(
    day.wilaya_name_ar,
    day.communes.length === 1 ? day.communes[0].commune_name_ar : null,
    false
  )
  const lines: string[] = [
    `🟢 صيدليات المناوبة — ${scope}`,
    `📅 ${formatDateAr(day.date)}${opts.upcoming ? ' (قادم)' : ''}`,
    '',
  ]

  const showCommunes = day.communes.length > 1
  let listed = 0
  let truncated = false
  for (const commune of day.communes) {
    if (truncated) break
    if (showCommunes) lines.push(`📍 ${commune.commune_name_ar}`)
    for (const ph of commune.pharmacies) {
      if (listed >= CAPTION_MAX_PHARMACIES) { truncated = true; break }
      const parts = [ph.name_ar]
      if (ph.address_ar) parts.push(ph.address_ar)
      if (ph.phone) parts.push(`☎ ${ph.phone}`)
      lines.push(`• ${parts.join(' — ')}${shiftSuffix(ph.shifts, 'ar')}`)
      listed++
    }
    lines.push('')
  }
  if (truncated) {
    lines.push(`… و${day.total - listed} صيدلية أخرى (القائمة الكاملة على الموقع)`, '')
  }

  const hashtagWilaya = day.wilaya_name_ar.replace(/[^؀-ۿ0-9]/g, '')
  lines.push(
    'ℹ️ المواقيت والخريطة والاتجاهات :',
    `👉 ${gardeWilayaUrl(appUrl, day, 'ar')}`,
    '',
    `#صيدلية_المناوبة #${hashtagWilaya} #الجزائر #DwaDZ`
  )

  return lines.join('\n')
}

// ─── LÉGENDE MENSUELLE ────────────────────────────────────────

/** Au-delà, la légende devient illisible dans le fil : on renvoie au site. */
const CAPTION_MAX_DAYS = 31

/** « Pharmacie X (nuit), Pharmacie Y » — officines d'une journée sur une ligne. */
function dayPharmacyLine(day: GardeMonthDay, locale: Locale): string {
  const names: string[] = []
  for (const commune of day.communes) {
    for (const ph of commune.pharmacies) {
      const label = locale === 'ar' ? ph.name_ar : ph.name
      names.push(`${label}${shiftSuffix(ph.shifts, locale)}`)
    }
  }
  return names.join(', ')
}

/**
 * Légende du planning mensuel : une ligne par jour, ce qui reste lisible
 * pour une commune (le format dans lequel les plannings sont publiés).
 */
export function formatGardeMonthCaption(month: GardeWilayaMonth, locale: Locale = 'fr'): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '')
  const ar = locale === 'ar'
  const scope = ar
    ? captionScope(month.wilaya_name_ar, month.commune_name_ar, false)
    : captionScope(month.wilaya_name_fr, month.commune_name_fr, true)

  const lines: string[] = ar
    ? [`🗓️ برنامج المناوبة — ${scope}`, `📅 ${formatMonthAr(month.month)}`, '']
    : [`🗓️ PLANNING DES GARDES — ${scope}`, `📅 ${formatMonthFr(month.month)}`, '']

  const shown = month.days.slice(0, CAPTION_MAX_DAYS)
  for (const day of shown) {
    lines.push(`${formatDayShort(day.date, locale)} — ${dayPharmacyLine(day, locale)}`)
  }
  if (month.days.length > shown.length) {
    const rest = month.days.length - shown.length
    lines.push(ar ? `… و${rest} يوم آخر على الموقع` : `… et ${rest} autres jours sur le site`)
  }
  lines.push('')

  const hashtagWilaya = ar
    ? month.wilaya_name_ar.replace(/[^؀-ۿ0-9]/g, '')
    : month.wilaya_name_fr.replace(/[^A-Za-zÀ-ÿ0-9]/g, '')

  lines.push(
    ar ? 'ℹ️ المواقيت والخريطة والاتجاهات :' : 'ℹ️ Horaires, carte et itinéraires :',
    `👉 ${gardeMonthUrl(appUrl, month, locale)}`,
    '',
    ar
      ? `#صيدلية_المناوبة #${hashtagWilaya} #الجزائر #DwaDZ`
      : `#PharmacieDeGarde #${hashtagWilaya} #Algérie #DwaDZ`
  )

  return lines.join('\n')
}

// ─── IMAGE (next/og / satori) ─────────────────────────────────

/**
 * Polices embarquées (assets/fonts) : la police par défaut de next/og ne
 * couvre pas l'arabe et satori PLANTE sur les noms d'officines en arabe
 * (name_fr nullable depuis la migration 10). Noto Sans (sous-ensemble
 * latin) pour le français, Tajawal pour l'arabe — les tables GSUB de Noto
 * Sans Arabic utilisent un format non supporté par le moteur de satori
 * (« lookupType 5 substFormat 3 »), Tajawal non. Chargées une fois par
 * instance ; incluses dans le bundle serverless via
 * outputFileTracingIncludes (next.config.js).
 */
type LoadedFont = { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }
let fontsCache: LoadedFont[] | null | undefined

// Logo DwaDZ embarqué dans l'en-tête de l'image, en data URI (satori ne
// récupère pas d'URL distante — et notre crawler serait de toute façon
// bloqué). Converti une fois depuis public/dwadz-logo.svg vers
// assets/dwadz-logo.png. Chargé une fois par instance.
let logoCache: string | null | undefined

async function loadLogo(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache
  try {
    const png = await readFile(path.join(process.cwd(), 'assets', 'dwadz-logo.png'))
    logoCache = `data:image/png;base64,${png.toString('base64')}`
  } catch (err: any) {
    console.error('[garde-social] Logo introuvable:', err?.message || err)
    logoCache = null
  }
  return logoCache
}

async function loadFonts(): Promise<LoadedFont[] | null> {
  if (fontsCache !== undefined) return fontsCache
  try {
    const dir = path.join(process.cwd(), 'assets', 'fonts')
    const [latin, latinBold, arabic, arabicBold] = await Promise.all([
      readFile(path.join(dir, 'NotoSans-Regular.ttf')),
      readFile(path.join(dir, 'NotoSans-Bold.ttf')),
      readFile(path.join(dir, 'Tajawal-Regular.ttf')),
      readFile(path.join(dir, 'Tajawal-Bold.ttf')),
    ])
    fontsCache = [
      { name: 'Noto Sans', data: latin, weight: 400, style: 'normal' },
      { name: 'Noto Sans', data: latinBold, weight: 700, style: 'normal' },
      { name: 'Tajawal', data: arabic, weight: 400, style: 'normal' },
      { name: 'Tajawal', data: arabicBold, weight: 700, style: 'normal' },
    ]
  } catch (err: any) {
    console.error('[garde-social] Polices introuvables, repli sans arabe:', err?.message || err)
    fontsCache = null
  }
  return fontsCache
}

/**
 * Sans police arabe chargée, tout caractère arabe fait planter satori :
 * on remplace alors le texte concerné plutôt que d'échouer la publication.
 */
function imageSafeText(text: string, arabicOk: boolean, fallback: string): string {
  if (arabicOk || !/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(text)) return text
  const latinOnly = text.replace(/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+/g, ' ').replace(/\s+/g, ' ').trim()
  return latinOnly || fallback
}

const IMAGE_WIDTH = 1080
const IMAGE_HEIGHT = 1350

// Vert et rouge du drapeau algérien — le liseré et les accents des visuels
// reprennent ces couleurs (le blanc vient du fond de la carte).
const ALGERIA_GREEN = '#006233'
const ALGERIA_RED = '#D21034'
// Hauteur disponible dans la carte blanche, exprimée en « unités ligne » :
// une officine ≈ 1 unité, un en-tête de commune ≈ 0.6 — au-delà, le
// contenu déborderait du cadre 1080×1350 (le reste passe en « + N autres »).
const IMAGE_ROW_BUDGET = 8
const COMMUNE_HEADER_COST = 0.6

type ImageSection =
  | { kind: 'commune'; label: string }
  | { kind: 'pharmacy'; pharmacy: GardePharmacyDay }

function buildImageSections(day: GardeWilayaDay, locale: Locale): { sections: ImageSection[]; remaining: number } {
  const sections: ImageSection[] = []
  const showHeaders = day.communes.length > 1
  let used = 0
  let listed = 0
  for (const commune of day.communes) {
    // Ne commencer une commune que s'il reste la place pour son en-tête
    // et au moins une officine.
    if (used + (showHeaders ? COMMUNE_HEADER_COST : 0) + 1 > IMAGE_ROW_BUDGET) break
    if (showHeaders) {
      const label = locale === 'ar' ? commune.commune_name_ar : commune.commune_name_fr
      sections.push({ kind: 'commune', label })
      used += COMMUNE_HEADER_COST
    }
    for (const ph of commune.pharmacies) {
      if (used + 1 > IMAGE_ROW_BUDGET) break
      sections.push({ kind: 'pharmacy', pharmacy: ph })
      used += 1
      listed++
    }
  }
  return { sections, remaining: day.total - listed }
}

function shiftBadge(shifts: string[], locale: Locale): { label: string; bg: string; fg: string } {
  const hasNuit = shifts.includes('nuit')
  const hasJour = shifts.some(s => s !== 'nuit')
  const ar = locale === 'ar'
  if (hasNuit && hasJour) return { label: ar ? '24/24' : '24h/24', bg: '#dcfce7', fg: '#166534' }
  if (hasNuit) return { label: ar ? 'ليلية' : 'Nuit', bg: '#e0e7ff', fg: '#3730a3' }
  return { label: ar ? 'نهارية' : 'Jour', bg: '#fef9c3', fg: '#854d0e' }
}

// Libellés localisés de l'image.
const IMAGE_STRINGS = {
  fr: {
    title: 'Pharmacies de garde',
    monthTitle: 'Planning des gardes',
    more: (n: number) => `+ ${n} autres officines — liste complète sur le site`,
    moreDays: (n: number) => `+ ${n} autres jours — planning complet sur le site`,
    upcoming: 'À venir',
    path: '/pharmacie-de-garde',
  },
  ar: {
    title: 'صيدليات المناوبة',
    monthTitle: 'برنامج المناوبة',
    more: (n: number) => `+ ${n} صيدلية أخرى — القائمة الكاملة على الموقع`,
    moreDays: (n: number) => `+ ${n} يوم آخر — البرنامج الكامل على الموقع`,
    upcoming: 'قادم',
    path: '/ar/pharmacie-de-garde',
  },
} as const

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s
}

/**
 * Réglages de mise en page communs aux visuels (sens de lecture, polices,
 * hôte affiché). On n'utilise PAS `direction: rtl` (satori « justifie »
 * alors les mots arabes, créant de gros trous) : le sens RTL des glyphes
 * est géré par la police, l'alignement visuel via flexDirection + justify.
 */
async function imageChrome(locale: Locale) {
  const ar = locale === 'ar'
  const [fonts, logo] = await Promise.all([loadFonts(), loadLogo()])
  return {
    ar,
    fonts,
    logo,
    arabicOk: !!fonts,
    t: IMAGE_STRINGS[locale],
    appHost: (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/^https?:\/\//, '').replace(/\/+$/, ''),
    rowDir: (ar ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    startAlign: (ar ? 'flex-end' : 'flex-start') as 'flex-end' | 'flex-start',
    fontFamily: fonts
      ? (ar ? '"Tajawal", "Noto Sans", sans-serif' : '"Noto Sans", "Tajawal", sans-serif')
      : 'sans-serif',
  }
}

type ImageChrome = Awaited<ReturnType<typeof imageChrome>>

/** Liseré vert-blanc-rouge : le visuel est identifiable au premier coup d'œil. */
function FlagStripe({ marginTop = 0 }: { marginTop?: number }) {
  return (
    <div style={{ display: 'flex', width: '100%', height: 9, borderRadius: 999, overflow: 'hidden', marginTop }}>
      <div style={{ display: 'flex', width: '34%', height: '100%', backgroundColor: ALGERIA_GREEN }} />
      <div style={{ display: 'flex', width: '33%', height: '100%', backgroundColor: '#ffffff' }} />
      <div style={{ display: 'flex', width: '33%', height: '100%', backgroundColor: ALGERIA_RED }} />
    </div>
  )
}

/**
 * En-tête commun aux visuels : logo DwaDZ, logo de la wilaya quand il est
 * enregistré (admin → /admin/garde/publication), titre, périmètre, période.
 */
function ImageHeader({
  chrome, wilayaLogo, title, scope, subtitle, badge, noWrap,
}: {
  chrome: ImageChrome
  wilayaLogo: string | null
  title: string
  scope: string
  subtitle: string
  badge?: string
  noWrap: (s: string) => string
}) {
  const { ar, logo, appHost, rowDir, startAlign } = chrome
  const logoGap = ar ? { marginLeft: 16 } : { marginRight: 16 }
  const subtitleGap = ar ? { marginRight: 22 } : { marginLeft: 22 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 22 }}>
      <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center' }}>
          {logo && <img src={logo} width={54} height={54} style={logoGap} alt="" />}
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#7dd3fc' }}>DwaDZ</div>
        </div>
        <div style={{ display: 'flex', fontSize: 23, color: '#94a3b8' }}>{appHost}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', marginTop: 14 }}>
        {wilayaLogo && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 112, height: 112, borderRadius: 20, backgroundColor: '#ffffff',
            padding: 8, border: `3px solid ${ALGERIA_GREEN}`,
            ...(ar ? { marginLeft: 22 } : { marginRight: 22 }),
          }}>
            <img src={wilayaLogo} width={92} height={92} style={{ objectFit: 'contain' }} alt="" />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 46, fontWeight: 800, color: '#ffffff' }}>{noWrap(title)}</div>
            {badge && (
              <div style={{
                display: 'flex', fontSize: 22, fontWeight: 700, color: '#ffffff',
                backgroundColor: ALGERIA_RED, borderRadius: 999, padding: '5px 18px',
              }}>
                {noWrap(badge)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: startAlign, marginTop: 8 }}>
            <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: '#38bdf8' }}>{noWrap(scope)}</div>
            <div style={{ display: 'flex', fontSize: 25, color: '#cbd5e1', ...subtitleGap }}>{noWrap(subtitle)}</div>
          </div>
        </div>
      </div>

      <FlagStripe marginTop={16} />
    </div>
  )
}

function ImageFooter({ chrome }: { chrome: ImageChrome }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18 }}>
      <FlagStripe />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#7dd3fc' }}>
          {chrome.appHost}{chrome.t.path}
        </div>
      </div>
    </div>
  )
}

/**
 * Périmètre affiché en titre : la commune quand elle est seule, sinon la
 * wilaya. Le chef-lieu porte souvent le nom de sa wilaya (Saïda, Béjaïa…) :
 * on ne l'écrit alors qu'une fois.
 */
function scopeLabel(wilayaName: string, communeName: string | null): string {
  if (!communeName) return wilayaName
  if (communeName.localeCompare(wilayaName, undefined, { sensitivity: 'base' }) === 0) return communeName
  return `${communeName} · ${wilayaName}`
}

function dayScopeLabel(day: GardeWilayaDay, ar: boolean): string {
  const commune = day.communes.length === 1 ? day.communes[0] : null
  return scopeLabel(
    ar ? day.wilaya_name_ar : day.wilaya_name_fr,
    commune ? (ar ? commune.commune_name_ar : commune.commune_name_fr) : null
  )
}

/**
 * Image portrait 1080×1350 (format adapté au fil Facebook) listant les
 * officines de garde d'une wilaya — ou d'une commune précise —, en français
 * (LTR) ou en arabe (RTL).
 */
export async function buildGardeImageResponse(
  day: GardeWilayaDay,
  locale: Locale = 'fr',
  opts: { upcoming?: boolean } = {}
): Promise<ImageResponse> {
  const { sections, remaining } = buildImageSections(day, locale)
  const chrome = await imageChrome(locale)
  const { ar, fonts, arabicOk, t, rowDir, startAlign } = chrome
  const wilayaLogo = await getWilayaLogoDataUri(day.wilaya_code)
  const dateStr = ar ? formatDateAr(day.date) : formatDateFr(day.date)
  // Peu d'officines (cas courant d'une commune) : on agrandit les lignes
  // plutôt que de laisser une grande carte blanche à moitié vide.
  const rows = sections.filter(s => s.kind === 'pharmacy').length
  const size = rows <= 3
    ? { name: 40, sub: 28, badge: 24, pad: 24 }
    : rows <= 5
      ? { name: 35, sub: 26, badge: 22, pad: 18 }
      : { name: 31, sub: 24, badge: 21, pad: 14 }
  // satori insère un espace anormalement large entre deux « mots » de texte
  // (il les découpe en segments) — flagrant en arabe. Remplacer l'espace
  // ordinaire par un insécable garde le texte en un seul segment et rétablit
  // l'espacement naturel de la police.
  const noWrap = (s: string) => ar ? s.replace(/ /g, ' ') : s

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        padding: '40px 48px',
        fontFamily: chrome.fontFamily,
      }}>
        <ImageHeader
          chrome={chrome}
          wilayaLogo={wilayaLogo}
          title={t.title}
          scope={dayScopeLabel(day, ar)}
          subtitle={dateStr}
          badge={opts.upcoming ? t.upcoming : undefined}
          noWrap={noWrap}
        />

        {/* Liste — centrée verticalement quand la commune n'a qu'une garde ou
            deux, pour éviter une grande carte blanche à moitié vide. */}
        <div style={{
          display: 'flex', flexDirection: 'column', flexGrow: 1,
          justifyContent: sections.length <= 4 ? 'center' : 'flex-start',
          backgroundColor: '#ffffff', borderRadius: 24, padding: '28px 36px', overflow: 'hidden',
        }}>
          {sections.map((section, i) => section.kind === 'commune' ? (
            <div key={i} style={{
              display: 'flex', justifyContent: startAlign, fontSize: 26, fontWeight: 700, color: '#0284c7',
              textTransform: 'uppercase', letterSpacing: 1,
              marginTop: i === 0 ? 0 : 18, paddingBottom: 6,
              borderBottom: '2px solid #e2e8f0',
            }}>
              {noWrap(truncate(section.label, 40))}
            </div>
          ) : (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column',
              padding: `${size.pad}px 0`, borderBottom: '1px solid #f1f5f9',
            }}>
              <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', fontSize: size.name, fontWeight: 700, color: '#0f172a' }}>
                  {noWrap(truncate(imageSafeText(ar ? section.pharmacy.name_ar : section.pharmacy.name, arabicOk, ar ? 'صيدلية' : 'Pharmacie (voir légende)'), rows <= 3 ? 32 : 42))}
                </div>
                <div style={{
                  display: 'flex', fontSize: size.badge, fontWeight: 700,
                  backgroundColor: shiftBadge(section.pharmacy.shifts, locale).bg,
                  color: shiftBadge(section.pharmacy.shifts, locale).fg,
                  borderRadius: 999, padding: '4px 16px',
                }}>
                  {shiftBadge(section.pharmacy.shifts, locale).label}
                </div>
              </div>
              {((ar ? section.pharmacy.address_ar : section.pharmacy.address) || section.pharmacy.phone) && (
                <div style={{ display: 'flex', justifyContent: startAlign, fontSize: size.sub, color: '#64748b', marginTop: 6 }}>
                  {noWrap(truncate(imageSafeText(
                    [ar ? section.pharmacy.address_ar : section.pharmacy.address, section.pharmacy.phone].filter(Boolean).join('  ·  '),
                    arabicOk, section.pharmacy.phone || ''
                  ), 70))}
                </div>
              )}
            </div>
          ))}
          {remaining > 0 && (
            <div style={{ display: 'flex', justifyContent: startAlign, fontSize: 26, fontWeight: 700, color: '#0284c7', marginTop: 18 }}>
              {noWrap(t.more(remaining))}
            </div>
          )}
        </div>

        <ImageFooter chrome={chrome} />
      </div>
    ),
    { width: IMAGE_WIDTH, height: IMAGE_HEIGHT, ...(fonts ? { fonts } : {}) }
  )
}

export async function renderGardeImagePng(
  day: GardeWilayaDay,
  locale: Locale = 'fr',
  opts: { upcoming?: boolean } = {}
): Promise<Buffer> {
  const image = await buildGardeImageResponse(day, locale, opts)
  return Buffer.from(await image.arrayBuffer())
}

// ─── IMAGE DU PLANNING MENSUEL ────────────────────────────────

const MONTH_MAX_ROWS = 31

// Hauteur utile de la carte blanche du visuel mensuel (1350 px moins
// l'en-tête, le pied de page et les marges) : les lignes s'y ajustent pour
// qu'un mois de 31 jours tienne sans déborder du cadre.
const MONTH_CARD_INNER_HEIGHT = 940
const MONTH_DAY_COLUMN_WIDTH = 150

function monthRowMetrics(rowCount: number) {
  const rowHeight = Math.floor(MONTH_CARD_INNER_HEIGHT / Math.max(rowCount, 1))
  // satori rend une ligne de texte à ~1.25 × la taille de police.
  const fontSize = Math.max(16, Math.min(30, Math.floor((rowHeight - 8) / 1.25)))
  const padding = Math.max(2, Math.min(12, Math.floor((rowHeight - fontSize * 1.25) / 2)))
  // Largeur disponible pour les noms d'officines, en caractères.
  const maxChars = Math.floor((IMAGE_WIDTH - 96 - 60 - MONTH_DAY_COLUMN_WIDTH) / (fontSize * 0.52))
  return { fontSize, dayFontSize: Math.max(14, fontSize - 4), padding, maxChars }
}

/**
 * Image du planning mensuel : une ligne par jour (« Ven. 14 — Pharmacie X »),
 * dans l'esprit des tableaux affichés en vitrine des officines.
 * Pensée pour une commune : à l'échelle d'une wilaya entière, préférez la
 * publication par commune (voir publishGardeToFacebook, granularity).
 */
export async function buildGardeMonthImageResponse(
  month: GardeWilayaMonth,
  locale: Locale = 'fr'
): Promise<ImageResponse> {
  const chrome = await imageChrome(locale)
  const { ar, fonts, arabicOk, t, rowDir, startAlign } = chrome
  const noWrap = (s: string) => ar ? s.replace(/ /g, ' ') : s
  const wilayaLogo = await getWilayaLogoDataUri(month.wilaya_code)

  const days = month.days.slice(0, MONTH_MAX_ROWS)
  const remainingDays = month.days.length - days.length
  const metrics = monthRowMetrics(days.length + (remainingDays > 0 ? 1 : 0))

  const scope = scopeLabel(
    ar ? month.wilaya_name_ar : month.wilaya_name_fr,
    ar ? month.commune_name_ar : month.commune_name_fr
  )

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        padding: '40px 48px',
        fontFamily: chrome.fontFamily,
      }}>
        <ImageHeader
          chrome={chrome}
          wilayaLogo={wilayaLogo}
          title={t.monthTitle}
          scope={scope}
          subtitle={ar ? formatMonthAr(month.month) : formatMonthFr(month.month)}
          noWrap={noWrap}
        />

        <div style={{
          display: 'flex', flexDirection: 'column', flexGrow: 1,
          backgroundColor: '#ffffff', borderRadius: 24, padding: '20px 30px', overflow: 'hidden',
        }}>
          {days.map((day, i) => {
            const names = day.communes.flatMap(c => c.pharmacies)
            const label = names
              .map(ph => `${imageSafeText(ar ? ph.name_ar : ph.name, arabicOk, ar ? 'صيدلية' : 'Pharmacie')}${shiftSuffix(ph.shifts, locale)}`)
              .join(' · ')
            // Le vendredi, jour de garde le plus consulté, est mis en avant.
            const isFriday = new Date(`${day.date}T12:00:00Z`).getUTCDay() === 5
            return (
              <div key={day.date} style={{
                display: 'flex', flexDirection: rowDir, alignItems: 'center',
                padding: `${metrics.padding}px 0`,
                borderBottom: i === days.length - 1 ? 'none' : '1px solid #f1f5f9',
                backgroundColor: isFriday ? '#f0fdf4' : 'transparent',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'center',
                  width: MONTH_DAY_COLUMN_WIDTH, flexShrink: 0,
                  fontSize: metrics.dayFontSize, fontWeight: 700,
                  color: isFriday ? ALGERIA_GREEN : '#334155',
                }}>
                  {noWrap(formatDayShort(day.date, locale))}
                </div>
                <div style={{
                  display: 'flex', justifyContent: startAlign, flexGrow: 1,
                  fontSize: metrics.fontSize, fontWeight: isFriday ? 700 : 400, color: '#0f172a',
                }}>
                  {noWrap(truncate(label, metrics.maxChars))}
                </div>
              </div>
            )
          })}
          {remainingDays > 0 && (
            <div style={{ display: 'flex', justifyContent: startAlign, fontSize: 24, fontWeight: 700, color: '#0284c7', marginTop: 12 }}>
              {noWrap(t.moreDays(remainingDays))}
            </div>
          )}
        </div>

        <ImageFooter chrome={chrome} />
      </div>
    ),
    { width: IMAGE_WIDTH, height: IMAGE_HEIGHT, ...(fonts ? { fonts } : {}) }
  )
}

export async function renderGardeMonthImagePng(month: GardeWilayaMonth, locale: Locale = 'fr'): Promise<Buffer> {
  const image = await buildGardeMonthImageResponse(month, locale)
  return Buffer.from(await image.arrayBuffer())
}

// ─── PUBLICATION ──────────────────────────────────────────────

export type GardeWilayaPublishResult = {
  wilaya_code: string
  wilaya_name_fr: string
  /** Commune ciblée, ou null pour une publication couvrant toute la wilaya. */
  commune_name_fr?: string | null
  period?: GardePeriod
  date?: string
  month?: string
  locale: Locale
  pharmacies: number
  status: 'published' | 'already_published' | 'failed' | 'dry_run'
  postId?: string
  error?: string
  /** Légende telle qu'elle serait publiée — renseignée en simulation. */
  caption?: string
}

export type GardeDailyPublishResult = {
  date: string
  period: GardePeriod
  /** Mois visé quand period = 'month'. */
  month?: string
  covered_wilayas: number
  /** Nombre de publications distinctes préparées (cibles × langues). */
  targets: number
  results: GardeWilayaPublishResult[]
}

/** Une publication : une journée ou un planning mensuel, wilaya ou commune. */
type PublishTarget = {
  wilaya_code: string
  wilaya_name_fr: string
  commune_name_fr: string | null
  pharmacies: number
  date?: string
  month?: string
  caption: (locale: Locale) => string
  render: (locale: Locale) => Promise<Buffer>
}

/**
 * Granularité des publications : un post par wilaya (toutes communes
 * réunies) ou un post par commune. Le planning mensuel force la granularité
 * commune — un mois × plusieurs communes est illisible sur un seul visuel.
 */
export type GardeGranularity = 'wilaya' | 'commune'

export function isGardeGranularity(value: unknown): value is GardeGranularity {
  return value === 'wilaya' || value === 'commune'
}

function configuredGranularity(): GardeGranularity {
  const raw = (process.env.GARDE_PUBLISH_GRANULARITY || 'wilaya').trim().toLowerCase()
  return isGardeGranularity(raw) ? raw : 'wilaya'
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Espacement entre deux publications, pour ne pas déverser toutes les
// wilayas dans le fil au même instant (et lisser la charge côté Graph API).
// Réglable via GARDE_POST_DELAY_MS. Le budget total borne la durée totale
// sous la limite d'exécution d'une fonction Vercel : au-delà, on continue à
// publier mais sans attendre, pour que toutes les wilayas passent quand même
// dans la même invocation plutôt que d'être coupées en cours de route.
const DEFAULT_POST_DELAY_MS = 8000
const DEFAULT_TIME_BUDGET_MS = 50000

/**
 * Langues publiées, dans l'ordre. Par défaut français puis arabe (un post
 * distinct par langue). Réglable via GARDE_PUBLISH_LOCALES (ex. "fr" pour
 * ne publier qu'en français, "ar,fr" pour inverser l'ordre).
 */
function configuredLocales(): Locale[] {
  const raw = (process.env.GARDE_PUBLISH_LOCALES || 'fr,ar')
    .split(',').map(s => s.trim().toLowerCase()).filter(s => s === 'fr' || s === 'ar') as Locale[]
  return raw.length ? Array.from(new Set(raw)) : ['fr', 'ar']
}

export type GardePublishOptions = {
  period?: GardePeriod
  /** Date visée (period 'day') ou point de départ du calcul (period 'friday'). */
  date?: string
  /** Mois visé (period 'month'), format YYYY-MM. Défaut : mois courant. */
  month?: string
  wilaya?: string
  commune?: string
  granularity?: GardeGranularity
  dryRun?: boolean
  delayMs?: number
  budgetMs?: number
  locales?: Locale[]
}

/** Construit la liste des publications à envoyer pour les options données. */
async function buildPublishTargets(opts: GardePublishOptions): Promise<{
  targets: PublishTarget[]
  coveredWilayas: number
  date: string
  month?: string
  upcoming: boolean
}> {
  const period = opts.period || 'day'

  if (period === 'month') {
    const month = opts.month || currentMonthInAlgiers()
    const wilayaMonths = await getGardeMonthByWilaya(month, opts.wilaya, opts.commune)
    // Un planning mensuel se lit commune par commune, quelle que soit la
    // granularité demandée.
    const targets = wilayaMonths.flatMap(splitMonthByCommune).map<PublishTarget>(m => ({
      wilaya_code: m.wilaya_code,
      wilaya_name_fr: m.wilaya_name_fr,
      commune_name_fr: m.commune_name_fr,
      pharmacies: m.total,
      month: m.month,
      caption: (locale) => formatGardeMonthCaption(m, locale),
      render: (locale) => renderGardeMonthImagePng(m, locale),
    }))
    return { targets, coveredWilayas: wilayaMonths.length, date: `${month}-01`, month, upcoming: false }
  }

  const date = resolveGardeDate(period, opts.date)
  const upcoming = period === 'friday'
  const days = await getGardeDayByWilaya(date, opts.wilaya, opts.commune)
  const granularity = opts.granularity ?? configuredGranularity()
  const scoped = granularity === 'commune' ? days.flatMap(splitDayByCommune) : days

  const targets = scoped.map<PublishTarget>(day => ({
    wilaya_code: day.wilaya_code,
    wilaya_name_fr: day.wilaya_name_fr,
    commune_name_fr: day.communes.length === 1 ? day.communes[0].commune_name_fr : null,
    pharmacies: day.total,
    date: day.date,
    caption: (locale) => formatGardeCaption(day, locale, { upcoming }),
    render: (locale) => renderGardeImagePng(day, locale, { upcoming }),
  }))

  return { targets, coveredWilayas: days.length, date, upcoming }
}

/**
 * Publie sur la Page Facebook, pour chaque cible ayant des officines de
 * garde sur la période demandée, une photo générée + la liste en légende,
 * dans chaque langue configurée (FR et AR par défaut, un post distinct
 * chacun, le post arabe pointant vers la version /ar du site).
 *
 * Idempotent : une légende strictement identique déjà publiée n'est pas
 * repostée — cron et bouton « Publier » peuvent donc être relancés sans
 * créer de doublon. Les publications sont espacées (voir delayMs).
 */
export async function publishGardeToFacebook(opts: GardePublishOptions = {}): Promise<GardeDailyPublishResult> {
  const period = opts.period || 'day'
  const { targets, coveredWilayas, date, month } = await buildPublishTargets(opts)
  const results: GardeWilayaPublishResult[] = []
  const locales = opts.locales ?? configuredLocales()

  const delayMs = opts.delayMs ?? (Number(process.env.GARDE_POST_DELAY_MS) || DEFAULT_POST_DELAY_MS)
  const budgetMs = opts.budgetMs ?? (Number(process.env.GARDE_TIME_BUDGET_MS) || DEFAULT_TIME_BUDGET_MS)
  const startedAt = Date.now()
  let publishedThisRun = 0

  for (const target of targets) {
    for (const locale of locales) {
      const caption = target.caption(locale)
      const base = {
        wilaya_code: target.wilaya_code,
        wilaya_name_fr: target.wilaya_name_fr,
        commune_name_fr: target.commune_name_fr,
        period,
        date: target.date,
        month: target.month,
        locale,
        pharmacies: target.pharmacies,
      }

      if (opts.dryRun) {
        results.push({ ...base, status: 'dry_run', caption })
        continue
      }

      const already = await queryOne<{ id: number }>(`
        SELECT id FROM social_posts
        WHERE type = 'garde' AND platform = 'facebook' AND status = 'published' AND content = $1
        LIMIT 1
      `, [caption])
      if (already) {
        results.push({ ...base, status: 'already_published' })
        continue
      }

      // Espacer les publications réelles successives, tant qu'il reste du
      // budget de temps (on ne retarde pas la première).
      if (publishedThisRun > 0 && delayMs > 0 && Date.now() - startedAt + delayMs < budgetMs) {
        await sleep(delayMs)
      }

      // Photo d'abord ; si la génération ou l'upload échoue, on retombe sur
      // un post texte pour ne pas priver la cible de sa publication.
      let post: { success: boolean; postId?: string; error?: string }
      try {
        const png = await target.render(locale)
        post = await postFacebookPhoto(png, caption)
        if (!post.success) post = await postToFacebook(caption)
      } catch (err: any) {
        console.error(`[garde-social] Image failed for wilaya ${target.wilaya_code} (${locale}):`, err?.message || err)
        post = await postToFacebook(caption)
      }
      publishedThisRun++

      const refId = Number(target.wilaya_code)
      await query(`
        INSERT INTO social_posts (type, platform, content, ref_id, ref_table, status, published_at, error_msg)
        VALUES ('garde', 'facebook', $1, $2, 'garde_wilaya', $3, $4, $5)
      `, [
        caption,
        Number.isFinite(refId) ? refId : null,
        post.success ? 'published' : 'failed',
        post.success ? new Date().toISOString() : null,
        post.error || null,
      ])

      results.push(post.success
        ? { ...base, status: 'published', postId: post.postId }
        : { ...base, status: 'failed', error: post.error })
    }
  }

  return { date, period, month, covered_wilayas: coveredWilayas, targets: targets.length * locales.length, results }
}

/** Publication de la garde du jour — conservé pour le cron et /api/publish. */
export function publishGardeDailyToFacebook(
  opts: Omit<GardePublishOptions, 'period' | 'month'> = {}
): Promise<GardeDailyPublishResult> {
  return publishGardeToFacebook({ ...opts, period: 'day' })
}
