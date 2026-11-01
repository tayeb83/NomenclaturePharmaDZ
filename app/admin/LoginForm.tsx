'use client'

import { useState } from 'react'

export default function LoginForm() {
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'forgot') {
        const res = await fetch('/api/admin/password/forgot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) setInfo('Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.')
        else setError(data.error || 'Erreur')
        return
      }
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) window.location.href = '/admin'
      else setError(data.error || 'Erreur de connexion')
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="adm-login">
      <div className="art">
        <div className="adm-brand"><div className="adm-logo">Dz</div><div><b>DwaDZ</b><small>ADMINISTRATION</small></div></div>
        <div>
          <h2>Nomenclature, gardes et formation, au même endroit.</h2>
          <p>Espace réservé aux administrateurs de DwaDZ.</p>
        </div>
        <div className="ring" />
      </div>
      <div className="formside">
        <form onSubmit={submit}>
          <h3>{mode === 'login' ? 'Connexion' : 'Mot de passe oublié'}</h3>
          <label className="adm-field" htmlFor="adm-email">
            Adresse e-mail
            <input id="adm-email" className="adm-input" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required={mode === 'forgot'} autoFocus />
          </label>
          {mode === 'login' && (
            <label className="adm-field" htmlFor="adm-pwd">
              Mot de passe
              <input id="adm-pwd" className="adm-input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
            </label>
          )}
          {error && <div className="adm-msg err" role="alert">{error}</div>}
          {info && <div className="adm-msg" role="status">{info}</div>}
          <button className="adm-btn p" style={{ padding: 11 }} disabled={loading || (mode === 'login' && !password)}>
            {loading ? 'Patientez…' : mode === 'login' ? 'Se connecter' : 'Envoyer le lien'}
          </button>
          <button type="button" className="adm-link" onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setError(''); setInfo('') }}>
            {mode === 'login' ? 'Mot de passe oublié ?' : '← Retour à la connexion'}
          </button>
        </form>
      </div>
    </div>
  )
}
