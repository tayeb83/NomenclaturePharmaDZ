import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EnteteGraphe } from '@/components/graphe/EnteteGraphe'
import { DemoGraphe } from '@/components/graphe/DemoGraphe'
import { PLAFOND_DEMO } from '@/lib/graphe/core'
import { construire } from '@/lib/graphe/data'
import { trouverDemo } from '@/lib/graphe/demos'

// Les démos sont les mêmes pour tout le monde : une requête par jour suffit. Pas de pré-génération au build :
// une base injoignable à ce moment-là figerait la page « sans données » pour 24 h.
export const revalidate = 86400
export const dynamicParams = true

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const f = trouverDemo(params.id)
  if (!f) return {}
  return {
    title: `${f.demo.titre.fr} — graphe de connaissances`,
    description: f.demo.question.fr,
    alternates: { canonical: `${APP_URL}/graphe/demo/${f.demo.id}` },
  }
}

export default async function DemoPage({ params }: { params: { id: string } }) {
  const f = trouverDemo(params.id)
  if (!f) notFound()
  // Base indisponible au moment de la génération : la page s'affiche avec son message « pas de données ».
  const graph = await construire(f.demo.params, PLAFOND_DEMO).catch(() => null)
  const couches = f.demo.params.vue === 'substance' ? f.demo.params.couches : ['atc', 'labos', 'pays', 'interactions', 'retraits'] as const
  return (
    <>
      <EnteteGraphe titre={f.demo.titre} />
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1000 }}>
          <DemoGraphe cas={f.cas} demo={f.demo} graph={graph} couches={[...couches]} />
        </div>
      </div>
    </>
  )
}
