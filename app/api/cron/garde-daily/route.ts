import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { isGardeGranularity, isGardePeriod, publishGardeToFacebook } from '@/lib/garde-social'

// Appelé par Vercel Cron (voir vercel.json) : publie sur la Page Facebook,
// wilaya par wilaya (ou commune par commune), la liste illustrée des
// pharmacies de garde. Trois planifications utilisent cette route via le
// paramètre `period` : la garde du jour, celle du vendredi suivant (postée
// en amont) et le planning du mois. Test manuel possible :
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//     "https://…/api/cron/garde-daily?dry=1"           (aperçu sans publier)
//     "…?wilaya=16&date=2026-07-22"                     (wilaya/date ciblées)
//     "…?period=friday"                                 (vendredi suivant)
//     "…?period=month&month=2026-08&granularity=commune"

export const dynamic = 'force-dynamic'
// Les publications sont espacées (GARDE_POST_DELAY_MS) : on laisse la
// fonction tourner aussi longtemps que le plan Vercel l'autorise. Sur
// Hobby la valeur est plafonnée à 60 s côté plateforme (le budget de temps
// interne, GARDE_TIME_BUDGET_MS ≈ 50 s, reste donc en deçà) ; sur Pro elle
// peut aller jusqu'à 300 s.
export const maxDuration = 300

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
  const month = params.get('month') || undefined
  const wilaya = params.get('wilaya') || undefined
  const commune = params.get('commune') || undefined
  const dryRun = params.get('dry') === '1'
  const periodParam = params.get('period') || 'day'
  const period = isGardePeriod(periodParam) ? periodParam : 'day'
  const granularityParam = params.get('granularity')
  const granularity = isGardeGranularity(granularityParam) ? granularityParam : undefined

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Date invalide (format attendu : YYYY-MM-DD)' }, { status: 400 })
  }
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: 'Mois invalide (format attendu : YYYY-MM)' }, { status: 400 })
  }

  try {
    const result = await publishGardeToFacebook({ period, date, month, wilaya, commune, granularity, dryRun })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[api/cron/garde-daily] Internal error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
