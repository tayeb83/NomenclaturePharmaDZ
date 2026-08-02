import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query } from '@/lib/db'

// Boîte englobante large de l'Algérie — garde-fou contre une erreur de saisie/clic.
const DZ_BOUNDS = { latMin: 18, latMax: 38, lngMin: -9, lngMax: 12 }

// Les adresses DSP les plus longues tiennent largement là-dedans ; au-delà,
// c'est un copier-coller accidentel.
const ADDRESS_MAX_LENGTH = 300

const ADDRESS_FIELDS = ['address_fr', 'address_ar'] as const

/** Champ texte optionnel : chaîne vide = effacement (NULL), pas "vide". */
function normalizeAddress(value: unknown): { value: string | null } | { error: string } {
  if (value === null) return { value: null }
  if (typeof value !== 'string') return { error: 'Adresse invalide' }
  const trimmed = value.trim()
  if (trimmed.length > ADDRESS_MAX_LENGTH) {
    return { error: `Adresse trop longue (max ${ADDRESS_MAX_LENGTH} caractères)` }
  }
  return { value: trimmed === '' ? null : trimmed }
}

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
    const lat = Number(body.lat)
    const lng = Number(body.lng)

    if (
      !Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < DZ_BOUNDS.latMin || lat > DZ_BOUNDS.latMax ||
      lng < DZ_BOUNDS.lngMin || lng > DZ_BOUNDS.lngMax
    ) {
      return NextResponse.json({ error: 'Coordonnées invalides (hors Algérie)' }, { status: 400 })
    }

    values.push(lat, lng)
    updates.push(`lat = $${values.length - 1}`, `lng = $${values.length}`, `geocode_status = 'manual'`)
  }

  // ── Adresses (optionnelles) ───────────────────────────────
  // Corriger une adresse mal extraite (décalage de ligne à la lecture du
  // document DSP) sans toucher au repère déjà posé.
  for (const field of ADDRESS_FIELDS) {
    if (body[field] === undefined) continue
    const parsed = normalizeAddress(body[field])
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    values.push(parsed.value)
    updates.push(`${field} = $${values.length}`)
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 })
  }

  values.push(id)

  try {
    const rows = await query<{
      id: number
      address_fr: string | null
      address_ar: string | null
      lat: number | null
      lng: number | null
      geocode_status: string
    }>(
      `UPDATE garde_pharmacies
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, address_fr, address_ar, lat, lng, geocode_status`,
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
