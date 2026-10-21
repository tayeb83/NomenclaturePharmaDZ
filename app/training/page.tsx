import type { Metadata } from 'next'
import { TrainingLanding } from '@/components/training/TrainingLanding'
import './training.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const metadata: Metadata = {
  title: 'Banque de QCM et examens blancs — Training',
  description:
    "Entraînez-vous aux QCM de pharmacie construits à partir de la nomenclature nationale des produits pharmaceutiques : DCI, génériques, formes, laboratoires, retraits, classes ATC. Accès gratuit sur inscription.",
  alternates: { canonical: `${APP_URL}/training` },
  openGraph: {
    title: 'Dzair-Pharma Training — Banque de QCM et examens blancs',
    description: 'QCM et examens blancs à partir de la nomenclature pharmaceutique algérienne. Accès gratuit sur inscription.',
    url: `${APP_URL}/training`,
  },
}

export default function TrainingPage({ searchParams }: { searchParams: { fb?: string | string[] } }) {
  const fb = Array.isArray(searchParams.fb) ? searchParams.fb[0] : searchParams.fb
  // Le bouton Facebook n'est actif que lorsque l'application Meta est configurée (phase 3).
  const facebookEnabled = Boolean(process.env.TRAINING_FACEBOOK_APP_ID && process.env.TRAINING_FACEBOOK_APP_SECRET)
  return <TrainingLanding facebookEnabled={facebookEnabled} fbCode={fb ?? null} />
}
