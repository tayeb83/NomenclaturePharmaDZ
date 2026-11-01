'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { getCopy } from '@/lib/training/copy'
import { CheckIcon, CrossIcon, DashIcon } from './icons'

export type Outil = { outil: string; url: string; etapes: string[] }
type Explanation = { contexte: string; rationales: string[]; points_cles: string[]; references: { label: string; url?: string }[]; outils?: Outil[] }
export type CorrectionData = {
  attempt: { id: number; mode: 'tuteur' | 'examen'; total: number; finished: boolean; position: number }
  question: { id: number; type: string; stem: string; options: string[]; atc_code: string | null }
  choice: number | null
  correct_index: number
  is_correct: boolean
  explanation: Explanation
  progress: { answered: number; correct: number }
  next_question_id: number | null
  flashcard: boolean
}
const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function CorrectionView({ data }: { data: CorrectionData }) {
  const { lang } = useLanguage()
  const c = getCopy(lang)
  const t = c.correction
  const { attempt, question, explanation } = data
  const [flash, setFlash] = useState(data.flashcard)
  const [flashMsg, setFlashMsg] = useState('')

  const banner = data.choice === null ? 'none' : data.is_correct ? 'ok' : 'ko'
  const bannerText = banner === 'ok' ? t.right : banner === 'ko' ? t.wrongBanner : t.noAnswerBanner

  // « Question suivante » : tuteur en cours → question suivante de l'examen ; terminé → correction suivante.
  let nextHref: string
  let nextLabel = t.next
  if (attempt.finished) {
    if (data.next_question_id) nextHref = `/training/correction/${data.next_question_id}?attempt=${attempt.id}`
    else { nextHref = `/training/resultats/${attempt.id}`; nextLabel = t.seeResults }
  } else if (attempt.position < attempt.total) {
    nextHref = `/training/examen/${attempt.id}?q=${attempt.position + 1}`
  } else {
    nextHref = `/training/examen/${attempt.id}?q=${attempt.position}&fin=1`
    nextLabel = t.finishSeries
  }
  const sheet = explanation.references.find(r => r.url)?.url

  async function toggleFlash() {
    const next = !flash
    const res = await fetch('/api/training/flashcards', {
      method: next ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: question.id }),
    }).catch(() => null)
    if (res?.ok) { setFlash(next); setFlashMsg(next ? t.flashAdded : t.flashRemoved) }
    else setFlashMsg(t.flashError)
  }

  return (
    <div className="tr-wrap tr-correction">
      <div className={`tr-banner is-${banner}`} role="status" aria-live="polite">
        {banner === 'ok' ? <CheckIcon size={24} /> : banner === 'ko' ? <CrossIcon size={24} /> : <DashIcon size={24} />}
        <strong>{bannerText}</strong>
      </div>

      <div className="tr-cgrid">
        <div>
          <h1 className="tr-stem tr-stem-h">{question.stem}</h1>

          <ol className="tr-corr-options">
            {question.options.map((text, i) => {
              const good = i === data.correct_index
              const mine = i === data.choice
              return (
                <li key={i} className={`${good ? 'is-good' : ''}${mine && !good ? ' is-bad' : ''}`}>
                  <div className="tr-corr-head">
                    <span className="tr-letter" aria-hidden="true">{LETTERS[i]}</span>
                    <span className="tr-option-text"><span className="sr-only">{LETTERS[i]}. </span>{text}</span>
                    {good && <span className="tr-tag good">{t.best}</span>}
                    {mine && <span className="tr-tag mine">{t.mine}</span>}
                  </div>
                  <p className="tr-rationale">{explanation.rationales[i]}</p>
                </li>
              )
            })}
          </ol>

          {explanation.outils && explanation.outils.length > 0 && (
            <section className="tr-section tr-tools" aria-labelledby="tr-tools">
              <h2 id="tr-tools">{c.tools.title}</h2>
              <p className="tr-muted">{c.tools.intro}</p>
              <ul className="tr-tools-list">
                {explanation.outils.map((o, i) => (
                  <li key={i}>
                    <strong>{o.outil}</strong>
                    <ol>{o.etapes.map((e, j) => <li key={j}>{e}</li>)}</ol>
                    <Link className="tr-link" href={o.url}>{c.tools.open} →</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="tr-section" aria-labelledby="tr-ctx">
            <h2 id="tr-ctx">{t.context}</h2>
            <p>{explanation.contexte}</p>
          </section>

          <section className="tr-section" aria-labelledby="tr-keys">
            <h2 id="tr-keys">{t.keyPoints}</h2>
            <ul className="tr-points">{explanation.points_cles.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </section>

          <section className="tr-section" aria-labelledby="tr-refs">
            <h2 id="tr-refs">{t.references}</h2>
            <ul className="tr-points">
              {explanation.references.map((r, i) => (
                <li key={i}>{r.url ? <Link className="tr-link" href={r.url}>{r.label}</Link> : r.label}</li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="tr-resultbox" aria-labelledby="tr-res">
          <h2 id="tr-res">{t.resultBox}</h2>
          <dl>
            <dt>{t.yourChoice}</dt>
            <dd>{data.choice === null ? '—' : LETTERS[data.choice]}</dd>
            <dt>{t.goodAnswer}</dt>
            <dd>{LETTERS[data.correct_index]}</dd>
          </dl>
          <p className="tr-muted">{t.progress(data.progress.correct, data.progress.answered)}</p>
          <div className="tr-resultbox-actions">
            <Link className="tr-btn tr-btn-primary" href={nextHref}>{nextLabel}</Link>
            {sheet && <Link className="tr-btn tr-btn-outline" href={sheet}>{t.openSheet}</Link>}
            <button type="button" className="tr-btn tr-btn-outline" aria-pressed={flash} onClick={toggleFlash}>
              {flash ? t.removeFlash : t.addFlash}
            </button>
          </div>
          <div className="tr-muted" role="status" aria-live="polite">{flashMsg}</div>
          <p><Link className="tr-link" href="/training/espace">{t.back}</Link></p>
        </aside>
      </div>
    </div>
  )
}
