/**
 * Crowdsourcing pharmacies de garde : helpers serveur partagés entre
 * /api/garde/report et /api/garde/claim (anti-abus + résolution de fiche).
 */

import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import { query, queryOne } from './db'

/** Hash salé de l'IP appelante — permet le rate-limit sans stocker d'IP en clair */
export function hashClientIp(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const salt = process.env.API_SECRET_KEY || process.env.ADMIN_PASSWORD || 'dwadz'
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

/** Nombre d'insertions récentes du même client dans une table de feedback */
export async function countRecentByIp(table: 'garde_reports' | 'garde_claims', ipHash: string, minutes: number): Promise<number> {
  const row = await queryOne<{ n: string }>(`
    SELECT COUNT(*)::TEXT AS n
    FROM ${table}
    WHERE ip_hash = $1 AND created_at >= NOW() - ($2 || ' minutes')::INTERVAL
  `, [ipHash, String(minutes)])
  return parseInt(row?.n ?? '0', 10)
}

/** Résout une pharmacie de garde par (wilaya, external_id) — l'identifiant exposé côté client */
export async function resolveGardePharmacy(wilayaCode: string, externalId: string): Promise<{ id: number; name: string | null } | null> {
  return queryOne<{ id: number; name: string | null }>(`
    SELECT id, COALESCE(name_fr, name_ar) AS name
    FROM garde_pharmacies
    WHERE wilaya_code = $1 AND external_id = $2
  `, [wilayaCode, externalId])
}

export function isMissingTableError(err: unknown): boolean {
  return (err as { code?: string })?.code === '42P01'
}

export function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

export { query, queryOne }
