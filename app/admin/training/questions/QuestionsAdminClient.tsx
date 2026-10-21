'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type Status = 'draft' | 'reviewed' | 'published'
type Row = {
  id: number; type: string; stem: string; status: Status; a_valider: boolean; relu_par: string | null
  stale: boolean; stale_reason: string | null; manually_edited: boolean; difficulty: number; atc_code: string | null
}
type Full = Row & {
  options: string[]; correct_index: number; source_ref: string
  explanation: { contexte: string; rationales: string[]; points_cles: string[]; references: { label: string; url?: string }[] }
}
type Counts = Record<Status | 'stale', number>

const TYPES: Record<string, string> = {
  dci_from_brand: 'DCI à partir du nom commercial', reference_generique: 'Référence ou générique', forme_dosage: 'Forme et dosage',
  labo_pays: 'Laboratoire et pays', retrait_motif: 'Motif de retrait', retrait_identification: 'Produit retiré', atc_classe: 'Classe ATC',
}
const STATUS_LABEL: Record<Status, string> = { draft: 'Brouillon', reviewed: 'Relue', published: 'Publiée' }
const LETTERS = ['A', 'B', 'C', 'D', 'E']
const PAGE = 50

export function QuestionsAdminClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Counts>({ draft: 0, reviewed: 0, published: 0, stale: 0 })
  const [status, setStatus] = useState<Status | 'all'>('draft')
  const [type, setType] = useState('')
  const [stale, setStale] = useState(false)
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [reviewer, setReviewer] = useState('')
  const [flash, setFlash] = useState<{ text: string; warn?: boolean } | null>(null)
  const [open, setOpen] = useState<Full | null>(null)
  const [saving, setSaving] = useState(false)
  const seq = useRef(0)

  useEffect(() => { try { setReviewer(localStorage.getItem('training_reviewer') ?? '') } catch { /* stockage indisponible */ } }, [])
  const saveReviewer = (v: string) => { setReviewer(v); try { localStorage.setItem('training_reviewer', v) } catch { /* ignoré */ } }

  const load = useCallback(async () => {
    const n = ++seq.current
    const p = new URLSearchParams({ status, type, q, offset: String(offset), limit: String(PAGE) })
    if (stale) p.set('stale', '1')
    const res = await fetch(`/api/admin/training/questions?${p}`)
    const json = await res.json().catch(() => ({}))
    if (n !== seq.current) return
    if (!res.ok) { setFlash({ text: json?.error || 'Erreur de chargement', warn: true }); return }
    setRows(json.rows); setTotal(json.total); setCounts(json.counts)
  }, [status, type, stale, q, offset])

  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t) }, [load, q])
  useEffect(() => { setOffset(0); setSelected(new Set()) }, [status, type, stale, q])

  async function bulk(action: 'review' | 'publish' | 'draft', ids = [...selected]) {
    const res = await fetch('/api/admin/training/questions/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action, reviewer }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setFlash({ text: json?.error || 'Action impossible', warn: true }); return false }
    setFlash({ text: `${json.updated} question(s) mise(s) à jour.` })
    setSelected(new Set())
    await load()
    return true
  }

  async function openQuestion(id: number) {
    const res = await fetch(`/api/admin/training/questions/${id}`)
    const json = await res.json().catch(() => ({}))
    if (res.ok) setOpen(json.question)
  }

  async function saveEdit() {
    if (!open) return
    setSaving(true)
    const res = await fetch(`/api/admin/training/questions/${open.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stem: open.stem, options: open.options, correct_index: open.correct_index, a_valider: open.a_valider, explanation: open.explanation }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setFlash({ text: (json?.errors ?? [json?.error ?? 'Erreur']).join(' · '), warn: true }); return }
    setFlash({ text: 'Question enregistrée (marquée « retouchée à la main »).' })
    await load()
  }

  const toggle = (id: number) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOnPage = rows.length > 0 && rows.every(r => selected.has(r.id))
  const pages = Math.max(1, Math.ceil(total / PAGE))

  const setOpt = (i: number, v: string) => setOpen(o => o && ({ ...o, options: o.options.map((x, k) => (k === i ? v : x)) }))
  const setRat = (i: number, v: string) => setOpen(o => o && ({ ...o, explanation: { ...o.explanation, rationales: o.explanation.rationales.map((x, k) => (k === i ? v : x)) } }))

  return (
    <main className="tr-admin">
      <div className="tr-admin-top">
        <div>
          <h1>Training — relecture des questions</h1>
          <Link href="/admin/training">← Demandes d’accès</Link>
        </div>
      </div>

      <div className="tr-counters">
        <div className="tr-counter"><strong>{counts.draft}</strong><span>Brouillons</span></div>
        <div className="tr-counter"><strong>{counts.reviewed}</strong><span>Relues</span></div>
        <div className="tr-counter"><strong>{counts.published}</strong><span>Publiées</span></div>
        <div className="tr-counter"><strong>{counts.stale}</strong><span>À relire (source modifiée)</span></div>
      </div>

      <div className="tr-toolbar">
        {(['draft', 'reviewed', 'published', 'all'] as const).map(s => (
          <button key={s} type="button" className="tr-chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s === 'all' ? 'Toutes' : STATUS_LABEL[s]}
          </button>
        ))}
        <label htmlFor="trq-type" className="sr-only">Type</label>
        <select id="trq-type" className="tr-select" style={{ width: 'auto' }} value={type} onChange={e => setType(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="tr-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={stale} onChange={e => setStale(e.target.checked)} /> À relire
        </label>
        <label htmlFor="trq-q" className="sr-only">Rechercher</label>
        <input id="trq-q" type="search" placeholder="Rechercher dans les énoncés" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="tr-toolbar" style={{ background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 10, padding: 10 }}>
        <label htmlFor="trq-rev" style={{ fontWeight: 700 }}>Relecteur</label>
        <input id="trq-rev" type="text" placeholder="Votre nom (obligatoire pour relire / publier)" value={reviewer} maxLength={80}
               onChange={e => saveReviewer(e.target.value)} style={{ flex: '1 1 240px', minHeight: 44, padding: '8px 12px', border: '1.5px solid var(--slate-500)', borderRadius: 8, font: 'inherit' }} />
        <button type="button" className="tr-act" disabled={selected.size === 0} onClick={() => bulk('review')}>Marquer relues ({selected.size})</button>
        <button type="button" className="tr-act ok" disabled={selected.size === 0} onClick={() => bulk('publish')}>Publier ({selected.size})</button>
        <button type="button" className="tr-act no" disabled={selected.size === 0} onClick={() => bulk('draft')}>Remettre en brouillon</button>
      </div>

      <div aria-live="polite">{flash && <div className={`tr-flash${flash.warn ? ' warn' : ''}`}>{flash.text}</div>}</div>

      <div className="tr-table-wrap">
        <table className="tr-table">
          <thead>
            <tr>
              <th><input type="checkbox" aria-label="Tout sélectionner" checked={allOnPage} onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())} /></th>
              <th>N°</th><th>Type</th><th>Énoncé</th><th>Statut</th><th>Relecteur</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Aucune question.</td></tr>}
            {rows.map(r => (
              <tr key={r.id}>
                <td><input type="checkbox" aria-label={`Sélectionner la question ${r.id}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                <td>{r.id}</td>
                <td>{TYPES[r.type] ?? r.type}</td>
                <td style={{ maxWidth: 420 }}>{r.stem}</td>
                <td>
                  <span className={`tr-badge ${r.status === 'published' ? 'approved' : r.status === 'reviewed' ? 'pending' : 'rejected'}`}>{STATUS_LABEL[r.status]}</span>
                  {r.stale && <span className="tr-badge pending" style={{ marginInlineStart: 6 }}>À relire</span>}
                  {r.manually_edited && <span className="tr-badge approved" style={{ marginInlineStart: 6, background: '#e0e7ff', color: '#3730a3' }}>Retouchée</span>}
                </td>
                <td>{r.relu_par ?? '—'}</td>
                <td><button type="button" className="tr-act" onClick={() => openQuestion(r.id)}>Ouvrir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tr-toolbar" style={{ marginTop: 12 }}>
        <button type="button" className="tr-act" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Précédent</button>
        <span>Page {Math.floor(offset / PAGE) + 1} / {pages} — {total} question(s)</span>
        <button type="button" className="tr-act" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Suivant</button>
      </div>

      {open && (
        <div className="tr-modal" role="presentation">
          <div className="tr-modal-card" style={{ maxWidth: 820, maxHeight: '92vh', overflow: 'auto' }} role="dialog" aria-modal="true" aria-labelledby="trq-title">
            <h2 id="trq-title" style={{ fontFamily: 'inherit' }}>Question {open.id} — {TYPES[open.type] ?? open.type}</h2>
            <p className="tr-muted">Source : {open.source_ref}. {open.explanation.references.map((r, i) => r.url && <Link key={i} className="tr-link" href={r.url} target="_blank" style={{ marginInlineEnd: 10 }}>{r.label}</Link>)}</p>

            <div className="tr-field"><label htmlFor="trq-stem">Énoncé</label>
              <textarea id="trq-stem" className="tr-textarea" rows={2} value={open.stem} onChange={e => setOpen({ ...open, stem: e.target.value })} /></div>

            <fieldset className="tr-field"><legend>Propositions — cochez la bonne réponse</legend>
              {open.options.map((o, i) => (
                <div key={i} className="tr-opt-edit">
                  <input type="radio" name="correct" aria-label={`Bonne réponse : ${LETTERS[i]}`} checked={open.correct_index === i} onChange={() => setOpen({ ...open, correct_index: i })} />
                  <strong>{LETTERS[i]}</strong>
                  <input type="text" aria-label={`Proposition ${LETTERS[i]}`} value={o} onChange={e => setOpt(i, e.target.value)} />
                </div>
              ))}
            </fieldset>

            <div className="tr-field"><label htmlFor="trq-ctx">Contexte</label>
              <textarea id="trq-ctx" className="tr-textarea" rows={3} value={open.explanation.contexte} onChange={e => setOpen({ ...open, explanation: { ...open.explanation, contexte: e.target.value } })} /></div>

            <fieldset className="tr-field"><legend>Justification de chaque proposition</legend>
              {open.explanation.rationales.map((r, i) => (
                <div key={i} className="tr-opt-edit">
                  <strong>{LETTERS[i]}</strong>
                  <textarea className="tr-textarea" aria-label={`Justification ${LETTERS[i]}`} rows={2} value={r} onChange={e => setRat(i, e.target.value)} />
                </div>
              ))}
            </fieldset>

            <div className="tr-field"><label htmlFor="trq-pts">Points clés (un par ligne)</label>
              <textarea id="trq-pts" className="tr-textarea" rows={3} value={open.explanation.points_cles.join('\n')}
                        onChange={e => setOpen({ ...open, explanation: { ...open.explanation, points_cles: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) } })} /></div>

            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input type="checkbox" checked={open.a_valider} onChange={e => setOpen({ ...open, a_valider: e.target.checked })} /> Reste « à valider »
            </label>

            <div className="tr-modal-actions">
              <button type="button" className="tr-act" onClick={() => setOpen(null)}>Fermer</button>
              <button type="button" className="tr-act" disabled={saving} onClick={saveEdit}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <button type="button" className="tr-act ok" disabled={saving || open.status === 'published'}
                      onClick={async () => { await saveEdit(); if (await bulk('publish', [open.id])) setOpen(null) }}>Enregistrer et publier</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
