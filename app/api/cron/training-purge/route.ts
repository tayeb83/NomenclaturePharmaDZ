import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getTraining } from '@/lib/training'

export const dynamic = 'force-dynamic'

// Appelé chaque jour par Vercel Cron (voir vercel.json) : applique les durées de
// conservation de la politique de confidentialité et supprime jetons / sessions expirés.
function isValidBearerToken(header: string | null, expected: string | undefined): boolean {
  if (!header || !expected) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${expected}`)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  if (!isValidBearerToken(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const purged = await getTraining().purgeRetention()
    return NextResponse.json({ ok: true, purged })
  } catch (err) {
    console.error('[api/cron/training-purge]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
