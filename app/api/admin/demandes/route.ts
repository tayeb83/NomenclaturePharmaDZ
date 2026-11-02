import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { analyserDemandes, importerDemandes, listPourAdmin, preparerPostDuJour } from '@/lib/demandes'

export const dynamic = 'force-dynamic'

const MAX_TEXTE = 200_000

/** GET — demandes actives et changements récents (commune et note privée incluses). */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    return NextResponse.json({ demandes: await listPourAdmin() })
  } catch (err: any) {
    console.error('[api/admin/demandes] GET error:', err)
    return NextResponse.json({ error: erreurBase(err) }, { status: 500 })
  }
}

/**
 * POST
 *   { action: 'analyser', texte }  → aperçu sans écriture (lignes, rejets, remarques)
 *   { action: 'importer', texte }  → enregistre ; fusionne avec les demandes actives identiques
 *   { action: 'post' }             → (re)génère le brouillon Facebook du jour
 */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const body = await request.json().catch(() => ({}))
    const texte = typeof body.texte === 'string' ? body.texte : ''
    if (texte.length > MAX_TEXTE) return NextResponse.json({ error: 'Texte trop long.' }, { status: 413 })

    if (body.action === 'analyser') {
      return NextResponse.json({ apercu: await analyserDemandes(texte) })
    }
    if (body.action === 'importer') {
      const res = await importerDemandes(texte)
      if (res.apercu.erreur) return NextResponse.json({ error: res.apercu.erreur }, { status: 400 })
      return NextResponse.json({ crees: res.crees, fusionnees: res.fusionnees, rejetees: res.apercu.rejetees })
    }
    if (body.action === 'post') {
      return NextResponse.json(await preparerPostDuJour())
    }
    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err: any) {
    console.error('[api/admin/demandes] POST error:', err)
    return NextResponse.json({ error: erreurBase(err) }, { status: 500 })
  }
}

/** Table absente (migration 35 pas encore appliquée) : message actionnable plutôt qu'une 500 muette. */
function erreurBase(err: any): string {
  return err?.code === '42P01'
    ? "La table demandes_medicaments n'existe pas : appliquez sql/35_demandes_medicaments.sql."
    : 'Erreur serveur'
}
