import { NextRequest, NextResponse } from 'next/server'
import { allowedHostsFor, isSameOrigin } from './security.ts'

/** Refuse (403) tout POST dont l'origine n'est pas notre site. Renvoie null si OK. */
export function rejectForeignOrigin(req: NextRequest): NextResponse | null {
  const ok = isSameOrigin(req.headers, allowedHostsFor(req.headers.get('host'), process.env.NEXT_PUBLIC_APP_URL))
  return ok ? null : NextResponse.json({ error: 'origine' }, { status: 403 })
}

export function tooMany(retryAfter: number): NextResponse {
  return NextResponse.json({ error: 'rate' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
}

/** Attend au moins `ms` depuis `startedAt` : uniformise le temps de réponse (existe / n'existe pas). */
export async function padTo(startedAt: number, ms: number): Promise<void> {
  const left = ms - (Date.now() - startedAt)
  if (left > 0) await new Promise(r => setTimeout(r, left))
}
