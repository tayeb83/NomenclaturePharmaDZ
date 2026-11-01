'use client'

import { useCallback, useEffect, useState } from 'react'

type Account = {
  id: number; email: string; name: string; role: 'admin' | 'editor'
  status: 'pending_approval' | 'invited' | 'active' | 'disabled' | 'rejected'
  invited_by: string | null; last_login_at: string | null
}

const STATUS: Record<Account['status'], { label: string; tone: string }> = {
  pending_approval: { label: 'En attente d’approbation', tone: 'wa' },
  invited: { label: 'Invitation envoyée', tone: 'in' },
  active: { label: 'Actif', tone: 'ok' },
  disabled: { label: 'Désactivé', tone: 'bad' },
  rejected: { label: 'Refusé', tone: 'bad' },
}
const ROLE = { admin: 'Administrateur', editor: 'Éditeur' }

export default function ComptesClient({ isOwner, selfId }: { isOwner: boolean; selfId: number | null }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({ email: '', name: '', role: 'editor' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/accounts')
    const json = await res.json().catch(() => ({}))
    if (res.ok) { setAccounts(json.accounts || []); setLoadError('') } else setLoadError(json.error || 'Erreur de chargement')
  }, [])
  useEffect(() => { load() }, [load])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const json = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg({ text: json.error || 'Échec de l’invitation', err: true }); return }
    setMsg(json.mailSent
      ? { text: 'Demande d’approbation envoyée au propriétaire.' }
      : { text: 'Compte créé, mais l’e-mail n’a pas pu partir. Utilisez « Renvoyer ».', err: true })
    setForm({ email: '', name: '', role: form.role })
    load()
  }

  async function act(id: number, action: string) {
    setMsg(null)
    const res = await fetch(`/api/admin/accounts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) setMsg({ text: json.error || 'Action impossible', err: true })
    else if (json.mailSent === false) setMsg({ text: 'Action effectuée, mais l’e-mail n’a pas pu partir. Réessayez avec « Renvoyer ».', err: true })
    else setMsg({ text: action === 'resend' ? 'E-mail renvoyé.' : 'Compte mis à jour.' })
    load()
  }

  const date = (v: string | null) => (v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

  return (
    <div className="adm-page">
      <div className="adm-head">
        <div>
          <h1>Comptes admin</h1>
          <p>Gérez qui peut accéder à l’administration. Chaque nouvelle invitation doit être approuvée par le propriétaire avant l’envoi du lien d’activation.</p>
        </div>
      </div>

      <form className="adm-card" onSubmit={invite}>
        <h3>Nouvelle invitation</h3>
        <div className="adm-fields">
          <label className="adm-field" htmlFor="ac-email">Adresse e-mail
            <input id="ac-email" className="adm-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="adm-field" htmlFor="ac-name">Nom affiché
            <input id="ac-name" className="adm-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="adm-field" htmlFor="ac-role">Rôle
            <select id="ac-role" className="adm-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="editor">Éditeur (contenu, sans import ni comptes)</option>
              <option value="admin">Administrateur complet</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <button className="adm-btn p" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer pour approbation'}</button>
          {msg && <span className={`adm-msg${msg.err ? ' err' : ''}`} role="status">{msg.text}</span>}
        </div>
      </form>

      <div className="adm-card">
        <h3>Comptes</h3>
        {loadError && <div className="adm-msg err">{loadError}</div>}
        <div className="adm-tw">
          <table className="adm-table">
            <thead><tr><th>Compte</th><th>Rôle</th><th>Statut</th><th>Dernière connexion</th><th /></tr></thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id}>
                  <td><div className="adm-who"><div className="adm-av">{(a.name || a.email)[0]?.toUpperCase()}</div><div>{a.name || a.email}<small>{a.email}</small></div></div></td>
                  <td>{ROLE[a.role]}</td>
                  <td><span className={`adm-pill ${STATUS[a.status].tone}`}>{STATUS[a.status].label}</span></td>
                  <td>{date(a.last_login_at)}</td>
                  <td style={{ whiteSpace: 'nowrap', display: 'flex', gap: 6 }}>
                    {isOwner && a.status === 'pending_approval' && <>
                      <button className="adm-btn p" onClick={() => act(a.id, 'approve')}>Approuver</button>
                      <button className="adm-btn d" onClick={() => act(a.id, 'reject')}>Refuser</button>
                    </>}
                    {(a.status === 'pending_approval' || a.status === 'invited') && <button className="adm-btn" onClick={() => act(a.id, 'resend')}>Renvoyer</button>}
                    {a.status === 'invited' && isOwner && <button className="adm-btn d" onClick={() => act(a.id, 'reject')}>Annuler</button>}
                    {a.status === 'active' && a.id !== selfId && <button className="adm-btn" onClick={() => act(a.id, 'disable')}>Désactiver</button>}
                    {a.status === 'disabled' && <button className="adm-btn" onClick={() => act(a.id, 'enable')}>Réactiver</button>}
                  </td>
                </tr>
              ))}
              {!accounts.length && !loadError && <tr><td colSpan={5} style={{ color: 'var(--adm-muted)' }}>Aucun compte nominatif pour l’instant. Le propriétaire se connecte avec le mot de passe historique.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
