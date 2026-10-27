import { NextRequest, NextResponse } from 'next/server'
import { getCachedMedicamentById } from '@/lib/medicament-cache'
import { getInteractionsAnsm } from '@/lib/interactions'
import { getPpa } from '@/lib/ppa'
import { buildMedicamentShareImage } from '@/lib/medicament-share-image'

// Visuel d'aperçu d'une fiche (Facebook, X, WhatsApp…) :
//   /partage/medicament/enregistrement/1943            (français)
//   /partage/medicament/enregistrement/1943?lang=ar    (arabe)
// Hors /api exprès : le middleware n'admet les robots d'aperçu que sur les pages.

export const revalidate = 86_400

const SOURCES = new Set(['enregistrement', 'retrait', 'non_renouvele'])

export async function GET(request: NextRequest, { params }: { params: { source: string; id: string } }) {
  const id = Number(params.id)
  if (!SOURCES.has(params.source) || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 })
  }
  const lang = request.nextUrl.searchParams.get('lang') === 'ar' ? 'ar' : 'fr'
  try {
    const med = await getCachedMedicamentById(params.source, id)
    if (!med) return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 })
    const [ppa, inter] = await Promise.all([
      getPpa(med.n_enreg, med.code).catch(() => null),
      med.source === 'retrait' ? Promise.resolve(null) : getInteractionsAnsm(med.dci, lang).catch(() => null),
    ])
    const items = inter?.items ?? []
    return await buildMedicamentShareImage(med, {
      ppa,
      interactions: items.length,
      contreIndications: items.filter(i => i.niveau === 'contre_indication').length,
    }, lang)
  } catch (err) {
    console.error('[partage] image impossible', err)
    return NextResponse.json({ error: 'Image indisponible' }, { status: 500 })
  }
}
