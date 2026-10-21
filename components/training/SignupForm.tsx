'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { getCopy } from '@/lib/training/copy'
import { ROLES, type TrainingRole } from '@/lib/training/validation.ts'
import { FacebookIcon } from './icons'

export function SignupForm({ facebookEnabled }: { facebookEnabled: boolean }) {
  const { lang } = useLanguage()
  const t = getCopy(lang).form
  const router = useRouter()
  const uid = useId()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TrainingRole | ''>('')
  const [faculte, setFaculte] = useState('')
  const [website, setWebsite] = useState('') // champ piège, invisible
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<keyof typeof t.errors | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    if (!role) { setError('role'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/training/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, faculte, website }),
      })
      if (res.ok) {
        router.push('/training/attente')
        return
      }
      const json = await res.json().catch(() => ({}))
      const code = res.status === 429 ? 'rate' : (json?.error as keyof typeof t.errors | undefined)
      setError(code && code in t.errors ? code : 'serveur')
    } catch {
      setError('reseau')
    } finally {
      setBusy(false)
    }
  }

  const errorId = `${uid}-error`

  return (
    <form className="tr-form" onSubmit={submit} noValidate>
      <h2 className="tr-form-title">{t.title}</h2>
      <p className="tr-form-lead">{t.lead}</p>

      {facebookEnabled ? (
        <a className="tr-btn tr-btn-facebook" href="/api/training/auth/facebook">
          <FacebookIcon /> {t.facebook}
        </a>
      ) : (
        <button type="button" className="tr-btn tr-btn-facebook" disabled aria-describedby={`${uid}-fb`}>
          <FacebookIcon /> {t.facebook}
        </button>
      )}
      {!facebookEnabled && <p id={`${uid}-fb`} className="tr-hint">{t.facebookSoon}</p>}

      <div className="tr-sep" role="separator"><span>{t.or}</span></div>

      <div className="tr-field">
        <label htmlFor={`${uid}-email`}>{t.email}</label>
        <input
          id={`${uid}-email`}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          dir="ltr"
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={e => setEmail(e.target.value)}
          aria-invalid={error === 'email'}
          aria-describedby={error === 'email' ? errorId : undefined}
        />
      </div>

      <fieldset className="tr-field tr-roles" aria-describedby={error === 'role' ? errorId : undefined}>
        <legend>{t.role}</legend>
        <div className="tr-role-grid">
          {ROLES.map(r => (
            <label key={r} className={`tr-role${role === r ? ' is-on' : ''}`}>
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} required />
              <span>{t.roles[r]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="tr-field">
        <label htmlFor={`${uid}-fac`}>
          {t.faculte} <span className="tr-optional">({t.optional})</span>
        </label>
        <input
          id={`${uid}-fac`}
          type="text"
          name="faculte"
          autoComplete="organization"
          maxLength={120}
          placeholder={t.facultePlaceholder}
          value={faculte}
          onChange={e => setFaculte(e.target.value)}
        />
      </div>

      {/* Piège à robots : hors écran, ignoré des lecteurs d'écran et du clavier. */}
      <div className="tr-trap" aria-hidden="true">
        <label>
          Site web
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
        </label>
      </div>

      <div id={errorId} className="tr-error" role="alert" aria-live="assertive">
        {error ? t.errors[error] : ''}
      </div>

      <button type="submit" className="tr-btn tr-btn-primary" disabled={busy}>
        {busy ? t.sending : t.submit}
      </button>

      <p className="tr-privacy">
        {t.privacy}{' '}
        <Link href="/privacy">{t.privacyLink}</Link>
      </p>
    </form>
  )
}
