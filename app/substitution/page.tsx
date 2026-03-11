import { getGeneriques } from '@/lib/queries'
import { SubstitutionClient } from './SubstitutionClient'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Substitution générique',
  description: 'Trouvez les génériques enregistrés en Algérie pour une DCI donnée — Nomenclature officielle MIPH.',
  alternates: { canonical: `${APP_URL}/substitution` },
}
export const dynamic = 'force-dynamic'

export default async function SubstitutionPage() {
  const generiques = await getGeneriques()
  return <SubstitutionClient generiques={generiques} />
}
