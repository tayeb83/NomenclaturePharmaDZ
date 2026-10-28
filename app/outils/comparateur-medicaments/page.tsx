import type { Metadata } from 'next'
import { getTrainingUser } from '@/lib/training/auth'
import { EnteteComparateur } from '@/components/comparateur-medicaments/EnteteComparateur'
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
      <EnteteComparateur />
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1000 }}>
          {user ? <ComparateurMedicaments /> : <AccesComparateur />}
        </div>
      </div>
    </>
  )
}
