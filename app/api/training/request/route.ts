import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { getTraining } from '@/lib/training'
import { allowedHostsFor, isSameOrigin } from '@/lib/training/security.ts'
import { parseSignup } from '@/lib/training/validation.ts'

export const dynamic = 'force-dynamic'

const HOUR = 60 * 60 * 1000

/**
 * Demande d'accès à Training. La réponse est identique que l'adresse soit
 * nouvelle, déjà en attente, validée ou refusée : on ne révèle rien sur les
 * comptes existants.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req.headers, allowedHostsFor(req.headers.get('host'), process.env.NEXT_PUBLIC_APP_URL))) {
    return NextResponse.json({ error: 'origine' }, { status: 403 })
  }

  const ipLimit = rateLimit(`training-req:ip:${getClientIp(req)}`, 6, HOUR)
  if (ipLimit !== null) {
    return NextResponse.json({ error: 'rate' }, { status: 429, headers: { 'Retry-After': String(ipLimit) } })
  }

  if (Number(req.headers.get('content-length') ?? '0') > 4096) {
    return NextResponse.json({ error: 'taille' }, { status: 413 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'email' }, { status: 400 })
  }

  // Champ piège invisible pour les humains : un robot qui le remplit reçoit un faux succès.
  if (typeof (body as any)?.website === 'string' && (body as any).website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const parsed = parseSignup(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const emailLimit = rateLimit(`training-req:email:${parsed.value.email}`, 3, HOUR)
  if (emailLimit !== null) {
    return NextResponse.json({ error: 'rate' }, { status: 429, headers: { 'Retry-After': String(emailLimit) } })
  }

  try {
    await getTraining().submitRequest(parsed.value)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as { code?: string })?.code === '42P01') {
      console.error('[api/training/request] tables absentes : appliquer sql/23_training.sql')
      return NextResponse.json({ error: 'indisponible' }, { status: 503 })
    }
    console.error('[api/training/request]', (err as Error).message)
    return NextResponse.json({ error: 'serveur' }, { status: 500 })
  }
}
