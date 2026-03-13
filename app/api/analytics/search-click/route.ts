import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const searchQuery = String(body?.search_query || '').trim()
    const scope = String(body?.scope || 'all').trim() || 'all'
    const resultSource = String(body?.result_source || '').trim()
    const resultId = Number(body?.result_id)
    const resultName = String(body?.result_name || '').trim()
    const resultDci = String(body?.result_dci || '').trim()
    const resultLabo = body?.result_labo ? String(body.result_labo).trim() : null

    if (!searchQuery || !resultSource || !Number.isFinite(resultId) || !resultName || !resultDci) {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    if (!['enregistrement', 'retrait', 'non_renouvele'].includes(resultSource)) {
      return NextResponse.json({ error: 'Source invalide' }, { status: 400 })
    }

    const { recordSearchClick } = await import('@/lib/queries')

    await recordSearchClick({
      search_query: searchQuery,
      scope,
      result_source: resultSource as 'enregistrement' | 'retrait' | 'non_renouvele',
      result_id: Math.trunc(resultId),
      result_name: resultName,
      result_dci: resultDci,
      result_labo: resultLabo,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
