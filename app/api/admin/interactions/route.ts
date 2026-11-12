import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { checkAdminAuth } from '@/lib/admin-auth'
import { INTERACTIONS_TAG, viderCachesInteractions } from '@/lib/interactions'
import {
  getInteractionAdmin, listInteractionsAdmin, removeInteraction, saveInteraction, statsInteractionsAdmin,
  suggererSubstances, validateInteraction,
} from '@/lib/interactions-admin'

const noAuth = () => NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
function dbError(err: any) {
  if (err?.code === '42P01') return NextResponse.json({ error: 'Table absente : appliquez sql/29_interactions_ansm.sql puis sql/40_interactions_admin.sql', migration: true }, { status: 500 })
  if (err?.code === '42703') return NextResponse.json({ error: 'Colonnes absentes : appliquez sql/40_interactions_admin.sql', migration: true }, { status: 500 })
  if (err?.code === 'NOT_FOUND') return NextResponse.json({ error: 'Interaction introuvable' }, { status: 404 })
  if (err?.code === '23505') return NextResponse.json({ error: 'Cette paire (substance + partenaire) existe déjà : modifiez la ligne existante.' }, { status: 409 })
  if (err?.code === '23514') return NextResponse.json({ error: 'Refusé par la base : vérifiez le niveau, la source et son adresse.' }, { status: 400 })
  return null
}

/**
 * Admin des interactions.
 *   GET ?id=            une interaction
 *   GET ?suggest=texte  substances et classes déjà connues (aide à la saisie)
 *   GET ?q=&niveau=&origine=&page=   liste paginée + totaux
 */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  const sp = new URL(request.url).searchParams
  try {
    const id = Number(sp.get('id'))
    if (id) return NextResponse.json({ interaction: await getInteractionAdmin(id) })
    const suggest = sp.get('suggest')
    if (suggest !== null) return NextResponse.json({ suggestions: await suggererSubstances(suggest) })
    const page = Math.max(1, Number(sp.get('page')) || 1)
    const limit = 50
    const [liste, stats] = await Promise.all([
      listInteractionsAdmin({
        q: sp.get('q') ?? '', niveau: sp.get('niveau') ?? '', origine: sp.get('origine') ?? '', limit, offset: (page - 1) * limit,
      }),
      statsInteractionsAdmin(),
    ])
    return NextResponse.json({ ...liste, stats, page, pages: Math.max(1, Math.ceil(liste.total / limit)) })
  } catch (err: any) {
    const r = dbError(err); if (r) return r
    console.error('Admin interactions GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** Crée (sans id) ou modifie (avec id) une interaction ; `inverse: true` crée aussi la ligne partenaire + substance. */
export async function PUT(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }) }
  const v = validateInteraction(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  try {
    return NextResponse.json({ ok: true, ...(await saveInteraction(v.value)) })
  } catch (err: any) {
    const r = dbError(err); if (r) return r
    console.error('Admin interactions PUT error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  try {
    await removeInteraction(id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    const r = dbError(err); if (r) return r
    console.error('Admin interactions DELETE error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Après un import en ligne de commande (scripts/import_ansm_*.py) : vide le cache des fiches, sans attendre les 24 h.
 * Session admin requise : POST /api/admin/interactions
 */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  revalidateTag(INTERACTIONS_TAG)
  viderCachesInteractions()
  return NextResponse.json({ ok: true })
}
