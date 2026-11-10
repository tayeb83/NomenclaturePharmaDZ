import { Suspense } from 'react'
import type { Metadata } from 'next'
import { GuideClient } from './GuideClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

// Page expérimentale : hors index tant qu'elle est au Lab. Chaque combinaison de filtres est une URL
// différente ; les laisser explorer gaspillerait le budget d'exploration des fiches (voir README, Indexation).
export const metadata: Metadata = {
  title: 'Recherche guidée (Lab)',
  description: 'Trouver un médicament pas à pas : substance, voie, forme, dosage. Fonction expérimentale de DwaDZ.',
  alternates: { canonical: `${APP_URL}/lab/guide` },
  robots: { index: false, follow: false },
}

export default function GuidePage() {
  return (
    <Suspense fallback={null}>
      <GuideClient />
    </Suspense>
  )
}
