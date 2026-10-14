'use client'

import { useCallback, useEffect, useState } from 'react'
import { pharmacyPath } from '@/lib/annuaire-types'

const label: React.CSSProperties = { display: 'block', fontSize: 11, color: '#065f46', marginBottom: 4, fontWeight: 600 }
const input: React.CSSProperties = { width: '100%', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 12px', fontSize: 14, background: '#fff' }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }
const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

type Draft = {
  verified: boolean
  verified_at: string
  is_hidden: boolean
  mobile_raw: string
  opens_at: string
  closes_at: string
  closed_days: number[]
  admin_note: string
}

const EMPTY: Draft = { verified: false, verified_at: '', is_hidden: false, mobile_raw: '', opens_at: '', closes_at: '', closed_days: [], admin_note: '' }

type Record = {
  verified: boolean; verified_at: string | null; is_hidden: boolean; mobile_raw: string | null
  opens_at: string | null; closes_at: string | null; closed_days: number[] | null; admin_note: string | null
}

function toDraft(r: Record | null): Draft {
  if (!r) return { ...EMPTY }
  return {
    verified: r.verified, verified_at: r.verified_at ? r.verified_at.slice(0, 10) : '', is_hidden: r.is_hidden,
    mobile_raw: r.mobile_raw || '', opens_at: r.opens_at ? r.opens_at.slice(0, 5) : '', closes_at: r.closes_at ? r.closes_at.slice(0, 5) : '',
    closed_days: r.closed_days || [], admin_note: r.admin_note || '',
  }
}

/**
 * Réglages de l'annuaire pour N'IMPORTE QUELLE pharmacie : badge « Vérifiée »,
 * horaires habituels (défaut 10:00–21:00), jours de repos, mobile, masquage.
 * Indépendant de l'abonnement premium.
 */
export function ProfileEditor({
  pharmacy, onChanged,
}: {
  pharmacy: { id: number; name_fr: string | null; name_ar: string | null }
  onChanged?: (verified: boolean) => void
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saved, setSaved] = useState<Draft>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(''); setMessage('')
    try {
      const res = await fetch(`/api/admin/garde/pharmacies/${pharmacy.id}/profile`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec du chargement')
      const d = toDraft(json.data)
      setDraft(d); setSaved(d)
    } catch (err: any) {
      setError(err.message || 'Échec du chargement')
    } finally {
      setLoading(false)
    }
  }, [pharmacy.id])

  useEffect(() => { load() }, [load])

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  function set<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(p => ({ ...p, [key]: value })); setMessage('') }
  function toggleDay(d: number) {
    set('closed_days', draft.closed_days.includes(d) ? draft.closed_days.filter(x => x !== d) : [...draft.closed_days, d].sort())
  }

  async function save() {
    setSaving(true); setError(''); setMessage('')
    try {
      const res = await fetch(`/api/admin/garde/pharmacies/${pharmacy.id}/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec')
      const d = toDraft(json.data)
      setDraft(d); setSaved(d)
      setMessage('Enregistré')
      onChanged?.(d.verified)
    } catch (err: any) {
      setError(err.message || "Échec de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const publicPath = pharmacyPath(pharmacy)
  async function copyLink() {
    const url = `${window.location.origin}${publicPath}`
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { window.prompt('Lien', url) }
  }

  return (
    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#064e3b' }}>📒 Annuaire — badge, horaires, visibilité</div>
        <a href={publicPath} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#047857', marginInlineStart: 'auto' }}>Voir la fiche publique ↗</a>
        <button type="button" onClick={copyLink} style={{ fontSize: 12, border: '1px solid #6ee7b7', background: '#fff', color: '#047857', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
          {copied ? 'Lien copié' : '🔗 Copier le lien stable'}
        </button>
      </div>

      {loading ? <div style={{ fontSize: 13, color: '#64748b' }}>Chargement…</div> : (
        <>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 12 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={draft.verified} onChange={e => set('verified', e.target.checked)} />
              ✅ Badge « Vérifiée »
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, fontWeight: 600, color: draft.is_hidden ? '#b91c1c' : undefined }}>
              <input type="checkbox" checked={draft.is_hidden} onChange={e => set('is_hidden', e.target.checked)} />
              🙈 Masquer la fiche (annuaire et sitemap)
            </label>
          </div>

          <div style={grid}>
            <div>
              <label style={label}>Vérifiée le <span style={{ fontWeight: 400 }}>(vide = aujourd&apos;hui)</span></label>
              <input style={input} type="date" value={draft.verified_at} disabled={!draft.verified} onChange={e => set('verified_at', e.target.value)} />
            </div>
            <div>
              <label style={label}>Mobile</label>
              <input style={{ ...input, direction: 'ltr' }} value={draft.mobile_raw} onChange={e => set('mobile_raw', e.target.value)} placeholder="0550 12 34 56" />
            </div>
          </div>

          <div style={grid}>
            <div>
              <label style={label}>Ouverture habituelle <span style={{ fontWeight: 400 }}>(vide = 10:00)</span></label>
              <input style={input} type="time" value={draft.opens_at} onChange={e => set('opens_at', e.target.value)} />
            </div>
            <div>
              <label style={label}>Fermeture habituelle <span style={{ fontWeight: 400 }}>(vide = 21:00)</span></label>
              <input style={input} type="time" value={draft.closes_at} onChange={e => set('closes_at', e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={label}>Jours de repos (hors garde)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DAYS.map((name, d) => (
                <button key={d} type="button" onClick={() => toggleDay(d)} aria-pressed={draft.closed_days.includes(d)}
                  style={{
                    padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${draft.closed_days.includes(d) ? '#dc2626' : '#a7f3d0'}`,
                    background: draft.closed_days.includes(d) ? '#fee2e2' : '#fff',
                    color: draft.closed_days.includes(d) ? '#b91c1c' : '#047857',
                  }}>{name}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={label}>Note interne (jamais affichée)</label>
            <input style={input} value={draft.admin_note} onChange={e => set('admin_note', e.target.value)} />
          </div>

          {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={save} disabled={saving || !dirty} style={{
              background: saving || !dirty ? '#cbd5e1' : '#059669', color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: saving || !dirty ? 'not-allowed' : 'pointer',
            }}>{saving ? 'Enregistrement…' : '✓ Enregistrer'}</button>
            {message && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{message}</span>}
          </div>
        </>
      )}
    </div>
  )
}
