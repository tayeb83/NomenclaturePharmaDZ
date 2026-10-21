'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { AR_VALIDATED, getCopy } from '@/lib/training/copy'

/**
 * Deux états : (1) un jeton est présent dans l'URL → bouton de confirmation
 * (le jeton n'est consommé que par ce clic, jamais par un aperçu de lien) ;
 * (2) sinon, formulaire « recevoir un lien ».
 */
export function LoginScreen({ initialToken }: { initialToken: string }) {
  const { lang } = useLanguage()
  const copy = getCopy(lang)
  const t = copy.login
  const router = useRouter()
  const uid = useId()
  const [token, setToken] = useState(initialToken)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Retire le jeton de la barre d'adresse (historique, copier-coller, en-tête Referer).
  useEffect(() => {
    if (initialToken) window.history.replaceState(null, '', '/training/connexion')
  }, [initialToken])

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/training/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        const json = await res.json().catch(() => ({}))
        router.push(json?.redirect || '/training/espace')
        router.refresh()
        return
      }
      if (res.status === 400) { setToken(''); setInvalid(true); return }
      setError(copy.form.errors[res.status === 429 ? 'rate' : 'serveur'])
    } catch {
      setError(copy.form.errors.reseau)
    } finally {
      setBusy(false)
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/training/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) { setSent(true); setInvalid(false); return }
      setError(copy.form.errors[res.status === 429 ? 'rate' : 'serveur'])
    } catch {
      setError(copy.form.errors.reseau)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tr-wrap tr-narrow">
      {lang === 'ar' && !AR_VALIDATED && <p className="tr-pending-note">{copy.arPending}</p>}

      {token ? (
        <div className="tr-card">
          <h1 className="tr-wait-title">{t.confirmTitle}</h1>
          <p>{t.confirmLead}</p>
          <div className="tr-error" role="alert" aria-live="assertive">{error ?? ''}</div>
          <button type="button" className="tr-btn tr-btn-primary" onClick={confirm} disabled={busy}>
            {busy ? t.sending : t.confirm}
          </button>
        </div>
      ) : (
        <form className="tr-form" onSubmit={sendLink} noValidate>
          <h1 className="tr-form-title" style={{ fontSize: '1.6rem' }}>{t.title}</h1>
          {invalid && <p className="tr-error" role="alert">{t.invalid}</p>}
          <p className="tr-form-lead">{t.lead}</p>
          <div className="tr-field">
            <label htmlFor={`${uid}-email`}>{copy.form.email}</label>
            <input
              id={`${uid}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={254}
              dir="ltr"
              placeholder={copy.form.emailPlaceholder}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="tr-error" role="alert" aria-live="assertive">{error ?? ''}</div>
          <div aria-live="polite">{sent && <p className="tr-flash" style={{ marginBottom: 12 }}>{t.sent}</p>}</div>
          <button type="submit" className="tr-btn tr-btn-primary" disabled={busy}>
            {busy ? t.sending : t.send}
          </button>
          <p className="tr-privacy">
            {t.noAccess} <Link href="/training">{t.requestAccess}</Link>
          </p>
        </form>
      )}
    </div>
  )
}
