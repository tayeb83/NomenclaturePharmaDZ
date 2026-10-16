'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MONOGRAPHIE_SECTIONS, SECTION_LABELS, type MonographieListRow } from '@/lib/monographie-types'

type Lang = 'fr' | 'ar'
type Form = Record<string, string>

const input: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', fontSize: 13.5, fontFamily: 'inherit' }
const EMPTY: Form = { status: 'brouillon', sources: '', reviewed_by: '', reviewed_at: '' }

const badge = (s: string | null) => (s === 'publie' ? '✅' : s === 'brouillon' ? '📝' : '·')

/**
 * Saisie des monographies par DCI. Une monographie publiée s'affiche sur
 * toutes les fiches de la DCI : la publication exige donc une source et un
 * relecteur (contrôlé aussi côté API).
 */
export function MonographiesClient() {
  const [rows, setRows] = useState<MonographieListRow[]>([])
  const [tableMissing, setTableMissing] = useState(false)
  const [filter, setFilter] = useState('')
  const [onlyEmpty, setOnlyEmpty] = useState(false)
  const [dci, setDci] = useState('')
  const [lang, setLang] = useState<Lang>('fr')
  const [form, setForm] = useState<Form>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const loadList = useCallback(async () => {
    const res = await fetch('/api/admin/monographies')
    const json = await res.json().catch(() => ({}))
    if (res.ok) { setRows(json.rows || []); setTableMissing(!!json.tableMissing) }
  }, [])
  useEffect(() => { loadList() }, [loadList])

  useEffect(() => {
    if (!dci) return
    setMsg('')
    fetch(`/api/admin/monographies?dci=${encodeURIComponent(dci)}&lang=${lang}`)
      .then(r => r.json())
      .then(j => {
        const m = j.monographie
        const f: Form = { ...EMPTY }
        if (m) {
          for (const k of [...MONOGRAPHIE_SECTIONS, 'sources', 'reviewed_by', 'status'] as const) f[k] = m[k] ?? ''
          f.reviewed_at = m.reviewed_at ? String(m.reviewed_at).slice(0, 10) : ''
        }
        setForm(f)
      })
      .catch(() => setMsg('Échec du chargement'))
  }, [dci, lang])

  const shown = useMemo(() => {
    const f = filter.trim().toUpperCase()
    return rows
      .filter(r => (!f || r.dci.includes(f)) && (!onlyEmpty || !r.fr))
      .slice(0, 300)
  }, [rows, filter, onlyEmpty])

  async function save(status: 'brouillon' | 'publie') {
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/admin/monographies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dci, lang, status }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec de l\'enregistrement')
      setForm(f => ({ ...f, status }))
      setMsg(status === 'publie' ? 'Publié.' : 'Brouillon enregistré.')
      loadList()
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const canPublish = form.sources.trim() && form.reviewed_by.trim()

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>🧬 Monographies par DCI</h1>
        <Link href="/admin" style={{ color: '#0284c7', fontSize: 13 }}>← Administration</Link>
      </div>

      {tableMissing && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
          Table absente : appliquez <code>sql/18_dci_monographies.sql</code> sur la base avant de saisir.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
          <input style={input} placeholder="Filtrer une DCI…" value={filter} onChange={e => setFilter(e.target.value)} />
          <label style={{ display: 'block', fontSize: 12, margin: '8px 0' }}>
            <input type="checkbox" checked={onlyEmpty} onChange={e => setOnlyEmpty(e.target.checked)} /> Sans monographie FR
          </label>
          <div style={{ maxHeight: 620, overflowY: 'auto' }}>
            {shown.map(r => (
              <button
                key={r.dci}
                onClick={() => setDci(r.dci)}
                style={{
                  display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left',
                  padding: '6px 8px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12.5,
                  background: r.dci === dci ? '#e0f2fe' : 'transparent',
                }}
              >
                <span>{r.dci}</span>
                <span style={{ whiteSpace: 'nowrap', color: '#64748b' }}>{r.nb_fiches} fiches {badge(r.fr)}{badge(r.ar)}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
          {!dci ? (
            <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
              Choisissez une DCI à gauche. Les plus présentes sont en tête : une monographie y enrichit le plus de fiches.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 16 }}>{dci}</strong>
                {(['fr', 'ar'] as Lang[]).map(l => (
                  <button key={l} onClick={() => setLang(l)} style={{
                    padding: '4px 12px', borderRadius: 6, border: '1px solid #cbd5e1', cursor: 'pointer',
                    background: lang === l ? '#0f172a' : 'white', color: lang === l ? 'white' : '#0f172a',
                  }}>{l === 'fr' ? 'Français' : 'العربية'}</button>
                ))}
                <span style={{ fontSize: 12, color: '#64748b' }}>Statut : {form.status}</span>
              </div>

              {MONOGRAPHIE_SECTIONS.map(s => (
                <div key={s} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>{SECTION_LABELS[s].fr}</label>
                  <textarea
                    style={{ ...input, minHeight: 70, direction: lang === 'ar' ? 'rtl' : 'ltr' }}
                    value={form[s] ?? ''}
                    onChange={e => set(s, e.target.value)}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Sources (une par ligne — RCP, ANSM, EMA, OMS…) *</label>
                <textarea style={{ ...input, minHeight: 60 }} value={form.sources} onChange={e => set('sources', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Relu par *</label>
                  <input style={input} value={form.reviewed_by} onChange={e => set('reviewed_by', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Date de relecture</label>
                  <input type="date" style={input} value={form.reviewed_at} onChange={e => set('reviewed_at', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button disabled={busy} onClick={() => save('brouillon')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>
                  Enregistrer le brouillon
                </button>
                <button disabled={busy || !canPublish} onClick={() => save('publie')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: canPublish ? '#059669' : '#94a3b8', color: 'white', cursor: canPublish ? 'pointer' : 'not-allowed' }}>
                  Publier
                </button>
                {!canPublish && <span style={{ fontSize: 12, color: '#92400e' }}>Source et relecteur requis pour publier.</span>}
                {msg && <span style={{ fontSize: 13 }}>{msg}</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
