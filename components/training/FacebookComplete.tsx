'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { getCopy } from '@/lib/training/copy'
import { ROLES, type TrainingRole } from '@/lib/training/validation.ts'

export function FacebookComplete({ email }: { email: string | null }) {
  const { lang } = useLanguage()
  const copy = getCopy(lang)
  const t = copy.facebook
  const f = copy.form
  const router = useRouter()
  const uid = useId()
  const [role, setRole] = useState<TrainingRole | ''>('')
  const [faculte, setFaculte] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!email) {
    return (
      <div className="tr-wrap tr-narrow">
        <p className="tr-error" role="alert">{t.expired}</p>
        <Link className="tr-link" href="/training">{t.back}</Link>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!role) { setError(f.errors.role); return }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/training/facebook/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, faculte }),
      })
      if (res.ok) { router.push('/training/attente'); return }
      const json = await res.json().catch(() => ({}))
      setError(json?.error === 'expire' ? t.expired : f.errors[res.status === 429 ? 'rate' : 'serveur'])
    } catch {
      setError(f.errors.reseau)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tr-wrap tr-narrow">
      <form className="tr-form" onSubmit={submit} noValidate>
        <h1 className="tr-form-title" style={{ fontSize: '1.6rem' }}>{t.title}</h1>
        <p className="tr-form-lead">{t.lead}</p>
        <p><strong>{t.emailLabel} :</strong> <span dir="ltr">{email}</span></p>

        <fieldset className="tr-field tr-roles">
          <legend>{f.role}</legend>
          <div className="tr-role-grid">
            {ROLES.map(r => (
              <label key={r} className={`tr-role${role === r ? ' is-on' : ''}`}>
                <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} required />
                <span>{f.roles[r]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="tr-field">
          <label htmlFor={`${uid}-fac`}>{f.faculte} <span className="tr-optional">({f.optional})</span></label>
          <input id={`${uid}-fac`} type="text" autoComplete="organization" maxLength={120} placeholder={f.facultePlaceholder}
                 value={faculte} onChange={e => setFaculte(e.target.value)} />
        </div>

        <div className="tr-error" role="alert" aria-live="assertive">{error ?? ''}</div>
        <button type="submit" className="tr-btn tr-btn-primary" disabled={busy}>{busy ? f.sending : t.submit}</button>
      </form>
    </div>
  )
}
