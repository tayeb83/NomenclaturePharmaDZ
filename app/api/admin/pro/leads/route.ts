import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { isMissingTableError } from '@/lib/garde-feedback'

/** Consultation des prospects B2B (page /pro) */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const leads = await query(`
      SELECT id, offer, organisation, nom, email, phone, message, status, created_at
      FROM pro_leads
      ORDER BY created_at DESC
      LIMIT 500
    `)
    return NextResponse.json({ leads })
  } catch (err) {
    if (isMissingTableError(err)) {
      return NextResponse.json({ leads: [], migrationMissing: true })
    }
    console.error('Admin pro leads API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** Suivi commercial : changer le statut d'un prospect */
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

  const id = Number(body?.id)
  const status = body?.status
  if (!Number.isInteger(id) || !['nouveau', 'contacte', 'converti', 'rejete'].includes(status)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  try {
    await query(`UPDATE pro_leads SET status = $1 WHERE id = $2`, [status, id])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Admin pro leads PATCH error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
