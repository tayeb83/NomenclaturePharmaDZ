import { getRetraitsPaged, getRetraitsCount, getAllRetraitAnnees, getNonRenouveles, getMotifStats } from '@/lib/queries'
import { AlertesClient } from './AlertesClient'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'
const PAGE_SIZE = 30

export const metadata: Metadata = {
  title: 'Alertes & Retraits',
  description: 'Liste officielle des médicaments retirés du marché algérien et AMM non renouvelées — Source MIPH.',
  alternates: { canonical: `${APP_URL}/alertes` },
}
export const dynamic = 'force-dynamic'

export default async function AlertesPage({ searchParams }: { searchParams: { annee?: string; page?: string } }) {
  const anneeParsed = Number.parseInt(searchParams.annee || '', 10)
  const annee = Number.isFinite(anneeParsed) ? anneeParsed : null

  const pageParsed = Number.parseInt(searchParams.page || '1', 10)
  const page = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1

  const [retraits, total, annees, nonRenouveles, motifStatsRaw] = await Promise.all([
    getRetraitsPaged(annee, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getRetraitsCount(annee),
    getAllRetraitAnnees(),
    getNonRenouveles(50),
    getMotifStats(),
  ])
  const motifStats: [string, number][] = motifStatsRaw.map(r => [r.motif, parseInt(r.n)])

  return (
    <AlertesClient
      retraits={retraits}
      nonRenouveles={nonRenouveles}
      motifStats={motifStats}
      annee={annee}
      annees={annees}
      page={page}
      totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      total={total}
    />
  )
}
