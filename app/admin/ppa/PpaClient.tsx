'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { PpaAdminRow } from '@/lib/ppa'

const input: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px', fontSize: 13.5, fontFamily: 'inherit' }

/**
 * Saisie du PPA (prix public algérien) par médicament. Un prix vide supprime
 * la valeur : la fiche publique affiche alors « Prix non disponible ».
 */
export function PpaClient() {
  const [rows, setRows] = useState<PpaAdminRow[]>([])
  const [tableMissing, setTableMissing] = useState(false)
  const [q, setQ] = useState('')
  const [missing, setMissing] = useState(false)
  const [edits, setEdits] = useState<Record<number, string>>({})
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/ppa?q=${encodeURIComponent(q)}&missing=${missing ? 1 : 0}`)
    const json = await res.json().catch(() => ({}))
    if (res.ok) { setRows(json.rows || []); setTableMissing(!!json.tableMissing); setEdits({}) }
  }, [q, missing])
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  async function save(r: PpaAdminRow) {
    setMsg('')
    const res = await fetch('/api/admin/ppa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ n_enreg: r.n_enreg, code: r.code, ppa: edits[r.id] }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg(json.error || 'Échec de l\'enregistrement'); return }
    const v = (edits[r.id] ?? '').replace(/\s/g, '').replace(',', '.')
    setRows(rs => rs.map(x => (x.n_enreg === r.n_enreg && x.code === r.code ? { ...x, ppa_dzd: v === '' ? null : v } : x)))
    setEdits(e => { const n = { ...e }; delete n[r.id]; return n })
    setMsg(`${r.nom_marque} : ${v === '' ? 'prix supprimé' : 'PPA enregistré'}.`)
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>💰 PPA — Prix public algérien</h1>
        <Link href="/admin" style={{ color: '#0284c7', fontSize: 13 }}>← Administration</Link>
      </div>

      {tableMissing && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
          Table absente : appliquez <code>sql/20_medicament_ppa.sql</code> sur la base avant de saisir.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input style={{ ...input, minWidth: 280 }} placeholder="Nom, DCI, n° d'enregistrement, laboratoire…" value={q} onChange={e => setQ(e.target.value)} />
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={missing} onChange={e => setMissing(e.target.checked)} /> Sans PPA uniquement
        </label>
        {msg && <span style={{ fontSize: 13 }}>{msg}</span>}
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
              <th style={{ padding: 8 }}>Médicament</th>
              <th style={{ padding: 8 }}>Forme / dosage</th>
              <th style={{ padding: 8 }}>Conditionnement</th>
              <th style={{ padding: 8 }}>Labo</th>
              <th style={{ padding: 8 }}>PPA (DA)</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const val = edits[r.id] ?? (r.ppa_dzd ?? '')
              const dirty = r.id in edits
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: 8 }}><strong>{r.nom_marque}</strong><br /><span style={{ color: '#64748b' }}>{r.dci} · n° {r.n_enreg}</span></td>
                  <td style={{ padding: 8 }}>{[r.forme, r.dosage].filter(Boolean).join(' — ')}</td>
                  <td style={{ padding: 8, maxWidth: 220 }}>{r.conditionnement}</td>
                  <td style={{ padding: 8 }}>{r.labo}</td>
                  <td style={{ padding: 8 }}>
                    <input
                      style={{ ...input, width: 110 }}
                      inputMode="decimal"
                      placeholder="non dispo"
                      value={val}
                      onChange={e => setEdits(s => ({ ...s, [r.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter' && dirty) save(r) }}
                    />
                  </td>
                  <td style={{ padding: 8 }}>
                    <button disabled={!dirty} onClick={() => save(r)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: dirty ? '#059669' : '#cbd5e1', color: 'white', cursor: dirty ? 'pointer' : 'default' }}>
                      Enregistrer
                    </button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 16, color: '#64748b' }}>Aucun médicament.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: '#64748b' }}>100 résultats maximum : affinez la recherche. Laissez le champ vide pour retirer un prix.</p>
    </div>
  )
}
