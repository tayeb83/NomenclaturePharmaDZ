'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PremiumRecord, PremiumStats } from './types'

const MAX_PHOTOS = 6

const label: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#78350f', marginBottom: 4, fontWeight: 600,
}
const input: React.CSSProperties = {
  width: '100%', border: '1px solid #fcd34d', borderRadius: 8,
  padding: '8px 12px', fontSize: 14, background: '#fff',
}
const grid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10,
}

type Draft = {
  is_active: boolean
  verified: boolean
  plan: string
  starts_on: string
  ends_on: string
  whatsapp_e164: string
  hours_fr: string
  hours_ar: string
  highlight_fr: string
  highlight_ar: string
  admin_note: string
  photos: string[]
}

const EMPTY: Draft = {
  is_active: true, verified: false, plan: 'premium',
  starts_on: '', ends_on: '', whatsapp_e164: '',
  hours_fr: '', hours_ar: '', highlight_fr: '', highlight_ar: '',
  admin_note: '', photos: [],
}

function toDraft(record: PremiumRecord | null): Draft {
  if (!record) return { ...EMPTY }
  return {
    is_active: record.is_active,
    verified: record.verified,
    plan: record.plan || 'premium',
    starts_on: record.starts_on ? record.starts_on.slice(0, 10) : '',
    ends_on: record.ends_on ? record.ends_on.slice(0, 10) : '',
    whatsapp_e164: record.whatsapp_e164 || '',
    hours_fr: record.hours_fr || '',
    hours_ar: record.hours_ar || '',
    highlight_fr: record.highlight_fr || '',
    highlight_ar: record.highlight_ar || '',
    admin_note: record.admin_note || '',
    photos: (record.photos || []).map(p => p.url),
  }
}

type Props = {
  pharmacyId: number
  pharmacyName: string
  onChanged: (isPremium: boolean, verified: boolean) => void
}

export function PremiumEditor({ pharmacyId, pharmacyName, onChanged }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [record, setRecord] = useState<PremiumRecord | null>(null)
  const [stats, setStats] = useState<PremiumStats>({ views_30d: 0, views_month: 0 })
  const [draft, setDraft] = useState<Draft>({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/garde/pharmacies/${pharmacyId}/premium`)
      if (res.status === 503) {
        setUnavailable(true)
        return
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec')
      setUnavailable(false)
      setRecord(json.data || null)
      setDraft(toDraft(json.data || null))
      setStats(json.stats || { views_30d: 0, views_month: 0 })
    } catch (err: any) {
      setError(err.message || 'Impossible de charger l’abonnement.')
    } finally {
      setLoading(false)
    }
  }, [pharmacyId])

  useEffect(() => { setOpen(false); setRecord(null); setDraft({ ...EMPTY }); setSaved(false) }, [pharmacyId])
  useEffect(() => { if (open) load() }, [open, load])

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function setPhoto(index: number, value: string) {
    setDraft(prev => {
      const photos = [...prev.photos]
      photos[index] = value
      return { ...prev, photos }
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/garde/pharmacies/${pharmacyId}/premium`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          photos: draft.photos.map(url => url.trim()).filter(Boolean).map(url => ({ url })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec')
      setRecord(json.data)
      setDraft(toDraft(json.data))
      setSaved(true)
      onChanged(json.data.is_active, json.data.verified)
    } catch (err: any) {
      setError(err.message || "Échec de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  async function stop() {
    if (!window.confirm(`Mettre fin à l'abonnement premium de « ${pharmacyName} » ?`)) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/garde/pharmacies/${pharmacyId}/premium`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec')
      setRecord(null)
      setDraft({ ...EMPTY })
      setSaved(false)
      onChanged(false, false)
    } catch (err: any) {
      setError(err.message || 'Échec.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', textAlign: 'left', background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700,
          color: '#92400e', cursor: 'pointer', marginBottom: 14,
        }}
      >
        ⭐ Fiche premium — badge, WhatsApp, photos, horaires, statistiques ▾
      </button>
    )
  }

  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>⭐ Fiche premium</div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#a16207', fontSize: 12, cursor: 'pointer' }}>
          Replier ▴
        </button>
      </div>

      {unavailable ? (
        <div style={{ fontSize: 12, color: '#92400e' }}>
          Table absente : appliquer <code>sql/15_garde_premium.sql</code> puis recharger.
        </div>
      ) : loading ? (
        <div style={{ fontSize: 12, color: '#a16207' }}>Chargement…</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#78350f', fontWeight: 600 }}>
              <input type="checkbox" checked={draft.is_active} onChange={e => set('is_active', e.target.checked)} />
              Abonnement actif
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#78350f', fontWeight: 600 }}>
              <input type="checkbox" checked={draft.verified} onChange={e => set('verified', e.target.checked)} />
              Badge « Vérifiée »
            </label>
          </div>

          <div style={grid}>
            <div>
              <label style={label}>Début d&apos;abonnement</label>
              <input style={input} type="date" value={draft.starts_on} onChange={e => set('starts_on', e.target.value)} />
            </div>
            <div>
              <label style={label}>Fin d&apos;abonnement <span style={{ fontWeight: 400 }}>(vide = illimité)</span></label>
              <input style={input} type="date" value={draft.ends_on} onChange={e => set('ends_on', e.target.value)} />
            </div>
          </div>

          <div style={grid}>
            <div>
              <label style={label}>WhatsApp</label>
              <input style={input} value={draft.whatsapp_e164} onChange={e => set('whatsapp_e164', e.target.value)} placeholder="0661 23 63 11" />
            </div>
            <div>
              <label style={label}>Formule</label>
              <input style={input} value={draft.plan} onChange={e => set('plan', e.target.value)} placeholder="premium" />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={label}>Horaires (français)</label>
            <input style={input} value={draft.hours_fr} onChange={e => set('hours_fr', e.target.value)} placeholder="Sam–Jeu 8h–20h · Ven 14h–20h" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={label}>Horaires (arabe)</label>
            <input style={input} dir="rtl" lang="ar" value={draft.hours_ar} onChange={e => set('hours_ar', e.target.value)} placeholder="السبت–الخميس 8–20" />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={label}>Accroche (français)</label>
            <input style={input} value={draft.highlight_fr} onChange={e => set('highlight_fr', e.target.value)} placeholder="Parapharmacie, orthopédie, livraison…" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={label}>Accroche (arabe)</label>
            <input style={input} dir="rtl" lang="ar" value={draft.highlight_ar} onChange={e => set('highlight_ar', e.target.value)} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={label}>Photos <span style={{ fontWeight: 400 }}>(URL https, {MAX_PHOTOS} max)</span></label>
            {Array.from({ length: Math.min(draft.photos.length + 1, MAX_PHOTOS) }).map((_, i) => (
              <input
                key={i}
                style={{ ...input, marginBottom: 6 }}
                value={draft.photos[i] || ''}
                onChange={e => setPhoto(i, e.target.value)}
                placeholder="https://…/devanture.jpg"
              />
            ))}
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={label}>Note interne <span style={{ fontWeight: 400 }}>(jamais affichée)</span></label>
            <input style={input} value={draft.admin_note} onChange={e => set('admin_note', e.target.value)} placeholder="Facturation, contact…" />
          </div>

          <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#78350f' }}>
            👁 <strong>{stats.views_month}</strong> consultation(s) ce mois-ci · {stats.views_30d} sur 30 jours
          </div>

          {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                background: saving ? '#d6d3d1' : '#b45309', color: '#fff', border: 'none',
                borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Enregistrement…' : record ? '✓ Mettre à jour le premium' : '⭐ Activer le premium'}
            </button>
            {saved && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Enregistré</span>}
            {record && (
              <button
                onClick={stop}
                disabled={saving}
                style={{
                  marginInlineStart: 'auto', background: 'none', color: '#b45309',
                  border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 14px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Mettre fin à l&apos;abonnement
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
