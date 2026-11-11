import { NextRequest, NextResponse } from 'next/server'
import { rechercheAvecFacettes } from '@/lib/recherche-facettes'
import { facettesDepuisParams } from '@/lib/facettes'
import { allergieDepuisParams } from '@/lib/allergies-params'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const scope = searchParams.get('scope') || 'all'
  const labo = searchParams.get('labo') || ''
  const substance = searchParams.get('substance') || ''
  const activeOnly = searchParams.get('activeOnly') === '1'
  const dciMode = searchParams.get('mode') === 'dci'
  const advancedRaw = searchParams.get('advanced') || '[]'
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 80) // la liste d'une DCI est élargie côté requête
  // Facettes : ?voie=…&forme=…&dosage=…&origine=f|i (identifiants renvoyés dans `facettes`)
  const choixFacettes = facettesDepuisParams(n => searchParams.get(n))
  // Allergie connue : ?allergie=0060520&allergie_mode=signaler|masquer (code HDO d'une allergie rattachée à une substance)
  const allergie = allergieDepuisParams(n => searchParams.get(n))

  let advanced: Array<{ field: string; operator: string; value: string; bool?: 'AND' | 'OR' }> = []
  try {
    const parsed = JSON.parse(advancedRaw)
    if (Array.isArray(parsed)) advanced = parsed
  } catch {
    advanced = []
  }

  const hasAdvancedFilters = advanced.some((condition) => condition?.value?.trim())
  if (!q.trim() && !labo.trim() && !substance.trim() && !hasAdvancedFilters) {
    return NextResponse.json({ results: [], count: 0 })
  }

  try {
    const { results, fuzzy, matchedTerm, synonymTerm, total, tronque, facettes, selection, ignores, allergie: bilanAllergie } =
      await rechercheAvecFacettes(q, scope, limit, { labo, substance, activeOnly, advanced, dciMode }, choixFacettes, allergie)
    return NextResponse.json({
      results,
      count: results.length,
      query: q,
      scope,
      fuzzy,
      matchedTerm,
      synonymTerm,
      /** lignes qui respectent les facettes choisies, avant troncature à `limit` */
      total,
      /** le lot analysé est plein : les compteurs de facettes ne couvrent que les premiers résultats */
      tronque,
      facettes,
      selection,
      ignores,
      /** filtre « allergie connue » : code, mode, présentations signalées ou masquées dans le lot analysé */
      allergie: bilanAllergie,
      filters: { labo, substance, activeOnly, advanced },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    })
  } catch (err: any) {
    console.error('Search error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
