import { NextRequest, NextResponse } from 'next/server'
import { cleanText, hashClientIp, isMissingTableError, query, resolveGardePharmacy } from '@/lib/garde-feedback'
import { rateLimit } from '@/lib/rate-limit'

// Statistique promise au pharmacien premium ("142 consultations ce mois-ci").
// Un compteur par jour, sans aucun identifiant visiteur : le hash d'IP ne
// sert qu'à ne pas compter dix fois le même curieux, il n'est pas stocké.
const MAX_VIEWS_PER_MINUTE = 20

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  const wilayaCode = cleanText(body?.wilaya_code, 10)
  const externalId = cleanText(body?.pharmacy_external_id, 100)

  if (!wilayaCode || !externalId) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const retryAfter = rateLimit(`garde-view:${hashClientIp(request)}`, MAX_VIEWS_PER_MINUTE, 60_000)
  if (retryAfter) {
    // Silencieux : une vue non comptée ne doit pas alarmer le visiteur.
    return NextResponse.json({ success: true, counted: false })
  }

  try {
    const pharmacy = await resolveGardePharmacy(wilayaCode, externalId)
    if (!pharmacy) {
      return NextResponse.json({ error: 'Pharmacie inconnue' }, { status: 404 })
    }

    await query(`
      INSERT INTO garde_pharmacy_views (pharmacy_id, day, views)
      VALUES ($1, CURRENT_DATE, 1)
      ON CONFLICT (pharmacy_id, day) DO UPDATE SET views = garde_pharmacy_views.views + 1
    `, [pharmacy.id])

    return NextResponse.json({ success: true, counted: true })
  } catch (err: any) {
    // Tant que sql/15_garde_premium.sql n'est pas appliqué, on ignore.
    if (isMissingTableError(err)) {
      return NextResponse.json({ success: true, counted: false })
    }
    console.error('Garde view count error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
