'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PROMPT_LLM, EXEMPLE_JSON, buildPostDuJour, type DemandeRow } from '@/lib/demandes-core'

type Ligne = {
  medicament: string; dci: string | null; dci_match: string | null; marques: string[]
  wilaya: string | null; commune: string | null; urgence: 'haute' | 'normale'
  demandes: number; jours: number; existante: { id: number; nb_demandes: number } | null
}
type Apercu = {
  lignes: Ligne[]
  rejetees: { index: number; medicament: string; raison: string }[]
  erreur: string | null
  avertissements: string[]
}
type Msg = { text: string; err?: boolean } | null

const STATUT: Record<DemandeRow['statut'], { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'in' },
  trouvee: { label: 'Trouvée', tone: 'ok' },
  expiree: { label: 'Expirée', tone: 'wa' },
  clos: { label: 'Close', tone: 'bad' },
}

const jours = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method, cache: 'no-store',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, json }
}

export default function DemandesClient() {
  const [rows, setRows] = useState<DemandeRow[]>([])
  const [loadError, setLoadError] = useState('')
  const [texte, setTexte] = useState('')
  const [apercu, setApercu] = useState<Apercu | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [onglet, setOnglet] = useState<'actives' | 'historique'>('actives')
  const [showPrompt, setShowPrompt] = useState(false)

  const load = useCallback(async () => {
    const { ok, json } = await api('/api/admin/demandes', 'GET')
    if (ok) { setRows(json.demandes || []); setLoadError('') } else setLoadError(json.error || 'Erreur de chargement')
  }, [])
  useEffect(() => { load() }, [load])

  const actives = useMemo(() => rows.filter(r => r.statut === 'active'), [rows])
  const historique = useMemo(() => rows.filter(r => r.statut !== 'active'), [rows])
  const postPrevu = useMemo(() => buildPostDuJour(actives), [actives])

  async function copier(t: string, ok: string) {
    try { await navigator.clipboard.writeText(t); setMsg({ text: ok }) }
    catch { setMsg({ text: 'Copie refusée par le navigateur : sélectionnez le texte à la main.', err: true }) }
  }

  async function analyser() {
    setBusy('analyser'); setMsg(null); setApercu(null)
    const { ok, json } = await api('/api/admin/demandes', 'POST', { action: 'analyser', texte })
    setBusy(null)
    if (!ok) { setMsg({ text: json.error || 'Analyse impossible', err: true }); return }
    const a: Apercu = json.apercu
    setApercu(a)
    if (a.erreur) setMsg({ text: a.erreur, err: true })
  }

  async function importer() {
    setBusy('importer'); setMsg(null)
    const { ok, json } = await api('/api/admin/demandes', 'POST', { action: 'importer', texte })
    setBusy(null)
    if (!ok) { setMsg({ text: json.error || 'Import impossible', err: true }); return }
    setMsg({ text: `${json.crees} nouvelle(s) demande(s), ${json.fusionnees} ajoutée(s) à une demande existante${json.rejetees?.length ? `, ${json.rejetees.length} écartée(s)` : ''}.` })
    setTexte(''); setApercu(null)
    load()
  }

  async function agir(id: number, body: Record<string, unknown>) {
    setMsg(null)
    const { ok, json } = await api(`/api/admin/demandes/${id}`, 'PATCH', body)
    if (!ok) setMsg({ text: json.error || 'Action impossible', err: true })
    load()
  }

  async function supprimer(r: DemandeRow) {
    if (!window.confirm(`Supprimer définitivement « ${r.medicament} » ? Pour la retirer du post sans l'effacer, utilisez « Clore ».`)) return
    const { ok, json } = await api(`/api/admin/demandes/${r.id}`, 'DELETE')
    if (!ok) setMsg({ text: json.error || 'Suppression impossible', err: true })
    load()
  }

  async function genererPost() {
    setBusy('post'); setMsg(null)
    const { ok, json } = await api('/api/admin/demandes', 'POST', { action: 'post' })
    setBusy(null)
    if (!ok) { setMsg({ text: json.error || 'Génération impossible', err: true }); return }
    setMsg(json.created
      ? { text: json.updated ? 'Brouillon du jour mis à jour.' : 'Brouillon du jour créé.' }
      : { text: json.reason || 'Rien à créer.', err: false })
  }

  const liste = onglet === 'actives' ? actives : historique
  const importable = !!apercu && !apercu.erreur && apercu.lignes.length > 0

  return (
    <div className="adm-page">
      <div className="adm-head">
        <div>
          <h1>Demandes de médicaments</h1>
          <p>Collez le JSON obtenu en passant l’email dans votre LLM. Chaque demande reste active jusqu’à son expiration, et alimente le post Facebook du jour ainsi que la page publique <Link href="/demandes" target="_blank">/demandes</Link>.</p>
        </div>
      </div>

      {msg && <div className={`adm-msg${msg.err ? ' err' : ''}`} role="status">{msg.text}</div>}

      <div className="adm-card">
        <h3>1. Coller le JSON</h3>
        <p style={{ margin: '4px 0 10px', fontSize: 13, color: 'var(--adm-muted)' }}>
          Le lieu est facultatif. Rien d’autre que le besoin n’est enregistré : pas de nom, pas de contact. Un email ou un téléphone dans le texte fait refuser l’entrée.
        </p>
        <label htmlFor="dm-src" className="adm-field">JSON des demandes
          <textarea id="dm-src" className="adm-input" style={{ minHeight: 180, fontFamily: 'var(--adm-mono, monospace)', fontSize: 12.5 }}
            spellCheck={false} value={texte} placeholder={EXEMPLE_JSON}
            onChange={e => { setTexte(e.target.value); setApercu(null) }} />
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="adm-btn p" disabled={!texte.trim() || !!busy} onClick={analyser}>{busy === 'analyser' ? 'Analyse…' : 'Analyser'}</button>
          <button className="adm-btn" disabled={!!busy} onClick={() => setShowPrompt(s => !s)}>{showPrompt ? 'Masquer le prompt' : 'Prompt pour le LLM'}</button>
          {texte && <button className="adm-btn" onClick={() => { setTexte(''); setApercu(null) }}>Vider</button>}
        </div>
        {showPrompt && (
          <div style={{ marginTop: 12 }}>
            <button className="adm-btn" onClick={() => copier(PROMPT_LLM, 'Prompt copié.')}>Copier le prompt</button>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, background: 'var(--adm-surface2)', padding: 12, borderRadius: 8, marginTop: 8 }}>{PROMPT_LLM}</pre>
          </div>
        )}
      </div>

      {apercu && !apercu.erreur && (
        <div className="adm-card">
          <h3>2. Contrôler avant d’importer</h3>
          {apercu.avertissements.map((a, i) => <div key={i} className="adm-msg" style={{ marginBottom: 8 }}>{a}</div>)}
          {apercu.rejetees.map((r, i) => <div key={i} className="adm-msg err" style={{ marginBottom: 8 }}><b>Écartée :</b> {r.medicament}. {r.raison}</div>)}
          {apercu.lignes.length > 0 && (
            <div className="adm-tw">
              <table className="adm-table">
                <thead><tr><th>Médicament</th><th>Lieu</th><th>Urgence</th><th>Demandes</th><th>Expire dans</th><th>Nomenclature</th><th>Effet</th></tr></thead>
                <tbody>
                  {apercu.lignes.map((l, i) => (
                    <tr key={i}>
                      <td><b>{l.medicament}</b>{l.marques.length > 0 && <small style={{ display: 'block' }}>{l.marques.join(', ')}</small>}</td>
                      <td>{l.wilaya || <span style={{ color: 'var(--adm-muted)' }}>non précisé</span>}{l.commune && <small style={{ display: 'block' }}>{l.commune}</small>}</td>
                      <td><span className={`adm-pill ${l.urgence === 'haute' ? 'bad' : 'in'}`}>{l.urgence}</span></td>
                      <td>{l.demandes}</td>
                      <td>{l.jours} j</td>
                      <td>{l.dci_match ? <span className="adm-pill ok">{l.dci_match}</span> : <span className="adm-pill wa">à rattacher</span>}</td>
                      <td>{l.existante
                        ? <span className="adm-pill wa">s’ajoute à une demande active ({l.existante.nb_demandes} → {l.existante.nb_demandes + l.demandes})</span>
                        : <span className="adm-pill ok">nouvelle</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="adm-btn p" disabled={!importable || !!busy} onClick={importer}>
              {busy === 'importer' ? 'Import…' : `Importer ${apercu.lignes.length} demande(s)`}
            </button>
            <span style={{ fontSize: 12.5, color: 'var(--adm-muted)' }}>Importer deux fois le même email double les compteurs : vérifiez la colonne « Effet ».</span>
          </div>
        </div>
      )}

      <div className="adm-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Demandes</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={`adm-btn${onglet === 'actives' ? ' p' : ''}`} onClick={() => setOnglet('actives')}>Actives ({actives.length})</button>
            <button className={`adm-btn${onglet === 'historique' ? ' p' : ''}`} onClick={() => setOnglet('historique')}>30 derniers jours ({historique.length})</button>
          </div>
        </div>
        {loadError && <div className="adm-msg err" style={{ marginTop: 10 }}>{loadError}</div>}
        <div className="adm-tw" style={{ marginTop: 10 }}>
          <table className="adm-table">
            <thead><tr><th>Médicament</th><th>Lieu</th><th>Urgence</th><th>Demandes</th><th>Statut</th><th>Expire</th><th /></tr></thead>
            <tbody>
              {liste.map(r => (
                <tr key={r.id}>
                  <td><b>{r.medicament}</b>
                    {r.marques.length > 0 && <small style={{ display: 'block' }}>{r.marques.join(', ')}</small>}
                    {r.dci_match && <small style={{ display: 'block' }}>Nomenclature : {r.dci_match}</small>}
                  </td>
                  <td>{r.wilaya || <span style={{ color: 'var(--adm-muted)' }}>non précisé</span>}{r.commune && <small style={{ display: 'block' }}>{r.commune} (interne)</small>}</td>
                  <td>
                    <button className={`adm-pill ${r.urgence === 'haute' ? 'bad' : 'in'}`} style={{ border: 0, cursor: 'pointer' }}
                      title="Basculer l’urgence" onClick={() => agir(r.id, { action: 'urgence', urgence: r.urgence === 'haute' ? 'normale' : 'haute' })}>{r.urgence}</button>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.statut === 'active' && <button className="adm-btn" aria-label="Moins une demande" disabled={r.nb_demandes <= 1} onClick={() => agir(r.id, { action: 'compteur', nb_demandes: r.nb_demandes - 1 })}>−</button>}
                    <span style={{ margin: '0 8px', fontVariantNumeric: 'tabular-nums' }}>{r.nb_demandes}</span>
                    {r.statut === 'active' && <button className="adm-btn" aria-label="Une demande de plus" onClick={() => agir(r.id, { action: 'compteur', nb_demandes: r.nb_demandes + 1 })}>+</button>}
                  </td>
                  <td><span className={`adm-pill ${STATUT[r.statut].tone}`}>{STATUT[r.statut].label}</span></td>
                  <td>{r.statut === 'active' ? `${Math.max(0, jours(r.expire_le))} j` : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {r.statut === 'active' && <>
                      <button className="adm-btn p" onClick={() => agir(r.id, { action: 'trouvee' })}>Trouvée</button>
                      <button className="adm-btn" onClick={() => agir(r.id, { action: 'prolonger', jours: 14 })}>+14 j</button>
                      <button className="adm-btn" onClick={() => agir(r.id, { action: 'clore' })}>Clore</button>
                    </>}
                    {r.statut === 'expiree' && <button className="adm-btn" onClick={() => agir(r.id, { action: 'prolonger', jours: 14 })}>Prolonger</button>}
                    {(r.statut === 'trouvee' || r.statut === 'clos') && <button className="adm-btn" onClick={() => agir(r.id, { action: 'reactiver' })}>Réactiver</button>}
                    <button className="adm-btn d" onClick={() => supprimer(r)}>Supprimer</button>
                  </td>
                </tr>
              ))}
              {!liste.length && !loadError && (
                <tr><td colSpan={7} style={{ color: 'var(--adm-muted)' }}>
                  {onglet === 'actives' ? 'Aucune demande active. Collez un premier JSON ci-dessus.' : 'Rien ces 30 derniers jours.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <h3>Post Facebook du jour</h3>
        <p style={{ margin: '4px 0 10px', fontSize: 13, color: 'var(--adm-muted)' }}>
          Le cron dépose chaque matin un brouillon dans <Link href="/admin/social">Publications Facebook</Link> ; vous le validez, il part avec la publication quotidienne.
          Après une modification ci-dessus, régénérez le brouillon tant qu’il n’est pas validé. La commune n’apparaît jamais dans le post.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="adm-btn p" disabled={!!busy} onClick={genererPost}>{busy === 'post' ? 'Génération…' : 'Générer / mettre à jour le brouillon'}</button>
          {postPrevu && <button className="adm-btn" onClick={() => copier(postPrevu.corps, 'Légende copiée.')}>Copier la légende</button>}
        </div>
        {postPrevu
          ? <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, background: 'var(--adm-surface2)', padding: 12, borderRadius: 8, margin: 0 }}>{postPrevu.corps}</pre>
          : <div style={{ color: 'var(--adm-muted)', fontSize: 13 }}>Aucune demande active : aucun post ne sera créé.</div>}
      </div>
    </div>
  )
}
