import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { getTraining } from '@/lib/training'
import { padTo, rejectForeignOrigin, tooMany } from '@/lib/training/guard'
import { normalizeEmail } from '@/lib/training/validation.ts'

export const dynamic = 'force-dynamic'

const HOUR = 60 * 60 * 1000

/**
 * « Recevoir un nouveau lien ». Réponse strictement identique (même corps,
 * même statut, durée alignée) que l'adresse existe, soit validée, en attente,
 * refusée ou inconnue : rien ne permet de sonder la liste des comptes.
 */
export async function POST(req: NextRequest) {
  const foreign = rejectForeignOrigin(req)
  if (foreign) return foreign

  const startedAt = Date.now()
  const ipLimit = rateLimit(`training-login:ip:${getClientIp(req)}`, 8, HOUR)
  if (ipLimit !== null) return tooMany(ipLimit)

  const body = await req.json().catch(() => null)
  const email = normalizeEmail(body?.email)
  // Une saisie invalide reçoit la même réponse neutre : pas d'indice sur la validité côté serveur.
  if (email) {
    const emailLimit = rateLimit(`training-login:email:${email}`, 3, HOUR)
    if (emailLimit !== null) return tooMany(emailLimit)
    // Le temps d'envoi d'un e-mail trahirait l'existence du compte : on borne
    // l'attente à 1,9 s puis on aligne toutes les réponses sur 2 s. Un envoi
    // plus lent que cela peut être interrompu sur une plateforme serverless :
    // l'utilisateur redemande un lien, c'est le prix de l'absence de fuite.
    const work = getTraining()
      .requestLoginLink(email)
      .catch(err => {
        // Journal sans adresse ni jeton ; la réponse reste neutre.
        console.error('[api/training/auth/login]', (err as Error).message)
      })
    await Promise.race([work, new Promise(r => setTimeout(r, 1900))])
  }
  await padTo(startedAt, 2000)
  return NextResponse.json({ ok: true })
}
