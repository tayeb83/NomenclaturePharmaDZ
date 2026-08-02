/**
 * Couche de données partagée pour les pharmacies de garde — utilisée à la
 * fois par les routes API (fetch côté client) et par les pages SSR
 * /pharmacie-de-garde/[wilaya]/[commune] (rendu serveur pour l'indexation).
 * Garder une seule implémentation évite que les deux surfaces divergent.
 */
import { query, queryOne } from '@/lib/db'
import type { GardeShift, GardeRosterMeta, GardeCoverageEntry } from '@/lib/db-types'
import { slugify } from '@/lib/slug'
import { ALGERIA_WILAYAS } from '@/lib/wilayas'
import { premiumFields, premiumJoin, premiumOrder, premiumTableAvailable } from '@/lib/garde-premium'

export { slugify }

const BASE_SHIFT_FIELDS = `
  dp.id, dp.shift, dp.duty_date, dp.weekday, dp.starts_at, dp.ends_at, dp.source, dp.source_ref,
  ph.external_id AS pharmacy_id, ph.type,
  COALESCE(ph.name_fr, ph.name_ar) AS name_fr,
  CASE WHEN ph.name_fr IS NULL THEN NULL ELSE ph.name_ar END AS name_ar,
  ph.name_fr_confidence,
  ph.address_fr, ph.address_ar, ph.phone_e164, ph.lat, ph.lng
`

/** Colonnes d'une garde + extras premium quand l'abonnement est en cours. */
function shiftFields(premium: boolean): string {
  return `${BASE_SHIFT_FIELDS}, ${premiumFields(premium)}`
}

const ROSTER_META_FIELDS = `
  wilaya_code, wilaya_name_fr, commune_code, commune_name_fr,
  period_from, period_to, review_status, issuer_fr, source_page, imported_at
`

export async function getGardeCoverage(): Promise<GardeCoverageEntry[]> {
  return query<GardeCoverageEntry>(`
    SELECT DISTINCT ON (wilaya_code, commune_code)
      wilaya_code, wilaya_name_fr, wilaya_name_ar,
      commune_code, commune_name_fr, commune_name_ar,
      period_from, period_to, review_status
    FROM garde_rosters
    ORDER BY wilaya_code, commune_code, imported_at DESC
  `)
}

export type WilayaHubEntry = {
  code: string
  name_fr: string
  name_ar: string
  slug: string
  covered: boolean
  communes: GardeCoverageEntry[]
}

/**
 * Croise les 58 wilayas officielles avec la couverture réelle
 * (garde_rosters), par nom normalisé — les wilaya_code de la DB viennent
 * de l'extraction DSP au cas par cas et ne suivent pas forcément le même
 * référentiel que le code officiel utilisé pour l'URL, donc on ne s'y fie
 * pas pour ce rapprochement.
 */
export function buildWilayaHub(coverage: GardeCoverageEntry[]): WilayaHubEntry[] {
  const bySlug = new Map<string, GardeCoverageEntry[]>()
  for (const entry of coverage) {
    const s = slugify(entry.wilaya_name_fr)
    const list = bySlug.get(s)
    if (list) list.push(entry)
    else bySlug.set(s, [entry])
  }

  const knownSlugs = new Set(ALGERIA_WILAYAS.map(w => slugify(w.name_fr)))

  const hub: WilayaHubEntry[] = ALGERIA_WILAYAS.map(w => {
    const slug = slugify(w.name_fr)
    const communes = bySlug.get(slug) || []
    return { code: w.code, name_fr: w.name_fr, name_ar: w.name_ar, slug, covered: communes.length > 0, communes }
  })

  // Filet de sécurité : si une wilaya couverte en DB ne correspond à aucune
  // entrée du référentiel statique (coquille, nom différent...), on
  // l'ajoute quand même plutôt que de perdre silencieusement des communes
  // déjà importées.
  for (const [slug, communes] of bySlug) {
    if (knownSlugs.has(slug)) continue
    const first = communes[0]
    hub.push({ code: first.wilaya_code, name_fr: first.wilaya_name_fr, name_ar: first.wilaya_name_ar || '', slug, covered: true, communes })
  }

  return hub
}

/** Résout un couple de slugs d'URL (wilaya, commune) vers l'entrée de couverture correspondante. */
export async function findGardeLocation(wilayaSlug: string, communeSlug: string): Promise<GardeCoverageEntry | null> {
  const coverage = await getGardeCoverage()
  return coverage.find(c => slugify(c.wilaya_name_fr) === wilayaSlug && slugify(c.commune_name_fr) === communeSlug) || null
}

export async function getGardeRosterMeta(wilaya: string, commune: string): Promise<GardeRosterMeta | null> {
  if (!wilaya || !commune) return null
  return queryOne<GardeRosterMeta>(`
    SELECT ${ROSTER_META_FIELDS}
    FROM garde_rosters
    WHERE wilaya_code = $1 AND commune_code = $2
    ORDER BY imported_at DESC
    LIMIT 1
  `, [wilaya, commune])
}

export type GardeNowResult = {
  wilaya_code: string
  commune_code: string
  at: string
  date: string | undefined
  current: GardeShift | null
  day_schedule: GardeShift[]
  coverage: GardeRosterMeta | null
}

export async function getGardeNow(wilaya: string, commune: string, opts: { at?: string; date?: string } = {}): Promise<GardeNowResult> {
  const at = opts.at || new Date().toISOString()
  const dateParam = opts.date || ''

  const dateRow = await queryOne<{ target_date: string }>(
    dateParam
      ? `SELECT $1::date AS target_date`
      : `SELECT ($1::timestamptz AT TIME ZONE 'Africa/Algiers')::date AS target_date`,
    [dateParam || at]
  )
  const targetDate = dateRow?.target_date

  const premium = await premiumTableAvailable()

  const [currentRows, dayRows, rosterMeta] = await Promise.all([
    query<GardeShift>(`
      SELECT ${shiftFields(premium)}
      FROM garde_duty_periods dp
      JOIN garde_pharmacies ph ON ph.id = dp.pharmacy_id
      ${premiumJoin(premium)}
      WHERE dp.wilaya_code = $1 AND dp.commune_code = $2
        AND dp.starts_at <= $3::timestamptz AND dp.ends_at > $3::timestamptz
      ORDER BY dp.starts_at DESC
      LIMIT 1
    `, [wilaya, commune, at]),
    query<GardeShift & { active_now: boolean }>(`
      SELECT ${shiftFields(premium)},
        (dp.starts_at <= $4::timestamptz AND dp.ends_at > $4::timestamptz) AS active_now
      FROM garde_duty_periods dp
      JOIN garde_pharmacies ph ON ph.id = dp.pharmacy_id
      ${premiumJoin(premium)}
      WHERE dp.wilaya_code = $1 AND dp.commune_code = $2 AND dp.duty_date = $3
      ORDER BY dp.starts_at ASC, ${premiumOrder(premium)}COALESCE(ph.name_fr, ph.name_ar)
    `, [wilaya, commune, targetDate, at]),
    queryOne<GardeRosterMeta>(`
      SELECT ${ROSTER_META_FIELDS}
      FROM garde_rosters
      WHERE wilaya_code = $1 AND commune_code = $2
        AND period_from <= $3::date AND period_to >= $3::date
      ORDER BY imported_at DESC
      LIMIT 1
    `, [wilaya, commune, targetDate]),
  ])

  return {
    wilaya_code: wilaya,
    commune_code: commune,
    at,
    date: targetDate,
    current: currentRows[0] || null,
    day_schedule: dayRows,
    coverage: rosterMeta,
  }
}

export type GardeMonthResult = {
  wilaya_code: string
  commune_code: string
  month: string
  coverage: GardeRosterMeta | null
  data: GardeShift[]
}

export function isValidGardeMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
}

export function currentGardeMonth(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit' })
    .format(new Date()).replace('/', '-')
}

export async function getGardeMonth(wilaya: string, commune: string, monthParam: string): Promise<GardeMonthResult> {
  const month = isValidGardeMonth(monthParam) ? monthParam : currentGardeMonth()

  const premium = await premiumTableAvailable()

  const [rows, rosterMeta] = await Promise.all([
    query<GardeShift>(`
      SELECT ${shiftFields(premium)}
      FROM garde_duty_periods dp
      JOIN garde_pharmacies ph ON ph.id = dp.pharmacy_id
      ${premiumJoin(premium)}
      WHERE dp.wilaya_code = $1 AND dp.commune_code = $2
        AND to_char(dp.duty_date, 'YYYY-MM') = $3
      ORDER BY dp.duty_date ASC, dp.starts_at ASC, ${premiumOrder(premium)}COALESCE(ph.name_fr, ph.name_ar)
    `, [wilaya, commune, month]),
    queryOne<GardeRosterMeta>(`
      SELECT ${ROSTER_META_FIELDS}
      FROM garde_rosters
      WHERE wilaya_code = $1 AND commune_code = $2
      ORDER BY imported_at DESC
      LIMIT 1
    `, [wilaya, commune]),
  ])

  return { wilaya_code: wilaya, commune_code: commune, month, coverage: rosterMeta, data: rows }
}
