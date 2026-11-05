import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { query } from '@/lib/db'
import { getGrapheAcces } from '@/lib/graphe/access'
import { grapheSubstance } from '@/lib/graphe/data'
import { construirePdfSubstance } from '@/lib/graphe/pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** Fiche PDF d'une substance (abonnés) : /api/graphe/pdf?substance=AMIODARONE */
export async function GET(req: NextRequest) {
  const limited = rateLimit(`graphe-pdf:ip:${getClientIp(req)}`, 30, 10 * 60 * 1000)
  if (limited !== null) {
    return NextResponse.json({ error: 'rate' }, { status: 429, headers: { 'Retry-After': String(limited) } })
  }
  const { acces } = await getGrapheAcces()
  if (acces !== 'abonne') {
    return NextResponse.json({ error: acces === 'public' ? 'connexion' : 'abonnement' }, { status: acces === 'public' ? 401 : 403 })
  }
  const substance = (req.nextUrl.searchParams.get('substance') ?? '').slice(0, 120).trim()
  if (!substance) return NextResponse.json({ error: 'Indiquez une substance.' }, { status: 400 })

  try {
    // un nombre de nœuds plus généreux que l'écran : la fiche liste tout, le dessin reste lisible grâce au plafond de la mise en page
    const graph = await grapheSubstance(substance, 14)
    if (!graph) return NextResponse.json({ error: 'Substance introuvable.' }, { status: 404 })
    const v = await query<{ version_label: string }>('SELECT version_label FROM nomenclature_versions ORDER BY id DESC LIMIT 1').catch(() => [])
    const pdf = await construirePdfSubstance(graph, { version: v[0]?.version_label ?? null, date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) })
    const nom = substance.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'substance'
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dwadz-${nom}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[api/graphe/pdf]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
