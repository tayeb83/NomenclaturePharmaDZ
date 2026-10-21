/**
 * Authentification Training côté serveur Next (cookies, redirections).
 * Un utilisateur n'est « connecté » que si sa session existe, n'a pas expiré
 * ET que son compte est toujours `approved` : refuser ou remettre en attente
 * coupe l'accès immédiatement.
 */
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { getTraining } from './index'
import { sessionCookieName, sessionCookieOptions } from './security.ts'
import type { TrainingUserRow } from './service.ts'

const isProd = () => process.env.NODE_ENV === 'production'

export const SESSION_COOKIE = () => sessionCookieName(isProd())

/** Utilisateur connecté d'un composant serveur / d'une page, ou null. */
export async function getTrainingUser(): Promise<TrainingUserRow | null> {
  const token = (await cookies()).get(SESSION_COOKIE())?.value
  return getTraining().getSessionUser(token)
}

/** Pour une page protégée : redirige vers la connexion si non connecté. */
export async function requireTrainingUserPage(): Promise<TrainingUserRow> {
  const user = await getTrainingUser()
  if (!user) redirect('/training/connexion')
  return user
}

/** Pour une route API protégée : renvoie l'utilisateur ou une réponse 401 à retourner telle quelle. */
export async function requireTrainingUserApi(
  req: NextRequest,
): Promise<{ user: TrainingUserRow } | { response: NextResponse }> {
  const user = await getTraining().getSessionUser(req.cookies.get(SESSION_COOKIE())?.value)
  if (!user) return { response: NextResponse.json({ error: 'Non connecté' }, { status: 401 }) }
  return { user }
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE(), token, sessionCookieOptions(isProd()))
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE(), '', { ...sessionCookieOptions(isProd()), maxAge: 0 })
}
