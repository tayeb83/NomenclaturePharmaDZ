import { NextRequest, NextResponse } from 'next/server'
import { cleanText, hashClientIp, isMissingTableError, query, queryOne } from '@/lib/garde-feedback'

const OFFERS = new Set(['veille', 'api', 'fiche_pharmacie', 'autre'])
const MAX_LEADS_PER_HOUR = 5

/** Capture de prospects B2B depuis la page /pro */
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const offer = cleanText(body?.offer, 20)
  const organisation = cleanText(body?.organisation, 200)
  const nom = cleanText(body?.nom, 200)
  const email = cleanText(body?.email, 200)
  const phone = cleanText(body?.phone, 30)
  const message = cleanText(body?.message, 2000)

  if (!offer || !OFFERS.has(offer) || !nom || !email) {
    return NextResponse.json({ error: 'Offre, nom et email sont obligatoires' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
  }

  const ipHash = hashClientIp(request)

  try {
    const recent = await queryOne<{ n: string }>(`
      SELECT COUNT(*)::TEXT AS n
      FROM pro_leads
      WHERE ip_hash = $1 AND created_at >= NOW() - INTERVAL '1 hour'
    `, [ipHash])
    if (parseInt(recent?.n ?? '0', 10) >= MAX_LEADS_PER_HOUR) {
      return NextResponse.json({ error: 'Trop de demandes, réessayez plus tard' }, { status: 429 })
    }

    await query(`
      INSERT INTO pro_leads (offer, organisation, nom, email, phone, message, ip_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [offer, organisation, nom, email, phone, message, ipHash])

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (isMissingTableError(err)) {
      return NextResponse.json({ error: 'Fonctionnalité pas encore activée (migration 13 manquante)' }, { status: 503 })
    }
    console.error('Pro lead API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
