import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ResultsView } from '@/components/training/ResultsView'
import { getExam } from '@/lib/training'
import { requireTrainingUserPage } from '@/lib/training/auth'
import '../../training.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Résultats — Training', robots: { index: false, follow: false } }

export default async function ResultsPage({ params }: { params: { id: string } }) {
  const user = await requireTrainingUserPage()
  const id = Number(params.id)
  const results = await getExam().getResults(user.id, id)
  if (!results) {
    // Existe-t-elle mais n'est pas terminée ? On renvoie vers l'examen ; sinon 404.
    const overview = await getExam().getOverview(user.id, id)
    if (overview && !overview.attempt.finished) redirect(`/training/examen/${id}`)
    notFound()
  }
  return <ResultsView data={results} />
}
