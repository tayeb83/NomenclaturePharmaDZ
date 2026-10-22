import type { Metadata } from 'next'
import { SpaceScreen } from '@/components/training/SpaceScreen'
import { getExam } from '@/lib/training'
import { requireTrainingUserPage } from '@/lib/training/auth'
import { MOCK_EXAMS } from '@/lib/training/exam.ts'
import '../training.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Mon espace — Training', robots: { index: false, follow: false } }

export default async function TrainingSpacePage() {
  const user = await requireTrainingUserPage()
  const exam = getExam()
  const [available, attempts, flashcards] = await Promise.all([exam.publishedCount(), exam.listAttempts(user.id, 8), exam.listFlashcards(user.id)])
  return <SpaceScreen email={user.email} role={user.role} available={available} attempts={attempts} mockCodes={Object.keys(MOCK_EXAMS)} flashCount={flashcards.length} />
}
