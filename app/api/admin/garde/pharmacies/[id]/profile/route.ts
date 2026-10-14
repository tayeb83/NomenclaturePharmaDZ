import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query, queryOne } from '@/lib/db'
import { profileTableAvailable } from '@/lib/annuaire'
import { parseProfile } from '@/lib/annuaire-admin'

function tableMissing() {
  return NextResponse.json({ error: 'Table annuaire absente : appliquer sql/17_annuaire.sql' }, { status: 503 })
}

/** Profil annuaire d'une pharmacie (badge, horaires, mobile, masquage). */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(await profileTableAvailable())) return tableMissing()

  const id = parseInt(params.id, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })

  try {
    const row = await queryOne(`
      SELECT pharmacy_id, verified, verified_at::text AS verified_at, is_hidden, mobile_raw, mobile_e164,
             opens_at::text AS opens_at, closes_at::text AS closes_at, closed_days, admin_note
      FROM annuaire_pharmacy_profile WHERE pharmacy_id = $1
    `, [id])
    return NextResponse.json({ data: row })
  } catch (err) {
    console.error('Admin annuaire profile get error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(await profileTableAvailable())) return tableMissing()

  const id = parseInt(params.id, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })

  const parsed = parseProfile(body as Record<string, unknown>)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const d = parsed.data

  try {
    const exists = await queryOne(`SELECT id FROM garde_pharmacies WHERE id = $1`, [id])
    if (!exists) return NextResponse.json({ error: 'Pharmacie introuvable' }, { status: 404 })

    const rows = await query(`
      INSERT INTO annuaire_pharmacy_profile (
        pharmacy_id, verified, verified_at, is_hidden, mobile_raw, mobile_e164,
        opens_at, closes_at, closed_days, admin_note, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (pharmacy_id) DO UPDATE SET
        verified = EXCLUDED.verified, verified_at = EXCLUDED.verified_at, is_hidden = EXCLUDED.is_hidden,
        mobile_raw = EXCLUDED.mobile_raw, mobile_e164 = EXCLUDED.mobile_e164,
        opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at, closed_days = EXCLUDED.closed_days,
        admin_note = EXCLUDED.admin_note, updated_at = NOW()
      RETURNING pharmacy_id, verified, verified_at::text AS verified_at, is_hidden, mobile_raw, mobile_e164,
                opens_at::text AS opens_at, closes_at::text AS closes_at, closed_days, admin_note
    `, [id, d.verified, d.verified_at, d.is_hidden, d.mobile_raw, d.mobile_e164, d.opens_at, d.closes_at, d.closed_days, d.admin_note])
    return NextResponse.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('Admin annuaire profile save error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
