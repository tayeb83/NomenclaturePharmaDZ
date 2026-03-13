import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const apiPath = String(body?.api_path || '').trim()
    const method = String(body?.method || '').trim().toUpperCase()
    const statusCode = Number.isFinite(Number(body?.status_code)) ? Number(body.status_code) : null

    if (!apiPath || !method) {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { recordApiExec } = await import('@/lib/queries')
    await recordApiExec({
      api_path: apiPath,
      method,
      status_code: statusCode,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
