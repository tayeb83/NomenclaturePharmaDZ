'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function SetPassword() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const isReset = params.get('kind') === 'reset'
  const [who, setWho] = useState<{ email: string; name: string } | null>(null)
  const [error, setError] = useState('')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/accounts/password?token=${encodeURIComponent(token)}`)
      .then(async r => { const j = await r.json().catch(() => ({})); if (r.ok) setWho(j); else setError(j.error || 'Lien invalide.') })
      .catch(() => setError('Erreur réseau'))
  }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (pwd !== pwd2) { setError('Les deux mots de passe sont différents.'); return }
    setBusy(true)
    const res = await fetch('/api/admin/accounts/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: pwd }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok) setDone(true); else setError(j.error || 'Échec')
  }

  return (
    <div className="adm-center">
      <div className="adm-card">
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: 0 }}>{isReset ? 'Nouveau mot de passe' : 'Activer votre compte'}</h1>
        {done ? <>
          <div className="adm-msg" role="status">Mot de passe enregistré. Vous pouvez vous connecter.</div>
          <Link href="/admin" className="adm-btn p" style={{ textAlign: 'center' }}>Aller à la connexion</Link>
        </> : !who ? (error ? <div className="adm-msg err" role="alert">{error}</div> : <p className="adm-mu">Chargement…</p>) : (
          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <p style={{ margin: 0 }}>Compte : <b>{who.email}</b></p>
            <label className="adm-field" htmlFor="pw1">Mot de passe (10 caractères minimum)
              <input id="pw1" className="adm-input" type="password" autoComplete="new-password" minLength={10} required value={pwd} onChange={e => setPwd(e.target.value)} />
            </label>
            <label className="adm-field" htmlFor="pw2">Confirmer le mot de passe
              <input id="pw2" className="adm-input" type="password" autoComplete="new-password" minLength={10} required value={pwd2} onChange={e => setPwd2(e.target.value)} />
            </label>
            {error && <div className="adm-msg err" role="alert">{error}</div>}
            <button className="adm-btn p" disabled={busy} style={{ padding: 11 }}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function PasswordPage() {
  return <Suspense fallback={null}><SetPassword /></Suspense>
}
