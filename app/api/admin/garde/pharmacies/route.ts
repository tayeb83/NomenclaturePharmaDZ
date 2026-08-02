import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query, queryOne } from '@/lib/db'
import { premiumTableAvailable } from '@/lib/garde-premium'
import {
  buildExternalId,
  derivePhoneE164,
  normalizeCoords,
  normalizeText,
  type TextField,
} from '@/lib/garde-admin'

// Corriger une adresse suppose de pouvoir atteindre une fiche déjà pointée :
// la liste n'est donc plus limitée aux geocode_status = 'none'.
const MAX_ROWS = 1000

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const wilaya = searchParams.get('wilaya') || ''
  const status = searchParams.get('status') || 'none'
  const q = (searchParams.get('q') || '').trim()

  const conditions: string[] = []
  const params: string[] = []

  if (status && status !== 'all') {
    params.push(status)
    conditions.push(`ph.geocode_status = $${params.length}`)
  }
  if (wilaya) {
    params.push(wilaya)
    conditions.push(`ph.wilaya_code = $${params.length}`)
  }
  if (q) {
    params.push(`%${q}%`)
    conditions.push(`(
      ph.name_fr ILIKE $${params.length} OR ph.name_ar ILIKE $${params.length}
      OR ph.address_fr ILIKE $${params.length} OR ph.address_ar ILIKE $${params.length}
      OR ph.commune_name_fr ILIKE $${params.length}
    )`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const premium = await premiumTableAvailable()

  try {
    const rows = await query(`
      SELECT ph.id, ph.external_id, ph.wilaya_code, ph.commune_code, ph.commune_name_fr, ph.commune_name_ar,
             ph.type, ph.name_fr, ph.name_ar, ph.address_fr, ph.address_ar,
             ph.phone_raw, ph.phone_e164, ph.lat, ph.lng, ph.geocode_status,
             w.wilaya_name_fr,
             ${premium
               ? `(prem.pharmacy_id IS NOT NULL) AS is_premium, COALESCE(prem.verified, FALSE) AS premium_verified`
               : `FALSE AS is_premium, FALSE AS premium_verified`}
      FROM garde_pharmacies ph
      ${premium ? 'LEFT JOIN garde_pharmacy_premium prem ON prem.pharmacy_id = ph.id AND prem.is_active' : ''}
      LEFT JOIN LATERAL (
        SELECT wilaya_name_fr FROM garde_rosters r
        WHERE r.wilaya_code = ph.wilaya_code
        ORDER BY imported_at DESC LIMIT 1
      ) w ON true
      ${where}
      ORDER BY ph.wilaya_code, ph.commune_name_fr, COALESCE(ph.name_fr, ph.name_ar)
      LIMIT ${MAX_ROWS}
    `, params)

    return NextResponse.json({ data: rows })
  } catch (err: any) {
    console.error('Admin garde pharmacies API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** Création d'une fiche à la main (pharmacie absente du document DSP). */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const wilayaCode = typeof body.wilaya_code === 'string' ? body.wilaya_code.trim() : ''
  if (!wilayaCode) {
    return NextResponse.json({ error: 'Wilaya obligatoire' }, { status: 400 })
  }

  const fields: Partial<Record<TextField, string | null>> = {}
  for (const field of ['name_fr', 'name_ar', 'type', 'address_fr', 'address_ar',
    'phone_raw', 'commune_code', 'commune_name_fr', 'commune_name_ar'] as TextField[]) {
    const parsed = normalizeText(field, body[field] ?? null)
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
    fields[field] = parsed.value
  }

  // Une fiche sans nom n'est identifiable ni par le public ni au réimport.
  if (!fields.name_fr && !fields.name_ar) {
    return NextResponse.json({ error: 'Nom (français ou arabe) obligatoire' }, { status: 400 })
  }
  if (!fields.commune_name_fr) {
    return NextResponse.json({ error: 'Commune obligatoire' }, { status: 400 })
  }

  const phone = derivePhoneE164(fields.phone_raw ?? null, body.phone_e164)
  if ('error' in phone) return NextResponse.json({ error: phone.error }, { status: 400 })

  let lat: number | null = null
  let lng: number | null = null
  if (body.lat !== undefined && body.lat !== null && body.lng !== undefined && body.lng !== null) {
    const coords = normalizeCoords(body.lat, body.lng)
    if ('error' in coords) return NextResponse.json({ error: coords.error }, { status: 400 })
    lat = coords.coords.lat
    lng = coords.coords.lng
  }

  try {
    // Le code commune n'est pas dans le formulaire : on reprend celui déjà
    // utilisé pour cette commune, sinon les pages publiques (qui résolvent
    // par commune_code) ne verraient pas la nouvelle fiche.
    let communeCode = fields.commune_code
    if (!communeCode) {
      const sibling = await queryOne<{ commune_code: string }>(`
        SELECT commune_code FROM garde_pharmacies
        WHERE wilaya_code = $1 AND lower(commune_name_fr) = lower($2)
        LIMIT 1
      `, [wilayaCode, fields.commune_name_fr])
      communeCode = sibling?.commune_code || null
    }
    if (!communeCode) {
      return NextResponse.json({
        error: "Commune inconnue pour cette wilaya : précisez un code commune (aucune fiche existante à recopier)",
      }, { status: 400 })
    }

    const rows = await query<{ id: number }>(`
      INSERT INTO garde_pharmacies (
        external_id, wilaya_code, type, name_fr, name_ar,
        commune_code, commune_name_fr, commune_name_ar,
        address_fr, address_ar, phone_raw, phone_e164,
        lat, lng, geocode_status, review_flags
      ) VALUES (
        $1, $2, COALESCE($3, 'officine'), $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, '["saisie_admin"]'::jsonb
      )
      RETURNING id
    `, [
      buildExternalId(wilayaCode, fields.name_fr || fields.name_ar || 'pharmacie'),
      wilayaCode,
      fields.type ?? null,
      fields.name_fr ?? null,
      fields.name_ar ?? null,
      communeCode,
      fields.commune_name_fr,
      fields.commune_name_ar ?? null,
      fields.address_fr ?? null,
      fields.address_ar ?? null,
      fields.phone_raw ?? null,
      phone.value,
      lat,
      lng,
      lat != null ? 'manual' : 'none',
    ])

    return NextResponse.json({ success: true, id: rows[0].id }, { status: 201 })
  } catch (err: any) {
    console.error('Admin garde pharmacy create error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
