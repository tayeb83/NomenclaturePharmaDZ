'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type Report = {
  id: number
  report_type: 'confirme_ouverte' | 'erreur' | 'fermee'
  message: string | null
  contact: string | null
  status: 'nouveau' | 'traite' | 'rejete'
  created_at: string
  wilaya_code: string
  commune_code: string
  pharmacy_name: string | null
}

type Claim = {
  id: number
  pharmacist_name: string
  phone: string
  whatsapp: string | null
  email: string | null
  message: string | null
  status: 'en_attente' | 'verifie' | 'rejete'
  created_at: string
  wilaya_code: string
  commune_code: string
  pharmacy_name: string | null
}

const REPORT_TYPE_LABELS: Record<Report['report_type'], string> = {
  confirme_ouverte: '✔ Confirmée ouverte',
  erreur: '⚠ Erreur signalée',
  fermee: '🚫 Fermée',
}

const REPORT_STATUSES: Report['status'][] = ['nouveau', 'traite', 'rejete']
const CLAIM_STATUSES: Claim['status'][] = ['en_attente', 'verifie', 'rejete']

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

const cellStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 13, verticalAlign: 'top' }
const thStyle: React.CSSProperties = { ...cellStyle, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: '#64748b', textAlign: 'left', background: '#f8fafc' }

export function SignalementsClient() {
  const [reports, setReports] = useState<Report[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [migrationMissing, setMigrationMissing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/garde/reports')
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setReports(data.reports || [])
      setClaims(data.claims || [])
      setMigrationMissing(Boolean(data.migrationMissing))
    } catch {
      setError('Impossible de charger les signalements.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function updateStatus(kind: 'report' | 'claim', id: number, status: string) {
    try {
      const res = await fetch('/api/admin/garde/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, status }),
      })
      if (!res.ok) throw new Error(String(res.status))
      if (kind === 'report') setReports(rs => rs.map(r => r.id === id ? { ...r, status: status as Report['status'] } : r))
      else setClaims(cs => cs.map(c => c.id === id ? { ...c, status: status as Claim['status'] } : c))
    } catch {
      setError('Échec de la mise à jour du statut.')
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>📣 Signalements &amp; revendications</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>
            Crowdsourcing des pharmacies de garde : confirmations, erreurs signalées et demandes «&nbsp;c&apos;est ma pharmacie&nbsp;».
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/admin/garde" style={{ fontSize: 13, color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>← Garde (géocodage)</Link>
          <button onClick={load} style={{ fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '6px 12px', cursor: 'pointer' }}>↻ Rafraîchir</button>
        </div>
      </div>

      {migrationMissing && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#92400e', fontSize: 13.5 }}>
          La migration <code>sql/12_garde_crowdsourcing.sql</code> n&apos;est pas encore appliquée sur cette base.
        </div>
      )}
      {error && <div style={{ color: '#b91c1c', marginBottom: 16, fontSize: 14 }}>{error}</div>}
      {loading && <div style={{ color: '#64748b', fontSize: 14 }}>⏳ Chargement…</div>}

      {!loading && (
        <>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '20px 0 10px' }}>
            🏪 Revendications de fiche ({claims.length})
          </h2>
          {claims.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13.5 }}>Aucune revendication pour l&apos;instant.</p>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', marginBottom: 28 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Pharmacie', 'Wilaya/Commune', 'Pharmacien', 'Contacts', 'Message', 'Statut'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {claims.map(c => (
                    <tr key={c.id} style={{ background: c.status === 'en_attente' ? '#fefce8' : undefined }}>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{fmtDate(c.created_at)}</td>
                      <td style={cellStyle}><strong>{c.pharmacy_name || '—'}</strong></td>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{c.wilaya_code} / {c.commune_code}</td>
                      <td style={cellStyle}>{c.pharmacist_name}</td>
                      <td style={cellStyle}>
                        📞 {c.phone}
                        {c.whatsapp && <div>💬 {c.whatsapp}</div>}
                        {c.email && <div>✉️ {c.email}</div>}
                      </td>
                      <td style={{ ...cellStyle, maxWidth: 240 }}>{c.message || '—'}</td>
                      <td style={cellStyle}>
                        <select value={c.status} onChange={e => updateStatus('claim', c.id, e.target.value)} style={{ fontSize: 12.5, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                          {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '20px 0 10px' }}>
            📣 Signalements ({reports.length})
          </h2>
          {reports.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13.5 }}>Aucun signalement pour l&apos;instant.</p>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Pharmacie', 'Wilaya/Commune', 'Type', 'Message', 'Contact', 'Statut'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id} style={{ background: r.status === 'nouveau' && r.report_type !== 'confirme_ouverte' ? '#fef2f2' : undefined }}>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                      <td style={cellStyle}><strong>{r.pharmacy_name || '—'}</strong></td>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{r.wilaya_code} / {r.commune_code}</td>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{REPORT_TYPE_LABELS[r.report_type]}</td>
                      <td style={{ ...cellStyle, maxWidth: 280 }}>{r.message || '—'}</td>
                      <td style={cellStyle}>{r.contact || '—'}</td>
                      <td style={cellStyle}>
                        <select value={r.status} onChange={e => updateStatus('report', r.id, e.target.value)} style={{ fontSize: 12.5, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                          {REPORT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
