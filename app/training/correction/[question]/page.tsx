import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CorrectionView } from '@/components/training/CorrectionView'
import { getExam } from '@/lib/training'
import { requireTrainingUserPage } from '@/lib/training/auth'
import '../../training.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Correction — Training', robots: { index: false, follow: false } }

export default async function CorrectionPage({ params, searchParams }: { params: { question: string }; searchParams: { attempt?: string } }) {
  const user = await requireTrainingUserPage()
  const attempt = searchParams.attempt !== undefined ? Number(searchParams.attempt) : undefined
  // Rien ne distingue « n'existe pas » de « pas encore corrigée pour vous » : 404 dans les deux cas.
  const data = await getExam().getCorrection(user.id, Number(params.question), attempt)
  if (!data) notFound()
  return <CorrectionView data={data} />
}
