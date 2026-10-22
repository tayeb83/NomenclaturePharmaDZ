import type { Metadata } from 'next'
import { FlashcardDeck } from '@/components/training/FlashcardDeck'
import { getExam } from '@/lib/training'
import { requireTrainingUserPage } from '@/lib/training/auth'
import '../training.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Flashcards — Training', robots: { index: false, follow: false } }

export default async function TrainingFlashcardsPage() {
  const user = await requireTrainingUserPage()
  const cards = await getExam().listFlashcards(user.id)
  return <FlashcardDeck cards={cards} />
}
