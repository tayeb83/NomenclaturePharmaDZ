import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ExamRunner } from '@/components/training/ExamRunner'
import { getExam } from '@/lib/training'
import { requireTrainingUserPage } from '@/lib/training/auth'
import '../../training.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Examen — Training', robots: { index: false, follow: false } }

export default async function ExamPage({ params, searchParams }: { params: { id: string }; searchParams: { q?: string; fin?: string } }) {
  const user = await requireTrainingUserPage()
  const id = Number(params.id)
  const overview = await getExam().getOverview(user.id, id)
  if (!overview) notFound()
  if (overview.attempt.finished) redirect(`/training/resultats/${id}`)
  const q = Math.min(Math.max(parseInt(searchParams.q ?? '', 10) || 1, 1), overview.attempt.total)
  return <ExamRunner initial={overview} initialPosition={q} finishNow={searchParams.fin === '1'} />
}
