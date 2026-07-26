import { getStats, getLatestNouveautes, getLastRetraits, getLastVersionDate } from '@/lib/queries'
import { HomeClient } from './HomeClient'
import type { Metadata } from 'next'

export const revalidate = 3600
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Pharma DZ & Médicaments Algérie — DwaDZ',
  description:
    'Pharma DZ : trouvez un médicament en Algérie, suivez les alertes de retraits, et consultez la nomenclature pharmaceutique officielle.',
  keywords: [
    'pharma dz',
    'pharmacie algérie',
    'médicaments algérie',
    'médicament algérie',
    'nomenclature pharmaceutique algérie',
    'liste médicaments algérie',
  ],
  alternates: {
    canonical: APP_URL,
  },
  openGraph: {
    title: 'Pharma DZ & Médicaments Algérie — DwaDZ',
    description:
      'La plateforme Pharma DZ pour rechercher les médicaments en Algérie et suivre les mises à jour officielles.',
    url: APP_URL,
    type: 'website',
    locale: 'fr_DZ',
  },
}

export default async function HomePage() {
  const [stats, nouveautes, retraits, lastVersionDate] = await Promise.all([
    getStats(),
    getLatestNouveautes(3),
    getLastRetraits(3),
    getLastVersionDate(),
  ])

  return (
    <HomeClient
      stats={stats}
      nouveautes={nouveautes}
      retraits={retraits}
      lastVersionDate={lastVersionDate}
    />
  )
}
