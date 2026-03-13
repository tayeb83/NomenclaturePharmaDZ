import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const pagePath = String(body?.page_path || '').trim()
    const pageTitle = body?.page_title ? String(body.page_title).trim() : null
    const referrer = body?.referrer ? String(body.referrer).trim() : null

    if (!pagePath) {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { recordPageVisit } = await import('@/lib/queries')

    await recordPageVisit({
      page_path: pagePath,
      page_title: pageTitle,
      referrer,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
