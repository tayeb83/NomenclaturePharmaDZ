import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

const VALID_PLATFORMS = ['android', 'ios']

/**
 * POST /api/push/register
 * Body: { token: string, platform: 'android' | 'ios' }
 *
 * Appelé par l'app mobile DwaDZ (Capacitor) après enregistrement du token
 * natif auprès de Firebase. Upsert idempotent : un même token réenvoyé
 * (redémarrage de l'app) met juste à jour last_seen_at et le remet actif.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { token, platform } = body

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token requis' }, { status: 400 })
  }
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'platform invalide (android|ios)' }, { status: 400 })
  }

  try {
    await query(`
      INSERT INTO push_tokens (token, platform, active, last_seen_at)
      VALUES ($1, $2, TRUE, NOW())
      ON CONFLICT (token) DO UPDATE SET
        platform = EXCLUDED.platform,
        active = TRUE,
        last_seen_at = NOW()
    `, [token, platform])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[api/push/register] Internal error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
