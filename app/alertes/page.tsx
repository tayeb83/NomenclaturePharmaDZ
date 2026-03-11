import { getRetraits, getNonRenouveles, getMotifStats } from '@/lib/queries'
import { AlertesClient } from './AlertesClient'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Alertes & Retraits',
  description: 'Liste officielle des médicaments retirés du marché algérien et AMM non renouvelées — Source MIPH.',
  alternates: { canonical: `${APP_URL}/alertes` },
}
export const dynamic = 'force-dynamic'

export default async function AlertesPage() {
  const [retraits, nonRenouveles, motifStatsRaw] = await Promise.all([getRetraits(100), getNonRenouveles(50), getMotifStats()])
  const motifStats: [string, number][] = motifStatsRaw.map(r => [r.motif, parseInt(r.n)])

  return (
    <AlertesClient
      retraits={retraits}
      nonRenouveles={nonRenouveles}
      motifStats={motifStats}
    />
  )
}
