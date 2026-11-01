import crypto from 'crypto'
import { NextRequest } from 'next/server'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8 // 8h

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.API_SECRET_KEY || process.env.ADMIN_PASSWORD
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  if (aBuffer.length !== bBuffer.length) return false
  return crypto.timingSafeEqual(aBuffer, bBuffer)
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export function createAdminSessionToken(adminPwd: string): string | null {
  const secret = getSessionSecret()
  if (!secret) return null

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  const nonce = crypto.randomBytes(12).toString('hex')
  const pwdDigest = crypto.createHash('sha256').update(adminPwd).digest('hex')
  const payload = `${pwdDigest}.${expiresAt}.${nonce}`
  const signature = signPayload(payload, secret)

  return `${payload}.${signature}`
}

export function checkAdminAuth(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_session')?.value
  return isAdminSessionValid(cookie)
}

export type AdminRole = 'owner' | 'admin' | 'editor'

export type AdminSessionInfo = {
  role: AdminRole
  email: string
  name: string
  /** Absent pour la session historique (mot de passe unique ADMIN_PASSWORD). */
  accountId?: number
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

/** Jeton de session d'un compte nominatif : `v2.<charge utile>.<signature>`. */
export function createAccountSessionToken(account: {
  id: number
  email: string
  name: string
  role: 'admin' | 'editor'
}): string | null {
  const secret = getSessionSecret()
  if (!secret) return null
  const body = b64url(
    JSON.stringify({
      sub: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
      n: crypto.randomBytes(8).toString('hex'),
    }),
  )
  return `v2.${body}.${signPayload(`v2.${body}`, secret)}`
}

function parseAccountSession(cookie: string): AdminSessionInfo | null {
  const secret = getSessionSecret()
  if (!secret) return null
  const [prefix, body, signature] = cookie.split('.')
  if (prefix !== 'v2' || !body || !signature) return null
  if (!safeEqual(signature, signPayload(`v2.${body}`, secret))) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) return null
    if (data.role !== 'admin' && data.role !== 'editor') return null
    return { role: data.role, email: String(data.email), name: String(data.name || ''), accountId: Number(data.sub) }
  } catch {
    return null
  }
}

/** Identité et rôle de la session, ou null si elle est absente ou invalide. */
export function getAdminSessionInfo(sessionCookie: string | undefined): AdminSessionInfo | null {
  if (!sessionCookie) return null
  if (sessionCookie.startsWith('v2.')) return parseAccountSession(sessionCookie)
  if (!isLegacySessionValid(sessionCookie)) return null
  return { role: 'owner', email: getOwnerEmail() ?? '', name: 'Propriétaire' }
}

export function getAdminSession(req: NextRequest): AdminSessionInfo | null {
  return getAdminSessionInfo(req.cookies.get('admin_session')?.value)
}

/** Vrai si la session existe et que son rôle fait partie de `roles`. */
export function hasAdminRole(req: NextRequest, roles: AdminRole[]): boolean {
  const info = getAdminSession(req)
  return !!info && roles.includes(info.role)
}

/** Adresse du propriétaire : destinataire des demandes d'approbation. */
export function getOwnerEmail(): string | null {
  const explicit = process.env.ADMIN_OWNER_EMAIL?.trim()
  if (explicit) return explicit.toLowerCase()
  const first = (process.env.ADMIN_EMAILS || '').split(',')[0]?.trim()
  return first ? first.toLowerCase() : null
}

export function isAdminSessionValid(sessionCookie: string | undefined): boolean {
  return getAdminSessionInfo(sessionCookie) !== null
}

function isLegacySessionValid(sessionCookie: string | undefined): boolean {
  if (!sessionCookie) return false

  const adminPwd = process.env.ADMIN_PASSWORD
  const secret = getSessionSecret()

  if (!adminPwd || !secret) return false

  const [pwdDigest, expiresAt, nonce, signature] = sessionCookie.split('.')
  if (!pwdDigest || !expiresAt || !nonce || !signature) return false

  const expectedDigest = crypto.createHash('sha256').update(adminPwd).digest('hex')
  if (!safeEqual(pwdDigest, expectedDigest)) return false

  if (!/^\d+$/.test(expiresAt)) return false
  if (Number(expiresAt) < Math.floor(Date.now() / 1000)) return false

  const payload = `${pwdDigest}.${expiresAt}.${nonce}`
  const expectedSignature = signPayload(payload, secret)

  return safeEqual(signature, expectedSignature)
}

export { SESSION_MAX_AGE_SECONDS }
