import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  pendingCount,
  lastScheduledDate,
  generateNextCandidate,
  enqueueCandidate,
  RUBRIQUE_ROTATION,
} from '@/lib/facebook-content'

export const dynamic = 'force-dynamic'

// Nombre de brouillons d'avance à maintenir en file, et espacement des dates.
const TARGET_PENDING = Number(process.env.SOCIAL_TARGET_PENDING || 5)
const INTERVAL_DAYS = Number(process.env.SOCIAL_POST_INTERVAL_DAYS || 3)

function isValidBearerToken(authorizationHeader: string | null, expectedToken: string | undefined): boolean {
  if (!authorizationHeader || !expectedToken) return false
  const expectedHeader = `Bearer ${expectedToken}`
  const providedBuffer = Buffer.from(authorizationHeader)
  const expectedBuffer = Buffer.from(expectedHeader)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}

/**
 * Cron « préparation » : maintient TARGET_PENDING brouillons d'avance dans la
 * file, avec des dates de publication échelonnées de INTERVAL_DAYS jours.
 * Les brouillons attendent la validation de l'admin (auto + validation).
 */
export async function GET(request: NextRequest) {
  if (!isValidBearerToken(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const already = await pendingCount()
    const toCreate = Math.max(0, TARGET_PENDING - already)
    if (toCreate === 0) {
      return NextResponse.json({ created: 0, pending: already, message: 'File déjà pleine' })
    }

    let cursor = (await lastScheduledDate()) ?? new Date()
    const created: string[] = []

    for (let i = 0; i < toCreate; i++) {
      const start = RUBRIQUE_ROTATION[(already + i) % RUBRIQUE_ROTATION.length]
      const candidate = await generateNextCandidate(start)
      if (!candidate) continue

      cursor = new Date(cursor.getTime() + INTERVAL_DAYS * 24 * 60 * 60 * 1000)
      const scheduled = new Date(cursor)
      scheduled.setHours(9, 0, 0, 0)

      const post = await enqueueCandidate(candidate, scheduled)
      if (post) created.push(candidate.titre)
    }

    return NextResponse.json({ created: created.length, titres: created, pending: already + created.length })
  } catch (err: any) {
    console.error('[api/cron/social-prepare] error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
