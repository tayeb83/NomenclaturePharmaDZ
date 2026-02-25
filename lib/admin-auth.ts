import crypto from 'crypto'
import { NextRequest } from 'next/server'

export function hashAdminPassword(pwd: string): string {
  return crypto.createHash('sha256').update(pwd).digest('hex')
}

export function checkAdminAuth(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_session')?.value
  if (!cookie) return false
  const adminPwd = process.env.ADMIN_PASSWORD
  if (!adminPwd) return false
  const expected = hashAdminPassword(adminPwd)
  return cookie === expected
}

export function isAdminSessionValid(sessionCookie: string | undefined): boolean {
  if (!sessionCookie) return false
  const adminPwd = process.env.ADMIN_PASSWORD
  if (!adminPwd) return false
  const expected = hashAdminPassword(adminPwd)
  return sessionCookie === expected
}
