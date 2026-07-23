import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { publishGardeDailyToFacebook } from '@/lib/garde-social'

// Appelé chaque matin par Vercel Cron (voir vercel.json) : publie sur la
// Page Facebook, wilaya par wilaya, la liste illustrée des pharmacies de
// garde du jour. Test manuel possible :
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//     "https://…/api/cron/garde-daily?dry=1"          (aperçu sans publier)
//     "…?wilaya=16&date=2026-07-22"                    (wilaya/date ciblées)

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isValidBearerToken(authorizationHeader: string | null, expectedToken: string | undefined): boolean {
  if (!authorizationHeader || !expectedToken) return false
  const expectedHeader = `Bearer ${expectedToken}`
  const providedBuffer = Buffer.from(authorizationHeader)
  const expectedBuffer = Buffer.from(expectedHeader)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')
  if (!isValidBearerToken(cronSecret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const date = params.get('date') || undefined
  const wilaya = params.get('wilaya') || undefined
  const dryRun = params.get('dry') === '1'

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Date invalide (format attendu : YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    const result = await publishGardeDailyToFacebook({ date, wilaya, dryRun })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[api/cron/garde-daily] Internal error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
