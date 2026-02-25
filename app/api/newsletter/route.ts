import { NextRequest, NextResponse } from 'next/server'
import { addSubscriber, confirmSubscriber, unsubscribeByToken } from '@/lib/queries'
import { addBrevoContact } from '@/lib/social'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, nom } = await request.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }
    const confirmToken = crypto.randomBytes(32).toString('hex')
    const unsubToken   = crypto.randomBytes(32).toString('hex')

    await addSubscriber(email, nom || null, confirmToken, unsubToken)
    // Ajouter à Brevo si configuré
    if (process.env.BREVO_API_KEY) await addBrevoContact(email, nom)

    return NextResponse.json({ success: true, message: 'Inscription enregistrée !' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const token  = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

  if (action === 'confirm') {
    const row = await confirmSubscriber(token)
    if (!row) return NextResponse.json({ error: 'Token invalide' }, { status: 400 })
    return NextResponse.redirect(new URL('/newsletter?confirmed=true', request.url))
  }
  if (action === 'unsubscribe') {
    const row = await unsubscribeByToken(token)
    if (!row) return NextResponse.json({ error: 'Token invalide' }, { status: 400 })
    return NextResponse.redirect(new URL('/newsletter?unsubscribed=true', request.url))
  }
  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
