import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { preparerPostDuJour } from '@/lib/demandes'

export const dynamic = 'force-dynamic'

function isValidBearerToken(authorizationHeader: string | null, expectedToken: string | undefined): boolean {
  if (!authorizationHeader || !expectedToken) return false
  const expectedHeader = `Bearer ${expectedToken}`
  const providedBuffer = Buffer.from(authorizationHeader)
  const expectedBuffer = Buffer.from(expectedHeader)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}

/**
 * Cron « demandes du jour » : expire les demandes échues, puis dépose dans la
 * file Facebook le brouillon « Médicaments recherchés » du jour tant qu'au
 * moins une demande est active. Le post part ensuite avec le cron
 * social-publish, une fois validé dans /admin/social.
 *
 * DEMANDES_AUTO_APPROVE=1 saute la validation manuelle (déconseillé : une
 * demande mal saisie serait publiée telle quelle).
 */
export async function GET(request: NextRequest) {
  if (!isValidBearerToken(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const res = await preparerPostDuJour({ approuver: process.env.DEMANDES_AUTO_APPROVE === '1' })
    return NextResponse.json(
      res.created
        ? { created: true, updated: res.updated, id: res.post?.id ?? null, statut: res.post?.statut ?? null, dedupKey: res.dedupKey }
        : res
    )
  } catch (err: any) {
    console.error('[api/cron/demandes-daily] error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
