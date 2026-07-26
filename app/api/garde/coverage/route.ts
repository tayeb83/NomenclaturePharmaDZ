import { NextResponse } from 'next/server'
import { getGardeCoverage } from '@/lib/garde'

// GET() sans paramètre `request` : sans cette directive, Next.js évalue la
// route une seule fois au build et sert la réponse statique jusqu'au
// prochain déploiement — les wilayas importées après coup n'apparaissent
// alors jamais dans le sélecteur, malgré le Cache-Control ci-dessous.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await getGardeCoverage()
    return NextResponse.json({ data: rows }, {
      // Court : la liste des wilayas couvertes évolue au fil des imports,
      // contrairement à la nomenclature qui ne change qu'une fois par mois.
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  } catch (err: any) {
    console.error('Garde coverage API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
