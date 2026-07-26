/**
 * Auto-publication Facebook des pharmacies de garde.
 *
 * Chaque jour (cron Vercel → /api/cron/garde-daily), pour chaque wilaya
 * couverte en base, on génère une image récapitulative (next/og — pas de
 * dépendance supplémentaire) listant les officines de garde du jour, puis
 * on la publie sur la Page Facebook avec la liste détaillée en légende.
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
import { slugify } from '@/lib/slug'

// ─── DONNÉES ──────────────────────────────────────────────────

export type Locale = 'fr' | 'ar'

type GardeDutyRow = {
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

/** Date du jour (YYYY-MM-DD) dans le fuseau Africa/Algiers. */
export function todayInAlgiers(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function formatDateFr(isoDate: string): string {
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Algiers', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00Z`))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

/**
 * Officines de garde pour une date, regroupées wilaya → commune.
 * Une officine présente sur plusieurs vacations (jour + nuit) n'apparaît
 * qu'une fois, avec l'ensemble de ses vacations.
 */
export async function getGardeDayByWilaya(date: string, wilayaCode?: string): Promise<GardeWilayaDay[]> {
  const params: any[] = [date]
  if (wilayaCode) params.push(wilayaCode)

  const rows = await query<GardeDutyRow>(`
    SELECT dp.wilaya_code, r.wilaya_name_fr, r.wilaya_name_ar,
      dp.commune_code, r.commune_name_fr, r.commune_name_ar, dp.shift,
      COALESCE(ph.name_fr, ph.name_ar) AS name,
      COALESCE(ph.name_ar, ph.name_fr) AS name_ar,
      ph.address_fr, ph.address_ar, ph.phone_e164
    FROM garde_duty_periods dp
    JOIN garde_pharmacies ph ON ph.id = dp.pharmacy_id
    JOIN garde_rosters r ON r.id = dp.roster_id
    WHERE dp.duty_date = $1 ${wilayaCode ? 'AND dp.wilaya_code = $2' : ''}
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

    let commune = wilaya.communes.find(c => c.commune_code === row.commune_code)
    if (!commune) {
      commune = {
        commune_code: row.commune_code,
        commune_name_fr: row.commune_name_fr,
        commune_name_ar: row.commune_name_ar || row.commune_name_fr,
        pharmacies: [],
      }
      wilaya.communes.push(commune)
    }

    const key = `${row.wilaya_code}|${row.commune_code}|${row.name}`
    const existing = pharmacyIndex.get(key)
    if (existing) {
      if (!existing.shifts.includes(row.shift)) existing.shifts.push(row.shift)
      continue
    }

    const pharmacy: GardePharmacyDay = {
      name: row.name,
      name_ar: row.name_ar,
      address: row.address_fr,
      address_ar: row.address_ar || row.address_fr,
      phone: row.phone_e164,
      shifts: [row.shift],
    }
    pharmacyIndex.set(key, pharmacy)
    commune.pharmacies.push(pharmacy)
    wilaya.total++
  }

  return Array.from(wilayas.values()).sort((a, b) => a.wilaya_code.localeCompare(b.wilaya_code))
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
  const prefix = locale === 'ar' ? '/ar' : ''
  const base = `${appUrl}${prefix}/pharmacie-de-garde`
  const wilayaSlug = slugify(day.wilaya_name_fr)
  if (day.communes.length === 1) {
    return `${base}/${wilayaSlug}/${slugify(day.communes[0].commune_name_fr)}`
  }
  return `${base}#${wilayaSlug}`
}

export function formatGardeCaption(day: GardeWilayaDay, locale: Locale = 'fr'): string {
  if (locale === 'ar') return formatGardeCaptionAr(day)

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '')
  const lines: string[] = [
    `🟢 PHARMACIES DE GARDE — ${day.wilaya_name_fr.toUpperCase()}`,
    `📅 ${formatDateFr(day.date)}`,
    '',
  ]

  let listed = 0
  let truncated = false
  for (const commune of day.communes) {
    if (truncated) break
    lines.push(`📍 ${commune.commune_name_fr}`)
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
function formatGardeCaptionAr(day: GardeWilayaDay): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '')
  const lines: string[] = [
    `🟢 صيدليات المناوبة — ${day.wilaya_name_ar}`,
    `📅 ${formatDateAr(day.date)}`,
    '',
  ]

  let listed = 0
  let truncated = false
  for (const commune of day.communes) {
    if (truncated) break
    lines.push(`📍 ${commune.commune_name_ar}`)
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
  fr: { title: 'Pharmacies de garde', more: (n: number) => `+ ${n} autres officines — liste complète sur le site`, path: '/pharmacie-de-garde' },
  ar: { title: 'صيدليات المناوبة', more: (n: number) => `+ ${n} صيدلية أخرى — القائمة الكاملة على الموقع`, path: '/ar/pharmacie-de-garde' },
} as const

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s
}

/**
 * Image portrait 1080×1350 (format adapté au fil Facebook) listant les
 * officines de garde d'une wilaya, en français (LTR) ou en arabe (RTL).
 */
export async function buildGardeImageResponse(day: GardeWilayaDay, locale: Locale = 'fr'): Promise<ImageResponse> {
  const { sections, remaining } = buildImageSections(day, locale)
  const appHost = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const [fonts, logo] = await Promise.all([loadFonts(), loadLogo()])
  const arabicOk = !!fonts
  const ar = locale === 'ar'
  const t = IMAGE_STRINGS[locale]
  const wilayaName = ar ? day.wilaya_name_ar : day.wilaya_name_fr
  const dateStr = ar ? formatDateAr(day.date) : formatDateFr(day.date)
  // On n'utilise PAS `direction: rtl` (satori « justifie » alors les mots
  // arabes, créant de gros trous). Le sens RTL des glyphes est géré par la
  // police ; l'alignement/ordre visuel se fait via flexDirection + justify.
  const rowDir = ar ? 'row-reverse' : 'row'
  const startAlign = ar ? 'flex-end' : 'flex-start'
  const logoGap = ar ? { marginLeft: 16 } : { marginRight: 16 }
  const dateGap = ar ? { marginRight: 24 } : { marginLeft: 24 }
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
        padding: '44px 48px',
        fontFamily: fonts ? (ar ? '"Tajawal", "Noto Sans", sans-serif' : '"Noto Sans", "Tajawal", sans-serif') : 'sans-serif',
      }}>
        {/* En-tête */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
          <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center' }}>
              {logo && (
                <img src={logo} width={58} height={58} style={logoGap} alt="" />
              )}
              <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: '#7dd3fc' }}>DwaDZ</div>
            </div>
            <div style={{ display: 'flex', fontSize: 24, color: '#94a3b8' }}>{appHost}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: startAlign, fontSize: 52, fontWeight: 800, color: '#ffffff', marginTop: 14 }}>
            {noWrap(t.title)}
          </div>
          <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'flex-start', marginTop: 10 }}>
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: '#38bdf8' }}>{noWrap(wilayaName)}</div>
            <div style={{ display: 'flex', fontSize: 28, color: '#cbd5e1', ...dateGap }}>{noWrap(dateStr)}</div>
          </div>
        </div>

        {/* Liste */}
        <div style={{
          display: 'flex', flexDirection: 'column', flexGrow: 1,
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
              padding: '14px 0', borderBottom: '1px solid #f1f5f9',
            }}>
              <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', fontSize: 31, fontWeight: 700, color: '#0f172a' }}>
                  {noWrap(truncate(imageSafeText(ar ? section.pharmacy.name_ar : section.pharmacy.name, arabicOk, ar ? 'صيدلية' : 'Pharmacie (voir légende)'), 42))}
                </div>
                <div style={{
                  display: 'flex', fontSize: 21, fontWeight: 700,
                  backgroundColor: shiftBadge(section.pharmacy.shifts, locale).bg,
                  color: shiftBadge(section.pharmacy.shifts, locale).fg,
                  borderRadius: 999, padding: '4px 16px',
                }}>
                  {shiftBadge(section.pharmacy.shifts, locale).label}
                </div>
              </div>
              {((ar ? section.pharmacy.address_ar : section.pharmacy.address) || section.pharmacy.phone) && (
                <div style={{ display: 'flex', justifyContent: startAlign, fontSize: 24, color: '#64748b', marginTop: 6 }}>
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

        {/* Pied de page */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#7dd3fc' }}>
            {appHost}{t.path}
          </div>
        </div>
      </div>
    ),
    { width: IMAGE_WIDTH, height: IMAGE_HEIGHT, ...(fonts ? { fonts } : {}) }
  )
}

export async function renderGardeImagePng(day: GardeWilayaDay, locale: Locale = 'fr'): Promise<Buffer> {
  const image = await buildGardeImageResponse(day, locale)
  return Buffer.from(await image.arrayBuffer())
}

// ─── PUBLICATION ──────────────────────────────────────────────

export type GardeWilayaPublishResult = {
  wilaya_code: string
  wilaya_name_fr: string
  locale: Locale
  pharmacies: number
  status: 'published' | 'already_published' | 'failed' | 'dry_run'
  postId?: string
  error?: string
}

export type GardeDailyPublishResult = {
  date: string
  covered_wilayas: number
  results: GardeWilayaPublishResult[]
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

/**
 * Publie sur la Page Facebook, pour chaque wilaya ayant des officines de
 * garde à la date donnée, une photo générée + la liste en légende, dans
 * chaque langue configurée (FR et AR par défaut, un post distinct chacun,
 * le post arabe pointant vers la version /ar du site).
 * Idempotent : une légende strictement identique déjà publiée n'est pas
 * repostée — le cron peut donc être relancé sans doublon. Les publications
 * sont espacées (voir delayMs).
 */
export async function publishGardeDailyToFacebook(
  opts: { date?: string; wilaya?: string; dryRun?: boolean; delayMs?: number; budgetMs?: number; locales?: Locale[] } = {}
): Promise<GardeDailyPublishResult> {
  const date = opts.date || todayInAlgiers()
  const days = await getGardeDayByWilaya(date, opts.wilaya)
  const results: GardeWilayaPublishResult[] = []
  const locales = opts.locales ?? configuredLocales()

  const delayMs = opts.delayMs ?? (Number(process.env.GARDE_POST_DELAY_MS) || DEFAULT_POST_DELAY_MS)
  const budgetMs = opts.budgetMs ?? (Number(process.env.GARDE_TIME_BUDGET_MS) || DEFAULT_TIME_BUDGET_MS)
  const startedAt = Date.now()
  let publishedThisRun = 0

  for (const day of days) {
    for (const locale of locales) {
      const caption = formatGardeCaption(day, locale)
      const base = { wilaya_code: day.wilaya_code, wilaya_name_fr: day.wilaya_name_fr, locale, pharmacies: day.total }

      if (opts.dryRun) {
        results.push({ ...base, status: 'dry_run' })
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
      // un post texte pour ne pas priver la wilaya de sa publication du jour.
      let post: { success: boolean; postId?: string; error?: string }
      try {
        const png = await renderGardeImagePng(day, locale)
        post = await postFacebookPhoto(png, caption)
        if (!post.success) post = await postToFacebook(caption)
      } catch (err: any) {
        console.error(`[garde-social] Image failed for wilaya ${day.wilaya_code} (${locale}):`, err?.message || err)
        post = await postToFacebook(caption)
      }
      publishedThisRun++

      const refId = Number(day.wilaya_code)
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

  return { date, covered_wilayas: days.length, results }
}
