'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { TrendRow } from '@/lib/acces'
import { ALGERIA_WILAYAS } from '@/lib/wilayas'

const cell: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #e2e8f0', fontSize: 13, textAlign: 'right' }
const left: React.CSSProperties = { ...cell, textAlign: 'left' }

/**
 * NAQESS — tendances par période × wilaya × médicament. Les signalements
 * (déclarations) et les consultations (clics de recherche, national) sont
 * des colonnes distinctes, jamais additionnées ; une ligne n'est « fiable »
 * qu'à partir de 3 déclarants distincts.
 */
export function AccesClient() {
  const [rows, setRows] = useState<TrendRow[]>([])
  const [months, setMonths] = useState(1)
  const [onlyReliable, setOnlyReliable] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/acces?months=${months}`)
    const json = await res.json().catch(() => ({}))
    if (res.ok) { setRows(json.rows || []); setTableMissing(!!json.tableMissing) }
  }, [months])
  useEffect(() => { load() }, [load])

  const wname = (c: string) => ALGERIA_WILAYAS.find(w => w.code === c)?.name_fr ?? c
  const shown = onlyReliable ? rows.filter(r => r.fiable) : rows

  function exportCsv() {
    const head = ['periode', 'wilaya', 'medicament', 'dci', 'introuvable', 'prix_inattendu', 'trouve', 'declarants', 'consultations_fiche_national', 'fiable']
    const lines = shown.map(r => [r.periode, wname(r.wilaya_code), r.med_name, r.dci ?? '', r.introuvable, r.prix_inattendu, r.trouve, r.declarants, r.consultations, r.fiable ? 'oui' : 'non']
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `naqess-${months}m.csv`; a.click()
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <Link href="/admin" style={{ fontSize: 13 }}>← Admin</Link>
      <h1 style={{ fontSize: 22, margin: '12px 0' }}>📊 NAQESS — accès aux médicaments</h1>
      <p style={{ fontSize: 13.5, color: '#475569' }}>
        Signalements déclaratifs de visiteurs (pas une mesure de stock). « Consultations » = clics de recherche
        sur la fiche, au niveau national : à comparer, pas à additionner. Fiable = au moins 3 déclarants distincts.
      </p>
      {tableMissing && <p style={{ color: '#b45309' }}>Migration manquante : <code>psql &quot;$DATABASE_URL&quot; -f sql/21_acces_signalements.sql</code></p>}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0' }}>
        <select value={months} onChange={e => setMonths(Number(e.target.value))}>
          <option value={1}>Mois en cours</option>
          <option value={2}>2 derniers mois</option>
          <option value={3}>3 derniers mois</option>
          <option value={12}>12 derniers mois</option>
        </select>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={onlyReliable} onChange={e => setOnlyReliable(e.target.checked)} /> Fiables seulement</label>
        <button type="button" onClick={exportCsv} disabled={!shown.length}>Exporter CSV</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {['Période', 'Wilaya', 'Médicament', 'Introuvable', 'Prix inattendu', 'Trouvé', 'Déclarants', 'Consultations (nat.)', 'Fiable'].map((h, i) => (
                <th key={h} style={{ ...(i < 3 ? left : cell), background: '#f1f5f9' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(r => (
              <tr key={`${r.periode}-${r.wilaya_code}-${r.med_source}-${r.med_id}`}>
                <td style={left}>{r.periode}</td>
                <td style={left}>{r.wilaya_code} {wname(r.wilaya_code)}</td>
                <td style={left}>{r.med_name}{r.dci ? <span style={{ color: '#64748b' }}> · {r.dci}</span> : null}</td>
                <td style={cell}>{r.introuvable}</td>
                <td style={cell}>{r.prix_inattendu}</td>
                <td style={cell}>{r.trouve}</td>
                <td style={cell}>{r.declarants}</td>
                <td style={cell}>{r.consultations}</td>
                <td style={cell}>{r.fiable ? '✓' : '—'}</td>
              </tr>
            ))}
            {!shown.length && <tr><td style={left} colSpan={9}>Aucun signalement sur la période.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
