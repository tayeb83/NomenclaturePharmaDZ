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

export function isAdminSessionValid(sessionCookie: string | undefined): boolean {
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
