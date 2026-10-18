/**
 * Annuaire des pharmacies — accès base (serveur uniquement).
 *
 * Source : garde_pharmacies (alimentée par les imports DSP et par l'admin),
 * enrichie par annuaire_pharmacy_profile (badge vérifié, horaires, mobile,
 * masquage) et garde_pharmacy_premium (WhatsApp, photos, accroche) quand
 * ces tables existent. Les deux sont optionnelles : l'annuaire fonctionne
 * dès l'installation, avec les valeurs par défaut (10h–19h, non vérifiée).
 *
 * URLs stables : /pharmacie/<id>-<slug>. L'id est celui de garde_pharmacies
 * (conservé par les réimports DSP : upsert sur wilaya_code + external_id) ;
 * le slug n'est qu'indicatif, une mauvaise valeur est redirigée.
 */
import { query, queryOne } from '@/lib/db'
import { slugify } from '@/lib/slug'
import { premiumTableAvailable, PREMIUM_ACTIVE_SQL, PREMIUM_TABLE } from '@/lib/garde-premium'
import type { GardeWindow, PharmacyHours } from '@/lib/annuaire-hours'
import type { TitlePlace } from '@/lib/annuaire-titles'
import { pharmacySlug } from '@/lib/annuaire-types'

export { pharmacySlug, pharmacyPath, parsePharmacyParam } from '@/lib/annuaire-types'

const PROFILE_TABLE = 'annuaire_pharmacy_profile'
const PLACES_TABLE = 'annuaire_places'

const globalForAnnuaire = globalThis as unknown as { _annuaireTables?: Map<string, Promise<boolean>> }

function tableAvailable(name: string): Promise<boolean> {
  const cache = (globalForAnnuaire._annuaireTables ||= new Map())
  let hit = cache.get(name)
  if (!hit) {
    hit = queryOne<{ t: string | null }>(`SELECT to_regclass($1) AS t`, [`public.${name}`])
      .then(row => Boolean(row?.t))
      .catch(() => false)
    cache.set(name, hit)
  }
  return hit
}

export const profileTableAvailable = () => tableAvailable(PROFILE_TABLE)
export const placesTableAvailable = () => tableAvailable(PLACES_TABLE)

export type DirectoryPharmacy = {
  id: number
  slug: string
  external_id: string
  wilaya_code: string
  wilaya_name_fr: string
  wilaya_name_ar: string | null
  wilaya_slug: string
  commune_code: string
  commune_name_fr: string
  commune_name_ar: string | null
  commune_slug: string
  name_fr: string | null
  name_ar: string | null
  address_fr: string | null
  address_ar: string | null
  phone_raw: string | null
  phone_e164: string | null
  mobile_raw: string | null
  mobile_e164: string | null
  whatsapp_e164: string | null
  lat: number | null
  lng: number | null
  verified: boolean
  verified_at: string | null
  is_premium: boolean
  highlight_fr: string | null
  highlight_ar: string | null
  hours_fr: string | null
  hours_ar: string | null
  photos: { url: string; caption?: string | null }[]
  hours: PharmacyHours
  /** Gardes en cours ou à venir dans les 48 h (liste), toutes à venir (fiche). */
  garde: GardeWindow[]
}

type Row = Omit<DirectoryPharmacy, 'slug' | 'wilaya_slug' | 'commune_slug' | 'hours' | 'garde' | 'photos'> & {
  opens_at: string | null
  closes_at: string | null
  closed_days: number[] | null
  photos: unknown
}

function hydrate(row: Row, garde: GardeWindow[]): DirectoryPharmacy {
  const photos = Array.isArray(row.photos) ? (row.photos as DirectoryPharmacy['photos']) : []
  const t = (v: string | null) => (v ? v.slice(0, 5) : null)
  return {
    ...row,
    // BIGSERIAL : pg renvoie les int8 en chaîne.
    id: Number(row.id),
    photos,
    slug: pharmacySlug(row),
    wilaya_slug: slugify(row.wilaya_name_fr),
    commune_slug: slugify(row.commune_name_fr),
    hours: { opens: t(row.opens_at), closes: t(row.closes_at), closedDays: row.closed_days || [] },
    garde,
  }
}

async function selectParts() {
  const [profile, premium] = await Promise.all([profileTableAvailable(), premiumTableAvailable()])
  return {
    profile,
    premium,
    fields: `
      ph.id, ph.external_id, ph.wilaya_code, ph.commune_code,
      COALESCE(wl.wilaya_name_fr, ph.wilaya_code) AS wilaya_name_fr, wl.wilaya_name_ar,
      ph.commune_name_fr, ph.commune_name_ar,
      ph.name_fr, ph.name_ar, ph.address_fr, ph.address_ar,
      ph.phone_raw, ph.phone_e164, ph.lat, ph.lng,
      ${profile
        ? `prof.mobile_raw, prof.mobile_e164, prof.opens_at::text AS opens_at, prof.closes_at::text AS closes_at,
           prof.closed_days, COALESCE(prof.verified, FALSE) AS verified, prof.verified_at::text AS verified_at`
        : `NULL::text AS mobile_raw, NULL::text AS mobile_e164, NULL::text AS opens_at, NULL::text AS closes_at,
           NULL::int[] AS closed_days, FALSE AS verified, NULL::text AS verified_at`},
      ${premium
        ? `(prem.pharmacy_id IS NOT NULL) AS is_premium, prem.whatsapp_e164,
           prem.highlight_fr, prem.highlight_ar, prem.hours_fr, prem.hours_ar,
           COALESCE(prem.photos, '[]'::jsonb) AS photos,
           (COALESCE(prem.verified, FALSE) AND prem.pharmacy_id IS NOT NULL) AS premium_verified`
        : `FALSE AS is_premium, NULL::text AS whatsapp_e164,
           NULL::text AS highlight_fr, NULL::text AS highlight_ar, NULL::text AS hours_fr, NULL::text AS hours_ar,
           '[]'::jsonb AS photos, FALSE AS premium_verified`}
    `,
    joins: `
      LEFT JOIN (
        SELECT DISTINCT ON (wilaya_code) wilaya_code, wilaya_name_fr, wilaya_name_ar
        FROM garde_rosters ORDER BY wilaya_code, imported_at DESC
      ) wl ON wl.wilaya_code = ph.wilaya_code
      ${profile ? `LEFT JOIN ${PROFILE_TABLE} prof ON prof.pharmacy_id = ph.id` : ''}
      ${premium ? `LEFT JOIN ${PREMIUM_TABLE} prem ON prem.pharmacy_id = ph.id AND ${PREMIUM_ACTIVE_SQL}` : ''}
    `,
    visible: profile ? `NOT COALESCE(prof.is_hidden, FALSE)` : 'TRUE',
  }
}

type DirectoryRow = Row & { premium_verified: boolean }

function finish(row: DirectoryRow, garde: GardeWindow[]): DirectoryPharmacy {
  const { premium_verified, ...rest } = row
  const p = hydrate(rest as Row, garde)
  // Le badge est accordé par l'admin (profil) ou par l'abonnement premium vérifié.
  p.verified = p.verified || Boolean(premium_verified)
  return p
}

async function gardeWindows(where: string, params: unknown[], upcomingDays: number): Promise<Map<number, GardeWindow[]>> {
  const rows = await query<{ pharmacy_id: number; s: string; e: string }>(`
    SELECT dp.pharmacy_id,
           (EXTRACT(EPOCH FROM dp.starts_at) * 1000)::bigint::text AS s,
           (EXTRACT(EPOCH FROM dp.ends_at) * 1000)::bigint::text AS e
    FROM garde_duty_periods dp
    WHERE ${where}
      AND dp.ends_at > NOW() AND dp.starts_at < NOW() + INTERVAL '${Math.floor(upcomingDays)} days'
    ORDER BY dp.starts_at
  `, params).catch(() => [])
  const map = new Map<number, GardeWindow[]>()
  for (const r of rows) {
    const list = map.get(Number(r.pharmacy_id)) || []
    list.push([Number(r.s), Number(r.e)])
    map.set(Number(r.pharmacy_id), list)
  }
  return map
}

/** Toutes les pharmacies visibles d'une wilaya (et d'une commune), avec gardes des 48 h. */
export async function getDirectoryPharmacies(wilayaCode: string, communeCode?: string): Promise<DirectoryPharmacy[]> {
  const parts = await selectParts()
  const params: unknown[] = [wilayaCode]
  let where = `ph.wilaya_code = $1 AND ${parts.visible}`
  if (communeCode) {
    params.push(communeCode)
    where += ` AND ph.commune_code = $2`
  }
  const rows = await query<DirectoryRow>(`
    SELECT ${parts.fields} FROM garde_pharmacies ph ${parts.joins}
    WHERE ${where}
    ORDER BY ph.commune_name_fr, COALESCE(ph.name_fr, ph.name_ar)
  `, params)

  const garde = await gardeWindows(
    communeCode ? `dp.wilaya_code = $1 AND dp.commune_code = $2` : `dp.wilaya_code = $1`,
    params, 2
  )
  return rows.map(r => finish(r, garde.get(Number(r.id)) || []))
}

export async function getDirectoryPharmacy(id: number): Promise<DirectoryPharmacy | null> {
  const parts = await selectParts()
  const row = await queryOne<DirectoryRow>(`
    SELECT ${parts.fields} FROM garde_pharmacies ph ${parts.joins}
    WHERE ph.id = $1 AND ${parts.visible}
  `, [id])
  if (!row) return null
  // Fiche : toutes les gardes des 60 prochains jours.
  const garde = await gardeWindows(`dp.pharmacy_id = $1`, [id], 60)
  return finish(row, garde.get(id) || [])
}

/** Autres pharmacies de la même commune (maillage interne de la fiche). */
export async function getNeighbours(p: DirectoryPharmacy, limit = 4): Promise<DirectoryPharmacy[]> {
  const rows = await getDirectoryPharmacies(p.wilaya_code, p.commune_code)
  return rows.filter(r => r.id !== p.id).slice(0, limit)
}

export type DirectoryPlace = {
  wilaya_code: string
  wilaya_name_fr: string
  wilaya_name_ar: string | null
  wilaya_slug: string
  commune_code: string
  commune_name_fr: string
  commune_name_ar: string | null
  commune_slug: string
  count: number
}

/** Zones couvertes (wilaya × commune) avec le nombre de pharmacies visibles. */
export async function getDirectoryPlaces(): Promise<DirectoryPlace[]> {
  const parts = await selectParts()
  const rows = await query<Omit<DirectoryPlace, 'wilaya_slug' | 'commune_slug'> & { count: string }>(`
    SELECT ph.wilaya_code, COALESCE(wl.wilaya_name_fr, ph.wilaya_code) AS wilaya_name_fr, wl.wilaya_name_ar,
           ph.commune_code, ph.commune_name_fr, ph.commune_name_ar, COUNT(*)::text AS count
    FROM garde_pharmacies ph ${parts.joins}
    WHERE ${parts.visible}
    GROUP BY ph.wilaya_code, wl.wilaya_name_fr, wl.wilaya_name_ar, ph.commune_code, ph.commune_name_fr, ph.commune_name_ar
    ORDER BY wilaya_name_fr, ph.commune_name_fr
  `)
  return rows.map(r => ({
    ...r,
    count: Number(r.count),
    wilaya_slug: slugify(r.wilaya_name_fr),
    commune_slug: slugify(r.commune_name_fr),
  }))
}

export type WilayaGroup = {
  wilaya_code: string
  wilaya_name_fr: string
  wilaya_name_ar: string | null
  wilaya_slug: string
  count: number
  communes: DirectoryPlace[]
}

export function groupByWilaya(places: DirectoryPlace[]): WilayaGroup[] {
  const map = new Map<string, WilayaGroup>()
  for (const p of places) {
    const g = map.get(p.wilaya_slug) || {
      wilaya_code: p.wilaya_code, wilaya_name_fr: p.wilaya_name_fr, wilaya_name_ar: p.wilaya_name_ar,
      wilaya_slug: p.wilaya_slug, count: 0, communes: [],
    }
    g.count += p.count
    g.communes.push(p)
    map.set(p.wilaya_slug, g)
  }
  return Array.from(map.values())
}

export type ResolvedPlace = {
  wilaya: WilayaGroup
  commune: DirectoryPlace | null
  title: TitlePlace
}

type PlaceOverride = { wilaya_code: string; commune_code: string; phrase_fr: string | null; phrase_ar: string | null }

export async function getPlaceOverrides(): Promise<PlaceOverride[]> {
  if (!(await placesTableAvailable())) return []
  return query<PlaceOverride>(`SELECT wilaya_code, commune_code, phrase_fr, phrase_ar FROM ${PLACES_TABLE}`).catch(() => [])
}

/** Résout (wilaya, commune?) depuis les slugs d'URL ; null si la zone n'existe pas. */
export async function resolvePlace(wilayaSlug: string, communeSlug?: string): Promise<ResolvedPlace | null> {
  const [places, overrides] = await Promise.all([getDirectoryPlaces(), getPlaceOverrides()])
  const wilaya = groupByWilaya(places).find(g => g.wilaya_slug === wilayaSlug)
  if (!wilaya) return null
  let commune: DirectoryPlace | null = null
  if (communeSlug) {
    commune = wilaya.communes.find(c => c.commune_slug === communeSlug) || null
    if (!commune) return null
  }
  const ov = overrides.find(o => o.wilaya_code === wilaya.wilaya_code && o.commune_code === (commune?.commune_code || ''))
  return {
    wilaya,
    commune,
    title: {
      wilayaFr: wilaya.wilaya_name_fr,
      wilayaAr: wilaya.wilaya_name_ar,
      communeFr: commune?.commune_name_fr,
      communeAr: commune?.commune_name_ar,
      phraseFr: ov?.phrase_fr,
      phraseAr: ov?.phrase_ar,
    },
  }
}

/** Titre d'une pharmacie pour sa commune (fiche, fil d'Ariane). */
export async function titlePlaceFor(p: DirectoryPharmacy): Promise<TitlePlace> {
  const overrides = await getPlaceOverrides()
  const ov = overrides.find(o => o.wilaya_code === p.wilaya_code && o.commune_code === p.commune_code)
  return {
    wilayaFr: p.wilaya_name_fr, wilayaAr: p.wilaya_name_ar,
    communeFr: p.commune_name_fr, communeAr: p.commune_name_ar,
    phraseFr: ov?.phrase_fr, phraseAr: ov?.phrase_ar,
  }
}

export type SearchHit = {
  id: number
  name_fr: string | null
  name_ar: string | null
  commune_name_fr: string
  commune_name_ar: string | null
  wilaya_name_fr: string
  wilaya_name_ar: string | null
  verified: boolean
}

/** Recherche globale par nom, commune ou wilaya (FR ou AR) pour la page d'accueil de l'annuaire. */
export async function searchDirectory(q: string, limit = 20): Promise<SearchHit[]> {
  const term = q.trim().slice(0, 80)
  if (term.length < 2) return []
  const parts = await selectParts()
  const like = `%${term.replace(/[%_\\]/g, m => `\\${m}`)}%`
  const rows = await query<SearchHit>(`
    SELECT ph.id, ph.name_fr, ph.name_ar, ph.commune_name_fr, ph.commune_name_ar,
           COALESCE(wl.wilaya_name_fr, ph.wilaya_code) AS wilaya_name_fr, wl.wilaya_name_ar,
           ${parts.profile ? `COALESCE(prof.verified, FALSE)` : 'FALSE'} AS verified
    FROM garde_pharmacies ph ${parts.joins}
    WHERE ${parts.visible} AND (
      ph.name_fr ILIKE $1 OR ph.name_ar ILIKE $1 OR ph.commune_name_fr ILIKE $1
      OR ph.commune_name_ar ILIKE $1 OR wl.wilaya_name_fr ILIKE $1 OR wl.wilaya_name_ar ILIKE $1
      OR ph.address_fr ILIKE $1 OR ph.address_ar ILIKE $1
    )
    ORDER BY (ph.name_fr ILIKE $2) DESC, COALESCE(ph.name_fr, ph.name_ar)
    LIMIT ${Math.min(Math.max(limit, 1), 50)}
  `, [like, `${term}%`])
  return rows.map(r => ({ ...r, id: Number(r.id) }))
}

/** Toutes les fiches visibles, pour le sitemap. */
export async function getAllPharmacyRefs(): Promise<{ id: number; name_fr: string | null; name_ar: string | null }[]> {
  const parts = await selectParts()
  const rows = await query<{ id: number; name_fr: string | null; name_ar: string | null }>(
    `SELECT ph.id, ph.name_fr, ph.name_ar FROM garde_pharmacies ph ${parts.joins} WHERE ${parts.visible} ORDER BY ph.id`
  )
  return rows.map(r => ({ ...r, id: Number(r.id) }))
}
