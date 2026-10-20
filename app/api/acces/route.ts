import { NextRequest, NextResponse } from 'next/server'
import { cleanText, hashClientIp } from '@/lib/garde-feedback'
import { ALGERIA_WILAYAS } from '@/lib/wilayas'
import {
  MAX_SIGNALS_PER_HOUR, PHARMACY_BUCKETS, SIGNAL_TYPES, countRecentSignals,
  insertSignal, isDuplicateSignal, isMissingTable,
  type PharmacyBucket, type SignalType,
} from '@/lib/acces'

const WILAYA_CODES = new Set(ALGERIA_WILAYAS.map(w => w.code))
const SOURCES = new Set(['enregistrement', 'retrait', 'non_renouvele'])

/** Signalement anonyme d'accès à un médicament (NAQESS). */
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const medSource = cleanText(body?.med_source, 30)
  const medId = Number(body?.med_id)
  const medName = cleanText(body?.med_name, 300)
  const dci = cleanText(body?.dci, 300)
  const wilaya = cleanText(body?.wilaya_code, 4)
  const type = cleanText(body?.signal_type, 20) as SignalType | null
  const pharmacies = cleanText(body?.pharmacies, 4) as PharmacyBucket | null

  if (
    !medSource || !SOURCES.has(medSource) || !Number.isInteger(medId) || medId <= 0 || !medName ||
    !wilaya || !WILAYA_CODES.has(wilaya) ||
    !type || !SIGNAL_TYPES.includes(type) ||
    !pharmacies || !PHARMACY_BUCKETS.includes(pharmacies)
  ) {
    return NextResponse.json({ error: 'Paramètres manquants ou invalides' }, { status: 400 })
  }

  const ipHash = hashClientIp(request)
  try {
    if (await countRecentSignals(ipHash, 60) >= MAX_SIGNALS_PER_HOUR) {
      return NextResponse.json({ error: 'Trop de signalements, réessayez plus tard' }, { status: 429 })
    }
    // Même client, même médicament, même wilaya, même type sur 24 h : on
    // répond OK sans recompter, pour ne pas gonfler les tendances.
    if (await isDuplicateSignal(ipHash, medSource, medId, wilaya, type)) {
      return NextResponse.json({ ok: true, duplicate: true })
    }
    await insertSignal({ medSource, medId, medName, dci, wilaya, type, pharmacies, ipHash })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (isMissingTable(err)) {
      return NextResponse.json({ error: 'Fonctionnalité pas encore activée (migration 21 manquante)' }, { status: 503 })
    }
    console.error('Acces signalement API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
