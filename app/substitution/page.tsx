import { getGeneriques } from '@/lib/queries'
import { SubstitutionClient } from './SubstitutionClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Substitution générique',
  description: 'Trouvez les génériques enregistrés en Algérie pour une DCI donnée — Nomenclature officielle MIPH.',
}
export const revalidate = 3600

export default async function SubstitutionPage() {
  const generiques = await getGeneriques()

  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}>
        <div className="container">
          <h1>♻️ Substitution générique</h1>
          <p>Trouvez les équivalents génériques enregistrés en Algérie pour une DCI donnée</p>
        </div>
      </div>
      <div className="page-body">
        <div className="container" style={{ maxWidth: 900 }}>
          <SubstitutionClient generiques={generiques} />
        </div>
      </div>
    </>
  )
}
