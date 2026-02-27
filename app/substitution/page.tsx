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
  return <SubstitutionClient generiques={generiques} />
}
