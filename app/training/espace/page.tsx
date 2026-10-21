import type { Metadata } from 'next'
import { SpaceScreen } from '@/components/training/SpaceScreen'
import { requireTrainingUserPage } from '@/lib/training/auth'
import '../training.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Mon espace — Training', robots: { index: false, follow: false } }

export default async function TrainingSpacePage() {
  const user = await requireTrainingUserPage()
  return <SpaceScreen email={user.email} role={user.role} />
}
