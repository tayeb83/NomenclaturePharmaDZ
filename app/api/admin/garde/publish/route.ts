import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { getGardeCoverage } from '@/lib/garde'
import {
  currentMonthInAlgiers,
  isGardeGranularity,
  isGardePeriod,
  nextFridayInAlgiers,
  publishGardeToFacebook,
  todayInAlgiers,
  type Locale,
} from '@/lib/garde-social'

// Publication manuelle des pharmacies de garde sur la Page Facebook,
// déclenchée depuis /admin/garde/publication. Même moteur que le cron
// (/api/cron/garde-daily) : idempotent, une légende déjà publiée n'est
// jamais repostée.

export const dynamic = 'force-dynamic'
// La publication enchaîne les cibles avec un délai entre chaque post.
export const maxDuration = 300

/** GET — couverture (wilayas/communes), dates cibles et publications récentes. */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const [coverage, recent] = await Promise.all([
      getGardeCoverage(),
      query<{ id: number; ref_id: number | null; content: string; status: string; published_at: string | null; error_msg: string | null; created_at: string }>(`
        SELECT id, ref_id, content, status, published_at, error_msg, created_at
        FROM social_posts
        WHERE type = 'garde' AND platform = 'facebook'
        ORDER BY id DESC
        LIMIT 20
      `),
    ])

    return NextResponse.json({
      coverage,
      dates: {
        today: todayInAlgiers(),
        friday: nextFridayInAlgiers(),
        month: currentMonthInAlgiers(),
      },
      recent: recent.map((r) => ({
        ...r,
        // La légende entière est inutile dans la liste : on garde l'en-tête.
        content: r.content.split('\n').slice(0, 2).join(' — '),
      })),
    })
  } catch (err: any) {
    console.error('[api/admin/garde/publish] GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function parseLocales(input: unknown): Locale[] | undefined {
  if (!Array.isArray(input)) return undefined
  const locales = input.filter((l): l is Locale => l === 'fr' || l === 'ar')
  return locales.length ? Array.from(new Set(locales)) : undefined
}

/**
 * POST — publie maintenant.
 * body: {
 *   period: 'day' | 'friday' | 'month',
 *   wilaya?: string, commune?: string,
 *   date?: 'YYYY-MM-DD', month?: 'YYYY-MM',
 *   locales?: ('fr'|'ar')[], granularity?: 'wilaya'|'commune', dryRun?: boolean
 * }
 * Sans wilaya, toutes les wilayas couvertes sont publiées (comme le cron).
 */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as any))
  const period = isGardePeriod(body.period) ? body.period : 'day'
  const granularity = isGardeGranularity(body.granularity) ? body.granularity : undefined

  if (body.date && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: 'Date invalide (format attendu : YYYY-MM-DD)' }, { status: 400 })
  }
  if (body.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month)) {
    return NextResponse.json({ error: 'Mois invalide (format attendu : YYYY-MM)' }, { status: 400 })
  }

  try {
    const result = await publishGardeToFacebook({
      period,
      granularity,
      date: typeof body.date === 'string' ? body.date : undefined,
      month: typeof body.month === 'string' ? body.month : undefined,
      wilaya: typeof body.wilaya === 'string' && body.wilaya ? body.wilaya : undefined,
      commune: typeof body.commune === 'string' && body.commune ? body.commune : undefined,
      locales: parseLocales(body.locales),
      dryRun: !!body.dryRun,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[api/admin/garde/publish] POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
