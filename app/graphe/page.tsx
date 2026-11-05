import type { Metadata } from 'next'
import { EnteteGraphe } from '@/components/graphe/EnteteGraphe'
import { GrapheHub } from '@/components/graphe/GrapheHub'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const metadata: Metadata = {
  title: 'Graphes de connaissances du médicament en Algérie',
  description: 'Substance, classe ATC, laboratoires, pays d\'origine, interactions et retraits reliés en un graphe : démos gratuites et explorateur complet pour la nomenclature algérienne.',
  alternates: { canonical: `${APP_URL}/graphe` },
}

export default function GraphePage() {
  return (
    <>
      <EnteteGraphe retour={false} />
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1000 }}>
          <GrapheHub />
        </div>
      </div>
    </>
  )
}
