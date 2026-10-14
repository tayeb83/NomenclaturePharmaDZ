'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type PlaceRow = {
  wilaya_code: string
  commune_code: string
  label: string
  default_h1_fr: string
  default_h1_ar: string
  phrase_fr: string
  phrase_ar: string
}

const cell: React.CSSProperties = { padding: '6px 8px', verticalAlign: 'top' }
const input: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px', fontSize: 13 }

/**
 * Titre de l'annuaire par wilaya / commune. Par défaut le site déduit
 * « Annuaire des pharmacies de Saïda » du nom de la zone ; ce panneau permet
 * de corriger l'article (« d'El Bayadh », « de Aïn Témouchent ») ou la graphie.
 * La valeur saisie remplace la partie après « pharmacies » (FR) / « صيدليات » (AR).
 */
export function PlaceTitlesEditor() {
  const [rows, setRows] = useState<PlaceRow[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/annuaire/places')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec du chargement')
      setRows(json.data || []); setAvailable(json.table_available !== false); setDirty(new Set())
    } catch (err: any) {
      setError(err.message || 'Échec du chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const key = (r: PlaceRow) => `${r.wilaya_code}|${r.commune_code}`
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase()
    return f ? rows.filter(r => r.label.toLowerCase().includes(f)) : rows
  }, [rows, filter])

  function edit(r: PlaceRow, field: 'phrase_fr' | 'phrase_ar', value: string) {
    setRows(prev => prev.map(x => (key(x) === key(r) ? { ...x, [field]: value } : x)))
    setDirty(prev => new Set(prev).add(key(r)))
  }

  async function save(r: PlaceRow) {
    setBusy(key(r)); setError('')
    try {
      const res = await fetch('/api/admin/annuaire/places', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wilaya_code: r.wilaya_code, commune_code: r.commune_code, phrase_fr: r.phrase_fr, phrase_ar: r.phrase_ar }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec')
      setDirty(prev => { const n = new Set(prev); n.delete(key(r)); return n })
    } catch (err: any) {
      setError(err.message || "Échec de l'enregistrement")
    } finally {
      setBusy('')
    }
  }

  return (
    <details style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, marginBottom: 20 }}>
      <summary style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', cursor: 'pointer' }}>
        📝 Titres de l&apos;annuaire par wilaya / commune
      </summary>
      <p style={{ fontSize: 12.5, color: '#64748b', margin: '10px 0' }}>
        Laissez vide pour le titre automatique. Exemples : FR « d&apos;El Bayadh », « de Maoussa (Mascara) » ; AR « ماوسة، معسكر ».
      </p>
      {!available && <div style={{ color: '#b45309', fontSize: 13, marginBottom: 8 }}>Table absente : appliquer sql/17_annuaire.sql pour pouvoir enregistrer.</div>}
      <input style={{ ...input, maxWidth: 320, marginBottom: 10 }} placeholder="Filtrer (Saïda, Mascara…)" value={filter} onChange={e => setFilter(e.target.value)} />
      {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>}
      {loading ? <div style={{ fontSize: 13, color: '#64748b' }}>Chargement…</div> : (
        <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={cell}>Zone</th><th style={cell}>Après « pharmacies » (FR)</th><th style={cell}>Après « صيدليات » (AR)</th><th style={cell} />
              </tr>
            </thead>
            <tbody>
              {shown.map(r => (
                <tr key={key(r)} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...cell, fontWeight: r.commune_code ? 400 : 700 }}>{r.label}</td>
                  <td style={cell}>
                    <input style={input} value={r.phrase_fr} onChange={e => edit(r, 'phrase_fr', e.target.value)}
                      placeholder={r.default_h1_fr.replace('Annuaire des pharmacies ', '')} />
                  </td>
                  <td style={cell}>
                    <input style={{ ...input, direction: 'rtl' }} lang="ar" value={r.phrase_ar} onChange={e => edit(r, 'phrase_ar', e.target.value)}
                      placeholder={r.default_h1_ar.replace('دليل صيدليات ', '')} />
                  </td>
                  <td style={cell}>
                    <button onClick={() => save(r)} disabled={!available || !dirty.has(key(r)) || busy === key(r)} style={{
                      background: dirty.has(key(r)) ? '#0284c7' : '#e2e8f0', color: dirty.has(key(r)) ? '#fff' : '#94a3b8',
                      border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                      cursor: dirty.has(key(r)) ? 'pointer' : 'default',
                    }}>{busy === key(r) ? '…' : 'Enregistrer'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  )
}
