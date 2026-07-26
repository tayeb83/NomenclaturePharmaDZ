import { NextRequest, NextResponse } from 'next/server'
import { buildGardeImageResponse, getGardeDayByWilaya, todayInAlgiers } from '@/lib/garde-social'

// Aperçu de l'image de garde publiée sur Facebook (mêmes données, même
// rendu) — pratique pour vérifier le visuel avant/après publication :
//   /api/garde/social-image?wilaya=16&date=2026-07-22       (français)
//   /api/garde/social-image?wilaya=16&lang=ar               (arabe, RTL)
// Les données sont publiques (déjà exposées par /api/garde) ; la route est
// couverte par le rate-limiting du middleware comme le reste de l'API.

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const wilaya = params.get('wilaya') || ''
  const date = params.get('date') || todayInAlgiers()
  const locale = params.get('lang') === 'ar' ? 'ar' : 'fr'

  if (!wilaya || wilaya.length > 10) {
    return NextResponse.json({ error: 'Paramètre wilaya requis' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Date invalide (format attendu : YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    const days = await getGardeDayByWilaya(date, wilaya)
    if (!days.length) {
      return NextResponse.json({ error: 'Aucune pharmacie de garde pour cette wilaya à cette date' }, { status: 404 })
    }
    return await buildGardeImageResponse(days[0], locale)
  } catch (error) {
    console.error('[api/garde/social-image] Internal error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
