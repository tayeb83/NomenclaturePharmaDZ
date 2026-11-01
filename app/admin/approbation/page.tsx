'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Info = { email: string; name: string; role: 'admin' | 'editor'; invitedBy: string | null }

function Approval() {
  const token = useSearchParams().get('token') || ''
  const [info, setInfo] = useState<Info | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/accounts/approval?token=${encodeURIComponent(token)}`)
      .then(async r => { const j = await r.json().catch(() => ({})); if (r.ok) setInfo(j); else setError(j.error || 'Lien invalide.') })
      .catch(() => setError('Erreur réseau'))
  }, [token])

  async function decide(decision: 'approve' | 'reject') {
    setBusy(true)
    const res = await fetch('/api/admin/accounts/approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, decision }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(j.error || 'Échec'); return }
    setDone(decision === 'reject' ? 'Demande refusée. Aucun accès n’a été créé.'
      : j.mailSent === false ? 'Demande approuvée, mais l’e-mail d’activation n’a pas pu partir. Utilisez « Renvoyer » dans Comptes admin.'
      : 'Demande approuvée. Le lien d’activation vient d’être envoyé.')
  }

  return (
    <div className="adm-center">
      <div className="adm-card">
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: 0 }}>Approuver un administrateur</h1>
        {done ? <div className="adm-msg" role="status">{done}</div>
          : error ? <div className="adm-msg err" role="alert">{error}</div>
          : !info ? <p className="adm-mu">Chargement…</p>
          : <>
            <p style={{ margin: 0 }}>{info.invitedBy || 'Un admin'} propose d’inviter <b>{info.name || info.email}</b> ({info.email}) avec le rôle <b>{info.role === 'admin' ? 'Administrateur' : 'Éditeur'}</b>.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="adm-btn p" disabled={busy} onClick={() => decide('approve')}>Approuver</button>
              <button className="adm-btn d" disabled={busy} onClick={() => decide('reject')}>Refuser</button>
            </div>
            <small className="adm-mu">Si vous n’êtes pas à l’origine de cette demande, refusez-la.</small>
          </>}
      </div>
    </div>
  )
}

export default function ApprovalPage() {
  return <Suspense fallback={null}><Approval /></Suspense>
}
