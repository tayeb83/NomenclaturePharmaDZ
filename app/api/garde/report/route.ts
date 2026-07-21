import { NextRequest, NextResponse } from 'next/server'
import {
  cleanText,
  countRecentByIp,
  hashClientIp,
  isMissingTableError,
  query,
  resolveGardePharmacy,
} from '@/lib/garde-feedback'

const REPORT_TYPES = new Set(['confirme_ouverte', 'erreur', 'fermee'])
const MAX_REPORTS_PER_10MIN = 10

/**
 * Signalement crowdsourcé sur une pharmacie de garde :
 * "confirmée ouverte" / "erreur sur la fiche" / "fermée".
 */
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const wilayaCode = cleanText(body?.wilaya_code, 10)
  const communeCode = cleanText(body?.commune_code, 10)
  const reportType = cleanText(body?.report_type, 20)
  const externalId = cleanText(body?.pharmacy_external_id, 100)
  const pharmacyName = cleanText(body?.pharmacy_name, 300)
  const message = cleanText(body?.message, 1000)
  const contact = cleanText(body?.contact, 200)

  if (!wilayaCode || !communeCode || !reportType || !REPORT_TYPES.has(reportType)) {
    return NextResponse.json({ error: 'Paramètres manquants ou invalides' }, { status: 400 })
  }
  // Un signalement d'erreur sans description n'est pas exploitable
  if (reportType === 'erreur' && !message) {
    return NextResponse.json({ error: 'Merci de décrire l\'erreur constatée' }, { status: 400 })
  }

  const ipHash = hashClientIp(request)

  try {
    if (await countRecentByIp('garde_reports', ipHash, 10) >= MAX_REPORTS_PER_10MIN) {
      return NextResponse.json({ error: 'Trop de signalements, réessayez plus tard' }, { status: 429 })
    }

    const pharmacy = externalId ? await resolveGardePharmacy(wilayaCode, externalId) : null

    await query(`
      INSERT INTO garde_reports (
        pharmacy_id, pharmacy_name, wilaya_code, commune_code,
        report_type, message, contact, ip_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      pharmacy?.id ?? null,
      pharmacy?.name ?? pharmacyName,
      wilayaCode,
      communeCode,
      reportType,
      message,
      contact,
      ipHash,
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (isMissingTableError(err)) {
      return NextResponse.json({ error: 'Fonctionnalité pas encore activée (migration 12 manquante)' }, { status: 503 })
    }
    console.error('Garde report API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
