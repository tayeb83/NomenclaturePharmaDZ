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
import {
  CASBAH, backgroundUri, bandUri, nicheUri, ornamentRuleUri, starUri, svgDataUri,
} from '@/lib/garde-ornaments'

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

/**
 * Même date en deux morceaux (« الثلاثاء، » puis « 20 أكتوبر 2026 ») pour les
 * visuels : voir IMAGE_STRINGS — satori ne sait pas ordonner seul un jour de
 * semaine arabe suivi de chiffres.
 */
function formatDateArPieces(isoDate: string): string[] {
  const parts = new Intl.DateTimeFormat('ar-DZ', {
    timeZone: 'Africa/Algiers', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    numberingSystem: 'latn',
  }).formatToParts(new Date(`${isoDate}T12:00:00Z`))
  const weekday = parts.find(p => p.type === 'weekday')?.value
  const tail = parts
    .filter(p => p.type === 'day' || p.type === 'month' || p.type === 'year' || (p.type === 'literal' && p.value === ' '))
    .map(p => p.value).join('').trim()
  return weekday && tail ? [`${weekday}،`, tail] : [formatDateAr(isoDate)]
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
    const [latin, latinBold, arabic, arabicBold, amiri, amiriBold] = await Promise.all([
      readFile(path.join(dir, 'NotoSans-Regular.ttf')),
      readFile(path.join(dir, 'NotoSans-Bold.ttf')),
      readFile(path.join(dir, 'Tajawal-Regular.ttf')),
      readFile(path.join(dir, 'Tajawal-Bold.ttf')),
      readFile(path.join(dir, 'Amiri-Regular.ttf')),
      readFile(path.join(dir, 'Amiri-Bold.ttf')),
    ])
    fontsCache = [
      { name: 'Noto Sans', data: latin, weight: 400, style: 'normal' },
      { name: 'Noto Sans', data: latinBold, weight: 700, style: 'normal' },
      { name: 'Tajawal', data: arabic, weight: 400, style: 'normal' },
      { name: 'Tajawal', data: arabicBold, weight: 700, style: 'normal' },
      // Police d'affichage du site (titres, noms) — calligraphie naskh.
      { name: 'Amiri', data: amiri, weight: 400, style: 'normal' },
      { name: 'Amiri', data: amiriBold, weight: 700, style: 'normal' },
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
const PAGE_PAD_X = 48

// Vert et rouge du drapeau algérien — gardés pour le petit liseré du pied de
// page ; le reste du visuel suit la palette du site (marine, laiton, zellige).
const ALGERIA_GREEN = '#006233'
const ALGERIA_RED = '#D21034'
// Hauteur disponible dans le cadre de la liste, exprimée en « unités ligne » :
// une officine ≈ 1 unité, un en-tête de commune ≈ 0.6 — au-delà, le
// contenu déborderait du cadre 1080×1350 (le reste passe en « + N autres »).
const IMAGE_ROW_BUDGET = 8
const COMMUNE_HEADER_COST = 0.6
const NAME_MAX_CHARS = 36
// Paliers de taille des lignes (du plus grand au plus serré) et hauteur utile
// de la liste dans la carte (1350 px − en-tête, pied de page, bandeaux, marges).
const ROW_TIERS = [
  { name: 56, sub: 31, badge: 28, pad: 32, head: 34 },
  { name: 48, sub: 28, badge: 25, pad: 22, head: 32 },
  { name: 42, sub: 26, badge: 23, pad: 16, head: 30 },
  { name: 36, sub: 23, badge: 21, pad: 11, head: 28 },
  { name: 33, sub: 21, badge: 19, pad: 6, head: 26 },
  { name: 30, sub: 20, badge: 18, pad: 3, head: 24 },
] as const
const ROW_LIST_HEIGHT = 815
export const DIVIDER_HEIGHT = 12

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

function shiftBadge(shifts: string[], locale: Locale): { label: string; bg: string; fg: string; border: string } {
  const hasNuit = shifts.includes('nuit')
  const hasJour = shifts.some(s => s !== 'nuit')
  const ar = locale === 'ar'
  if (hasNuit && hasJour) return { label: ar ? '24/24' : '24h/24', bg: CASBAH.teal, fg: '#ffffff', border: CASBAH.teal }
  if (hasNuit) return { label: ar ? 'ليلية' : 'Nuit', bg: CASBAH.navy, fg: CASBAH.brassLight, border: CASBAH.brass }
  return { label: ar ? 'نهارية' : 'Jour', bg: '#f8ebc8', fg: CASBAH.brassDark, border: CASBAH.brass }
}

// Libellés localisés de l'image.
const IMAGE_STRINGS = {
  fr: {
    title: 'Pharmacies de garde',
    monthTitle: 'Planning des gardes',
    more: (n: number) => [`+ ${n} autres officines — liste complète sur le site`],
    moreDays: (n: number) => [`+ ${n} autres jours — planning complet sur le site`],
    upcoming: 'À venir',
    path: '/pharmacie-de-garde',
  },
  ar: {
    title: 'صيدليات المناوبة',
    monthTitle: 'برنامج المناوبة',
    // En morceaux : satori n'applique pas l'algorithme bidi sur toute la phrase,
    // un mélange chiffres + arabe sortirait dans le désordre. Chaque morceau
    // est posé séparément, dans l'ordre de lecture (de droite à gauche).
    more: (n: number) => [`+ ${n}`, 'صيدلية أخرى', '—', 'القائمة الكاملة على الموقع'],
    moreDays: (n: number) => [`+ ${n}`, 'يوم آخر', '—', 'البرنامج الكامل على الموقع'],
    upcoming: 'قادم',
    path: '/ar/pharmacie-de-garde',
  },
} as const

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s
}

/**
 * Largeur approximative d'un texte en px (satori ne la donne pas) : capitales
 * et chiffres ≈ 0.70 em, bas de casse ≈ 0.56, fines ≈ 0.30, espace ≈ 0.27,
 * arabe ≈ 0.50.
 */
function approxTextWidth(text: string, fontSize: number): number {
  let em = 0
  for (const ch of text) {
    if (ch === ' ' || ch === '\u00a0') em += 0.27
    else if (/[A-ZÀ-ÖØ-Þ0-9@%&]/.test(ch)) em += 0.7
    else if (/[iljI.,;:'|!·]/.test(ch)) em += 0.3
    else if (ch.charCodeAt(0) > 0x600) em += 0.5
    else em += 0.56
  }
  return em * fontSize
}

/** Coupe le texte (avec « … ») pour qu'il tienne sur une ligne de `maxPx`. */
function fitToWidth(text: string, fontSize: number, maxPx: number): string {
  if (approxTextWidth(text, fontSize) <= maxPx) return text
  let out = text
  while (out.length > 1 && approxTextWidth(out + '…', fontSize) > maxPx) out = out.slice(0, -1)
  return out.trimEnd() + '…'
}

// ─── Ornements (calculés une fois) ────────────────────────────

export const CONTENT_WIDTH = IMAGE_WIDTH - PAGE_PAD_X * 2
// Largeur utile à l'intérieur de la carte : bordure (3) + marge (12) +
// filet (1.5) + marge interne (34) de chaque côté.
export const CARD_INNER_WIDTH = CONTENT_WIDTH - 2 * (3 + 12 + 2 + 34)
const ORNAMENT_BACKGROUND = backgroundUri(IMAGE_WIDTH, IMAGE_HEIGHT)
const ORNAMENT_NICHE = nicheUri(1.25)
export const ORNAMENT_STAR_BRASS = starUri(CASBAH.brass)
const ORNAMENT_STAR_TEAL = starUri(CASBAH.teal)
const ORNAMENT_HEADER_BAND = bandUri(CONTENT_WIDTH, 22)
const ORNAMENT_CARD_BAND = bandUri(CONTENT_WIDTH - 6, 18)
const ORNAMENT_RULE = ornamentRuleUri(CONTENT_WIDTH, CASBAH.brassLight)
export const ORNAMENT_DIVIDER = ornamentRuleUri(CARD_INNER_WIDTH, CASBAH.brass, 5, 0.45)

// Emblème des pharmacies algériennes (public/emblem-pharma-dz.svg), inline :
// il remplace le blason quand la wilaya n'en a pas enregistré.
export const EMBLEM_URI = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
  '<path d="M30 4.5A20 20 0 1 0 30 43.5A24 24 0 0 1 30 4.5Z" fill="#d92128"/>' +
  '<path d="M22 21h23c-1 5-5.5 8-11.5 8S23 26 22 21z" fill="#0b9248"/>' +
  '<path d="M32.5 28h2v10h-2zM28 39.5c2-1.2 3-1.5 5.5-1.5s3.5.3 5.5 1.5z" fill="#0b9248"/>' +
  '<path d="M40 9.5C40 5.5 33 5.5 33 9.5S40 13.5 40 17.5S34 20 34 21" fill="none" stroke="#0b9248" stroke-width="2" stroke-linecap="round"/>' +
  '</svg>'
)

/**
 * Réglages de mise en page communs aux visuels (sens de lecture, polices,
 * hôte affiché). On n'utilise PAS `direction: rtl` (satori « justifie »
 * alors les mots arabes, créant de gros trous) : le sens RTL des glyphes
 * est géré par la police, l'ordre des éléments via flexDirection.
 *
 * Les textes sont CENTRÉS plutôt qu'alignés sur un bord : en arabe, satori
 * mesure chaque ligne avec les formes isolées des lettres alors qu'il les
 * dessine avec les formes liées — la boîte est donc trop large (ou trop
 * étroite) de façon imprévisible, et un alignement à droite sort irrégulier.
 * Centré, l'écart est divisé par deux et invisible, et la composition
 * symétrique va bien avec le décor (arc, zellige).
 */
export async function imageChrome(locale: Locale) {
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
    fontFamily: fonts
      ? (ar ? '"Tajawal", "Noto Sans", sans-serif' : '"Noto Sans", "Tajawal", sans-serif')
      : 'sans-serif',
    // Titres et noms d'officines : Amiri (latin seul, voir loadFonts), comme
    // le site ; l'arabe retombe sur Tajawal.
    displayFamily: fonts
      ? '"Amiri", "Tajawal", "Noto Sans", serif'
      : 'sans-serif',
  }
}

export type ImageChrome = Awaited<ReturnType<typeof imageChrome>>

/** Page : fond marine zellige, remplissant tout le cadre. */
export function Page({ chrome, children }: { chrome: ImageChrome; children: React.ReactNode }) {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      backgroundColor: CASBAH.navyDeep, padding: `34px ${PAGE_PAD_X}px 30px`,
      fontFamily: chrome.fontFamily, position: 'relative',
    }}>
      <img
        src={ORNAMENT_BACKGROUND} width={IMAGE_WIDTH} height={IMAGE_HEIGHT} alt=""
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      {children}
    </div>
  )
}

/** Texte posé en morceaux, dans l'ordre de lecture (voir IMAGE_STRINGS). */
function TextPieces({ chrome, parts, noWrap }: {
  chrome: ImageChrome
  parts: readonly string[]
  noWrap: (s: string) => string
}) {
  const gap = chrome.ar ? { marginRight: 10 } : { marginLeft: 10 }
  return (
    <div style={{ display: 'flex', flexDirection: chrome.rowDir, alignItems: 'center', justifyContent: 'center' }}>
      {parts.map((part, i) => (
        <div key={i} style={{ display: 'flex', ...(i > 0 ? gap : {}) }}>{noWrap(part)}</div>
      ))}
    </div>
  )
}

/**
 * En-tête commun aux visuels : logo DwaDZ, niche en arc outrepassé abritant
 * le blason de la wilaya (ou l'emblème des pharmacies), titre, périmètre,
 * période, puis bandeau de zellige.
 */
export function ImageHeader({
  chrome, wilayaLogo, title, scope, subtitle, badge, noWrap,
}: {
  chrome: ImageChrome
  wilayaLogo: string | null
  title: string
  scope: string
  subtitle: readonly string[]
  badge?: string
  noWrap: (s: string) => string
}) {
  const { ar, logo, appHost, rowDir, displayFamily } = chrome
  const logoGap = ar ? { marginLeft: 14 } : { marginRight: 14 }
  const nicheGap = ar ? { marginLeft: 30 } : { marginRight: 30 }
  const badgeGap = ar ? { marginRight: 18 } : { marginLeft: 18 }
  const { medallion } = ORNAMENT_NICHE
  const crest = wilayaLogo ? Math.round(medallion.r * 1.6) : Math.round(medallion.r * 1.34)
  const scopeText = truncate(scope, 38)
  const scopeSize = scopeText.length > 26 ? 36 : 44

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}>
      <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center' }}>
          {logo && <img src={logo} width={50} height={50} style={logoGap} alt="" />}
          <div style={{ display: 'flex', fontFamily: displayFamily, fontSize: 38, lineHeight: 1.1, fontWeight: 700, color: CASBAH.brassLight }}>DwaDZ</div>
        </div>
        <div style={{ display: 'flex', fontSize: 23, color: '#a9b8d4' }}>{appHost}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', marginTop: 18, marginBottom: 18 }}>
        <div style={{
          display: 'flex', position: 'relative', flexShrink: 0,
          width: ORNAMENT_NICHE.width, height: ORNAMENT_NICHE.height, ...nicheGap,
        }}>
          <img src={ORNAMENT_NICHE.uri} width={ORNAMENT_NICHE.width} height={ORNAMENT_NICHE.height} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
          <img
            src={wilayaLogo || EMBLEM_URI} width={crest} height={crest} alt=""
            style={{
              position: 'absolute', objectFit: 'contain',
              left: Math.round(medallion.cx - crest / 2), top: Math.round(medallion.cy - crest / 2),
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', fontFamily: displayFamily, fontSize: 64, fontWeight: 700, color: '#fff7e0', lineHeight: 1.05 }}>
              {noWrap(title)}
            </div>
            {badge && (
              <div style={{
                display: 'flex', fontSize: 22, fontWeight: 700, color: CASBAH.navy, lineHeight: 1.3,
                backgroundColor: CASBAH.brassLight, border: `2px solid ${CASBAH.brass}`,
                borderRadius: 999, padding: '3px 18px', ...badgeGap,
              }}>
                {noWrap(badge)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', fontFamily: displayFamily, fontSize: scopeSize, lineHeight: 1.1, fontWeight: 700, color: CASBAH.brassLight, marginTop: 4 }}>
            {noWrap(scopeText)}
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#c9d6ea', marginTop: 8 }}>
            <TextPieces chrome={chrome} parts={subtitle} noWrap={noWrap} />
          </div>
        </div>
      </div>

      <img src={ORNAMENT_HEADER_BAND} width={CONTENT_WIDTH} height={22} alt="" />
    </div>
  )
}

/** Pied de page : filet orné, adresse du site, petit liseré aux couleurs du drapeau. */
export function ImageFooter({ chrome, path }: { chrome: ImageChrome; path?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 12 }}>
      <img src={ORNAMENT_RULE} width={CONTENT_WIDTH} height={22} alt="" />
      <div style={{ display: 'flex', fontFamily: chrome.displayFamily, fontSize: 34, lineHeight: 1.1, fontWeight: 700, color: CASBAH.brassLight, marginTop: 4 }}>
        {chrome.appHost}{path ?? chrome.t.path}
      </div>
      <div style={{ display: 'flex', width: 150, height: 6, borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
        <div style={{ display: 'flex', width: '34%', height: '100%', backgroundColor: ALGERIA_GREEN }} />
        <div style={{ display: 'flex', width: '33%', height: '100%', backgroundColor: '#ffffff' }} />
        <div style={{ display: 'flex', width: '33%', height: '100%', backgroundColor: ALGERIA_RED }} />
      </div>
    </div>
  )
}

/**
 * Carte de contenu : blanc chaux, double filet laiton, bandeaux de zellige
 * en haut et en bas. Elle prend la place restante et rogne son contenu
 * plutôt que de repousser le pied de page. `centered` centre la liste
 * verticalement (communes n'ayant qu'une ou deux gardes).
 */
export function ListCard({ children, centered, padding = '14px 34px' }: {
  children: React.ReactNode
  centered?: boolean
  padding?: string
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flexGrow: 1, flexBasis: 0, minHeight: 0,
      backgroundColor: CASBAH.cream, border: `3px solid ${CASBAH.brass}`,
      borderRadius: 18, overflow: 'hidden',
    }}>
      <img src={ORNAMENT_CARD_BAND} width={CONTENT_WIDTH - 6} height={18} alt="" />
      <div style={{
        display: 'flex', flexDirection: 'column', flexGrow: 1, flexBasis: 0, minHeight: 0, overflow: 'hidden',
        margin: '10px 12px', padding, borderRadius: 10,
        border: `1.5px solid rgba(185, 132, 37, 0.5)`,
        justifyContent: centered ? 'center' : 'flex-start',
      }}>
        {children}
      </div>
      <img src={ORNAMENT_CARD_BAND} width={CONTENT_WIDTH - 6} height={18} alt="" />
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
 * (LTR) ou en arabe (RTL). Style « Casbah » : marine, laiton, zellige.
 */
export async function buildGardeImageResponse(
  day: GardeWilayaDay,
  locale: Locale = 'fr',
  opts: { upcoming?: boolean } = {}
): Promise<ImageResponse> {
  const { sections, remaining } = buildImageSections(day, locale)
  const chrome = await imageChrome(locale)
  const { ar, fonts, arabicOk, t, rowDir, displayFamily } = chrome
  const wilayaLogo = await getWilayaLogoDataUri(day.wilaya_code)
  const dateParts = ar ? formatDateArPieces(day.date) : [formatDateFr(day.date)]
  // Taille des lignes : le plus grand palier dont la hauteur estimée tient
  // dans le cadre. Peu d'officines (cas courant d'une commune) → grandes
  // lignes plutôt qu'un cadre à moitié vide ; beaucoup, ou beaucoup
  // d'en-têtes de commune → paliers plus serrés.
  const rows = sections.filter(s => s.kind === 'pharmacy').length
  const headers = sections.length - rows
  const estimateHeight = (tr: (typeof ROW_TIERS)[number]) =>
    rows * (2 * tr.pad + 1.2 * tr.name + 3 + 1.36 * tr.sub)
    + (rows - 1 + (remaining > 0 ? 1 : 0)) * DIVIDER_HEIGHT
    + headers * 1.15 * tr.head + Math.max(0, headers - 1) * 10
    + (remaining > 0 ? 10 + 1.36 * 24 : 0)
  const tier = ROW_TIERS.find(tr => estimateHeight(tr) <= ROW_LIST_HEIGHT) ?? ROW_TIERS[ROW_TIERS.length - 1]
  // Le nom le plus long ne doit pas déborder de la ligne (à côté du badge) :
  // on réduit la taille des noms plutôt que de les tronquer.
  const nameOf = (ph: GardePharmacyDay) => truncate(
    imageSafeText(ar ? ph.name_ar : ph.name, arabicOk, ar ? 'صيدلية' : 'Pharmacie (voir légende)'),
    NAME_MAX_CHARS
  )
  const longestName = Math.max(1, ...sections.flatMap(s => s.kind === 'pharmacy' ? [nameOf(s.pharmacy).length] : []))
  const nameFit = Math.floor((CARD_INNER_WIDTH - 200) / (longestName * 0.6))
  const size = { ...tier, name: Math.max(28, Math.min(tier.name, nameFit)) }
  // Ligne « adresse · téléphone » sur une seule ligne : si elle est trop
  // longue, on coupe l'adresse, jamais le numéro.
  const subTextOf = (ph: GardePharmacyDay) => {
    const address = imageSafeText(ar ? ph.address_ar || '' : ph.address || '', arabicOk, '')
    const phone = ph.phone || ''
    const maxPx = CARD_INNER_WIDTH - 30
    if (!address) return phone
    if (!phone) return fitToWidth(address, size.sub, maxPx)
    const tail = `  ·  ${phone}`
    return fitToWidth(address, size.sub, maxPx - approxTextWidth(tail, size.sub)) + tail
  }
  // satori insère un espace anormalement large entre deux « mots » de texte
  // (il les découpe en segments) — flagrant en arabe. Remplacer l'espace
  // ordinaire par un insécable garde le texte en un seul segment et rétablit
  // l'espacement naturel de la police.
  const noWrap = (s: string) => ar ? s.replace(/ /g, ' ') : s
  const badgeGap = ar ? { marginRight: 18 } : { marginLeft: 18 }
  const starGap = ar ? { marginLeft: 14 } : { marginRight: 14 }

  return new ImageResponse(
    (
      <Page chrome={chrome}>
        <ImageHeader
          chrome={chrome}
          wilayaLogo={wilayaLogo}
          title={t.title}
          scope={dayScopeLabel(day, ar)}
          subtitle={dateParts}
          badge={opts.upcoming ? t.upcoming : undefined}
          noWrap={noWrap}
        />

        <ListCard centered={sections.length <= 4}>
          {sections.map((section, i) => {
            if (section.kind === 'commune') {
              return (
                <div key={i} style={{
                  display: 'flex', flexDirection: rowDir, alignItems: 'center',
                  marginTop: i === 0 ? 0 : 10,
                }}>
                  <div style={{ display: 'flex', flexGrow: 1, height: 2, backgroundColor: 'rgba(30, 142, 138, 0.35)' }} />
                  <div style={{
                    display: 'flex', fontFamily: displayFamily, fontSize: size.head, lineHeight: 1.15, fontWeight: 700,
                    color: CASBAH.teal, textTransform: 'uppercase', margin: '0 18px',
                  }}>
                    {noWrap(truncate(section.label, 36))}
                  </div>
                  <div style={{ display: 'flex', flexGrow: 1, height: 2, backgroundColor: 'rgba(30, 142, 138, 0.35)' }} />
                </div>
              )
            }
            const badge = shiftBadge(section.pharmacy.shifts, locale)
            const isLast = i === sections.length - 1 && remaining === 0
            const sub = subTextOf(section.pharmacy)
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${size.pad}px 0` }}>
                  <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      display: 'flex', fontFamily: displayFamily, fontSize: size.name, lineHeight: 1.12,
                      fontWeight: 700, color: CASBAH.ink,
                    }}>
                      {noWrap(nameOf(section.pharmacy))}
                    </div>
                    <div style={{
                      display: 'flex', fontSize: size.badge, lineHeight: 1.35, fontWeight: 700,
                      backgroundColor: badge.bg, color: badge.fg, border: `2px solid ${badge.border}`,
                      borderRadius: 999, padding: '1px 16px', ...badgeGap,
                    }}>
                      {badge.label}
                    </div>
                  </div>
                  {sub && (
                    <div style={{ display: 'flex', fontSize: size.sub, lineHeight: 1.25, color: CASBAH.muted, marginTop: 3, whiteSpace: 'nowrap' }}>
                      {noWrap(sub)}
                    </div>
                  )}
                </div>
                {!isLast && <img src={ORNAMENT_DIVIDER} width={CARD_INNER_WIDTH} height={DIVIDER_HEIGHT} alt="" />}
              </div>
            )
          })}
          {remaining > 0 && (
            <div style={{
              display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, color: CASBAH.brassDark, marginTop: 10,
            }}>
              <img src={ORNAMENT_STAR_TEAL} width={20} height={20} style={starGap} alt="" />
              <TextPieces chrome={chrome} parts={t.more(remaining)} noWrap={noWrap} />
              <img src={ORNAMENT_STAR_TEAL} width={20} height={20} style={ar ? { marginRight: 14 } : { marginLeft: 14 }} alt="" />
            </div>
          )}
        </ListCard>

        <ImageFooter chrome={chrome} />
      </Page>
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

// Hauteur utile du cadre de liste du visuel mensuel (1350 px moins
// l'en-tête, le pied de page, les bandeaux et les marges).
const MONTH_CARD_INNER_HEIGHT = 800
const MONTH_DAY_COLUMN_WIDTH = 150
// Deux colonnes (1–16 | 17–31) quand les libellés tiennent dans une demi-largeur :
// la police gagne ~60 % en taille, indispensable pour rester lisible dans un fil.
const MONTH_HALF_WIDTH = Math.floor((CARD_INNER_WIDTH - 40 - 31) / 2)
const MONTH_HALF_DAY_WIDTH = 116
const MONTH_FS_MIN = 15
const MONTH_FS_MAX = 28

/** « nuit » / « 24h/24 » sans parenthèses (les parenthèses se mirent mal en arabe). */
function monthShiftLabel(shifts: string[], locale: Locale): { text: string; color: string } | null {
  const hasNuit = shifts.includes('nuit')
  const hasJour = shifts.some(s => s !== 'nuit')
  const ar = locale === 'ar'
  if (hasNuit && hasJour) return { text: ar ? '24/24' : '24h/24', color: CASBAH.teal }
  if (hasNuit) return { text: ar ? 'ليلية' : 'nuit', color: CASBAH.brassDark }
  return null
}

type MonthEntry = { name: string; shift: ReturnType<typeof monthShiftLabel> }

function monthEntries(day: GardeMonthDay, locale: Locale, arabicOk: boolean): MonthEntry[] {
  const ar = locale === 'ar'
  return day.communes.flatMap(c => c.pharmacies).map(ph => ({
    name: imageSafeText(ar ? ph.name_ar : ph.name, arabicOk, ar ? 'صيدلية' : 'Pharmacie'),
    shift: monthShiftLabel(ph.shifts, locale),
  }))
}

/** Longueur approximative (en caractères) du libellé d'un jour, suffixes compris. */
function monthEntriesLength(entries: MonthEntry[]): number {
  return entries.reduce((sum, e, i) => sum + e.name.length + (e.shift ? e.shift.text.length + 1 : 0) + (i ? 3 : 0), 0)
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
  const { ar, fonts, arabicOk, t, rowDir } = chrome
  const noWrap = (s: string) => ar ? s.replace(/ /g, ' ') : s
  const wilayaLogo = await getWilayaLogoDataUri(month.wilaya_code)

  const days = month.days.slice(0, MONTH_MAX_ROWS)
  const remainingDays = month.days.length - days.length
  const entries = days.map(d => monthEntries(d, locale, arabicOk))
  const maxLen = Math.max(1, ...entries.map(monthEntriesLength))

  // Taille de police : on part de la place disponible par ligne, bornée par
  // la largeur du plus long libellé (en caractères ≈ 0.56 × corps).
  const charW = 0.56
  const twoColumns = days.length > 12
    && Math.floor((MONTH_HALF_WIDTH - MONTH_HALF_DAY_WIDTH - 12) / (maxLen * charW)) >= 19
  const perColumn = twoColumns ? Math.ceil(days.length / 2) : days.length
  const rowsTotal = perColumn + (!twoColumns && remainingDays > 0 ? 1 : 0)
  const rowHeight = Math.floor(MONTH_CARD_INNER_HEIGHT / rowsTotal)
  // satori rend une ligne de texte à ~1.38 × la taille de police (Noto Sans).
  const byHeight = Math.floor((rowHeight - 4) / 1.38)
  const labelWidth = twoColumns
    ? MONTH_HALF_WIDTH - MONTH_HALF_DAY_WIDTH - 12
    : CARD_INNER_WIDTH - 40 - MONTH_DAY_COLUMN_WIDTH - 12
  const byWidth = Math.floor(labelWidth / (maxLen * charW))
  const fontSize = Math.max(MONTH_FS_MIN, Math.min(MONTH_FS_MAX, byHeight, byWidth))
  const dayFontSize = Math.max(14, fontSize - 3)
  const dayWidth = twoColumns ? MONTH_HALF_DAY_WIDTH : MONTH_DAY_COLUMN_WIDTH
  const sepGap = ar ? { marginRight: 8 } : { marginLeft: 8 }
  const shiftGap = ar ? { marginRight: 8 } : { marginLeft: 8 }

  const scope = scopeLabel(
    ar ? month.wilaya_name_ar : month.wilaya_name_fr,
    ar ? month.commune_name_ar : month.commune_name_fr
  )

  const renderRow = (day: GardeMonthDay, entry: MonthEntry[], isLast: boolean) => {
    // Le vendredi, jour de garde le plus consulté, est mis en avant.
    const isFriday = new Date(`${day.date}T12:00:00Z`).getUTCDay() === 5
    return (
      <div key={day.date} style={{
        display: 'flex', flexDirection: rowDir, alignItems: 'center', height: rowHeight,
        borderBottom: isLast ? 'none' : '1px dashed rgba(185, 132, 37, 0.4)',
        backgroundColor: isFriday ? CASBAH.tealLight : 'transparent',
        borderRadius: isFriday ? 6 : 0,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'center', width: dayWidth, flexShrink: 0,
          fontSize: dayFontSize, fontWeight: 700,
          color: isFriday ? CASBAH.teal : CASBAH.brassDark,
        }}>
          {noWrap(formatDayShort(day.date, locale))}
        </div>
        <div style={{
          display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'center', flexGrow: 1,
          fontSize, fontWeight: isFriday ? 700 : 400, color: CASBAH.ink,
        }}>
          {entry.map((e, j) => (
            <div key={j} style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', ...(j ? sepGap : {}) }}>
              {j > 0 && <div style={{ display: 'flex', color: CASBAH.brass, ...(ar ? { marginLeft: 8 } : { marginRight: 8 }) }}>·</div>}
              <div style={{ display: 'flex' }}>{noWrap(truncate(e.name, Math.max(12, Math.floor(labelWidth / (fontSize * charW)))))}</div>
              {e.shift && (
                <div style={{
                  display: 'flex', fontSize: Math.round(fontSize * 0.78), fontWeight: 700, color: e.shift.color, ...shiftGap,
                }}>
                  {e.shift.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const columns = twoColumns
    ? [days.slice(0, perColumn).map((d, i) => ({ d, e: entries[i] })), days.slice(perColumn).map((d, i) => ({ d, e: entries[perColumn + i] }))]
    : [days.map((d, i) => ({ d, e: entries[i] }))]

  return new ImageResponse(
    (
      <Page chrome={chrome}>
        <ImageHeader
          chrome={chrome}
          wilayaLogo={wilayaLogo}
          title={t.monthTitle}
          scope={scope}
          subtitle={[ar ? formatMonthAr(month.month) : formatMonthFr(month.month)]}
          noWrap={noWrap}
        />

        <ListCard padding="10px 20px">
          <div style={{ display: 'flex', flexDirection: rowDir, flexGrow: 1 }}>
            {columns.map((col, ci) => (
              <div key={ci} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, flexBasis: 0 }}>
                {col.map(({ d, e }, i) => renderRow(d, e, i === col.length - 1))}
              </div>
            )).flatMap((col, ci) => ci === 0 || !twoColumns ? [col] : [
              <div key={`sep${ci}`} style={{ display: 'flex', width: 1, backgroundColor: 'rgba(185, 132, 37, 0.45)', margin: '6px 15px' }} />,
              col,
            ])}
          </div>
          {remainingDays > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', fontSize: 23, fontWeight: 700, color: CASBAH.brassDark, marginTop: 8 }}>
              <TextPieces chrome={chrome} parts={t.moreDays(remainingDays)} noWrap={noWrap} />
            </div>
          )}
        </ListCard>

        <ImageFooter chrome={chrome} />
      </Page>
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
