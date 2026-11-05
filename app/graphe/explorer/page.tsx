import type { Metadata } from 'next'
import { EnteteGraphe } from '@/components/graphe/EnteteGraphe'
import { Explorateur } from '@/components/graphe/Explorateur'
import { AccesExplorateur } from '@/components/graphe/AccesExplorateur'
import { getGrapheAcces } from '@/lib/graphe/access'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Explorateur de graphes',
  description: 'Explorateur complet des graphes de connaissances du médicament (abonnés).',
  robots: { index: false, follow: true },
}

export default async function ExplorateurPage() {
  const { acces } = await getGrapheAcces()
  return (
    <>
      <EnteteGraphe titre={{ fr: 'Explorateur de graphes', ar: 'مستكشف الرسوم' }} />
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1000 }}>
          {acces === 'abonne' ? <Explorateur /> : <AccesExplorateur connecte={acces === 'connecte'} />}
        </div>
      </div>
    </>
  )
}
