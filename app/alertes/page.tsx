import { getRetraits, getNonRenouveles, getMotifStats } from '@/lib/queries'
import { AlertesClient } from './AlertesClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alertes & Retraits',
  description: 'Liste officielle des médicaments retirés du marché algérien et AMM non renouvelées — Source MIPH.',
}
export const revalidate = 3600

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
