/**
 * Dzair-Pharma Training — validation des entrées de la demande d'accès.
 * Module pur (aucun import) : testable directement avec `node --test`.
 */

/** Profils proposés. (`enseignant` a existé : d'anciens comptes peuvent le porter, il n'est plus proposé.) */
export const ROLES = ['etudiant', 'pharmacien'] as const
export type TrainingRole = (typeof ROLES)[number]

export const STATUSES = ['pending', 'approved', 'rejected'] as const
export type TrainingStatus = (typeof STATUSES)[number]

export const MAX_EMAIL_LENGTH = 254
export const MAX_FACULTE_LENGTH = 120

// Volontairement simple : la vraie vérification est l'e-mail de connexion
// envoyé à l'adresse. On refuse seulement ce qui ne peut pas être une adresse.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (email.length < 6 || email.length > MAX_EMAIL_LENGTH) return null
  if (!EMAIL_RE.test(email)) return null
  if (email.includes('..')) return null
  return email
}

export function isRole(value: unknown): value is TrainingRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function isStatus(value: unknown): value is TrainingStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

/** Texte libre → une ligne, sans caractères de contrôle, longueur bornée ; vide → null. */
export function cleanFreeText(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null
  // eslint-disable-next-line no-control-regex
  const text = raw.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return null
  return text.slice(0, max)
}

export type SignupInput = { email: string; role: TrainingRole; faculte: string | null }
export type SignupParse = { ok: true; value: SignupInput } | { ok: false; error: 'email' | 'role' }

export function parseSignup(body: unknown): SignupParse {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const email = normalizeEmail(b.email)
  if (!email) return { ok: false, error: 'email' }
  if (!isRole(b.role)) return { ok: false, error: 'role' }
  return { ok: true, value: { email, role: b.role, faculte: cleanFreeText(b.faculte, MAX_FACULTE_LENGTH) } }
}

/** Échappement HTML pour tout texte saisi par un utilisateur inséré dans un e-mail. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
