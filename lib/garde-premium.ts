/**
 * Fiche Pharmacie Premium — briques partagées entre les pages publiques
 * (badge, WhatsApp, photos, mise en avant) et l'admin.
 *
 * La table est optionnelle : tant que sql/15_garde_premium.sql n'est pas
 * appliqué, les pages de garde doivent continuer à fonctionner. On teste
 * donc son existence une fois par instance plutôt que de faire échouer
 * toutes les requêtes de garde.
 */
import { queryOne } from '@/lib/db'

export const PREMIUM_TABLE = 'garde_pharmacy_premium'
export const VIEWS_TABLE = 'garde_pharmacy_views'

/** Abonnement en cours : actif et dans sa fenêtre de validité. */
export const PREMIUM_ACTIVE_SQL = `
  prem.is_active
  AND (prem.starts_on IS NULL OR prem.starts_on <= CURRENT_DATE)
  AND (prem.ends_on   IS NULL OR prem.ends_on   >= CURRENT_DATE)
`

const globalForPremium = globalThis as unknown as { _gardePremiumTable?: Promise<boolean> }

export function premiumTableAvailable(): Promise<boolean> {
  if (!globalForPremium._gardePremiumTable) {
    globalForPremium._gardePremiumTable = queryOne<{ t: string | null }>(
      `SELECT to_regclass($1) AS t`,
      [`public.${PREMIUM_TABLE}`]
    )
      .then(row => Boolean(row?.t))
      .catch(() => false)
  }
  return globalForPremium._gardePremiumTable
}

/** Colonnes premium exposées au public (jamais admin_note ni facturation). */
export const PREMIUM_PUBLIC_FIELDS = `
  TRUE AS is_premium,
  prem.verified AS premium_verified,
  prem.whatsapp_e164,
  prem.hours_fr, prem.hours_ar,
  prem.highlight_fr, prem.highlight_ar,
  prem.photos
`

/** Mêmes colonnes, à NULL, quand la table n'existe pas encore. */
export const PREMIUM_ABSENT_FIELDS = `
  FALSE AS is_premium,
  NULL::boolean AS premium_verified,
  NULL::text AS whatsapp_e164,
  NULL::text AS hours_fr, NULL::text AS hours_ar,
  NULL::text AS highlight_fr, NULL::text AS highlight_ar,
  '[]'::jsonb AS photos
`

/**
 * Jointure vers l'abonnement en cours. Un LEFT JOIN filtré : une fiche
 * sans premium (ou expirée) reste listée, simplement sans les extras.
 */
export const PREMIUM_JOIN = `
  LEFT JOIN ${PREMIUM_TABLE} prem
    ON prem.pharmacy_id = ph.id AND ${PREMIUM_ACTIVE_SQL}
`

export function premiumFields(available: boolean): string {
  return available
    ? PREMIUM_PUBLIC_FIELDS.replace('TRUE AS is_premium', '(prem.pharmacy_id IS NOT NULL) AS is_premium')
    : PREMIUM_ABSENT_FIELDS
}

export function premiumJoin(available: boolean): string {
  return available ? PREMIUM_JOIN : ''
}

/**
 * Tri d'affichage : à horaire égal, les fiches premium passent devant —
 * c'est la « mise en avant locale » vendue sur /pro.
 */
export function premiumOrder(available: boolean): string {
  return available ? `(prem.pharmacy_id IS NOT NULL) DESC, ` : ''
}

export type PremiumPhoto = { url: string; caption?: string | null }

export const MAX_PHOTOS = 6

/**
 * N'accepte que des URLs https absolues : ces photos sont rendues telles
 * quelles dans les pages publiques.
 */
export function normalizePhotos(input: unknown): { photos: PremiumPhoto[] } | { error: string } {
  if (input == null) return { photos: [] }
  if (!Array.isArray(input)) return { error: 'photos doit être une liste' }
  if (input.length > MAX_PHOTOS) return { error: `Maximum ${MAX_PHOTOS} photos` }

  const photos: PremiumPhoto[] = []
  for (const raw of input) {
    const url = typeof raw === 'string' ? raw : typeof raw?.url === 'string' ? raw.url : ''
    const trimmed = url.trim()
    if (!trimmed) continue

    let parsed: URL
    try {
      parsed = new URL(trimmed)
    } catch {
      return { error: `URL de photo invalide : ${trimmed.slice(0, 60)}` }
    }
    if (parsed.protocol !== 'https:') {
      return { error: 'Les photos doivent être en https' }
    }

    const caption = typeof raw?.caption === 'string' ? raw.caption.trim().slice(0, 120) : null
    photos.push({ url: parsed.toString(), caption: caption || null })
  }

  return { photos }
}
