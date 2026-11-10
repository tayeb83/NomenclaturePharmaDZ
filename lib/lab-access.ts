/**
 * DwaDZ — Accès au Lab : réservé aux sessions admin (n'importe quel rôle) tant que les fonctions sont à l'essai.
 * Pages (`/lab`, `/lab/guide`, `/terminologies`) : 404 pour les autres visiteurs ; routes d'API : 404 JSON.
 * Un 404 plutôt qu'un 403 : rien n'indique aux autres visiteurs que ces pages existent.
 */

import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getAdminSession, isAdminSessionValid } from './admin-auth'

/** Vrai si la requête (page serveur) porte une session admin valide. */
export function labAccessible(): boolean {
  return isAdminSessionValid(cookies().get('admin_session')?.value)
}

/** À appeler en tête d'une page du Lab. */
export function exigerLab(): void {
  if (!labAccessible()) notFound()
}

/** À appeler en tête d'une route d'API du Lab : renvoie la réponse 404 à retourner, ou null si l'accès est permis. */
export function refuserSiPasLab(req: NextRequest): NextResponse | null {
  if (getAdminSession(req)) return null
  return NextResponse.json({ error: 'Introuvable.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
}
