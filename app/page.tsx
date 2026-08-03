import {
  getStats,
  getLatestNouveautes,
  getLastRetraits,
  getLastVersionDate,
  getPopularPages,
  getPopularSearches,
} from '@/lib/queries'
import { HomeClient } from './HomeClient'
import type { Metadata } from 'next'

export const revalidate = 3600
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

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
  const [stats, nouveautes, retraits, lastVersionDate, popularPages, popularSearches] = await Promise.all([
    getStats(),
    getLatestNouveautes(3),
    getLastRetraits(3),
    getLastVersionDate(),
    getPopularPages(10, 30),
    getPopularSearches(10, 30),
  ])

  // ItemList : le classement est aussi exposé aux moteurs, qui peuvent alors
  // suivre le maillage vers les fiches les plus demandées.
  const itemListJsonLd = popularPages.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Les pages les plus consultées sur DwaDZ',
    numberOfItems: popularPages.length,
    itemListElement: popularPages.map((page, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: page.label,
      url: `${APP_URL}${page.path}`,
    })),
  } : null

  return (
    <>
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <HomeClient
        stats={stats}
        nouveautes={nouveautes}
        retraits={retraits}
        lastVersionDate={lastVersionDate}
        popularPages={popularPages}
        popularSearches={popularSearches}
      />
    </>
  )
}
