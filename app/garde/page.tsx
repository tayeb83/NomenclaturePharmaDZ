import type { Metadata } from 'next'
import { queryOne } from '@/lib/db'
import type { GardeRosterMeta } from '@/lib/db-types'
import { GardeClient } from './GardeClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

type GardeSearchParams = { wilaya?: string; commune?: string; mode?: string; month?: string }

const VALID_MODES = new Set(['now', 'tonight', 'friday', 'month'])

async function getRosterMeta(wilaya: string, commune: string): Promise<GardeRosterMeta | null> {
  if (!wilaya || !commune) return null
  try {
    return await queryOne<GardeRosterMeta>(`
      SELECT wilaya_code, wilaya_name_fr, commune_code, commune_name_fr,
             period_from, period_to, review_status, issuer_fr, source_page
      FROM garde_rosters
      WHERE wilaya_code = $1 AND commune_code = $2
      ORDER BY imported_at DESC
      LIMIT 1
    `, [wilaya, commune])
  } catch {
    return null
  }
}

function formatMonthFr(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return ''
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, 1))
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
}

function buildCanonical(params: GardeSearchParams) {
  const qs = new URLSearchParams()
  if (params.wilaya) qs.set('wilaya', params.wilaya)
  if (params.commune) qs.set('commune', params.commune)
  if (params.mode && VALID_MODES.has(params.mode)) qs.set('mode', params.mode)
  if (params.mode === 'month' && params.month) qs.set('month', params.month)
  const query = qs.toString()
  return `${APP_URL}/garde${query ? `?${query}` : ''}`
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<GardeSearchParams>
}): Promise<Metadata> {
  const params = await searchParams
  const wilaya = params.wilaya || ''
  const commune = params.commune || ''
  const mode = VALID_MODES.has(params.mode || '') ? params.mode! : ''
  const canonical = buildCanonical(params)

  const meta = await getRosterMeta(wilaya, commune)

  if (meta) {
    const place = meta.commune_name_fr || meta.wilaya_name_fr
    const suffix = mode === 'month'
      ? ` — planning ${formatMonthFr(params.month || '')}`.trimEnd()
      : mode === 'friday'
        ? ' — vendredi prochain'
        : ' — aujourd\'hui'
    const title = `Pharmacies de garde à ${place}${suffix} | DwaDZ`
    const description = `Liste des pharmacies de garde à ${place} (wilaya de ${meta.wilaya_name_fr}) — source officielle ${meta.issuer_fr || 'DSP'}. Adresses, horaires et téléphones.`
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: 'website' },
    }
  }

  return {
    title: 'Pharmacies de garde en Algérie',
    description: 'Trouvez la pharmacie de garde ouverte maintenant, cette nuit ou vendredi près de chez vous — listes officielles des Directions de la Santé et de la Population (DSP), wilaya par wilaya.',
    keywords: [
      'pharmacie de garde algérie', 'pharmacie de garde', 'pharmacie ouverte maintenant algérie',
      'pharmacie de nuit algérie', 'garde pharmacie wilaya', 'DSP pharmacie de garde',
      'صيدلية الحراسة الجزائر',
    ],
    alternates: { canonical },
    openGraph: {
      title: 'Pharmacies de garde en Algérie | DwaDZ',
      description: 'Pharmacie ouverte maintenant, cette nuit ou vendredi, triée par distance — listes officielles DSP par wilaya et commune.',
      url: canonical,
      type: 'website',
    },
  }
}

export default async function GardePage({
  searchParams,
}: {
  searchParams: Promise<GardeSearchParams>
}) {
  const params = await searchParams
  const initialWilaya = params.wilaya || ''
  const initialCommune = params.commune || ''
  const initialMode = VALID_MODES.has(params.mode || '') ? (params.mode as 'now' | 'tonight' | 'friday' | 'month') : 'now'
  const initialMonth = params.month || ''

  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: 'var(--navy)' }}>
          🏥 Pharmacies de garde
        </h1>
        <p style={{ color: 'var(--slate-500)', fontSize: 16, maxWidth: 620, lineHeight: 1.6 }}>
          Trouvez la pharmacie de garde ouverte maintenant, cette nuit ou vendredi près de chez vous —
          listes officielles des Directions de la Santé et de la Population (DSP), wilaya par wilaya.
        </p>
      </div>

      <GardeClient
        initialWilaya={initialWilaya}
        initialCommune={initialCommune}
        initialMode={initialMode}
        initialMonth={initialMonth}
      />
    </div>
  )
}
