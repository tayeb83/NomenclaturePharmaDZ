import { getRetraitsPaged, getRetraitsCount, getAllRetraitAnnees, getNonRenouveles, getNonRenouvelesCount, getMotifStats } from '@/lib/queries'
import { AlertesClient } from './AlertesClient'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'
const PAGE_SIZE = 30

export const metadata: Metadata = {
  title: 'Alertes & Retraits',
  description: 'Liste officielle des médicaments retirés du marché algérien et AMM non renouvelées — Source MIPH.',
  alternates: { canonical: `${APP_URL}/alertes` },
}
export const dynamic = 'force-dynamic'

function parsePage(v?: string) {
  const n = Number.parseInt(v || '1', 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

export default async function AlertesPage({ searchParams }: { searchParams: { annee?: string; page?: string; npage?: string; q?: string } }) {
  const anneeParsed = Number.parseInt(searchParams.annee || '', 10)
  const annee = Number.isFinite(anneeParsed) ? anneeParsed : null
  const q = (searchParams.q || '').trim().slice(0, 100)
  const page = parsePage(searchParams.page)
  const npage = parsePage(searchParams.npage)

  const [retraits, total, annees, nonRenouveles, totalNonRenouveles, motifStatsRaw] = await Promise.all([
    getRetraitsPaged(annee, PAGE_SIZE, (page - 1) * PAGE_SIZE, q),
    getRetraitsCount(annee, q),
    getAllRetraitAnnees(),
    getNonRenouveles(PAGE_SIZE, (npage - 1) * PAGE_SIZE, q),
    getNonRenouvelesCount(q),
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
      q={q}
      page={page}
      totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      total={total}
      npage={npage}
      nTotalPages={Math.max(1, Math.ceil(totalNonRenouveles / PAGE_SIZE))}
      nTotal={totalNonRenouveles}
    />
  )
}
