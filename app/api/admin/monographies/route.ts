import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { checkAdminAuth } from '@/lib/admin-auth'
import {
  MONOGRAPHIE_TAG,
  getMonographieAdmin,
  listDciWithMonographieState,
  upsertMonographie,
  type MonographieInput,
} from '@/lib/monographies'

const isLang = (v: unknown): v is 'fr' | 'ar' => v === 'fr' || v === 'ar'

/** Sans paramètre : liste des DCI et état des monographies. Avec ?dci=&lang= : une monographie. */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const dci = searchParams.get('dci')
    if (dci) {
      const lang = searchParams.get('lang')
      if (!isLang(lang)) return NextResponse.json({ error: 'Langue invalide' }, { status: 400 })
      return NextResponse.json({ monographie: await getMonographieAdmin(dci, lang) })
    }
    return NextResponse.json(await listDciWithMonographieState())
  } catch (err) {
    console.error('Admin monographies GET error:', err)
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
  const dci = typeof body?.dci === 'string' ? body.dci.trim() : ''
  if (!dci || !isLang(body?.lang) || !['brouillon', 'publie'].includes(body?.status)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }
  const input = body as MonographieInput
  // Publier sans relecteur ni source reviendrait à afficher un texte médical
  // non attribué : on refuse côté serveur, pas seulement dans le formulaire.
  if (input.status === 'publie' && (!input.sources?.trim() || !input.reviewed_by?.trim())) {
    return NextResponse.json({ error: 'Publication impossible sans source ni relecteur.' }, { status: 400 })
  }
  try {
    await upsertMonographie(dci, body.lang, input)
    revalidateTag(MONOGRAPHIE_TAG)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err?.code === '42P01') {
      return NextResponse.json({ error: 'Table absente : appliquez sql/18_dci_monographies.sql' }, { status: 500 })
    }
    console.error('Admin monographies PUT error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
