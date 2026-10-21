'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { getCopy } from '@/lib/training/copy'

type Item = {
  position: number; question_id: number; type: string; stem: string
  choice: number | null; correct_index: number; is_correct: boolean; marked: boolean; time_spent_s: number
}
export type ResultsData = {
  attempt: { id: number; name: string; mode: 'tuteur' | 'examen'; total: number; score: number }
  items: Item[]
}
const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function ResultsView({ data }: { data: ResultsData }) {
  const { lang } = useLanguage()
  const c = getCopy(lang)
  const t = c.result
  const { attempt, items } = data
  const pct = attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0

  const byType = new Map<string, { n: number; ok: number }>()
  for (const i of items) {
    const e = byType.get(i.type) ?? { n: 0, ok: 0 }
    e.n++
    if (i.is_correct) e.ok++
    byType.set(i.type, e)
  }

  return (
    <div className="tr-wrap tr-narrow">
      <h1 className="tr-wait-title">{t.title}</h1>
      <p className="tr-muted">{attempt.name}</p>

      <section className="tr-card tr-score" aria-label={t.score}>
        <div className="tr-score-big" dir="ltr"><strong>{attempt.score}</strong> / {attempt.total}</div>
        <div>{t.outOf} {attempt.total} — {pct} % {t.percent}</div>
      </section>

      <section className="tr-section" aria-labelledby="tr-bytype">
        <h2 id="tr-bytype">{t.byType}</h2>
        <ul className="tr-bytype">
          {[...byType.entries()].map(([type, e]) => (
            <li key={type}>
              <span>{c.typeLabels[type] ?? type}</span>
              <span dir="ltr">{e.ok} / {e.n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="tr-section" aria-labelledby="tr-detail">
        <h2 id="tr-detail">{t.detail}</h2>
        <ol className="tr-detail">
          {items.map(i => (
            <li key={i.position} className={i.is_correct ? 'is-ok' : 'is-ko'}>
              <div className="tr-detail-head">
                <span className="tr-detail-n">{t.question} {i.position}</span>
                <span className={`tr-badge ${i.is_correct ? 'approved' : 'rejected'}`}>{i.is_correct ? t.correct : t.wrong}</span>
              </div>
              <p className="tr-detail-stem">{i.stem}</p>
              <p className="tr-muted">
                {t.yourAnswer} : {i.choice === null ? t.noAnswer : LETTERS[i.choice]} · {t.correctAnswer} : {LETTERS[i.correct_index]} · {t.time} : {i.time_spent_s} s
              </p>
              <Link className="tr-link" href={`/training/correction/${i.question_id}?attempt=${attempt.id}`}>{t.viewCorrection}</Link>
            </li>
          ))}
        </ol>
      </section>

      <p><Link className="tr-link" href="/training/espace">{t.back}</Link></p>
    </div>
  )
}
