import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { checkAdminAuth } from '@/lib/admin-auth'
import { PPA_TAG, listPpaAdmin, setPpa } from '@/lib/ppa'

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    return NextResponse.json(
      await listPpaAdmin(searchParams.get('q') ?? '', searchParams.get('missing') === '1')
    )
  } catch (err) {
    console.error('Admin ppa GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }
  const nEnreg = typeof body?.n_enreg === 'string' ? body.n_enreg.trim() : ''
  const code = typeof body?.code === 'string' ? body.code : ''
  if (!nEnreg) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

  // Vide = supprimer le prix ; virgule décimale acceptée (« 1 250,50 »).
  const raw = body.ppa === null || body.ppa === undefined ? '' : String(body.ppa).replace(/\s/g, '').replace(',', '.')
  let ppa: number | null = null
  if (raw !== '') {
    ppa = Number(raw)
    if (!Number.isFinite(ppa) || ppa < 0 || ppa >= 1e10) {
      return NextResponse.json({ error: 'Prix invalide' }, { status: 400 })
    }
  }
  try {
    await setPpa(nEnreg, code, ppa)
    revalidateTag(PPA_TAG)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err?.code === '42P01') {
      return NextResponse.json({ error: 'Table absente : appliquez sql/20_medicament_ppa.sql' }, { status: 500 })
    }
    console.error('Admin ppa PUT error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
