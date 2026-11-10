import { Suspense } from 'react'
import type { Metadata } from 'next'
import { exigerLab } from '@/lib/lab-access'
import { getListesTerminologies } from '@/lib/terminologies-page'
import { TerminologiesClient } from './TerminologiesClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

// Au Lab : hors index. Les fiches y renvoient (une URL par code), on ne veut pas que ces pages entrent dans l'index.
export const metadata: Metadata = {
  title: 'Terminologies : EDQM, UCUM, ATC',
  description: 'Formes pharmaceutiques, voies et méthodes d’administration (EDQM), unités (UCUM) et classification ATC utilisées par la nomenclature algérienne, en français, anglais et arabe.',
  alternates: { canonical: `${APP_URL}/terminologies` },
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function TerminologiesPage() {
  exigerLab()
  const listes = await getListesTerminologies()
  return (
    <Suspense fallback={null}>
      <TerminologiesClient listes={listes} />
    </Suspense>
  )
}
