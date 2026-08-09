import { NextRequest, NextResponse } from 'next/server'
import {
  buildGardeImageResponse,
  buildGardeMonthImageResponse,
  currentMonthInAlgiers,
  getGardeDayByWilaya,
  getGardeMonthByWilaya,
  isGardePeriod,
  resolveGardeDate,
  splitMonthByCommune,
} from '@/lib/garde-social'

// Aperçu de l'image de garde publiée sur Facebook (mêmes données, même
// rendu) — pratique pour vérifier le visuel avant/après publication :
//   /api/garde/social-image?wilaya=16&date=2026-07-22          (jour, français)
//   /api/garde/social-image?wilaya=16&lang=ar                  (arabe, RTL)
//   /api/garde/social-image?wilaya=20&commune=2001             (commune ciblée)
//   /api/garde/social-image?wilaya=20&period=friday            (vendredi suivant)
//   /api/garde/social-image?wilaya=20&period=month&month=2026-08 (planning du mois)
// Les données sont publiques (déjà exposées par /api/garde) ; la route est
// couverte par le rate-limiting du middleware comme le reste de l'API.

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const wilaya = params.get('wilaya') || ''
  const commune = params.get('commune') || undefined
  const locale = params.get('lang') === 'ar' ? 'ar' : 'fr'
  const periodParam = params.get('period') || 'day'
  const period = isGardePeriod(periodParam) ? periodParam : 'day'

  if (!wilaya || wilaya.length > 10) {
    return NextResponse.json({ error: 'Paramètre wilaya requis' }, { status: 400 })
  }
  if (commune && commune.length > 20) {
    return NextResponse.json({ error: 'Paramètre commune invalide' }, { status: 400 })
  }

  try {
    if (period === 'month') {
      const month = params.get('month') || currentMonthInAlgiers()
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return NextResponse.json({ error: 'Mois invalide (format attendu : YYYY-MM)' }, { status: 400 })
      }
      const months = await getGardeMonthByWilaya(month, wilaya, commune)
      if (!months.length) {
        return NextResponse.json({ error: 'Aucun planning de garde pour cette wilaya sur ce mois' }, { status: 404 })
      }
      // Un visuel mensuel = une commune (cf. lib/garde-social).
      const [first] = splitMonthByCommune(months[0])
      return await buildGardeMonthImageResponse(first, locale)
    }

    const dateParam = params.get('date')
    if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json({ error: 'Date invalide (format attendu : YYYY-MM-DD)' }, { status: 400 })
    }
    const date = resolveGardeDate(period, dateParam || undefined)

    const days = await getGardeDayByWilaya(date, wilaya, commune)
    if (!days.length) {
      return NextResponse.json({ error: 'Aucune pharmacie de garde pour cette wilaya à cette date' }, { status: 404 })
    }
    return await buildGardeImageResponse(days[0], locale, { upcoming: period === 'friday' })
  } catch (error) {
    console.error('[api/garde/social-image] Internal error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
