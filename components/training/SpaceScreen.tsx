'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { getCopy } from '@/lib/training/copy'
import { LogoutButton } from './LogoutButton'

export type SpaceAttempt = { id: number; name: string; mode: 'tuteur' | 'examen'; total: number; finished: boolean; score: number | null; started_at: string }

const COUNTS = [10, 20, 50, 100]

export function SpaceScreen({
  email, role, available, attempts, mockCodes, flashCount,
}: {
  email: string
  role: 'etudiant' | 'enseignant' | 'pharmacien'
  available: number
  attempts: SpaceAttempt[]
  mockCodes: string[]
  flashCount: number
}) {
  const { lang } = useLanguage()
  const c = getCopy(lang)
  const t = c.start
  const router = useRouter()
  const uid = useId()
  const [mode, setMode] = useState<'tuteur' | 'examen'>('tuteur')
  const [count, setCount] = useState(Math.min(20, Math.max(available, 1)))
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState(false)

  async function deleteAccount() {
    setDeleteError(false)
    const res = await fetch('/api/training/account', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }),
    }).catch(() => null)
    if (res?.ok) { router.push('/training'); router.refresh(); return }
    setDeleteError(true)
  }

  async function start(body: Record<string, unknown>, key: string) {
    if (busy) return
    setBusy(key)
    setError(null)
    try {
      const res = await fetch('/api/training/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) { router.push(`/training/examen/${json.id}`); return }
      setError(t.errors[res.status === 429 ? 'rate' : json?.error] ?? t.errors.serveur)
    } catch {
      setError(c.form.errors.reseau)
    } finally {
      setBusy(null)
    }
  }

  const counts = COUNTS.filter(n => n <= Math.max(available, 10)).concat(available > 0 && !COUNTS.includes(available) && available < 100 ? [available] : []).sort((a, b) => a - b)

  return (
    <div className="tr-wrap tr-narrow">
      <h1 className="tr-wait-title">{c.space.title}</h1>
      <p>{c.space.welcome} <strong dir="ltr">{email}</strong> ({c.form.roles[role]})</p>

      <div className="tr-links-row">
        <Link className="tr-btn tr-btn-outline" href="/training/quiz">{c.spaceLinks.quiz}</Link>
        <Link className="tr-btn tr-btn-outline" href="/training/flashcards">{c.spaceLinks.flash} ({flashCount})</Link>
      </div>

      {available === 0 ? (
        <p className="tr-flash warn" role="status">{t.empty}</p>
      ) : (
        <>
          <p className="tr-muted">{available} {t.bank}</p>

          <section className="tr-card" aria-labelledby={`${uid}-start`}>
            <h2 id={`${uid}-start`}>{t.title}</h2>
            <fieldset className="tr-field">
              <legend>{t.modeLabel}</legend>
              <div className="tr-mode-grid">
                {(['tuteur', 'examen'] as const).map(m => (
                  <label key={m} className={`tr-role tr-mode${mode === m ? ' is-on' : ''}`}>
                    <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
                    <span><strong>{t[m]}</strong><br /><small>{t[`${m}Desc` as 'tuteurDesc' | 'examenDesc']}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="tr-field">
              <label htmlFor={`${uid}-n`}>{t.count}</label>
              <select id={`${uid}-n`} className="tr-select" value={count} onChange={e => setCount(Number(e.target.value))}>
                {counts.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button type="button" className="tr-btn tr-btn-primary" disabled={!!busy} onClick={() => start({ mode, count }, 'free')}>
              {busy === 'free' ? t.beginning : t.begin}
            </button>
          </section>

          <section className="tr-card tr-card-sm" style={{ marginTop: 16 }} aria-labelledby={`${uid}-mock`}>
            <h2 id={`${uid}-mock`}>{t.mocks}</h2>
            <p className="tr-muted">{t.mocksDesc}</p>
            <div className="tr-mock-row">
              {mockCodes.map(code => (
                <button key={code} type="button" className="tr-btn tr-btn-outline" disabled={!!busy} onClick={() => start({ mode: 'examen', count: 100, examCode: code }, code)}>
                  {busy === code ? t.beginning : (t.mockNames[code] ?? code)}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="tr-error" role="alert" aria-live="assertive">{error ?? ''}</div>

      <section className="tr-section" aria-labelledby={`${uid}-recent`}>
        <h2 id={`${uid}-recent`}>{t.recent}</h2>
        {attempts.length === 0 ? (
          <p className="tr-muted">{t.none}</p>
        ) : (
          <ul className="tr-attempts">
            {attempts.map(a => (
              <li key={a.id}>
                <div>
                  <strong>{a.name}</strong>
                  <div className="tr-muted">{new Date(a.started_at).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                </div>
                <div className="tr-attempt-score">
                  {a.finished ? `${t.score} : ${a.score ?? 0} / ${a.total}` : t.inProgress}
                </div>
                <Link className="tr-link" href={a.finished ? `/training/resultats/${a.id}` : `/training/examen/${a.id}`}>
                  {a.finished ? t.results : t.resume}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LogoutButton />

      <section className="tr-account" aria-labelledby={`${uid}-acc`}>
        <h2 id={`${uid}-acc`}>{c.account.title}</h2>
        <p className="tr-muted">{c.account.text} <Link className="tr-link" href="/privacy#training">{c.account.privacy}</Link></p>
        <button type="button" className="tr-btn tr-btn-outline tr-danger" onClick={() => setConfirmDelete(true)}>{c.account.delete}</button>
      </section>

      {confirmDelete && (
        <div className="tr-modal" role="presentation">
          <div className="tr-modal-card" role="alertdialog" aria-modal="true" aria-labelledby={`${uid}-dt`} aria-describedby={`${uid}-dd`}>
            <h2 id={`${uid}-dt`}>{c.account.confirmTitle}</h2>
            <p id={`${uid}-dd`}>{c.account.confirmText}</p>
            <div className="tr-error" role="alert">{deleteError ? c.account.error : ''}</div>
            <div className="tr-modal-actions">
              <button type="button" className="tr-btn tr-btn-outline" autoFocus onClick={() => setConfirmDelete(false)}>{c.account.cancel}</button>
              <button type="button" className="tr-btn tr-btn-outline tr-danger" onClick={deleteAccount}>{c.account.confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
