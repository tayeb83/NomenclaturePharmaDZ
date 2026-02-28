import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Ce endpoint est appelé automatiquement par Vercel Cron (voir vercel.json)
// Tous les lundis à 8h00 (heure d'Alger)
function isValidBearerToken(authorizationHeader: string | null, expectedToken: string | undefined): boolean {
  if (!authorizationHeader || !expectedToken) return false
  const expectedHeader = `Bearer ${expectedToken}`
  const providedBuffer = Buffer.from(authorizationHeader)
  const expectedBuffer = Buffer.from(expectedHeader)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')
  if (!isValidBearerToken(cronSecret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': process.env.API_SECRET_KEY || '',
      },
      body: JSON.stringify({ type: 'recap_hebdo' }),
    })

    const data = await res.json()
    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    console.error('[api/cron/weekly] Internal error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
