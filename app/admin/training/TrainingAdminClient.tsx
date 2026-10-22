'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { TrainingUserRow } from '@/lib/training/service.ts'

type Status = 'pending' | 'approved' | 'rejected'
type Counts = Record<Status, number>
type Filter = Status | 'all'

const STATUS_LABEL: Record<Status, string> = { pending: 'En attente', approved: 'Validé', rejected: 'Refusé' }
const ROLE_LABEL: Record<string, string> = { etudiant: 'Étudiant(e)', enseignant: 'Enseignant(e)', pharmacien: 'Pharmacien(ne)' }
const SOURCE_LABEL: Record<string, string> = { email: 'E-mail', facebook: 'Facebook' }

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export function TrainingAdminClient() {
  const [rows, setRows] = useState<TrainingUserRow[]>([])
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0 })
  const [filter, setFilter] = useState<Filter>('pending')
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [flash, setFlash] = useState<{ text: string; warn?: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  const load = useCallback(async () => {
    const n = ++seq.current
    const params = new URLSearchParams({ status: filter, q })
    const res = await fetch(`/api/admin/training/requests?${params}`)
    const json = await res.json().catch(() => ({}))
    if (n !== seq.current) return // réponse périmée
    if (!res.ok) { setError(json?.error || 'Erreur de chargement'); return }
    setError(null)
    setRows(json.requests)
    setCounts(json.counts)
  }, [filter, q])

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, q])

  async function act(id: number, action: 'approve' | 'reject' | 'pending' | 'resend' | 'delete') {
    if (action === 'delete' && !window.confirm('Supprimer définitivement ce compte et toutes ses données (progression, flashcards, résultats) ? Cette action est irréversible.')) return
    setBusyId(id)
    setFlash(null)
    try {
      const res = await fetch(`/api/admin/training/requests/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, confirm: action === 'delete' ? true : undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setFlash({ text: json?.error || 'Action impossible', warn: true }); return }
      if (json.mailSent === false) {
        setFlash({ text: "Statut mis à jour, mais l'e-mail n'a pas pu être envoyé. Utilisez « Renvoyer le lien ».", warn: true })
      } else if (json.mailSent === true) {
        setFlash({ text: "E-mail d'accès envoyé." })
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const exportHref = `/api/admin/training/requests/export?${new URLSearchParams({ status: filter, q })}`
  const filters: { id: Filter; label: string }[] = [
    { id: 'pending', label: 'En attente' },
    { id: 'approved', label: 'Accès ouverts' },
    { id: 'rejected', label: 'Refusées' },
    { id: 'all', label: 'Toutes' },
  ]

  return (
    <main className="tr-admin">
      <div className="tr-admin-top">
        <div>
          <h1>Training — demandes d’accès</h1>
          <Link href="/admin">← Administration</Link>
        </div>
        <div className="tr-acts">
          <Link className="tr-act" href="/admin/training/stats" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>Suivi d’usage</Link>
          <Link className="tr-act" href="/admin/training/questions" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>Relecture des questions</Link>
          <a className="tr-act" href={exportHref} download style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>Exporter en CSV</a>
        </div>
      </div>

      <div className="tr-counters" aria-label="Compteurs">
        <div className="tr-counter"><strong>{counts.pending}</strong><span>En attente</span></div>
        <div className="tr-counter"><strong>{counts.approved}</strong><span>Accès ouverts</span></div>
        <div className="tr-counter"><strong>{counts.rejected}</strong><span>Refusées</span></div>
      </div>

      <div className="tr-toolbar">
        <label htmlFor="tr-q" className="sr-only" style={{ position: 'absolute', left: -9999 }}>Rechercher</label>
        <input id="tr-q" type="search" placeholder="Rechercher un e-mail ou une faculté" value={q} onChange={e => setQ(e.target.value)} />
        {filters.map(f => (
          <button key={f.id} type="button" className="tr-chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {flash && <div className={`tr-flash${flash.warn ? ' warn' : ''}`}>{flash.text}</div>}
        {error && <div className="tr-flash warn">{error}</div>}
      </div>

      <div className="tr-table-wrap">
        <table className="tr-table">
          <thead>
            <tr>
              <th>E-mail</th><th>Source</th><th>Profil</th><th>Faculté</th><th>Date</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Aucune demande.</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.email}</td>
                <td>{SOURCE_LABEL[r.source] ?? r.source}</td>
                <td>{ROLE_LABEL[r.role] ?? r.role}</td>
                <td>{r.faculte ?? '—'}</td>
                <td>{fmtDate(r.created_at)}</td>
                <td><span className={`tr-badge ${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                <td>
                  <div className="tr-acts">
                    {r.status !== 'approved' && (
                      <button type="button" className="tr-act ok" disabled={busyId === r.id} onClick={() => act(r.id, 'approve')}>Valider</button>
                    )}
                    {r.status !== 'rejected' && (
                      <button type="button" className="tr-act no" disabled={busyId === r.id} onClick={() => act(r.id, 'reject')}>Refuser</button>
                    )}
                    {r.status !== 'pending' && (
                      <button type="button" className="tr-act" disabled={busyId === r.id} onClick={() => act(r.id, 'pending')}>Remettre en attente</button>
                    )}
                    <button type="button" className="tr-act no" disabled={busyId === r.id} onClick={() => act(r.id, 'delete')}>Supprimer</button>
                    {r.status === 'approved' && (
                      <button type="button" className="tr-act" disabled={busyId === r.id} onClick={() => act(r.id, 'resend')}>Renvoyer le lien</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
