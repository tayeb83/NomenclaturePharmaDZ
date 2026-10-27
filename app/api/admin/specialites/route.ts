import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { checkAdminAuth } from '@/lib/admin-auth'
import {
  SPECIALITES_TAG, addItem, deleteSpecialite, isValidSlug, listSpecialitesAdmin, parseSpecialite,
  removeItem, searchAtc, searchDci, updateItem, upsertSpecialite,
} from '@/lib/specialites'

export const dynamic = 'force-dynamic'

const unauthorized = () => NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
const MIGRATION = 'Tables absentes : appliquez sql/28_specialites.sql'

function fail(err: any, ctx: string) {
  if (err?.code === '42P01') return NextResponse.json({ error: MIGRATION }, { status: 500 })
  console.error(`Admin specialites ${ctx} error:`, err)
  return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
}

/** GET : liste complète, ou aide à la saisie (?suggest=atc|dci&q=…). */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return unauthorized()
  try {
    const { searchParams } = new URL(request.url)
    const suggest = searchParams.get('suggest')
    const q = searchParams.get('q') ?? ''
    if (suggest === 'atc') return NextResponse.json({ results: await searchAtc(q) })
    if (suggest === 'dci') return NextResponse.json({ results: await searchDci(q) })
    return NextResponse.json(await listSpecialitesAdmin())
  } catch (err) {
    return fail(err, 'GET')
  }
}

/**
 * POST { action, … } :
 *  - save        : crée ou met à jour une spécialité
 *  - delete      : supprime une spécialité (et ses éléments)
 *  - add_item    : ajoute une classe ATC ou une substance
 *  - update_item : libellé arabe / ordre d'un élément
 *  - remove_item : retire un élément
 */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return unauthorized()
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }
  try {
    switch (body?.action) {
      case 'save': {
        const p = parseSpecialite(body)
        if (!p.ok) return NextResponse.json({ error: p.error }, { status: 400 })
        await upsertSpecialite(p.value)
        break
      }
      case 'delete': {
        const slug = typeof body.slug === 'string' ? body.slug : ''
        if (!isValidSlug(slug)) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
        await deleteSpecialite(slug)
        break
      }
      case 'add_item': {
        const kind = body.kind === 'dci' ? 'dci' : body.kind === 'atc' ? 'atc' : null
        const slug = typeof body.slug === 'string' ? body.slug : ''
        if (!kind || !isValidSlug(slug) || typeof body.valeur !== 'string') {
          return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
        }
        const r = await addItem(slug, kind, body.valeur, typeof body.libelle_ar === 'string' ? body.libelle_ar : null)
        if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
        break
      }
      case 'update_item': {
        const id = Number(body.id)
        if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
        await updateItem(id, typeof body.libelle_ar === 'string' ? body.libelle_ar : null, body.ordre === undefined ? undefined : Number(body.ordre))
        break
      }
      case 'remove_item': {
        const id = Number(body.id)
        if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
        await removeItem(id)
        break
      }
      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }
    revalidateTag(SPECIALITES_TAG)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return fail(err, 'POST')
  }
}
