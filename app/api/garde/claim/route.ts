import { NextRequest, NextResponse } from 'next/server'
import {
  cleanText,
  countRecentByIp,
  hashClientIp,
  isMissingTableError,
  query,
  resolveGardePharmacy,
} from '@/lib/garde-feedback'

const MAX_CLAIMS_PER_10MIN = 3

/**
 * "Revendiquer ma pharmacie" : un pharmacien demande la main sur sa fiche
 * (horaires, garde, téléphone, WhatsApp). Vérification manuelle côté admin
 * avant toute modification de la fiche.
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
  const externalId = cleanText(body?.pharmacy_external_id, 100)
  const pharmacyName = cleanText(body?.pharmacy_name, 300)
  const pharmacistName = cleanText(body?.pharmacist_name, 200)
  const phone = cleanText(body?.phone, 30)
  const whatsapp = cleanText(body?.whatsapp, 30)
  const email = cleanText(body?.email, 200)
  const message = cleanText(body?.message, 1000)

  if (!wilayaCode || !communeCode || !pharmacistName || !phone) {
    return NextResponse.json({ error: 'Nom du pharmacien et téléphone obligatoires' }, { status: 400 })
  }
  if (!/^[+0-9 .()-]{6,30}$/.test(phone)) {
    return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
  }

  const ipHash = hashClientIp(request)

  try {
    if (await countRecentByIp('garde_claims', ipHash, 10) >= MAX_CLAIMS_PER_10MIN) {
      return NextResponse.json({ error: 'Trop de demandes, réessayez plus tard' }, { status: 429 })
    }

    const pharmacy = externalId ? await resolveGardePharmacy(wilayaCode, externalId) : null

    await query(`
      INSERT INTO garde_claims (
        pharmacy_id, pharmacy_name, wilaya_code, commune_code,
        pharmacist_name, phone, whatsapp, email, message, ip_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      pharmacy?.id ?? null,
      pharmacy?.name ?? pharmacyName,
      wilayaCode,
      communeCode,
      pharmacistName,
      phone,
      whatsapp,
      email,
      message,
      ipHash,
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (isMissingTableError(err)) {
      return NextResponse.json({ error: 'Fonctionnalité pas encore activée (migration 12 manquante)' }, { status: 503 })
    }
    console.error('Garde claim API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
