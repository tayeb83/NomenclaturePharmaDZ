'use client'

import { useCallback, useEffect, useState } from 'react'
import { NIVEAUX, type Niveau } from '@/lib/interactions-core'
import { NIVEAU_LABEL } from '@/lib/interactions-admin-core'
import {
  ECART_LABEL, GRAVITE_LABEL, STATUT_LABEL, niveauSuggere,
  type Action, type Statut,
} from '@/lib/interactions-veille-core'
import type { CandidatRow, LigneAnsmRow, PreuveRow } from '@/lib/interactions-veille'

type Stats = Record<Statut, number> & { absente: number; divergence_niveau: number }
type Detail = { candidat: CandidatRow; preuves: PreuveRow[]; ansm: LigneAnsmRow[] }

const ONGLETS: { id: string; label: string }[] = [
  { id: 'a_relire', label: 'À relire' }, { id: 'differe', label: 'Différés' },
  { id: 'accepte', label: 'Acceptés' }, { id: 'rejete', label: 'Rejetés' }, { id: 'tous', label: 'Tous' },
]
const GRAVITE_PILL: Record<string, string> = { contre_indiquee: 'bad', deconseillee: 'bad', precaution: 'wa', a_prendre_en_compte: '', non_precisee: '' }
const STATUT_PILL: Record<Statut, string> = { nouveau: 'in', en_revue: 'wa', differe: '', accepte: 'ok', rejete: 'bad' }
const mono: React.CSSProperties = { fontFamily: 'DM Mono, monospace', fontSize: 12 }

/**
 * Relecture des interactions que d'autres sources citent (RCP de l'ANPP) et que le thésaurus ANSM ne dit pas,
 * ou dit à un autre niveau. Rien n'est publié sans une décision ici.
 */
export function VeilleClient() {
  const [rows, setRows] = useState<CandidatRow[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [onglet, setOnglet] = useState('a_relire')
  const [ecart, setEcart] = useState('')
  const [q, setQ] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [migration, setMigration] = useState<string | null>(null)

  // formulaire de décision
  const [niveau, setNiveau] = useState<Niveau>('precaution_emploi')
  const [risque, setRisque] = useState('')
  const [mecanisme, setMecanisme] = useState('')
  const [conduite, setConduite] = useState('')
  const [motif, setMotif] = useState('')
  const [preuveId, setPreuveId] = useState<number | null>(null)

  const say = (ok: boolean, text: string) => setMsg({ ok, text })

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ page: String(page), statut: onglet })
    if (ecart) sp.set('ecart', ecart)
    if (q.trim()) sp.set('q', q.trim())
    const res = await fetch(`/api/admin/interactions/veille?${sp}`)
    const data = await res.json().catch(() => ({}))
    if (data?.migration) { setMigration(data.error); return }
    if (!res.ok) { say(false, data?.error || 'Chargement impossible'); return }
    setMigration(null); setRows(data.rows); setTotal(data.total); setStats(data.stats); setPages(data.pages); setReviewer(data.reviewer || '')
  }, [page, onglet, ecart, q])
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t) }, [load])
  useEffect(() => { setPage(1) }, [onglet, ecart, q])

  async function ouvrir(id: number) {
    setMsg(null)
    const res = await fetch(`/api/admin/interactions/veille?id=${id}`)
    const data: Detail & { error?: string } = await res.json().catch(() => ({} as any))
    if (!res.ok) { say(false, data?.error || 'Chargement impossible'); return }
    setDetail(data)
    setNiveau(niveauSuggere(data.candidat.gravite_source))
    setRisque(''); setMecanisme(''); setConduite(''); setMotif(data.candidat.motif ?? '')
    setPreuveId(data.preuves[0]?.id ?? null)
  }

  async function decider(action: Action) {
    if (!detail) return
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/interactions/veille', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: detail.candidat.id, action, motif, niveau, risque_fr: risque, mecanisme_fr: mecanisme, conduite_fr: conduite, preuve_id: preuveId }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { say(false, data?.error || 'Décision refusée'); return }
    say(true, action === 'accepte'
      ? (data.promoted_id ? 'Interaction créée dans les deux sens (saisie manuelle sourcée).' : 'Divergence retenue et enregistrée.')
      : 'Décision enregistrée.')
    setDetail(null); load()
  }

  if (migration) {
    return (
      <div className="adm-page"><div className="adm-card">
        <h3>Interactions à relire</h3>
        <p>{migration}</p>
        <pre style={mono}>psql &quot;$DATABASE_URL&quot; -f sql/42_interactions_veille.sql</pre>
      </div></div>
    )
  }

  const c = detail?.candidat
  const decide = c && c.statut !== 'accepte' && c.statut !== 'rejete'
  const absente = c?.ecart === 'absente'

  return (
    <div className="adm-page">
      <div className="adm-head">
        <div>
          <h1>Interactions à relire</h1>
          <p>
            Interactions citées par les RCP de l’ANPP et que le thésaurus ANSM ne mentionne pas, ou mentionne à un autre niveau.
            Un écart n’est pas une erreur de l’ANSM : c’est un point à examiner. Rien n’est publié sans votre décision.
          </p>
        </div>
      </div>

      {stats && (
        <div className="adm-kpis">
          <div className="adm-kpi"><b>{stats.nouveau + stats.en_revue}</b><span>à relire</span></div>
          <div className="adm-kpi"><b>{stats.absente}</b><span>absentes de l’ANSM</span></div>
          <div className="adm-kpi"><b>{stats.divergence_niveau}</b><span>niveaux différents</span></div>
          <div className="adm-kpi"><b>{stats.accepte}</b><span>acceptées</span></div>
          <div className="adm-kpi"><b>{stats.rejete}</b><span>rejetées</span></div>
        </div>
      )}
      {msg && <div className="adm-msg" style={{ color: msg.ok ? 'var(--adm-ok)' : 'var(--adm-bad)' }}>{msg.text}</div>}

      {c && detail && (
        <div className="adm-card" style={{ display: 'grid', gap: 14 }}>
          <h3>{c.substance_a} + {c.substance_b}
            <button className="adm-btn" onClick={() => setDetail(null)}>Fermer</button></h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`adm-pill ${STATUT_PILL[c.statut]}`}>{STATUT_LABEL[c.statut]}</span>
            <span className="adm-pill in">{ECART_LABEL[c.ecart]}</span>
            <span className={`adm-pill ${GRAVITE_PILL[c.gravite_source]}`}>RCP : {GRAVITE_LABEL[c.gravite_source]}</span>
            {c.niveau_ansm && <span className="adm-pill">ANSM : {NIVEAU_LABEL[c.niveau_ansm as Niveau] ?? c.niveau_ansm}</span>}
            {c.sens === 'source_plus_grave' && <span className="adm-pill bad">le RCP est plus sévère</span>}
            {c.sens === 'source_moins_grave' && <span className="adm-pill wa">le RCP est moins sévère</span>}
            {c.b_est_classe && <span className="adm-pill in">« {c.substance_b} » est une classe</span>}
            {(c.a_hors_thesaurus || c.b_hors_thesaurus) && <span className="adm-pill wa">substance hors thésaurus ANSM</span>}
            <span style={{ fontSize: 12, color: 'var(--adm-muted)' }}>{c.n_sources} RCP · score {c.score}</span>
          </div>
          {c.reviewed_by && <p style={{ margin: 0, fontSize: 12, color: 'var(--adm-muted)' }}>Dernière décision : {c.reviewed_by}{c.reviewed_at ? ` le ${String(c.reviewed_at).slice(0, 10)}` : ''}{c.motif ? ` — ${c.motif}` : ''}</p>}

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <div>
              <strong style={{ fontSize: 13 }}>Ce que dit l’ANSM</strong>
              {detail.ansm.length > 0 ? detail.ansm.map(l => (
                <div key={l.id} style={{ marginTop: 8, padding: 10, border: '1px solid var(--adm-line)', borderRadius: 8, fontSize: 13 }}>
                  <div><b>{l.substance} + {l.partenaire}</b> <span className="adm-pill">{NIVEAU_LABEL[l.niveau as Niveau] ?? l.niveau}</span></div>
                  <p style={{ margin: '6px 0 0' }}>{l.risque_fr}</p>
                  {l.conduite_fr && <p style={{ margin: '6px 0 0', color: 'var(--adm-muted)' }}>{l.conduite_fr}</p>}
                </div>
              )) : <p style={{ fontSize: 13, color: 'var(--adm-muted)' }}>Aucune ligne pour cette paire.</p>}
              {(c.via?.length ?? 0) > 0 && (
                <p style={{ fontSize: 12, color: 'var(--adm-muted)' }}>Couverture par classe : {c.via!.join(' ; ')}</p>
              )}
            </div>

            <div>
              <strong style={{ fontSize: 13 }}>Ce que disent les RCP de l’ANPP</strong>
              {detail.preuves.map(p => (
                <div key={p.id} style={{ marginTop: 8, padding: 10, border: '1px solid var(--adm-line)', borderRadius: 8, fontSize: 13 }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
                    {absente && decide && <input type="radio" name="preuve" checked={preuveId === p.id} onChange={() => setPreuveId(p.id)} style={{ marginTop: 3 }} />}
                    <span>
                      <b>{p.nom_commercial ?? p.ref}</b>{p.laboratoire ? ` (${p.laboratoire})` : ''}
                      <span style={{ color: 'var(--adm-muted)' }}> · rubrique {p.section || '?'}{p.page ? `, p. ${p.page}` : ''}{p.version ? ` · ${p.version}` : ''}</span>
                      {p.gravite && <> <span className={`adm-pill ${GRAVITE_PILL[p.gravite]}`}>{GRAVITE_LABEL[p.gravite]}</span></>}
                      {p.pdf_url && <> · <a href={p.pdf_url} target="_blank" rel="noopener noreferrer">ouvrir le PDF</a></>}
                      {p.contexte && <em style={{ display: 'block', marginTop: 4, color: 'var(--adm-muted)' }}>« {p.contexte} » <small>(extrait de relecture, non publié)</small></em>}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {decide && (
            <div style={{ border: '1px dashed var(--adm-line)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
              <strong style={{ fontSize: 13 }}>Votre décision {reviewer && <span style={{ fontWeight: 400, color: 'var(--adm-muted)' }}>({reviewer})</span>}</strong>
              {absente ? (
                <>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--adm-muted)' }}>
                    {c.b_est_classe ? 'Accepter crée une interaction substance + classe, en saisie manuelle,' : 'Accepter crée l’interaction dans les deux sens, en saisie manuelle,'} avec le RCP choisi comme source. Le niveau est le vôtre :
                    il ne reprend pas automatiquement celui du RCP. Rédigez le risque avec vos mots : le texte du RCP n’est pas recopié.
                  </p>
                  <div className="adm-fields">
                    <label className="adm-field">Niveau de gravité
                      <select className="adm-input" value={niveau} onChange={e => setNiveau(e.target.value as Niveau)}>
                        {NIVEAUX.map(n => <option key={n} value={n}>{NIVEAU_LABEL[n]}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="adm-fields">
                    <label className="adm-field">Risque (obligatoire)<textarea className="adm-input" rows={3} value={risque} onChange={e => setRisque(e.target.value)} /></label>
                    <label className="adm-field">Mécanisme<textarea className="adm-input" rows={3} value={mecanisme} onChange={e => setMecanisme(e.target.value)} /></label>
                    <label className="adm-field">Conduite à tenir<textarea className="adm-input" rows={3} value={conduite} onChange={e => setConduite(e.target.value)} /></label>
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--adm-muted)' }}>
                  Divergence de niveau : « Retenir » enregistre votre constat sans modifier la ligne de l’ANSM, dont le texte reste celui du thésaurus.
                  Ajoutez une note pour garder la raison de votre choix.
                </p>
              )}
              <label className="adm-field">Note ou motif {absente ? '(obligatoire pour rejeter)' : '(obligatoire pour rejeter)'}
                <input className="adm-input" value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex. sans portée clinique ; déjà couvert par une classe ; à revoir avec le RCP du princeps" />
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="adm-btn p" disabled={busy} onClick={() => decider('accepte')}>{absente ? 'Accepter et créer l’interaction' : 'Retenir la divergence'}</button>
                <button className="adm-btn d" disabled={busy} onClick={() => decider('rejete')}>Rejeter</button>
                <button className="adm-btn" disabled={busy} onClick={() => decider('differe')}>Différer</button>
                {c.statut === 'nouveau' && <button className="adm-btn" disabled={busy} onClick={() => decider('en_revue')}>Marquer en revue</button>}
              </div>
            </div>
          )}
          {!decide && (
            <div><button className="adm-btn" disabled={busy} onClick={() => decider('rouvrir')}>Rouvrir ce candidat</button>
              {c.promoted_id && <span style={{ fontSize: 12, color: 'var(--adm-muted)', marginLeft: 10 }}>Rouvrir ne supprime pas l’interaction déjà créée : la corriger dans « Interactions ».</span>}</div>
          )}
        </div>
      )}

      <div className="adm-card">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {ONGLETS.map(o => (
            <button key={o.id} className={`adm-btn${onglet === o.id ? ' p' : ''}`} onClick={() => setOnglet(o.id)}>{o.label}</button>
          ))}
          <select className="adm-input" style={{ width: 'auto' }} value={ecart} onChange={e => setEcart(e.target.value)}>
            <option value="">Tous les écarts</option>
            <option value="absente">{ECART_LABEL.absente}</option>
            <option value="divergence_niveau">{ECART_LABEL.divergence_niveau}</option>
          </select>
          <input className="adm-input" style={{ width: 220 }} placeholder="Substance…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <table className="adm-table">
          <thead><tr><th>Score</th><th>Paire</th><th>Écart</th><th>RCP</th><th>ANSM</th><th>RCP cités</th><th>Statut</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} onClick={() => ouvrir(r.id)} style={{ cursor: 'pointer' }}>
                <td style={mono}>{r.score}</td>
                <td><b>{r.substance_a}</b> + <b>{r.substance_b}</b></td>
                <td>{ECART_LABEL[r.ecart]}</td>
                <td><span className={`adm-pill ${GRAVITE_PILL[r.gravite_source]}`}>{GRAVITE_LABEL[r.gravite_source]}</span></td>
                <td>{r.niveau_ansm ? (NIVEAU_LABEL[r.niveau_ansm as Niveau] ?? r.niveau_ansm) : '—'}</td>
                <td style={mono}>{r.n_sources}</td>
                <td><span className={`adm-pill ${STATUT_PILL[r.statut]}`}>{STATUT_LABEL[r.statut]}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--adm-muted)' }}>Aucun candidat. Lancez <code>scripts/ddi_gap_rcp.mts --db --apply</code> pour en produire.</td></tr>}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, fontSize: 13 }}>
          <button className="adm-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
          <span>{total} candidat{total > 1 ? 's' : ''} · page {page}/{pages}</span>
          <button className="adm-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>→</button>
        </div>
      </div>
    </div>
  )
}
