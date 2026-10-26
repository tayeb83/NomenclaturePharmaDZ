import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { checkAdminAuth } from '@/lib/admin-auth'
import { RCP_TAG } from '@/lib/rcp'
import {
  AdminError, getReglagesAdmin, isUuid, listDocuments, listFaits, publishDrafts, setDocumentFlags,
  setLaboratoireFlags, setReglage, tablesState, updateFait,
} from '@/lib/rcp-admin'

const unauthorized = () => NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

/** Sans paramètre : interrupteurs et liste des RCP. Avec ?rcp=<uuid> : les faits d'un RCP. */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return unauthorized()
  try {
    const tables = await tablesState()
    if (!tables.liens) return NextResponse.json({ tables, reglages: null, documents: [] })
    const rcp = new URL(request.url).searchParams.get('rcp')
    if (rcp) {
      if (!isUuid(rcp)) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
      return NextResponse.json({ faits: tables.faits ? await listFaits(rcp) : [] })
    }
    return NextResponse.json({
      tables,
      reglages: tables.faits ? await getReglagesAdmin() : { liens: true, faits: false },
      documents: await listDocuments(tables.faits),
    })
  } catch (err) {
    console.error('Admin RCP GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Actions (corps JSON { action, … }) : reglage, fait, publier_brouillons,
 * document, laboratoire, actualiser. Chaque écriture vide le cache des fiches.
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
    let result: Record<string, unknown> = {}
    switch (body?.action) {
      case 'reglage':
        if (!['liens', 'faits'].includes(body.cle) || typeof body.actif !== 'boolean') throw new AdminError('Paramètres invalides.')
        await setReglage(body.cle, body.actif)
        break
      case 'fait':
        if (!Number.isInteger(body.id)) throw new AdminError('Identifiant invalide.')
        await updateFait(body.id, { libelle: body.libelle, status: body.status, reviewed_by: body.reviewed_by })
        break
      case 'publier_brouillons':
        if (!isUuid(body.rcp)) throw new AdminError('Identifiant invalide.')
        result = { publies: await publishDrafts(body.rcp, body.reviewed_by) }
        break
      case 'document':
        if (!isUuid(body.rcp)) throw new AdminError('Identifiant invalide.')
        result = { documents: await setDocumentFlags(body.rcp, { retire: body.retire, faits_masques: body.faits_masques }) }
        break
      case 'laboratoire':
        if (typeof body.labo !== 'string') throw new AdminError('Laboratoire manquant.')
        result = { documents: await setLaboratoireFlags(body.labo, { retire: body.retire, faits_masques: body.faits_masques }) }
        break
      case 'actualiser':
        break // après un import en ligne de commande : vide le cache des fiches
      default:
        throw new AdminError('Action inconnue.')
    }
    revalidateTag(RCP_TAG)
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    if (err instanceof AdminError) return NextResponse.json({ error: err.message }, { status: 400 })
    if (err?.code === '42P01' || err?.code === '42703') {
      return NextResponse.json({ error: 'Tables absentes : appliquez sql/26_rcp_anpp.sql et sql/27_rcp_faits.sql' }, { status: 500 })
    }
    if (err?.code === '23514') return NextResponse.json({ error: 'Refusé par la base (publication sans relecteur ?).' }, { status: 400 })
    console.error('Admin RCP POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
