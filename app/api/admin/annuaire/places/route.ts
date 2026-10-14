import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { getDirectoryPlaces, getPlaceOverrides, placesTableAvailable } from '@/lib/annuaire'
import { annuaireTitles } from '@/lib/annuaire-titles'
import { cleanShortText } from '@/lib/annuaire-admin'

/**
 * Titres de l'annuaire par zone. GET : toutes les zones avec le titre calculé
 * par défaut et la surcharge éventuelle. PUT : enregistre (ou efface) la
 * surcharge d'une wilaya (commune_code = '') ou d'une commune.
 */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const [places, overrides, available] = await Promise.all([getDirectoryPlaces(), getPlaceOverrides(), placesTableAvailable()])
    const key = (w: string, c: string) => `${w}|${c}`
    const ov = new Map(overrides.map(o => [key(o.wilaya_code, o.commune_code), o]))

    const rows: unknown[] = []
    const seenWilaya = new Set<string>()
    for (const p of places) {
      const base = { wilayaFr: p.wilaya_name_fr, wilayaAr: p.wilaya_name_ar }
      if (!seenWilaya.has(p.wilaya_code)) {
        seenWilaya.add(p.wilaya_code)
        const o = ov.get(key(p.wilaya_code, ''))
        rows.push({
          wilaya_code: p.wilaya_code, commune_code: '', label: p.wilaya_name_fr,
          default_h1_fr: annuaireTitles(base, 'fr').h1, default_h1_ar: annuaireTitles(base, 'ar').h1,
          phrase_fr: o?.phrase_fr ?? '', phrase_ar: o?.phrase_ar ?? '',
        })
      }
      const o = ov.get(key(p.wilaya_code, p.commune_code))
      const t = { ...base, communeFr: p.commune_name_fr, communeAr: p.commune_name_ar }
      rows.push({
        wilaya_code: p.wilaya_code, commune_code: p.commune_code, label: `${p.wilaya_name_fr} › ${p.commune_name_fr}`,
        default_h1_fr: annuaireTitles(t, 'fr').h1, default_h1_ar: annuaireTitles(t, 'ar').h1,
        phrase_fr: o?.phrase_fr ?? '', phrase_ar: o?.phrase_ar ?? '',
      })
    }
    return NextResponse.json({ data: rows, table_available: available })
  } catch (err) {
    console.error('Admin annuaire places get error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(await placesTableAvailable())) {
    return NextResponse.json({ error: 'Table annuaire absente : appliquer sql/17_annuaire.sql' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const wilaya = typeof body?.wilaya_code === 'string' ? body.wilaya_code.trim() : ''
  const commune = typeof body?.commune_code === 'string' ? body.commune_code.trim() : ''
  if (!wilaya) return NextResponse.json({ error: 'Wilaya obligatoire' }, { status: 400 })

  const fr = cleanShortText(body.phrase_fr, 'titre FR', 120)
  if ('error' in fr) return NextResponse.json({ error: fr.error }, { status: 400 })
  const ar = cleanShortText(body.phrase_ar, 'titre AR', 120)
  if ('error' in ar) return NextResponse.json({ error: ar.error }, { status: 400 })

  try {
    if (!fr.value && !ar.value) {
      await query(`DELETE FROM annuaire_places WHERE wilaya_code = $1 AND commune_code = $2`, [wilaya, commune])
    } else {
      await query(`
        INSERT INTO annuaire_places (wilaya_code, commune_code, phrase_fr, phrase_ar, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (wilaya_code, commune_code) DO UPDATE SET
          phrase_fr = EXCLUDED.phrase_fr, phrase_ar = EXCLUDED.phrase_ar, updated_at = NOW()
      `, [wilaya, commune, fr.value, ar.value])
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin annuaire places save error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
