import type { Metadata } from 'next'
import Link from 'next/link'
import { getTrainingUser } from '@/lib/training/auth'
import { AccesComparateur } from '@/components/comparateur-medicaments/AccesComparateur'
import { ComparateurMedicaments } from '@/components/comparateur-medicaments/ComparateurMedicaments'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Comparateur de deux médicaments',
  description: 'Outil à accès limité : comparez deux médicaments de la nomenclature algérienne et consultez leurs interactions selon le Thesaurus ANSM.',
  // page derrière un compte : rien à indexer
  robots: { index: false, follow: true },
}

export default async function ComparateurMedicamentsPage() {
  // Une base sans les tables Training (sql/23) ne doit pas faire tomber la page : on montre le formulaire d'accès.
  const user = await getTrainingUser().catch(() => null)
  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #12233f, #173f82)' }}>
        <div className="container">
          <Link href="/outils" style={{ color: 'rgba(255,255,255,.8)', fontSize: 13 }}>← Outils</Link>
          <h1>⚖️ Comparateur de deux médicaments</h1>
        </div>
      </div>
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1000 }}>
          {user ? <ComparateurMedicaments /> : <AccesComparateur />}
        </div>
      </div>
    </>
  )
}
