import { NextRequest, NextResponse } from 'next/server'
import { addSubscriber, confirmSubscriber, unsubscribeByToken, getSubscriberByEmail } from '@/lib/queries'
import { addBrevoContact, sendConfirmationEmail } from '@/lib/social'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Anti-spam : limite l'envoi d'emails de confirmation (5 / heure / IP)
    const retryAfter = rateLimit(`newsletter:${getClientIp(request)}`, 5, 60 * 60 * 1000)
    if (retryAfter !== null) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const { email, nom } = await request.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    // Vérifier si l'email existe déjà
    const existing = await getSubscriberByEmail(email.toLowerCase().trim())

    if (existing?.confirmed) {
      // Déjà inscrit et confirmé
      return NextResponse.json(
        { error: 'already_confirmed', message: 'Cet email est déjà abonné à la newsletter.' },
        { status: 409 }
      )
    }

    const confirmToken = crypto.randomBytes(32).toString('hex')
    const unsubToken   = crypto.randomBytes(32).toString('hex')

    await addSubscriber(email.toLowerCase().trim(), nom || null, confirmToken, unsubToken)

    // Envoyer l'email de confirmation
    await sendConfirmationEmail(email, nom, confirmToken)

    // Ajouter à Brevo si configuré (contact non confirmé pour l'instant)
    if (process.env.BREVO_API_KEY) {
      await addBrevoContact(email, nom).catch(() => {}) // non bloquant
    }

    if (existing && !existing.confirmed) {
      // Email existant mais pas encore confirmé — renvoyer l'email
      return NextResponse.json({
        success: true,
        message: 'Un nouvel email de confirmation vous a été envoyé.',
        resent: true,
      })
    }

    return NextResponse.json({ success: true, message: 'Inscription enregistrée ! Vérifiez votre email pour confirmer.' })
  } catch (error) {
    console.error('[api/newsletter] Internal error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
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
