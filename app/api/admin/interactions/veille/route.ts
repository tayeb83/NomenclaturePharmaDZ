import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth, getAdminSession } from '@/lib/admin-auth'
import { decider, getCandidat, listCandidats, statsCandidats, validateDecision, VeilleError } from '@/lib/interactions-veille'

const noAuth = () => NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
function dbError(err: any) {
  if (err instanceof VeilleError) return NextResponse.json({ error: err.message }, { status: err.status })
  if (err?.code === '42P01') return NextResponse.json({ error: 'Tables absentes : appliquez sql/42_interactions_veille.sql', migration: true }, { status: 500 })
  if (err?.code === '23514') return NextResponse.json({ error: 'Refusé par la base : vérifiez le niveau, le motif et la source.' }, { status: 400 })
  if (err?.code === '23505') return NextResponse.json({ error: 'Cette paire existe déjà dans les interactions.' }, { status: 409 })
  return null
}

/**
 * Candidats à relire (sql/42).
 *   GET ?id=                      un candidat, avec ses preuves et ce que l'ANSM dit déjà de la paire
 *   GET ?statut=&ecart=&q=&page=  liste paginée (statut : a_relire par défaut, tous, nouveau, en_revue, differe, accepte, rejete)
 */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  const sp = new URL(request.url).searchParams
  try {
    const id = Number(sp.get('id'))
    if (id) {
      const data = await getCandidat(id)
      if (!data) return NextResponse.json({ error: 'Candidat introuvable' }, { status: 404 })
      return NextResponse.json(data)
    }
    const page = Math.max(1, Number(sp.get('page')) || 1)
    const limit = 50
    const [liste, stats] = await Promise.all([
      listCandidats({ statut: sp.get('statut') ?? '', ecart: sp.get('ecart') ?? '', q: sp.get('q') ?? '', limit, offset: (page - 1) * limit }),
      statsCandidats(),
    ])
    return NextResponse.json({ ...liste, stats, page, pages: Math.max(1, Math.ceil(liste.total / limit)), reviewer: getAdminSession(request)?.name ?? '' })
  } catch (err: any) {
    const r = dbError(err); if (r) return r
    console.error('Admin interactions veille GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** Décision d'un relecteur : en_revue, differe, rejete (motif), accepte (niveau, risque), rouvrir. */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }) }
  const v = validateDecision(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  try {
    const session = getAdminSession(request)
    return NextResponse.json({ ok: true, ...(await decider(v.value, session?.name || session?.email || '')) })
  } catch (err: any) {
    const r = dbError(err); if (r) return r
    console.error('Admin interactions veille POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
