'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { AdminSpecialite, ItemKind } from '@/lib/specialites'

const input: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', fontSize: 13.5, fontFamily: 'inherit', width: '100%' }
const btn: React.CSSProperties = { border: 0, borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: '#1d4e9e', color: 'white' }
const btnGhost: React.CSSProperties = { ...btn, background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }
const card: React.CSSProperties = { background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }
const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }

type Draft = {
  slug: string; titre_fr: string; titre_ar: string; description_fr: string; description_ar: string; ordre: number; actif: boolean
}
const EMPTY: Draft = { slug: '', titre_fr: '', titre_ar: '', description_fr: '', description_ar: '', ordre: 0, actif: true }

async function api(method: 'GET' | 'POST', body?: unknown, qs = '') {
  const res = await fetch(`/api/admin/specialites${qs}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, json }
}

/**
 * Gestion des spécialités : titre et présentation FR/AR, classes ATC et
 * substances rattachées. Le public voit les compteurs calculés, jamais saisis.
 */
export function SpecialitesClient() {
  const [list, setList] = useState<AdminSpecialite[]>([])
  const [tableMissing, setTableMissing] = useState(false)
  const [current, setCurrent] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null)

  const [kind, setKind] = useState<ItemKind>('atc')
  const [valeur, setValeur] = useState('')
  const [libAr, setLibAr] = useState('')
  const [suggestions, setSuggestions] = useState<{ value: string; label: string }[]>([])
  const [arEdits, setArEdits] = useState<Record<number, string>>({})
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const flash = (text: string, error = false) => setMsg({ text, error })

  const load = useCallback(async (keep?: string | null) => {
    const { ok, json } = await api('GET')
    if (!ok) { flash(json.error || 'Chargement impossible', true); return }
    setList(json.specialites || [])
    setTableMissing(!!json.tableMissing)
    setArEdits({})
    const slug = keep ?? current
    const found = (json.specialites as AdminSpecialite[]).find(s => s.slug === slug) ?? json.specialites?.[0]
    if (found) { setCurrent(found.slug); setCreating(false); fill(found) }
  }, [current])
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function fill(s: AdminSpecialite) {
    setDraft({
      slug: s.slug, titre_fr: s.titre_fr, titre_ar: s.titre_ar ?? '', description_fr: s.description_fr ?? '',
      description_ar: s.description_ar ?? '', ordre: s.ordre, actif: s.actif,
    })
  }

  // Aide à la saisie : classes ATC ou substances qui correspondent.
  useEffect(() => {
    clearTimeout(timer.current)
    if (valeur.trim().length < 2) { setSuggestions([]); return }
    timer.current = setTimeout(async () => {
      const { ok, json } = await api('GET', undefined, `?suggest=${kind}&q=${encodeURIComponent(valeur)}`)
      if (!ok) return
      setSuggestions((json.results || []).map((r: any) =>
        kind === 'atc' ? { value: r.code, label: `${r.code} — ${r.label}` } : { value: r.dci, label: `${r.dci} (${r.nb} fiches)` }))
    }, 250)
    return () => clearTimeout(timer.current)
  }, [valeur, kind])

  const sel = list.find(s => s.slug === current) ?? null

  async function save() {
    const { ok, json } = await api('POST', { action: 'save', ...draft })
    if (!ok) { flash(json.error || 'Échec', true); return }
    flash('Spécialité enregistrée.')
    await load(draft.slug)
  }

  async function remove() {
    if (!sel) return
    if (!window.confirm(`Supprimer « ${sel.titre_fr} » et sa liste de classes ? Les médicaments ne sont pas touchés.`)) return
    const { ok, json } = await api('POST', { action: 'delete', slug: sel.slug })
    if (!ok) { flash(json.error || 'Échec', true); return }
    flash('Spécialité supprimée.')
    setCurrent(null)
    await load(null)
  }

  async function addItem() {
    if (!sel || !valeur.trim()) return
    const { ok, json } = await api('POST', { action: 'add_item', slug: sel.slug, kind, valeur, libelle_ar: libAr })
    if (!ok) { flash(json.error || 'Échec', true); return }
    flash(`${valeur.trim().toUpperCase()} ajouté.`)
    setValeur(''); setLibAr(''); setSuggestions([])
    await load(sel.slug)
  }

  async function saveAr(id: number) {
    const { ok, json } = await api('POST', { action: 'update_item', id, libelle_ar: arEdits[id] ?? '' })
    if (!ok) { flash(json.error || 'Échec', true); return }
    flash('Libellé arabe enregistré.')
    await load(sel?.slug)
  }

  async function removeItem(id: number, name: string) {
    if (!window.confirm(`Retirer « ${name} » de cette spécialité ?`)) return
    const { ok, json } = await api('POST', { action: 'remove_item', id })
    if (!ok) { flash(json.error || 'Échec', true); return }
    flash(`${name} retiré.`)
    await load(sel?.slug)
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>🗂️ Spécialités</h1>
        <Link href="/admin" style={{ color: '#0284c7', fontSize: 13 }}>← Administration</Link>
      </div>

      {tableMissing && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
          Tables absentes : appliquez <code>sql/28_specialites.sql</code> avant de modifier. En attendant, le site affiche la Dentisterie par défaut.
        </div>
      )}
      {msg && (
        <div role="status" style={{ background: msg.error ? '#fee2e2' : '#d1fae5', borderRadius: 8, padding: '9px 12px', marginBottom: 16, fontSize: 13.5 }}>{msg.text}</div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {list.map(s => (
          <button key={s.slug} type="button" onClick={() => { setCurrent(s.slug); setCreating(false); fill(s); setArEdits({}) }}
            style={{ ...btnGhost, ...(s.slug === current && !creating ? { background: '#12233f', color: 'white' } : {}), opacity: s.actif ? 1 : 0.55 }}>
            {s.titre_fr}
          </button>
        ))}
        <button type="button" disabled={tableMissing} style={{ ...btn, background: '#059669' }}
          onClick={() => { setCreating(true); setCurrent(null); setDraft({ ...EMPTY, ordre: list.length + 1 }) }}>
          + Nouvelle spécialité
        </button>
      </div>

      {(sel || creating) && (
        <div style={card}>
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>{creating ? 'Nouvelle spécialité' : 'Présentation'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <div>
              <label style={label} htmlFor="sp-slug">Identifiant (adresse de la page)</label>
              <input id="sp-slug" style={{ ...input, background: creating ? 'white' : '#f1f5f9' }} value={draft.slug} readOnly={!creating}
                placeholder="dentaire" onChange={e => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} />
              <span style={{ fontSize: 11.5, color: '#64748b' }}>/specialites/{draft.slug || '…'}</span>
            </div>
            <div>
              <label style={label} htmlFor="sp-ordre">Ordre d'affichage</label>
              <input id="sp-ordre" type="number" style={input} value={draft.ordre} onChange={e => setDraft({ ...draft, ordre: Number(e.target.value) })} />
              <label style={{ fontSize: 13, display: 'block', marginTop: 8 }}>
                <input type="checkbox" checked={draft.actif} onChange={e => setDraft({ ...draft, actif: e.target.checked })} /> Visible sur le site
              </label>
            </div>
            <div>
              <label style={label} htmlFor="sp-tfr">Titre (français)</label>
              <input id="sp-tfr" style={input} value={draft.titre_fr} onChange={e => setDraft({ ...draft, titre_fr: e.target.value })} />
            </div>
            <div>
              <label style={label} htmlFor="sp-tar">العنوان (arabe)</label>
              <input id="sp-tar" dir="rtl" style={input} value={draft.titre_ar} onChange={e => setDraft({ ...draft, titre_ar: e.target.value })} />
            </div>
            <div>
              <label style={label} htmlFor="sp-dfr">Présentation (français, 1 à 2 phrases)</label>
              <textarea id="sp-dfr" rows={3} style={input} value={draft.description_fr} onChange={e => setDraft({ ...draft, description_fr: e.target.value })} />
            </div>
            <div>
              <label style={label} htmlFor="sp-dar">التقديم (arabe)</label>
              <textarea id="sp-dar" dir="rtl" rows={3} style={input} value={draft.description_ar} onChange={e => setDraft({ ...draft, description_ar: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="button" style={btn} onClick={save} disabled={tableMissing}>Enregistrer</button>
            {!creating && sel && (
              <>
                <Link href={`/specialites/${sel.slug}`} target="_blank" style={{ ...btnGhost, textDecoration: 'none', display: 'inline-block' }}>Voir la page ↗</Link>
                <button type="button" style={{ ...btnGhost, color: '#b91c1c', marginInlineStart: 'auto' }} onClick={remove} disabled={tableMissing}>Supprimer</button>
              </>
            )}
          </div>
        </div>
      )}

      {sel && !creating && (
        <div style={card}>
          <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Classes ATC et substances</h2>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 12px' }}>
            Une classe ATC (ex. N01B) couvre toutes ses sous-classes. Les compteurs sont calculés à partir de la nomenclature.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: 8 }}>Type</th>
                  <th style={{ padding: 8 }}>Code / DCI</th>
                  <th style={{ padding: 8 }}>Libellé officiel</th>
                  <th style={{ padding: 8 }}>Libellé arabe</th>
                  <th style={{ padding: 8 }}>DCI</th>
                  <th style={{ padding: 8 }}>Fiches</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {sel.items.map(it => (
                  <tr key={it.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{it.kind === 'atc' ? 'ATC' : 'Substance'}</td>
                    <td style={{ padding: 8, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{it.valeur}</td>
                    <td style={{ padding: 8 }}>{it.kind === 'atc' ? it.libelle_fr : '—'}</td>
                    <td style={{ padding: 8, minWidth: 190 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input dir="rtl" aria-label={`Libellé arabe de ${it.valeur}`} style={input}
                          value={arEdits[it.id] ?? it.libelle_ar ?? ''}
                          onChange={e => setArEdits({ ...arEdits, [it.id]: e.target.value })} />
                        {arEdits[it.id] !== undefined && arEdits[it.id] !== (it.libelle_ar ?? '') && (
                          <button type="button" style={btn} onClick={() => saveAr(it.id)} disabled={tableMissing}>OK</button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 8 }}>{it.nb_dci}</td>
                    <td style={{ padding: 8 }}>{it.nb_produits}</td>
                    <td style={{ padding: 8 }}>
                      <button type="button" style={{ ...btnGhost, color: '#b91c1c', padding: '5px 10px' }} disabled={tableMissing}
                        onClick={() => removeItem(it.id, it.valeur)}>Retirer</button>
                    </td>
                  </tr>
                ))}
                {sel.items.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 14, color: '#64748b' }}>Aucune classe. Ajoutez-en ci-dessous.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: 16, paddingTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>Ajouter</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(180px, 1.4fr) minmax(160px, 1fr) auto', gap: 8, alignItems: 'end' }}>
              <div>
                <label style={label} htmlFor="it-kind">Type</label>
                <select id="it-kind" style={{ ...input, width: 'auto' }} value={kind} onChange={e => { setKind(e.target.value as ItemKind); setValeur('') }}>
                  <option value="atc">Classe ATC</option>
                  <option value="dci">Substance (DCI)</option>
                </select>
              </div>
              <div>
                <label style={label} htmlFor="it-val">{kind === 'atc' ? 'Code ou nom de la classe' : 'Nom de la substance'}</label>
                <input id="it-val" list="it-sugg" style={input} value={valeur} autoComplete="off"
                  placeholder={kind === 'atc' ? 'N01B ou « anesthésiques »' : 'CHLORHEXIDINE'}
                  onChange={e => setValeur(e.target.value)} />
                <datalist id="it-sugg">
                  {suggestions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </datalist>
              </div>
              <div>
                <label style={label} htmlFor="it-ar">Libellé arabe (facultatif)</label>
                <input id="it-ar" dir="rtl" style={input} value={libAr} onChange={e => setLibAr(e.target.value)} />
              </div>
              <button type="button" style={btn} onClick={addItem} disabled={tableMissing || !valeur.trim()}>Ajouter</button>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Le code ou la DCI doit exister dans la base : sinon l'ajout est refusé.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
