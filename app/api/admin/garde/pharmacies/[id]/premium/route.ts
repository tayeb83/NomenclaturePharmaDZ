import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query, queryOne } from '@/lib/db'
import { normalizePhotos, premiumTableAvailable } from '@/lib/garde-premium'
import { toDzE164 } from '@/lib/phone-dz'

const TEXT_LIMITS = {
  plan: 40,
  hours_fr: 300,
  hours_ar: 300,
  highlight_fr: 200,
  highlight_ar: 200,
  admin_note: 500,
} as const

type TextKey = keyof typeof TEXT_LIMITS

function cleanText(key: TextKey, value: unknown): { value: string | null } | { error: string } {
  if (value === null || value === undefined) return { value: null }
  if (typeof value !== 'string') return { error: `Champ ${key} invalide` }
  const trimmed = value.trim()
  if (trimmed.length > TEXT_LIMITS[key]) {
    return { error: `Champ ${key} trop long (max ${TEXT_LIMITS[key]} caractères)` }
  }
  return { value: trimmed === '' ? null : trimmed }
}

function cleanDate(value: unknown): { value: string | null } | { error: string } {
  if (value === null || value === undefined || value === '') return { value: null }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'Date attendue au format AAAA-MM-JJ' }
  }
  return { value }
}

function tableMissing() {
  return NextResponse.json({
    error: "Table premium absente : appliquer sql/15_garde_premium.sql",
  }, { status: 503 })
}

/** État de l'abonnement + consultations des 30 derniers jours. */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  if (!(await premiumTableAvailable())) return tableMissing()

  const id = parseInt(params.id, 10)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  }

  try {
    const [premium, stats] = await Promise.all([
      queryOne(`SELECT * FROM garde_pharmacy_premium WHERE pharmacy_id = $1`, [id]),
      queryOne<{ views_30d: number; views_month: number }>(`
        SELECT
          COALESCE(SUM(views) FILTER (WHERE day >= CURRENT_DATE - INTERVAL '30 days'), 0)::int AS views_30d,
          COALESCE(SUM(views) FILTER (WHERE date_trunc('month', day) = date_trunc('month', CURRENT_DATE)), 0)::int AS views_month
        FROM garde_pharmacy_views WHERE pharmacy_id = $1
      `, [id]),
    ])

    return NextResponse.json({ data: premium, stats: stats || { views_30d: 0, views_month: 0 } })
  } catch (err: any) {
    console.error('Admin garde premium get error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** Crée ou met à jour l'abonnement premium d'une fiche. */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  if (!(await premiumTableAvailable())) return tableMissing()

  const id = parseInt(params.id, 10)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const texts: Record<string, string | null> = {}
  for (const key of Object.keys(TEXT_LIMITS) as TextKey[]) {
    const parsed = cleanText(key, body[key])
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
    texts[key] = parsed.value
  }

  const startsOn = cleanDate(body.starts_on)
  if ('error' in startsOn) return NextResponse.json({ error: startsOn.error }, { status: 400 })
  const endsOn = cleanDate(body.ends_on)
  if ('error' in endsOn) return NextResponse.json({ error: endsOn.error }, { status: 400 })
  if (startsOn.value && endsOn.value && endsOn.value < startsOn.value) {
    return NextResponse.json({ error: "La fin d'abonnement précède son début" }, { status: 400 })
  }

  let whatsapp: string | null = null
  if (body.whatsapp_e164 !== undefined && body.whatsapp_e164 !== null && String(body.whatsapp_e164).trim() !== '') {
    whatsapp = toDzE164(String(body.whatsapp_e164))
    if (!whatsapp) {
      return NextResponse.json({ error: 'Numéro WhatsApp invalide' }, { status: 400 })
    }
  }

  const photos = normalizePhotos(body.photos)
  if ('error' in photos) return NextResponse.json({ error: photos.error }, { status: 400 })

  try {
    const exists = await queryOne<{ id: number }>(`SELECT id FROM garde_pharmacies WHERE id = $1`, [id])
    if (!exists) {
      return NextResponse.json({ error: 'Pharmacie introuvable' }, { status: 404 })
    }

    const rows = await query(`
      INSERT INTO garde_pharmacy_premium (
        pharmacy_id, is_active, verified, plan, starts_on, ends_on,
        whatsapp_e164, hours_fr, hours_ar, highlight_fr, highlight_ar,
        photos, admin_note, updated_at
      ) VALUES (
        $1, $2, $3, COALESCE($4, 'premium'), $5, $6,
        $7, $8, $9, $10, $11,
        $12::jsonb, $13, NOW()
      )
      ON CONFLICT (pharmacy_id) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        verified = EXCLUDED.verified,
        plan = EXCLUDED.plan,
        starts_on = EXCLUDED.starts_on,
        ends_on = EXCLUDED.ends_on,
        whatsapp_e164 = EXCLUDED.whatsapp_e164,
        hours_fr = EXCLUDED.hours_fr,
        hours_ar = EXCLUDED.hours_ar,
        highlight_fr = EXCLUDED.highlight_fr,
        highlight_ar = EXCLUDED.highlight_ar,
        photos = EXCLUDED.photos,
        admin_note = EXCLUDED.admin_note,
        updated_at = NOW()
      RETURNING *
    `, [
      id,
      body.is_active !== false,
      body.verified === true,
      texts.plan,
      startsOn.value,
      endsOn.value,
      whatsapp,
      texts.hours_fr,
      texts.hours_ar,
      texts.highlight_fr,
      texts.highlight_ar,
      JSON.stringify(photos.photos),
      texts.admin_note,
    ])

    return NextResponse.json({ success: true, data: rows[0] })
  } catch (err: any) {
    console.error('Admin garde premium put error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** Fin d'abonnement : la fiche redevient une fiche normale. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  if (!(await premiumTableAvailable())) return tableMissing()

  const id = parseInt(params.id, 10)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  }

  try {
    await query(`DELETE FROM garde_pharmacy_premium WHERE pharmacy_id = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Admin garde premium delete error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
