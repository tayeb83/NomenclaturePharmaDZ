import { getAllEnregistrements, getAvailableAnnees, getStatsByYear } from '@/lib/queries'
import { VeilleClient } from './VeilleClient'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const metadata: Metadata = {
  title: 'Veille réglementaire',
  description: 'Nouveaux médicaments enregistrés en Algérie — Suivi des mises à jour officielles de la nomenclature pharmaceutique MIPH.',
  alternates: { canonical: `${APP_URL}/veille` },
}
export const dynamic = 'force-dynamic'

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
