import { NextRequest, NextResponse } from 'next/server'
import { appUrl, trainingSecret } from '@/lib/training'
import { fetchProfile, readFacebookConfig } from '@/lib/training/facebook.ts'
import { safeEqual, signPayload, verifyPayload } from '@/lib/training/security.ts'

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'tr_fb_state'
const FB_PROFILE_COOKIE = 'tr_fb_profile'

/**
 * Retour de Facebook. Récupère identifiant + e-mail, les place dans un cookie
 * signé de 10 minutes, puis envoie l'utilisateur choisir son profil
 * (/training/facebook). Aucune session n'est créée ici : Facebook ne fait
 * qu'initier une demande `pending`.
 */
export async function GET(req: NextRequest) {
  const base = appUrl()
  const back = (code: string) => {
    const res = NextResponse.redirect(`${base}/training?fb=${code}`, 302)
    res.cookies.set(STATE_COOKIE, '', { path: '/api/training/auth/facebook', maxAge: 0 })
    return res
  }

  const cfg = readFacebookConfig(process.env, base)
  const secret = trainingSecret()
  if (!cfg || !secret) return back('indisponible')

  const sp = new URL(req.url).searchParams
  if (sp.get('error')) return back('annule') // l'utilisateur a refusé

  const saved = verifyPayload<{ state: string }>(req.cookies.get(STATE_COOKIE)?.value, secret)
  const state = sp.get('state') ?? ''
  const code = sp.get('code') ?? ''
  if (!saved || !state || !safeEqual(saved.state, state) || !code || code.length > 2000) return back('etat')

  const result = await fetchProfile(cfg, code, fetch as any)
  if (!result.ok) return back(result.reason === 'email' ? 'email' : 'erreur')

  const res = NextResponse.redirect(`${base}/training/facebook`, 302)
  res.cookies.set(STATE_COOKIE, '', { path: '/api/training/auth/facebook', maxAge: 0 })
  res.cookies.set(FB_PROFILE_COOKIE, signPayload({ id: result.profile.id, email: result.profile.email }, secret, 10 * 60 * 1000), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
