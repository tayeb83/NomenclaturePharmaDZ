'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { getCopy } from '@/lib/training/copy'
import { CheckIcon, CrossIcon } from './icons'

type View = {
  question: { id: number; stem: string; options: string[] }
  answer: { choice: number | null; locked: boolean }
  review?: { correct_index: number; is_correct: boolean; explanation: { rationales: string[]; contexte: string } }
}
const LETTERS = ['A', 'B', 'C', 'D', 'E']
const COUNT = 10

/**
 * Quiz rapide pensé pour le téléphone : une question par écran, un appui sur
 * une proposition la valide et affiche la correction sur place. S'appuie sur
 * les mêmes routes que le mode tuteur (la correction ne sort qu'après la
 * validation), la série est donc enregistrée comme une tentative en mode tuteur.
 */
export function QuickQuiz({ available, initialAttempt }: { available: number; initialAttempt: number | null }) {
  const { lang } = useLanguage()
  const c = getCopy(lang)
  const t = c.quiz
  const [attemptId, setAttemptId] = useState<number | null>(initialAttempt)
  const [total, setTotal] = useState(COUNT)
  const [pos, setPos] = useState(1)
  const [view, setView] = useState<View | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (id: number, p: number) => {
    setView(null)
    const res = await fetch(`/api/training/attempts/${id}/questions/${p}`).catch(() => null)
    if (!res || !res.ok) { setError(t.error); return }
    const v: View & { finished?: boolean } = await res.json()
    if (v.finished) { setDone(true); return }
    setView(v)
  }, [t.error])

  // Reprise d'une série en cours (rechargement de la page).
  useEffect(() => {
    if (!initialAttempt) return
    fetch(`/api/training/attempts/${initialAttempt}`).then(async r => {
      if (!r.ok) { setAttemptId(null); return }
      const o = await r.json()
      if (o.attempt.finished) { setAttemptId(null); return }
      setTotal(o.attempt.total)
      const first = o.items.find((i: { answered: boolean }) => !i.answered)?.position ?? o.attempt.total
      setScore(0)
      setPos(first)
      void load(initialAttempt, first)
    }).catch(() => setError(t.error))
  }, [initialAttempt, load, t.error])

  async function start() {
    if (busy) return
    setBusy(true); setError(null)
    const res = await fetch('/api/training/attempts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'tuteur', count: COUNT }),
    }).catch(() => null)
    setBusy(false)
    if (!res || !res.ok) { setError(t.error); return }
    const { id } = await res.json()
    const o = await (await fetch(`/api/training/attempts/${id}`)).json()
    window.history.replaceState(null, '', `/training/quiz?attempt=${id}`)
    setAttemptId(id); setTotal(o.attempt.total); setPos(1); setScore(0); setDone(false)
    void load(id, 1)
  }

  async function answer(i: number) {
    if (!attemptId || !view || view.answer.locked || busy) return
    setBusy(true); setError(null)
    const put = await fetch(`/api/training/attempts/${attemptId}/questions/${pos}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choice: i, submit: true }),
    }).catch(() => null)
    if (!put || !put.ok) { setBusy(false); setError(t.error); return }
    const res = await fetch(`/api/training/attempts/${attemptId}/questions/${pos}`).catch(() => null)
    setBusy(false)
    if (!res || !res.ok) { setError(t.error); return }
    const v: View = await res.json()
    if (v.review?.is_correct) setScore(s => s + 1)
    setView(v)
    setTimeout(() => feedbackRef.current?.focus(), 50)
  }

  async function next() {
    if (!attemptId) return
    if (pos >= total) {
      setBusy(true)
      await fetch(`/api/training/attempts/${attemptId}/finish`, { method: 'POST' }).catch(() => null)
      setBusy(false)
      setDone(true)
      window.history.replaceState(null, '', '/training/quiz')
      return
    }
    setPos(pos + 1)
    void load(attemptId, pos + 1)
  }

  if (available === 0) return <div className="tr-wrap tr-narrow"><p className="tr-flash warn">{t.empty}</p><Link className="tr-link" href="/training/espace">{t.back}</Link></div>

  if (done) {
    return (
      <div className="tr-wrap tr-narrow tr-quiz">
        <h1 className="tr-wait-title">{t.title}</h1>
        <p className="tr-score-big" dir="ltr"><strong>{score}</strong> / {total}</p>
        <p>{t.score(score, total)}</p>
        <div className="tr-resultbox-actions">
          {attemptId && <Link className="tr-btn tr-btn-outline" href={`/training/resultats/${attemptId}`}>{t.results}</Link>}
          <button type="button" className="tr-btn tr-btn-primary" onClick={() => { setDone(false); setAttemptId(null); setView(null) }}>{t.again}</button>
          <Link className="tr-link" href="/training/espace">{t.back}</Link>
        </div>
      </div>
    )
  }

  if (!attemptId) {
    return (
      <div className="tr-wrap tr-narrow tr-quiz">
        <h1 className="tr-wait-title">{t.title}</h1>
        <p>{t.lead}</p>
        <div className="tr-error" role="alert" aria-live="assertive">{error ?? ''}</div>
        <button type="button" className="tr-btn tr-btn-primary" onClick={start} disabled={busy}>{busy ? t.beginning : t.begin}</button>
        <p><Link className="tr-link" href="/training/espace">{t.back}</Link></p>
      </div>
    )
  }

  const rv = view?.review
  return (
    <div className="tr-wrap tr-narrow tr-quiz">
      <p className="tr-muted" aria-live="polite">{t.progress(pos, total)}</p>
      <div className="tr-quiz-bar" aria-hidden="true"><span style={{ width: `${((pos - (rv ? 0 : 1)) / total) * 100}%` }} /></div>
      <div className="tr-error" role="alert" aria-live="assertive">{error ?? ''}</div>
      {!view && !error && <p className="tr-muted">{t.loading}</p>}
      {view && (
        <>
          <h1 className="tr-stem tr-stem-h">{view.question.stem}</h1>
          <div className="tr-quiz-options" role="group" aria-label={view.question.stem}>
            {view.question.options.map((text, i) => {
              const good = rv && i === rv.correct_index
              const mine = view.answer.choice === i
              return (
                <button
                  key={i} type="button" disabled={!!rv || busy}
                  className={`tr-quiz-opt${good ? ' is-good' : ''}${rv && mine && !good ? ' is-bad' : ''}`}
                  onClick={() => answer(i)}
                >
                  <span className="tr-letter" aria-hidden="true">{LETTERS[i]}</span>
                  <span><span className="sr-only">{LETTERS[i]}. </span>{text}</span>
                </button>
              )
            })}
          </div>
          {rv && (
            <div ref={feedbackRef} tabIndex={-1} className={`tr-quiz-feedback ${rv.is_correct ? 'is-ok' : 'is-ko'}`} role="status" aria-live="polite">
              <strong className="tr-quiz-verdict">
                {rv.is_correct ? <CheckIcon size={22} /> : <CrossIcon size={22} />} {rv.is_correct ? t.right : t.wrong}
              </strong>
              {!rv.is_correct && <p>{t.goodWas(LETTERS[rv.correct_index])}</p>}
              <p>{rv.explanation.rationales[rv.correct_index]}</p>
              <Link className="tr-link" href={`/training/correction/${view.question.id}?attempt=${attemptId}`}>{t.detail}</Link>
              <button type="button" className="tr-btn tr-btn-primary" onClick={next} disabled={busy}>{pos >= total ? t.last : t.next}</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
