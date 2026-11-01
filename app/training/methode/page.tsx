import type { Metadata } from 'next'
import { MethodView, type MethodExample } from '@/components/training/MethodView'
import { requireTrainingUserPage } from '@/lib/training/auth'
import { query } from '@/lib/db'
import '../training.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Méthode — Training', robots: { index: false, follow: false } }

/**
 * Un exemple par type : la première question PUBLIÉE (donc relue) de chaque type.
 * Page réservée aux comptes validés, comme la banque de questions elle-même.
 * Sans question publiée pour un type, la page affiche seulement la marche à suivre.
 */
async function loadExamples(): Promise<MethodExample[]> {
  try {
    const rows = await query<{ type: string; stem: string; options: string[]; correct_index: number; explanation: { rationales?: string[]; contexte?: string } }>(
      `SELECT DISTINCT ON (type) type, stem, options, correct_index, explanation
         FROM training_questions
        WHERE status = 'published' AND NOT stale
        ORDER BY type, id`,
    )
    return rows.map(r => ({
      type: r.type, stem: r.stem, options: r.options, correct_index: r.correct_index,
      rationale: r.explanation?.rationales?.[r.correct_index] ?? '', contexte: r.explanation?.contexte ?? '',
    }))
  } catch {
    return []
  }
}

export default async function TrainingMethodPage() {
  await requireTrainingUserPage()
  return <MethodView examples={await loadExamples()} />
}
