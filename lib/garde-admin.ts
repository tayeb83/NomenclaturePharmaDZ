/**
 * Champs éditables d'une fiche pharmacie côté admin — partagés entre la
 * création (POST) et la modification (PATCH) pour que les deux routes
 * valident exactement la même chose.
 */
import { toDzE164 } from '@/lib/phone-dz'

// Boîte englobante large de l'Algérie — garde-fou contre une erreur de saisie/clic.
export const DZ_BOUNDS = { latMin: 18, latMax: 38, lngMin: -9, lngMax: 12 }

export const TEXT_FIELDS = {
  name_fr: 200,
  name_ar: 200,
  type: 40,
  address_fr: 300,
  address_ar: 300,
  phone_raw: 60,
  commune_code: 20,
  commune_name_fr: 120,
  commune_name_ar: 120,
} as const

export type TextField = keyof typeof TEXT_FIELDS

export type FieldResult = { value: string | null } | { error: string }

/** Champ texte optionnel : chaîne vide = effacement (NULL), pas "vide". */
export function normalizeText(field: TextField, value: unknown): FieldResult {
  if (value === null) return { value: null }
  if (typeof value !== 'string') return { error: `Champ ${field} invalide` }

  const trimmed = value.trim()
  const max = TEXT_FIELDS[field]
  if (trimmed.length > max) {
    return { error: `Champ ${field} trop long (max ${max} caractères)` }
  }
  return { value: trimmed === '' ? null : trimmed }
}

export type Coords = { lat: number; lng: number }

export function normalizeCoords(lat: unknown, lng: unknown): { coords: Coords } | { error: string } {
  const latNum = Number(lat)
  const lngNum = Number(lng)

  if (
    !Number.isFinite(latNum) || !Number.isFinite(lngNum) ||
    latNum < DZ_BOUNDS.latMin || latNum > DZ_BOUNDS.latMax ||
    lngNum < DZ_BOUNDS.lngMin || lngNum > DZ_BOUNDS.lngMax
  ) {
    return { error: 'Coordonnées invalides (hors Algérie)' }
  }
  return { coords: { lat: latNum, lng: lngNum } }
}

/**
 * Le téléphone est saisi comme sur le document DSP ; phone_e164 en est
 * déduit, sauf si l'admin le fournit explicitement.
 */
export function derivePhoneE164(phoneRaw: string | null, explicit: unknown): FieldResult {
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    const normalized = toDzE164(explicit)
    if (!normalized) return { error: 'Téléphone E.164 invalide (attendu +213…)' }
    return { value: normalized }
  }
  if (explicit === null || explicit === '') return { value: null }
  return { value: toDzE164(phoneRaw) }
}

/** Identifiant d'extraction pour une fiche créée à la main. */
export function buildExternalId(wilayaCode: string, name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  const suffix = Math.random().toString(36).slice(2, 8)
  return `admin-${wilayaCode}-${slug || 'pharmacie'}-${suffix}`
}
