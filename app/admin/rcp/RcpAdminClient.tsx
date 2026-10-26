'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { AdminDocument, AdminFait, AdminReglages } from '@/lib/rcp-admin'

const box: React.CSSProperties = { background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }
const input: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', fontSize: 13.5, fontFamily: 'inherit', minWidth: 0 }
const btn = (bg = 'white', color = '#0f172a', border = '#cbd5e1'): React.CSSProperties => ({
  padding: '5px 12px', borderRadius: 6, border: `1px solid ${border}`, background: bg, color, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
})
const STATUS_LABEL = { brouillon: '📝 brouillon', publie: '✅ publié', rejete: '🚫 rejeté' } as const
const GRAVITE_LABEL: Record<string, string> = {
  contre_indiquee: 'contre-indiquée', deconseillee: 'déconseillée', precaution: 'précaution d\'emploi',
  a_prendre_en_compte: 'à prendre en compte', non_precisee: 'non précisée',
}

type Tables = { liens: boolean; faits: boolean }

async function api(body: Record<string, unknown>) {
  const res = await fetch('/api/admin/rcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Échec')
  return json
}

/**
 * Administration des RCP : interrupteurs d'urgence (couper les liens ou les
 * faits d'un clic), retrait par laboratoire ou par document, relecture des
 * faits avant publication. Chaque action vide le cache des fiches.
 */
export function RcpAdminClient() {
  const [tables, setTables] = useState<Tables | null>(null)
  const [reglages, setReglages] = useState<AdminReglages | null>(null)
  const [docs, setDocs] = useState<AdminDocument[]>([])
  const [filter, setFilter] = useState('')
  const [onlyToReview, setOnlyToReview] = useState(false)
  const [sel, setSel] = useState<string>('')
  const [faits, setFaits] = useState<AdminFait[]>([])
  const [edits, setEdits] = useState<Record<number, string>>({})
  const [reviewer, setReviewer] = useState('')
  const [confirmOff, setConfirmOff] = useState<'liens' | 'faits' | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { try { setReviewer(localStorage.getItem('rcp_reviewer') || '') } catch { /* stockage indisponible */ } }, [])
  const saveReviewer = (v: string) => { setReviewer(v); try { localStorage.setItem('rcp_reviewer', v) } catch { /* ignoré */ } }

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/rcp')
    const json = await res.json().catch(() => ({}))
    if (res.ok) { setTables(json.tables); setReglages(json.reglages); setDocs(json.documents || []) }
    else setMsg(json.error || 'Échec du chargement')
  }, [])
  useEffect(() => { load() }, [load])

  const loadFaits = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/rcp?rcp=${id}`)
    const json = await res.json().catch(() => ({}))
    setFaits(json.faits || []); setEdits({})
  }, [])
  useEffect(() => { if (sel) loadFaits(sel) }, [sel, loadFaits])

  async function run(body: Record<string, unknown>, ok: string, then?: () => Promise<void> | void) {
    setBusy(true); setMsg('')
    try {
      const json = await api(body)
      setMsg(typeof json.publies === 'number' ? `${json.publies} fait(s) publié(s).` : typeof json.documents === 'number' ? `${json.documents} document(s) modifié(s).` : ok)
      await load(); if (then) await then()
    } catch (e: any) { setMsg(e.message) } finally { setBusy(false) }
  }

  const doc = docs.find(d => d.rcp_id === sel)
  const shown = useMemo(() => {
    const f = filter.trim().toUpperCase()
    return docs.filter(d => (!f || `${d.nom_commercial} ${d.laboratoire_anpp ?? ''}`.toUpperCase().includes(f)) && (!onlyToReview || d.nb_brouillon > 0)).slice(0, 400)
  }, [docs, filter, onlyToReview])
  const labos = useMemo(() => {
    const m = new Map<string, { n: number; retires: number; masques: number }>()
    for (const d of docs) {
      const k = d.laboratoire_anpp || '(sans laboratoire)'
      const v = m.get(k) ?? { n: 0, retires: 0, masques: 0 }
      v.n++; if (d.retire) v.retires++; if (d.faits_masques) v.masques++
      m.set(k, v)
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [docs])

  const toggle = (cle: 'liens' | 'faits', label: string, on: boolean | undefined) => (
    <div style={{ flex: '1 1 280px', border: `2px solid ${on ? '#16a34a' : '#dc2626'}`, borderRadius: 10, padding: 12, background: on ? '#f0fdf4' : '#fef2f2' }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 13, margin: '4px 0 8px' }}>{on ? '🟢 Affiché sur le site' : '🔴 Masqué sur tout le site'}</div>
      {on && confirmOff !== cle && <button disabled={busy} style={btn('#dc2626', 'white', '#dc2626')} onClick={() => setConfirmOff(cle)}>Désactiver</button>}
      {on && confirmOff === cle && (
        <span style={{ display: 'inline-flex', gap: 6 }}>
          <button disabled={busy} style={btn('#dc2626', 'white', '#dc2626')} onClick={() => { setConfirmOff(null); run({ action: 'reglage', cle, actif: false }, 'Désactivé.') }}>Confirmer la désactivation</button>
          <button style={btn()} onClick={() => setConfirmOff(null)}>Annuler</button>
        </span>
      )}
      {!on && <button disabled={busy} style={btn('#16a34a', 'white', '#16a34a')} onClick={() => run({ action: 'reglage', cle, actif: true }, 'Réactivé.')}>Réactiver</button>}
    </div>
  )

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: 20, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>📄 RCP de l'ANPP</h1>
        <Link href="/admin" style={{ color: '#0284c7', fontSize: 13 }}>← Administration</Link>
      </div>

      {tables && !tables.liens && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, fontSize: 13 }}>
          Tables absentes : appliquez <code>sql/26_rcp_anpp.sql</code> puis importez les rattachements (<code>scripts/import_rcp_links.py</code>).
        </div>
      )}
      {tables && tables.liens && !tables.faits && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, fontSize: 13 }}>
          Appliquez <code>sql/27_rcp_faits.sql</code> pour activer les faits et les interrupteurs.
        </div>
      )}
      {msg && <div style={{ background: '#e0f2fe', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>{msg}</div>}

      {tables?.faits && (
        <section style={box}>
          <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>Interrupteurs d'urgence</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {toggle('faits', 'Faits courts (doses, associations)', reglages?.faits)}
            {toggle('liens', 'Bloc « RCP officiel » en entier', reglages?.liens)}
          </div>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '10px 0 0' }}>
            L'effet est immédiat : le cache des fiches est vidé à chaque action.{' '}
            <button style={btn()} disabled={busy} onClick={() => run({ action: 'actualiser' }, 'Cache des fiches vidé.')}>Actualiser le site</button>{' '}
            à faire après un import en ligne de commande.
          </p>
        </section>
      )}

      {tables?.liens && labos.length > 0 && (
        <section style={box}>
          <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Retrait demandé par un laboratoire</h2>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 8px' }}>
            « Masquer les faits » garde le lien vers le PDF de l'ANPP ; « Retirer » cache aussi le lien. Rien n'est supprimé : on peut tout rétablir.
          </p>
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'grid', gap: 4 }}>
            {labos.map(([labo, v]) => (
              <div key={labo} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
                <span style={{ flex: '1 1 260px' }}>{labo} <span style={{ color: '#64748b' }}>({v.n} RCP{v.retires ? `, ${v.retires} retiré(s)` : ''}{v.masques ? `, ${v.masques} sans faits` : ''})</span></span>
                {tables.faits && <button style={btn()} disabled={busy} onClick={() => run({ action: 'laboratoire', labo, faits_masques: true }, 'Faits masqués.')}>Masquer les faits</button>}
                <button style={btn('#fef2f2', '#991b1b', '#fca5a5')} disabled={busy} onClick={() => run({ action: 'laboratoire', labo, retire: true }, 'Retiré.')}>Retirer</button>
                <button style={btn()} disabled={busy} onClick={() => run({ action: 'laboratoire', labo, retire: false, ...(tables.faits ? { faits_masques: false } : {}) }, 'Rétabli.')}>Rétablir</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tables?.liens && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <div style={box}>
            <input style={{ ...input, width: '100%' }} placeholder="Filtrer (marque, laboratoire)…" value={filter} onChange={e => setFilter(e.target.value)} />
            {tables.faits && (
              <label style={{ display: 'block', fontSize: 12, margin: '8px 0' }}>
                <input type="checkbox" checked={onlyToReview} onChange={e => setOnlyToReview(e.target.checked)} /> Avec des brouillons à relire
              </label>
            )}
            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
              {shown.map(d => (
                <button key={d.rcp_id} onClick={() => setSel(d.rcp_id)} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontSize: 12.5, background: d.rcp_id === sel ? '#e0f2fe' : 'transparent', fontFamily: 'inherit',
                }}>
                  <strong>{d.nom_commercial}</strong>{d.retire ? ' 🔴' : d.faits_masques ? ' 🟠' : ''}
                  <div style={{ color: '#64748b' }}>{d.laboratoire_anpp} · {d.nb_fiches} fiche(s) · 📝 {d.nb_brouillon} ✅ {d.nb_publie}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={box}>
            {!doc ? <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Choisissez un RCP à gauche pour relire ses faits.</p> : (
              <>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <strong style={{ fontSize: 16 }}>{doc.nom_commercial}</strong>
                  <span style={{ fontSize: 12.5, color: '#64748b' }}>{doc.laboratoire_anpp} · version du texte : {doc.version_texte || 'non lue'}</span>
                  <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontSize: 13 }}>PDF ↗</a>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <button style={btn(doc.retire ? '#fef2f2' : 'white')} disabled={busy} onClick={() => run({ action: 'document', rcp: doc.rcp_id, retire: !doc.retire }, doc.retire ? 'Rétabli.' : 'Retiré.')}>
                    {doc.retire ? '🔴 Retiré : rétablir' : 'Retirer ce RCP du site'}
                  </button>
                  {tables.faits && (
                    <button style={btn(doc.faits_masques ? '#fff7ed' : 'white')} disabled={busy} onClick={() => run({ action: 'document', rcp: doc.rcp_id, faits_masques: !doc.faits_masques }, doc.faits_masques ? 'Faits rétablis.' : 'Faits masqués.')}>
                      {doc.faits_masques ? '🟠 Faits masqués : rétablir' : 'Masquer les faits de ce RCP'}
                    </button>
                  )}
                </div>

                {tables.faits && (
                  <>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                      <label style={{ fontSize: 13 }}>Relecteur{' '}
                        <input style={{ ...input, width: 200 }} value={reviewer} onChange={e => saveReviewer(e.target.value)} placeholder="Votre nom" />
                      </label>
                      <button style={btn('#0f172a', 'white', '#0f172a')} disabled={busy || !reviewer.trim() || doc.nb_brouillon === 0}
                        onClick={() => run({ action: 'publier_brouillons', rcp: doc.rcp_id, reviewed_by: reviewer }, 'Publié.', () => loadFaits(doc.rcp_id))}>
                        Publier les {doc.nb_brouillon} brouillon(s) relus
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
                      Vérifiez chaque fait dans le PDF (lien « p.N ») avant de publier. Le contexte en italique est la phrase d'origine : il n'est jamais affiché au public.
                    </p>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {faits.length === 0 && <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Aucun fait pour ce RCP. Lancez <code>extract_rcp_faits.py</code> puis <code>import_rcp_faits.py</code>.</p>}
                      {faits.map(f => {
                        const val = edits[f.id] ?? f.libelle
                        return (
                          <div key={f.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, background: f.status === 'rejete' ? '#f8fafc' : 'white' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{STATUS_LABEL[f.status]}</span>
                              <span style={{ fontSize: 12, color: '#64748b' }}>
                                {f.type === 'dose' ? `dose · ${f.population ?? ''}` : `interaction · ${GRAVITE_LABEL[f.gravite ?? 'non_precisee']}`}
                                {f.cible ? ` · → ${f.cible_type} ${f.cible}` : ''}
                              </span>
                              <a href={`${doc.pdf_url}#page=${f.page}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontSize: 12.5, marginLeft: 'auto' }}>RCP {f.section} · p.{f.page} ↗</a>
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                              <input style={{ ...input, flex: '1 1 260px' }} value={val} maxLength={140} onChange={e => setEdits(s => ({ ...s, [f.id]: e.target.value }))} aria-label="Libellé du fait" />
                              {val !== f.libelle && (
                                <button style={btn()} disabled={busy} onClick={() => run({ action: 'fait', id: f.id, libelle: val }, 'Libellé enregistré.', () => loadFaits(doc.rcp_id))}>Enregistrer</button>
                              )}
                              {f.status !== 'publie' && <button style={btn('#16a34a', 'white', '#16a34a')} disabled={busy || !reviewer.trim() || val !== f.libelle} onClick={() => run({ action: 'fait', id: f.id, status: 'publie', reviewed_by: reviewer }, 'Publié.', () => loadFaits(doc.rcp_id))}>Publier</button>}
                              {f.status !== 'rejete' && <button style={btn('white', '#991b1b', '#fca5a5')} disabled={busy} onClick={() => run({ action: 'fait', id: f.id, status: 'rejete', reviewed_by: reviewer }, 'Rejeté.', () => loadFaits(doc.rcp_id))}>Rejeter</button>}
                              {f.status !== 'brouillon' && <button style={btn()} disabled={busy} onClick={() => run({ action: 'fait', id: f.id, status: 'brouillon' }, 'Remis en brouillon.', () => loadFaits(doc.rcp_id))}>Dépublier</button>}
                            </div>
                            {f.contexte && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>« {f.contexte} »</p>}
                            {f.reviewed_by && <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#94a3b8' }}>Relu par {f.reviewed_by}{f.reviewed_at ? ` le ${String(f.reviewed_at).slice(0, 10)}` : ''}</p>}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
