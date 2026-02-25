import { NextRequest, NextResponse } from 'next/server'

// Ce endpoint est appelé automatiquement par Vercel Cron (voir vercel.json)
// Tous les lundis à 8h00 (heure d'Alger)
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
