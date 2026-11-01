import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAdminSessionInfo } from '@/lib/admin-auth'
import { getTrainingUser } from '@/lib/training/auth'
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

export const dynamic = 'force-dynamic'

export default async function TrainingPage({ searchParams }: { searchParams: { fb?: string | string[]; admin?: string } }) {
  // Déjà connecté (compte validé) : inutile de redemander l'accès.
  if (await getTrainingUser().catch(() => null)) redirect('/training/espace')
  // Administrateur connecté : accès direct, sauf si on vient d'en être renvoyé (admin=0).
  const adminCookie = (await cookies()).get('admin_session')?.value
  if (searchParams.admin !== '0' && getAdminSessionInfo(adminCookie)?.email) redirect('/api/training/auth/admin')
  const fb = Array.isArray(searchParams.fb) ? searchParams.fb[0] : searchParams.fb
  // Le bouton Facebook n'est actif que lorsque l'application Meta est configurée (phase 3).
  const facebookEnabled = Boolean(process.env.TRAINING_FACEBOOK_APP_ID && process.env.TRAINING_FACEBOOK_APP_SECRET)
  return <TrainingLanding facebookEnabled={facebookEnabled} fbCode={fb ?? null} />
}
