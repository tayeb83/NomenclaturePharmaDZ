/** Validation des champs admin de l'annuaire (profil de pharmacie, titres de zones). */
import { toDzE164 } from '@/lib/phone-dz'

type Ok<T> = { value: T }
type Err = { error: string }

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export function cleanTime(value: unknown, field: string): Ok<string | null> | Err {
  if (value === null || value === undefined || value === '') return { value: null }
  if (typeof value !== 'string' || !HHMM.test(value.trim().slice(0, 5))) return { error: `${field} : heure attendue au format HH:MM` }
  return { value: value.trim().slice(0, 5) }
}

export function cleanDays(value: unknown): Ok<number[]> | Err {
  if (value === null || value === undefined) return { value: [] }
  if (!Array.isArray(value)) return { error: 'closed_days doit être une liste' }
  const days = Array.from(new Set(value.map(Number)))
  if (days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) return { error: 'Jours de repos invalides (0 = dimanche … 6 = samedi)' }
  if (days.length === 7) return { error: 'Une pharmacie ne peut pas être fermée tous les jours : masquez la fiche à la place' }
  return { value: days.sort((a, b) => a - b) }
}

export function cleanDate(value: unknown): Ok<string | null> | Err {
  if (value === null || value === undefined || value === '') return { value: null }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: 'Date attendue au format AAAA-MM-JJ' }
  return { value }
}

export function cleanShortText(value: unknown, field: string, max: number): Ok<string | null> | Err {
  if (value === null || value === undefined) return { value: null }
  if (typeof value !== 'string') return { error: `Champ ${field} invalide` }
  const trimmed = value.trim()
  if (trimmed.length > max) return { error: `Champ ${field} trop long (max ${max} caractères)` }
  return { value: trimmed === '' ? null : trimmed }
}

export type ProfileInput = {
  verified: boolean
  verified_at: string | null
  is_hidden: boolean
  mobile_raw: string | null
  mobile_e164: string | null
  opens_at: string | null
  closes_at: string | null
  closed_days: number[]
  admin_note: string | null
}

export function parseProfile(body: Record<string, unknown>): { data: ProfileInput } | Err {
  const mobileRaw = cleanShortText(body.mobile_raw, 'mobile', 60)
  if ('error' in mobileRaw) return mobileRaw
  let mobileE164: string | null = null
  if (mobileRaw.value) {
    mobileE164 = toDzE164(mobileRaw.value)
    if (!mobileE164) return { error: 'Numéro mobile invalide (ex. 0550 12 34 56)' }
  }

  const opens = cleanTime(body.opens_at, 'Ouverture')
  if ('error' in opens) return opens
  const closes = cleanTime(body.closes_at, 'Fermeture')
  if ('error' in closes) return closes
  if (!!opens.value !== !!closes.value) return { error: "Renseignez l'ouverture et la fermeture, ou aucune des deux (défaut 10:00–21:00)" }
  if (opens.value && closes.value && opens.value >= closes.value) return { error: "L'ouverture doit précéder la fermeture" }

  const days = cleanDays(body.closed_days)
  if ('error' in days) return days
  const verifiedAt = cleanDate(body.verified_at)
  if ('error' in verifiedAt) return verifiedAt
  const note = cleanShortText(body.admin_note, 'note', 500)
  if ('error' in note) return note

  const verified = body.verified === true
  return {
    data: {
      verified,
      // Un badge sans date n'a pas de sens : on date au jour de la validation.
      verified_at: verified ? (verifiedAt.value || new Date().toISOString().slice(0, 10)) : null,
      is_hidden: body.is_hidden === true,
      mobile_raw: mobileRaw.value,
      mobile_e164: mobileE164,
      opens_at: opens.value,
      closes_at: closes.value,
      closed_days: days.value,
      admin_note: note.value,
    },
  }
}
