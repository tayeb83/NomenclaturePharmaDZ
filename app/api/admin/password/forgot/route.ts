import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { appBaseUrl, requestPasswordReset } from '@/lib/admin-accounts'

export async function POST(req: NextRequest) {
  const retryAfter = rateLimit(`admin-forgot:${getClientIp(req)}`, 5, 15 * 60 * 1000)
  if (retryAfter !== null) {
    return NextResponse.json({ error: 'Trop de demandes. Réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
  }
  try {
    const { email } = await req.json()
    if (typeof email === 'string' && email.includes('@')) await requestPasswordReset(email, appBaseUrl(req))
  } catch (err) {
    console.error('Admin forgot password error:', err)
  }
  // Même réponse dans tous les cas : on ne révèle pas si l'adresse a un compte.
  return NextResponse.json({ success: true })
}
