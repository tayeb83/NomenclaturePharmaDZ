import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { isMissingTableError } from '@/lib/garde-feedback'

/** Consultation des signalements crowdsourcés et des revendications de fiche */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const [reports, claims] = await Promise.all([
      query(`
        SELECT
          r.id, r.report_type, r.message, r.contact, r.status, r.created_at,
          r.wilaya_code, r.commune_code,
          COALESCE(ph.name_fr, ph.name_ar, r.pharmacy_name) AS pharmacy_name
        FROM garde_reports r
        LEFT JOIN garde_pharmacies ph ON ph.id = r.pharmacy_id
        ORDER BY r.created_at DESC
        LIMIT 200
      `),
      query(`
        SELECT
          c.id, c.pharmacist_name, c.phone, c.whatsapp, c.email, c.message,
          c.status, c.created_at, c.wilaya_code, c.commune_code,
          COALESCE(ph.name_fr, ph.name_ar, c.pharmacy_name) AS pharmacy_name
        FROM garde_claims c
        LEFT JOIN garde_pharmacies ph ON ph.id = c.pharmacy_id
        ORDER BY c.created_at DESC
        LIMIT 200
      `),
    ])

    return NextResponse.json({ reports, claims })
  } catch (err) {
    if (isMissingTableError(err)) {
      return NextResponse.json({ reports: [], claims: [], migrationMissing: true })
    }
    console.error('Admin garde reports API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** Modération : changer le statut d'un signalement ou d'une revendication */
export async function PATCH(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const kind = body?.kind
  const id = Number(body?.id)
  const status = body?.status

  const allowed: Record<string, Set<string>> = {
    report: new Set(['nouveau', 'traite', 'rejete']),
    claim: new Set(['en_attente', 'verifie', 'rejete']),
  }
  if (!['report', 'claim'].includes(kind) || !Number.isInteger(id) || !allowed[kind].has(status)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  try {
    if (kind === 'report') {
      await query(`UPDATE garde_reports SET status = $1 WHERE id = $2`, [status, id])
    } else {
      await query(`UPDATE garde_claims SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id])
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Admin garde reports PATCH error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
