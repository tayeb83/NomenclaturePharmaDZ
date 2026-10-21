'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { getCopy } from '@/lib/training/copy'
import { ClockIcon } from './icons'

type Overview = {
  attempt: { id: number; mode: 'tuteur' | 'examen'; name: string; total: number; finished: boolean; remaining_s: number | null }
  items: { position: number; answered: boolean; marked: boolean; struck: boolean }[]
}
type QuestionView = {
  question: { id: number; type: string; stem: string; options: string[] }
  answer: { choice: number | null; struck: number[]; marked: boolean; locked: boolean }
  remaining_s: number | null
  finished: boolean
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function fmt(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0')
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

export function ExamRunner({ initial, initialPosition, finishNow }: { initial: Overview; initialPosition: number; finishNow: boolean }) {
  const { lang } = useLanguage()
  const copy = getCopy(lang)
  const t = copy.exam
  const router = useRouter()
  const { attempt } = initial
  const tutor = attempt.mode === 'tuteur'

  const [items, setItems] = useState(initial.items)
  const [pos, setPos] = useState(initialPosition)
  const [view, setView] = useState<QuestionView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(initial.attempt.remaining_s)
  const [announce, setAnnounce] = useState('')
  const deadline = useRef<number | null>(initial.attempt.remaining_s === null ? null : Date.now() + initial.attempt.remaining_s * 1000)
  const enteredAt = useRef(Date.now())
  const finishing = useRef(false)
  const warned = useRef<Set<number>>(new Set())

  const api = `/api/training/attempts/${attempt.id}`

  // Temps passé sur la question courante, envoyé à chaque départ de question.
  const takeElapsed = useCallback(() => {
    const secs = Math.max(0, Math.round((Date.now() - enteredAt.current) / 1000))
    enteredAt.current = Date.now()
    return secs
  }, [])

  const finish = useCallback(async (expired = false) => {
    if (finishing.current) return
    finishing.current = true
    setBusy(true)
    try {
      const res = await fetch(`${api}/finish`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        router.push(json.redirect ?? `/training/resultats/${attempt.id}`)
        router.refresh()
        return
      }
      setError(expired ? t.expired : t.saveError)
    } catch {
      setError(t.saveError)
    } finally {
      finishing.current = false
      setBusy(false)
    }
  }, [api, attempt.id, router, t.expired, t.saveError])

  // Chargement de la question courante.
  useEffect(() => {
    let cancelled = false
    setView(null)
    setError(null)
    enteredAt.current = Date.now()
    fetch(`${api}/questions/${pos}`)
      .then(async r => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<QuestionView>
      })
      .then(v => {
        if (cancelled) return
        if (v.finished) { router.replace(`/training/resultats/${attempt.id}`); return }
        setView(v)
      })
      .catch(() => { if (!cancelled) setError(t.loadError) })
    return () => { cancelled = true }
  }, [api, pos, attempt.id, router, t.loadError])

  // « Question suivante » depuis la correction du dernier item : on clôture la série.
  useEffect(() => { if (finishNow) void finish() }, [finishNow, finish])

  // Chronomètre : l'horloge de référence est celle du serveur (remaining_s) ; ici, simple affichage.
  useEffect(() => {
    if (deadline.current === null) return
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline.current! - Date.now()) / 1000))
      setRemaining(left)
      for (const m of [10, 5, 1]) {
        if (left <= m * 60 && left > 0 && !warned.current.has(m)) {
          warned.current.add(m)
          setAnnounce(t.warn(m))
        }
      }
      if (left <= 0) void finish(true)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [finish, t])

  const patchLocal = (p: Partial<QuestionView['answer']>) =>
    setView(v => (v ? { ...v, answer: { ...v.answer, ...p } } : v))
  const patchItem = (p: Partial<Overview['items'][number]>) =>
    setItems(list => list.map(i => (i.position === pos ? { ...i, ...p } : i)))

  async function save(body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`${api}/questions/${pos}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)
    if (!res) { setError(t.saveError); return false }
    if (res.ok) { setError(null); return true }
    const json = await res.json().catch(() => ({}))
    if (json?.error === 'expired') { void finish(true); return false }
    if (json?.error === 'finished') { router.replace(`/training/resultats/${attempt.id}`); return false }
    setError(t.saveError)
    return false
  }

  async function choose(i: number) {
    if (!view || view.answer.locked) return
    const prev = view.answer
    const struck = prev.struck.filter(s => s !== i)
    patchLocal({ choice: i, struck })
    patchItem({ answered: true, struck: struck.length > 0 })
    if (!(await save({ choice: i, struck }))) {
      patchLocal({ choice: prev.choice, struck: prev.struck })
      patchItem({ answered: prev.choice !== null, struck: prev.struck.length > 0 })
    }
  }

  async function toggleStrike(i: number) {
    if (!view || view.answer.locked || view.answer.choice === i) return
    const prev = view.answer.struck
    const struck = prev.includes(i) ? prev.filter(s => s !== i) : [...prev, i].sort()
    patchLocal({ struck })
    patchItem({ struck: struck.length > 0 })
    if (!(await save({ struck }))) { patchLocal({ struck: prev }); patchItem({ struck: prev.length > 0 }) }
  }

  async function toggleMark() {
    if (!view) return
    const marked = !view.answer.marked
    patchLocal({ marked })
    patchItem({ marked })
    if (!(await save({ marked }))) { patchLocal({ marked: !marked }); patchItem({ marked: !marked }) }
  }

  async function go(next: number) {
    if (next < 1 || next > attempt.total || next === pos || busy) return
    const secs = takeElapsed()
    if (view && !view.answer.locked && secs > 0) void save({ timeSpentDelta: secs })
    setNavOpen(false)
    setPos(next)
    window.history.replaceState(null, '', `/training/examen/${attempt.id}?q=${next}`)
  }

  async function validate() {
    if (!view || view.answer.choice === null || busy) return
    setBusy(true)
    const secs = takeElapsed()
    const ok = await save({ submit: true, timeSpentDelta: secs })
    if (ok) router.push(`/training/correction/${view.question.id}?attempt=${attempt.id}`)
    else setBusy(false)
  }

  async function askFinish() {
    const secs = takeElapsed()
    if (view && !view.answer.locked && secs > 0) await save({ timeSpentDelta: secs })
    setConfirming(true)
  }

  const unanswered = items.filter(i => !i.answered).length
  const a = view?.answer
  const lowTime = remaining !== null && remaining <= 300

  return (
    <div className="tr-exam">
      <header className="tr-exam-bar">
        <div className="tr-exam-name">{attempt.name}</div>
        <div className="tr-exam-counter" aria-live="polite">{t.questionOf(pos, attempt.total)}</div>
        {remaining !== null && (
          <div className={`tr-exam-timer${lowTime ? ' is-low' : ''}`} role="timer" aria-live="off">
            <ClockIcon size={18} />
            <span className="sr-only">{t.timeLeft} : </span>
            <span>{fmt(remaining)}</span>
          </div>
        )}
        <button type="button" className="tr-btn tr-btn-outline tr-exam-finish" onClick={askFinish} disabled={busy}>{t.finish}</button>
      </header>
      <div className="sr-only" aria-live="polite">{announce}</div>

      <div className="tr-exam-body">
        <nav className="tr-nav" aria-label={t.navigator}>
          <button type="button" className="tr-btn tr-btn-outline tr-nav-toggle" aria-expanded={navOpen} aria-controls="tr-nav-grid" onClick={() => setNavOpen(o => !o)}>
            {t.showNavigator} ({items.length - unanswered}/{items.length})
          </button>
          <div id="tr-nav-grid" className={`tr-nav-panel${navOpen ? ' is-open' : ''}`}>
            <h2 className="tr-nav-title">{t.navigator}</h2>
            <ol className="tr-nav-grid">
              {items.map(i => {
                const state = [
                  i.answered ? t.stateAnswered : t.stateUnanswered,
                  i.marked ? t.stateMarked : null,
                  i.position === pos ? t.stateCurrent : null,
                ].filter(Boolean).join(', ')
                return (
                  <li key={i.position}>
                    <button
                      type="button"
                      className={`tr-q${i.answered ? ' is-answered' : ''}${i.marked ? ' is-marked' : ''}${i.position === pos ? ' is-current' : ''}`}
                      aria-current={i.position === pos ? 'step' : undefined}
                      aria-label={`${t.questionOf(i.position, attempt.total)} — ${state}`}
                      onClick={() => go(i.position)}
                    >
                      {i.position}
                    </button>
                  </li>
                )
              })}
            </ol>
            <ul className="tr-legend">
              <li><span className="tr-q-sample is-answered" aria-hidden="true" />{t.legend.answered}</li>
              <li><span className="tr-q-sample is-marked" aria-hidden="true" />{t.legend.marked}</li>
              <li><span className="tr-q-sample" aria-hidden="true" />{t.legend.unanswered}</li>
              <li><span className="tr-q-sample is-current" aria-hidden="true" />{t.legend.current}</li>
            </ul>
          </div>
        </nav>

        <main className="tr-exam-main">
          <div className="tr-error" role="alert" aria-live="assertive">{error ?? ''}</div>
          {!view && !error && <p className="tr-muted">{t.loading}</p>}
          {view && a && (
            <fieldset className="tr-qfield">
              <legend className="tr-stem">{view.question.stem}</legend>
              <div className="tr-options">
                {view.question.options.map((text, i) => {
                  const struck = a.struck.includes(i)
                  const selected = a.choice === i
                  return (
                    <div key={i} className={`tr-option${selected ? ' is-selected' : ''}${struck ? ' is-struck' : ''}`}>
                      <label className="tr-option-label">
                        <input type="radio" name="choice" checked={selected} disabled={a.locked} onChange={() => choose(i)} />
                        <span className="tr-letter" aria-hidden="true">{LETTERS[i]}</span>
                        <span className="tr-option-text">
                          <span className="sr-only">{LETTERS[i]}. </span>{text}
                          {struck && <span className="sr-only"> ({t.struckSr})</span>}
                        </span>
                      </label>
                      <button
                        type="button"
                        className="tr-strike"
                        aria-pressed={struck}
                        aria-label={struck ? t.unstrike(LETTERS[i]) : t.strike(LETTERS[i])}
                        disabled={a.locked || selected}
                        onClick={() => toggleStrike(i)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
                          <path d="M4 12h16" /><path d="M8 7.5C8 5.6 9.8 4.5 12 4.5s4 1 4 2.7M16 16.5c0 1.9-1.8 3-4 3s-4-1.1-4-2.7" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="tr-qactions">
                <button type="button" className={`tr-btn tr-btn-outline tr-mark${a.marked ? ' is-on' : ''}`} aria-pressed={a.marked} onClick={toggleMark}>
                  {a.marked ? t.marked : t.mark}
                </button>
                {tutor && !a.locked && (
                  <button type="button" className="tr-btn tr-btn-primary" disabled={a.choice === null || busy} onClick={validate}>
                    {busy ? t.validating : t.validate}
                  </button>
                )}
                {a.locked && (
                  <a className="tr-btn tr-btn-primary" href={`/training/correction/${view.question.id}?attempt=${attempt.id}`}>{t.seeCorrection}</a>
                )}
              </div>
              {a.locked && <p className="tr-muted">{t.lockedNote}</p>}

              <div className="tr-pager">
                <button type="button" className="tr-btn tr-btn-outline" onClick={() => go(pos - 1)} disabled={pos <= 1}>{t.prev}</button>
                <button type="button" className="tr-btn tr-btn-outline" onClick={() => go(pos + 1)} disabled={pos >= attempt.total}>{t.next}</button>
              </div>
            </fieldset>
          )}
        </main>
      </div>

      {confirming && (
        <div className="tr-modal" role="presentation">
          <div className="tr-modal-card" role="alertdialog" aria-modal="true" aria-labelledby="tr-confirm-title" aria-describedby="tr-confirm-desc">
            <h2 id="tr-confirm-title">{t.confirmTitle}</h2>
            <p id="tr-confirm-desc">{t.unanswered(unanswered)} {t.confirmNote}</p>
            <div className="tr-modal-actions">
              <button type="button" className="tr-btn tr-btn-outline" autoFocus onClick={() => setConfirming(false)}>{t.keep}</button>
              <button type="button" className="tr-btn tr-btn-primary" disabled={busy} onClick={() => finish()}>{t.confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
