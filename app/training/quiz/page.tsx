import type { Metadata } from 'next'
import { QuickQuiz } from '@/components/training/QuickQuiz'
import { getExam } from '@/lib/training'
import { requireTrainingUserPage } from '@/lib/training/auth'
import '../training.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Quiz rapide — Training', robots: { index: false, follow: false } }

export default async function TrainingQuizPage({ searchParams }: { searchParams: { attempt?: string } }) {
  await requireTrainingUserPage()
  const available = await getExam().publishedCount()
  const attempt = Number(searchParams.attempt)
  return <QuickQuiz available={available} initialAttempt={Number.isSafeInteger(attempt) && attempt > 0 ? attempt : null} />
}
