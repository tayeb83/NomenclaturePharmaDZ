import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query, queryOne } from '@/lib/db'
import {
  derivePhoneE164,
  normalizeCoords,
  normalizeText,
  TEXT_FIELDS,
  type TextField,
} from '@/lib/garde-admin'

const EDITABLE_TEXT_FIELDS = Object.keys(TEXT_FIELDS) as TextField[]

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const id = parseInt(params.id, 10)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const updates: string[] = []
  const values: (string | number | null)[] = []

  // ── Position (optionnelle) ────────────────────────────────
  // Les deux coordonnées vont ensemble : n'en fournir qu'une placerait le
  // repère n'importe où.
  if (body.lat !== undefined || body.lng !== undefined) {
    const coords = normalizeCoords(body.lat, body.lng)
    if ('error' in coords) {
      return NextResponse.json({ error: coords.error }, { status: 400 })
    }
    values.push(coords.coords.lat, coords.coords.lng)
    updates.push(`lat = $${values.length - 1}`, `lng = $${values.length}`, `geocode_status = 'manual'`)
  }

  // ── Champs texte (tous optionnels) ────────────────────────
  // Corriger une adresse mal extraite (décalage de ligne à la lecture du
  // document DSP) ne doit pas toucher au repère déjà posé, et inversement.
  let phoneRaw: string | null = null
  let phoneRawProvided = false

  for (const field of EDITABLE_TEXT_FIELDS) {
    if (body[field] === undefined) continue
    const parsed = normalizeText(field, body[field])
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    if (field === 'phone_raw') {
      phoneRaw = parsed.value
      phoneRawProvided = true
    }
    values.push(parsed.value)
    updates.push(`${field} = $${values.length}`)
  }

  // phone_e164 suit phone_raw sauf si l'admin le fournit lui-même.
  if (phoneRawProvided || body.phone_e164 !== undefined) {
    const phone = derivePhoneE164(phoneRaw, body.phone_e164)
    if ('error' in phone) {
      return NextResponse.json({ error: phone.error }, { status: 400 })
    }
    values.push(phone.value)
    updates.push(`phone_e164 = $${values.length}`)
  }

  // Un nom vidé des deux côtés rendrait la fiche inidentifiable.
  if (body.name_fr !== undefined || body.name_ar !== undefined) {
    const current = await queryOne<{ name_fr: string | null; name_ar: string | null }>(
      `SELECT name_fr, name_ar FROM garde_pharmacies WHERE id = $1`, [id]
    )
    if (!current) {
      return NextResponse.json({ error: 'Pharmacie introuvable' }, { status: 404 })
    }
    const nextFr = body.name_fr !== undefined ? String(body.name_fr ?? '').trim() : (current.name_fr || '')
    const nextAr = body.name_ar !== undefined ? String(body.name_ar ?? '').trim() : (current.name_ar || '')
    if (!nextFr && !nextAr) {
      return NextResponse.json({ error: 'La fiche doit garder un nom (français ou arabe)' }, { status: 400 })
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 })
  }

  values.push(id)

  try {
    const rows = await query(
      `UPDATE garde_pharmacies
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, external_id, wilaya_code, commune_code, commune_name_fr, commune_name_ar,
                 type, name_fr, name_ar, address_fr, address_ar,
                 phone_raw, phone_e164, lat, lng, geocode_status`,
      values
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Pharmacie introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: rows[0] })
  } catch (err: any) {
    console.error('Admin garde pharmacy patch error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Suppression d'une fiche. Les gardes rattachées partent avec elle
 * (ON DELETE CASCADE) : on renvoie leur nombre pour que l'admin sache ce
 * qu'il vient de perdre, et on l'exige en confirmation quand il y en a.
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const id = parseInt(params.id, 10)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const confirmed = searchParams.get('confirm') === '1'

  try {
    const pharmacy = await queryOne<{ id: number; name: string | null; duties: number }>(`
      SELECT ph.id, COALESCE(ph.name_fr, ph.name_ar) AS name,
             (SELECT COUNT(*)::int FROM garde_duty_periods dp WHERE dp.pharmacy_id = ph.id) AS duties
      FROM garde_pharmacies ph WHERE ph.id = $1
    `, [id])

    if (!pharmacy) {
      return NextResponse.json({ error: 'Pharmacie introuvable' }, { status: 404 })
    }

    if (!confirmed) {
      return NextResponse.json({
        error: 'Confirmation requise',
        pharmacy: pharmacy.name,
        duty_periods: pharmacy.duties,
      }, { status: 409 })
    }

    await query(`DELETE FROM garde_pharmacies WHERE id = $1`, [id])

    return NextResponse.json({ success: true, deleted_duty_periods: pharmacy.duties })
  } catch (err: any) {
    console.error('Admin garde pharmacy delete error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
