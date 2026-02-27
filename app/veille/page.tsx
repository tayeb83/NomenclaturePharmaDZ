import { getAllEnregistrements, getAvailableAnnees, getStatsByYear } from '@/lib/queries'
import { VeilleClient } from './VeilleClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Veille réglementaire' }
export const revalidate = 3600

export default async function VeillePage({ searchParams }: { searchParams: { annee?: string } }) {
  const anneesDisponibles = await getAvailableAnnees(8)
  const anneeDemandee = Number.parseInt(searchParams.annee || '', 10)
  const annee = Number.isFinite(anneeDemandee)
    ? anneeDemandee
    : (anneesDisponibles[0] ?? new Date().getFullYear())

  const [drugs, stats] = await Promise.all([getAllEnregistrements(annee, 50), getStatsByYear(annee)])

  return (
    <VeilleClient
      drugs={drugs}
      stats={stats}
      annee={annee}
      anneesDisponibles={anneesDisponibles}
    />
  )
}
