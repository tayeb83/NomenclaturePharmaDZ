'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { finApres } from '@/lib/graphe/core'

type Abonne = {
  id: number; email: string; is_active: boolean; starts_on: string | null; ends_on: string | null
  moyen_paiement: 'ccp' | 'paypal' | null; reference_paiement: string | null; montant: string | null; note: string | null
}
type Demande = { id: number; nom: string; email: string; organisation: string | null; phone: string | null; message: string | null; status: string; created_at: string }

const aujourdhui = () => new Date().toISOString().slice(0, 10)
const MOYEN = { ccp: 'Virement CCP', paypal: 'PayPal' } as const
const DUREES = [{ m: 1, l: '1 mois' }, { m: 3, l: '3 mois' }, { m: 6, l: '6 mois' }, { m: 12, l: '12 mois' }]
const vide = { email: '', ends_on: finApres(aujourdhui(), 12), moyen_paiement: 'ccp', reference_paiement: '', montant: '', note: '', prevenir: true }

function etat(a: Abonne, jour: string): { label: string; tone: string } {
  if (!a.is_active) return { label: 'Suspendu', tone: 'bad' }
  if (a.ends_on && a.ends_on < jour) return { label: 'Expiré', tone: 'bad' }
  if (a.starts_on && a.starts_on > jour) return { label: 'À venir', tone: 'in' }
  if (a.ends_on && a.ends_on <= finApres(jour, 1)) return { label: 'Expire bientôt', tone: 'wa' }
  return { label: 'Actif', tone: 'ok' }
}

type ResultatDemo = { id: string; titre: string; etat: 'ok' | 'attention' | 'vide' | 'erreur'; noeuds: number; liens: number; remarques: string[] }
const ETAT_DEMO = { ok: { l: 'OK', t: 'ok' }, attention: { l: 'À vérifier', t: 'wa' }, vide: { l: 'Sans données', t: 'bad' }, erreur: { l: 'Erreur', t: 'bad' } } as const

const date = (v: string | null) => (v ? new Date(`${v.slice(0, 10)}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—')

export default function GrapheAdminClient() {
  const [abonnes, setAbonnes] = useState<Abonne[]>([])
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [manquante, setManquante] = useState(false)
  const [erreurChargement, setErreurChargement] = useState('')
  const [form, setForm] = useState(vide)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null)
  const [aSupprimer, setASupprimer] = useState<number | null>(null)
  const jour = useMemo(aujourdhui, [])
  const [demos, setDemos] = useState<ResultatDemo[] | null>(null)
  const [controle, setControle] = useState(false)

  async function verifierDemos() {
    setControle(true)
    const res = await fetch('/api/admin/graphe?demos=1')
    const json = await res.json().catch(() => ({}))
    setControle(false)
    if (res.ok) setDemos(json.demos || [])
    else setMsg({ text: json.error || 'Contrôle impossible', err: true })
  }

  const charger = useCallback(async () => {
    const res = await fetch('/api/admin/graphe')
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setErreurChargement(json.error || 'Erreur de chargement'); return }
    setErreurChargement(''); setAbonnes(json.abonnes || []); setDemandes(json.demandes || []); setManquante(!!json.migrationManquante)
  }, [])
  useEffect(() => { charger() }, [charger])

  async function activer(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/graphe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const json = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg({ text: json.error || 'Activation impossible', err: true }); return }
    setMsg(json.mailEnvoye === false
      ? { text: 'Abonnement activé, mais l’e-mail n’a pas pu partir : prévenez la personne vous-même.', err: true }
      : { text: json.mailEnvoye ? 'Abonnement activé et e-mail envoyé.' : 'Abonnement activé.' })
    setForm(vide)
    charger()
  }

  async function basculer(a: Abonne) {
    setMsg(null)
    const res = await fetch('/api/admin/graphe', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, actif: !a.is_active }) })
    if (!res.ok) setMsg({ text: 'Action impossible.', err: true })
    charger()
  }

  async function supprimer(id: number) {
    setMsg(null)
    const res = await fetch('/api/admin/graphe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setASupprimer(null)
    if (!res.ok) setMsg({ text: 'Suppression impossible.', err: true })
    charger()
  }

  function preparer(email: string, note?: string | null) {
    setForm({ ...vide, email, note: note ?? '' })
    document.getElementById('gr-email')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    document.getElementById('gr-email')?.focus()
  }

  const nouvelles = demandes.filter(d => d.status !== 'converti' && d.status !== 'rejete')

  return (
    <div className="adm-page">
      <div className="adm-head">
        <div>
          <h1>Abonnés — graphes et fiches PDF</h1>
          <p>Le paiement se fait par virement CCP ou par PayPal uniquement. Une fois le virement reçu (ou le paiement PayPal confirmé), activez l’abonnement ici : la personne se connecte avec son adresse e-mail, sans mot de passe.</p>
        </div>
      </div>

      {manquante && <div className="adm-card"><span className="adm-msg err">Migration manquante : <code>psql &quot;$DATABASE_URL&quot; -f sql/36_graphe.sql</code></span></div>}
      {erreurChargement && <div className="adm-card"><span className="adm-msg err">{erreurChargement}</span></div>}

      {nouvelles.length > 0 && (
        <div className="adm-card">
          <h3>Demandes à traiter <span className="adm-pill wa">{nouvelles.length}</span></h3>
          <div className="adm-tw">
            <table className="adm-table">
              <thead><tr><th>Demandeur</th><th>Besoin</th><th>Reçue le</th><th /></tr></thead>
              <tbody>
                {nouvelles.map(d => (
                  <tr key={d.id}>
                    <td>{d.nom}<small style={{ display: 'block', color: 'var(--adm-muted)' }}>{d.email}{d.phone ? ` · ${d.phone}` : ''}{d.organisation ? ` · ${d.organisation}` : ''}</small></td>
                    <td style={{ maxWidth: 360 }}>{d.message || '—'}</td>
                    <td>{date(d.created_at)}</td>
                    <td><button className="adm-btn p" type="button" onClick={() => preparer(d.email, d.organisation)}>Préparer l’activation</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <form className="adm-card" onSubmit={activer}>
        <h3>Activer ou renouveler un abonnement</h3>
        <div className="adm-fields">
          <label className="adm-field" htmlFor="gr-email">Adresse e-mail de l’abonné
            <input id="gr-email" className="adm-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="adm-field" htmlFor="gr-fin">Valable jusqu’au
            <input id="gr-fin" className="adm-input" type="date" required value={form.ends_on} onChange={e => setForm({ ...form, ends_on: e.target.value })} />
          </label>
          <label className="adm-field" htmlFor="gr-moyen">Moyen de paiement
            <select id="gr-moyen" className="adm-input" value={form.moyen_paiement} onChange={e => setForm({ ...form, moyen_paiement: e.target.value })}>
              <option value="ccp">Virement CCP</option>
              <option value="paypal">PayPal</option>
            </select>
          </label>
          <label className="adm-field" htmlFor="gr-ref">{form.moyen_paiement === 'paypal' ? 'Identifiant de transaction PayPal' : 'Référence du virement CCP'}
            <input id="gr-ref" className="adm-input" value={form.reference_paiement} maxLength={120} onChange={e => setForm({ ...form, reference_paiement: e.target.value })} />
          </label>
          <label className="adm-field" htmlFor="gr-montant">Montant reçu
            <input id="gr-montant" className="adm-input" value={form.montant} maxLength={40} placeholder="ex. 4 000 DZD ou 25 EUR" onChange={e => setForm({ ...form, montant: e.target.value })} />
          </label>
          <label className="adm-field" htmlFor="gr-note">Note interne
            <input id="gr-note" className="adm-input" value={form.note} maxLength={500} onChange={e => setForm({ ...form, note: e.target.value })} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--adm-muted)' }}>Durée depuis aujourd’hui :</span>
          {DUREES.map(d => <button key={d.m} type="button" className="adm-btn" onClick={() => setForm({ ...form, ends_on: finApres(jour, d.m) })}>{d.l}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={form.prevenir} onChange={e => setForm({ ...form, prevenir: e.target.checked })} /> Prévenir l’abonné par e-mail</label>
          <button className="adm-btn p" disabled={busy}>{busy ? 'Activation…' : 'Activer l’abonnement'}</button>
          {msg && <span className={`adm-msg${msg.err ? ' err' : ''}`} role="status">{msg.text}</span>}
        </div>
      </form>

      <div className="adm-card">
        <h3>Contrôle des démos <button className="adm-btn" type="button" onClick={verifierDemos} disabled={controle}>{controle ? 'Contrôle en cours…' : 'Vérifier les démos'}</button></h3>
        <p style={{ fontSize: 13, color: 'var(--adm-muted)', margin: '0 0 8px' }}>Construit chaque démo du catalogue sur la vraie base et signale ce qui manque : substance introuvable, classe vide, aucun retrait, aucune interaction…</p>
        {demos && (
          <div className="adm-tw">
            <table className="adm-table">
              <thead><tr><th>Démo</th><th>État</th><th>Nœuds</th><th>Liens</th><th>Remarques</th></tr></thead>
              <tbody>
                {demos.map(d => (
                  <tr key={d.id}>
                    <td><a href={`/graphe/demo/${d.id}`} target="_blank" rel="noopener noreferrer">{d.titre}</a><small style={{ display: 'block', color: 'var(--adm-muted)' }}>{d.id}</small></td>
                    <td><span className={`adm-pill ${ETAT_DEMO[d.etat].t}`}>{ETAT_DEMO[d.etat].l}</span></td>
                    <td>{d.noeuds}</td><td>{d.liens}</td>
                    <td>{d.remarques.join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="adm-card">
        <h3>Abonnés ({abonnes.length})</h3>
        <div className="adm-tw">
          <table className="adm-table">
            <thead><tr><th>Abonné</th><th>État</th><th>Validité</th><th>Paiement</th><th /></tr></thead>
            <tbody>
              {abonnes.map(a => {
                const e = etat(a, jour)
                return (
                  <tr key={a.id}>
                    <td>{a.email}{a.note && <small style={{ display: 'block', color: 'var(--adm-muted)' }}>{a.note}</small>}</td>
                    <td><span className={`adm-pill ${e.tone}`}>{e.label}</span></td>
                    <td>{date(a.starts_on)} → {date(a.ends_on)}</td>
                    <td>{a.moyen_paiement ? MOYEN[a.moyen_paiement] : '—'}{a.montant ? ` · ${a.montant}` : ''}{a.reference_paiement && <small style={{ display: 'block', color: 'var(--adm-muted)' }}>{a.reference_paiement}</small>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="adm-btn" type="button" onClick={() => preparer(a.email, a.note)}>Renouveler</button>{' '}
                      <button className="adm-btn" type="button" onClick={() => basculer(a)}>{a.is_active ? 'Suspendre' : 'Réactiver'}</button>{' '}
                      {aSupprimer === a.id
                        ? <><button className="adm-btn d" type="button" onClick={() => supprimer(a.id)}>Confirmer la suppression</button> <button className="adm-btn" type="button" onClick={() => setASupprimer(null)}>Annuler</button></>
                        : <button className="adm-btn d" type="button" onClick={() => setASupprimer(a.id)}>Supprimer</button>}
                    </td>
                  </tr>
                )
              })}
              {!abonnes.length && !erreurChargement && <tr><td colSpan={5} style={{ color: 'var(--adm-muted)' }}>Aucun abonné pour l’instant.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
