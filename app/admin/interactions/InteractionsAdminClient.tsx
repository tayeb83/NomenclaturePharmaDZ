'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { NIVEAUX, type Niveau } from '@/lib/interactions-core'
import { NIVEAU_LABEL, SOURCE_LABEL, SOURCE_TYPES, type SourceType } from '@/lib/interactions-admin-core'

type Row = {
  id: number; substance: string; partenaire: string; partenaire_est_classe: boolean; niveau: Niveau
  risque_fr: string; mecanisme_fr: string | null; conduite_fr: string
  risque_ar: string | null; mecanisme_ar: string | null; conduite_ar: string | null; partenaire_ar: string | null
  ar_statut: 'absent' | 'brouillon' | 'relu'; origine: 'ansm' | 'manuelle'
  source_type: SourceType | null; source_titre: string | null; source_url: string | null; source_ref: string | null
  source_version: string; page: number | null
}
type Form = {
  id?: number; substance: string; partenaire: string; partenaire_est_classe: boolean; niveau: Niveau
  risque_fr: string; mecanisme_fr: string; conduite_fr: string
  risque_ar: string; mecanisme_ar: string; conduite_ar: string; partenaire_ar: string
  ar_statut: 'absent' | 'brouillon' | 'relu'
  source_type: SourceType; source_titre: string; source_url: string; source_ref: string
  inverse: boolean; origine?: 'ansm' | 'manuelle'; source_version?: string; page?: number | null
}
type Stats = { total: number; ansm: number; manuelle: number; ar_absent: number }

const EMPTY: Form = {
  substance: '', partenaire: '', partenaire_est_classe: false, niveau: 'precaution_emploi',
  risque_fr: '', mecanisme_fr: '', conduite_fr: '', risque_ar: '', mecanisme_ar: '', conduite_ar: '', partenaire_ar: '',
  ar_statut: 'absent', source_type: 'rcp', source_titre: '', source_url: '', source_ref: '', inverse: true,
}
const NIVEAU_PILL: Record<Niveau, string> = { contre_indication: 'bad', deconseillee: 'bad', precaution_emploi: 'wa', a_prendre_en_compte: '' }
const mono: React.CSSProperties = { fontFamily: 'DM Mono, monospace', fontSize: 12 }

const toForm = (r: Row): Form => ({
  id: r.id, substance: r.substance, partenaire: r.partenaire, partenaire_est_classe: r.partenaire_est_classe, niveau: r.niveau,
  risque_fr: r.risque_fr, mecanisme_fr: r.mecanisme_fr ?? '', conduite_fr: r.conduite_fr,
  risque_ar: r.risque_ar ?? '', mecanisme_ar: r.mecanisme_ar ?? '', conduite_ar: r.conduite_ar ?? '', partenaire_ar: r.partenaire_ar ?? '',
  ar_statut: r.ar_statut,
  // une ligne du thésaurus sans source détaillée : l'ANSM est la source, la saisie n'est pas imposée tant qu'on n'en change pas
  source_type: r.source_type ?? 'ansm', source_titre: r.source_titre ?? (r.origine === 'ansm' ? r.source_version : ''), source_url: r.source_url ?? '',
  source_ref: r.source_ref ?? (r.origine === 'ansm' && r.page ? `p. ${r.page}` : ''),
  inverse: false, origine: r.origine, source_version: r.source_version, page: r.page,
})

/** Champ avec suggestions de substances déjà connues du thésaurus (évite « AMIODARONE » / « amiodarone chlorhydrate »). */
function SubstanceInput({ label, value, onChange, dir }: { label: string; value: string; onChange: (v: string) => void; dir?: 'rtl' }) {
  const [sugg, setSugg] = useState<{ nom: string; classe: boolean }[]>([])
  const timer = useRef<ReturnType<typeof setTimeout>>()
  function type(v: string) {
    onChange(v)
    clearTimeout(timer.current)
    if (v.trim().length < 2) { setSugg([]); return }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/interactions?suggest=${encodeURIComponent(v)}`)
      const data = await res.json().catch(() => ({}))
      setSugg(data.suggestions ?? [])
    }, 250)
  }
  return (
    <label className="adm-field" style={{ position: 'relative' }}>{label}
      <input className="adm-input" value={value} dir={dir} onChange={(e) => type(e.target.value)} onBlur={() => setTimeout(() => setSugg([]), 150)} />
      {sugg.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5, background: 'white', border: '1px solid var(--adm-line)', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,.12)' }}>
          {sugg.map((s) => (
            <div key={s.nom} onMouseDown={() => { onChange(s.nom); setSugg([]) }} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>
              {s.nom} {s.classe && <span className="adm-pill">classe</span>}
            </div>
          ))}
        </div>
      )}
    </label>
  )
}

/**
 * Administration des interactions médicamenteuses : consulter toutes les interactions (thésaurus ANSM et saisies),
 * en créer, les corriger et les sourcer (RCP, article scientifique, étude, site…).
 */
export function InteractionsAdminClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [q, setQ] = useState('')
  const [niveau, setNiveau] = useState('')
  const [origine, setOrigine] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [migration, setMigration] = useState<string | null>(null)

  const say = (ok: boolean, text: string) => setMsg({ ok, text })
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ page: String(page) })
    if (q.trim()) sp.set('q', q.trim())
    if (niveau) sp.set('niveau', niveau)
    if (origine) sp.set('origine', origine)
    const res = await fetch(`/api/admin/interactions?${sp}`)
    const data = await res.json().catch(() => ({}))
    if (data?.migration) { setMigration(data.error); return }
    if (!res.ok) { say(false, data?.error || 'Chargement impossible'); return }
    setMigration(null); setRows(data.rows); setTotal(data.total); setStats(data.stats); setPages(data.pages)
  }, [page, q, niveau, origine])
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t) }, [load])
  useEffect(() => { setPage(1) }, [q, niveau, origine])

  async function save() {
    if (!form) return
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/interactions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { say(false, data?.error || 'Enregistrement refusé'); return }
    say(true, data.inverse_id ? 'Interaction enregistrée dans les deux sens (visible sur les deux fiches).' : 'Interaction enregistrée.')
    setForm(null); load()
  }
  async function remove() {
    if (!form?.id || !confirm('Supprimer définitivement cette interaction ?')) return
    setBusy(true)
    const res = await fetch(`/api/admin/interactions?id=${form.id}`, { method: 'DELETE' })
    setBusy(false)
    if (!res.ok) { say(false, 'Suppression impossible'); return }
    setForm(null); say(true, 'Interaction supprimée.'); load()
  }

  if (migration) {
    return (
      <div className="adm-page"><div className="adm-card">
        <h3>Interactions médicamenteuses</h3>
        <p>{migration}</p>
        <pre style={mono}>psql &quot;$DATABASE_URL&quot; -f sql/40_interactions_admin.sql</pre>
      </div></div>
    )
  }

  const L = (label: string, child: React.ReactNode) => <label className="adm-field">{label}{child}</label>
  const input = (k: keyof Form, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input className="adm-input" value={String(form![k] ?? '')} onChange={(e) => set(k, e.target.value as any)} {...props} />
  )
  const area = (k: keyof Form, rows: number, dir?: 'rtl') => (
    <textarea className="adm-input" rows={rows} dir={dir} value={String(form![k] ?? '')} onChange={(e) => set(k, e.target.value as any)} />
  )
  const ansmModif = form?.id && form.origine === 'ansm'

  return (
    <div className="adm-page">
      <div className="adm-head">
        <div>
          <h1>Interactions médicamenteuses</h1>
          <p>
            Toutes les interactions affichées sur les fiches et dans le comparateur : celles du thésaurus ANSM et celles que vous saisissez ici.
            Une interaction relie deux substances (ou une substance et une classe) : niveau, risque, mécanisme, conduite à tenir, et sa source.
          </p>
        </div>
        <button className="adm-btn p" onClick={() => { setForm({ ...EMPTY }); setMsg(null) }}>+ Nouvelle interaction</button>
      </div>

      {stats && (
        <div className="adm-kpis">
          <div className="adm-kpi"><b>{stats.total}</b><span>interactions</span></div>
          <div className="adm-kpi"><b>{stats.ansm}</b><span>du thésaurus ANSM</span></div>
          <div className="adm-kpi"><b>{stats.manuelle}</b><span>saisies par l’équipe</span></div>
          <div className="adm-kpi"><b>{stats.ar_absent}</b><span>sans traduction arabe</span></div>
        </div>
      )}
      {msg && <div className="adm-msg" style={{ color: msg.ok ? 'var(--adm-ok)' : 'var(--adm-bad)' }}>{msg.text}</div>}

      {form && (
        <div className="adm-card" style={{ display: 'grid', gap: 14 }}>
          <h3>{form.id ? 'Modifier l’interaction' : 'Nouvelle interaction'}
            <button className="adm-btn" onClick={() => setForm(null)}>Fermer</button></h3>
          {ansmModif && (
            <div style={{ background: 'var(--adm-warn-soft)', color: 'var(--adm-warn)', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
              Ligne importée du thésaurus ANSM. Vous pouvez ajouter le mécanisme, l’arabe et une source sans changer son origine.
              Modifier le niveau, le risque ou la conduite à tenir la fait passer en « saisie manuelle » : l’import du thésaurus ne l’écrasera plus.
            </div>
          )}

          <div className="adm-fields">
            <SubstanceInput label="Substance A" value={form.substance} onChange={(v) => set('substance', v)} />
            <SubstanceInput label="Substance (ou classe) B associée" value={form.partenaire} onChange={(v) => set('partenaire', v)} />
            {L('Nom arabe de B (facultatif)', input('partenaire_ar', { dir: 'rtl' }))}
            <label style={{ fontSize: 13, alignSelf: 'end' }}>
              <input type="checkbox" checked={form.partenaire_est_classe} onChange={(e) => set('partenaire_est_classe', e.target.checked)} /> B est une classe de substances
            </label>
          </div>
          <div className="adm-fields">
            {L('Niveau de gravité', (
              <select className="adm-input" value={form.niveau} onChange={(e) => set('niveau', e.target.value as Niveau)}>
                {NIVEAUX.map((n) => <option key={n} value={n}>{NIVEAU_LABEL[n]}</option>)}
              </select>
            ))}
            {!form.id && (
              <label style={{ fontSize: 13, alignSelf: 'end' }}>
                <input type="checkbox" checked={form.inverse} onChange={(e) => set('inverse', e.target.checked)} /> Créer aussi le sens inverse (B + A), pour que l’interaction figure sur les deux fiches
              </label>
            )}
          </div>

          <div className="adm-fields">
            {L('Risque (français)', area('risque_fr', 3))}
            {L('Mécanisme (français)', area('mecanisme_fr', 3))}
            {L('Conduite à tenir (français)', area('conduite_fr', 3))}
          </div>
          <details open={!!(form.risque_ar || form.conduite_ar || form.mecanisme_ar)}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Version arabe (facultative : sinon la fiche arabe affiche le français)</summary>
            <div className="adm-fields" style={{ marginTop: 10 }}>
              {L('الخطر', area('risque_ar', 3, 'rtl'))}
              {L('الآلية', area('mecanisme_ar', 3, 'rtl'))}
              {L('السلوك الواجب اتباعه', area('conduite_ar', 3, 'rtl'))}
              {L('Statut de la traduction', (
                <select className="adm-input" value={form.ar_statut} onChange={(e) => set('ar_statut', e.target.value as Form['ar_statut'])}>
                  <option value="absent">Aucune</option>
                  <option value="brouillon">Brouillon (mention « en cours de relecture »)</option>
                  <option value="relu">Relue</option>
                </select>
              ))}
            </div>
          </details>

          <div style={{ border: '1px dashed var(--adm-line)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
            <strong style={{ fontSize: 13 }}>Source {form.origine === 'ansm' ? '' : '(obligatoire)'}</strong>
            <div className="adm-fields">
              {L('Type de source', (
                <select className="adm-input" value={form.source_type} onChange={(e) => set('source_type', e.target.value as SourceType)}>
                  {SOURCE_TYPES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s].fr}</option>)}
                </select>
              ))}
              {L('Titre (RCP du médicament, article, site…)', input('source_titre', { placeholder: 'Ex. RCP Cordarone 200 mg — rubrique 4.5' }))}
              {L('Adresse (lien)', input('source_url', { style: mono, placeholder: 'https://…' }))}
              {L('Référence précise (page, rubrique, DOI, PMID)', input('source_ref', { placeholder: 'Ex. DOI 10.1000/xyz · rubrique 4.5' }))}
            </div>
            <small style={{ color: 'var(--adm-muted)' }}>Titre ou lien : l’un des deux au moins. Le lien s’affiche en bas de la carte d’interaction, visible des pharmaciens.</small>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="adm-btn p" disabled={busy} onClick={save}>Enregistrer</button>
            {form.id && <button className="adm-btn d" disabled={busy} onClick={remove}>Supprimer</button>}
          </div>
        </div>
      )}

      <div className="adm-card">
        <div className="adm-fields" style={{ marginBottom: 12 }}>
          {L('Rechercher une substance', <input className="adm-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex. amiodarone, AINS, warfarine…" />)}
          {L('Niveau', (
            <select className="adm-input" value={niveau} onChange={(e) => setNiveau(e.target.value)}>
              <option value="">Tous</option>
              {NIVEAUX.map((n) => <option key={n} value={n}>{NIVEAU_LABEL[n]}</option>)}
            </select>
          ))}
          {L('Origine', (
            <select className="adm-input" value={origine} onChange={(e) => setOrigine(e.target.value)}>
              <option value="">Toutes</option>
              <option value="manuelle">Saisies par l’équipe</option>
              <option value="ansm">Thésaurus ANSM</option>
            </select>
          ))}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="adm-table">
            <thead><tr><th>Substance A</th><th>+ B</th><th>Niveau</th><th>Source</th><th>AR</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => { setForm(toForm(r)); setMsg(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                  <td><b>{r.substance}</b></td>
                  <td>{r.partenaire}{r.partenaire_est_classe && <span className="adm-pill" style={{ marginInlineStart: 6 }}>classe</span>}</td>
                  <td><span className={`adm-pill ${NIVEAU_PILL[r.niveau]}`}>{NIVEAU_LABEL[r.niveau]}</span></td>
                  <td style={{ fontSize: 12.5 }}>
                    {r.origine === 'manuelle'
                      ? <>{r.source_type && SOURCE_LABEL[r.source_type].fr}{(r.source_titre || r.source_url) ? ` — ${r.source_titre || r.source_url}` : ''}</>
                      : <span style={{ color: 'var(--adm-muted)' }}>ANSM{r.source_type && r.source_type !== 'ansm' ? ` + ${SOURCE_LABEL[r.source_type].fr}` : ''}</span>}
                  </td>
                  <td>{r.ar_statut === 'absent' ? '—' : r.ar_statut === 'relu' ? '✓' : '…'}</td>
                  <td>{r.origine === 'manuelle' && <span className="adm-pill ok">saisie</span>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--adm-muted)' }}>Aucune interaction ne correspond.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 13 }}>
          <button className="adm-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Précédent</button>
          <span>Page {page} / {pages} · {total} interaction{total > 1 ? 's' : ''}</span>
          <button className="adm-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivant →</button>
        </div>
      </div>
    </div>
  )
}
