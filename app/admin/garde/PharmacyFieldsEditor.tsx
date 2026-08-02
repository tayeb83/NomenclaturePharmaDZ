'use client'

import { useEffect, useState } from 'react'
import type { AdminPharmacy } from './types'

const label: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 600,
}
const input: React.CSSProperties = {
  width: '100%', border: '1px solid #cbd5e1', borderRadius: 8,
  padding: '8px 12px', fontSize: 14, background: '#fff',
}
const grid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10,
}

type Props = {
  pharmacy: AdminPharmacy
  onSaved: (updated: Partial<AdminPharmacy>) => void
  onDeleted: (id: number) => void
}

type Draft = {
  type: string
  name_fr: string
  name_ar: string
  commune_name_fr: string
  commune_name_ar: string
  commune_code: string
  address_fr: string
  address_ar: string
  phone_raw: string
  phone_e164: string
}

function toDraft(p: AdminPharmacy): Draft {
  return {
    type: p.type || 'officine',
    name_fr: p.name_fr || '',
    name_ar: p.name_ar || '',
    commune_name_fr: p.commune_name_fr || '',
    commune_name_ar: p.commune_name_ar || '',
    commune_code: p.commune_code || '',
    address_fr: p.address_fr || '',
    address_ar: p.address_ar || '',
    phone_raw: p.phone_raw || '',
    phone_e164: p.phone_e164 || '',
  }
}

export function PharmacyFieldsEditor({ pharmacy, onSaved, onDeleted }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(pharmacy))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Changer de pharmacie dans la liste doit repartir de ses valeurs à elle.
  useEffect(() => { setDraft(toDraft(pharmacy)); setSaved(false); setError('') }, [pharmacy])

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(pharmacy))

  function set<K extends keyof Draft>(key: K, value: string) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/garde/pharmacies/${pharmacy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec')
      onSaved(json.data || {})
      setSaved(true)
    } catch (err: any) {
      setError(err.message || "Échec de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setDeleting(true)
    setError('')
    try {
      // Premier appel sans confirmation : le serveur renvoie 409 avec le
      // nombre de gardes qui partiraient avec la fiche.
      const probe = await fetch(`/api/admin/garde/pharmacies/${pharmacy.id}`, { method: 'DELETE' })
      const info = await probe.json().catch(() => ({}))

      if (probe.status === 409) {
        const name = info.pharmacy || 'cette pharmacie'
        const duties = info.duty_periods || 0
        const message = duties > 0
          ? `Supprimer « ${name} » ?\n\n${duties} garde(s) rattachée(s) seront supprimées avec elle. Action irréversible.`
          : `Supprimer « ${name} » ? Action irréversible.`
        if (!window.confirm(message)) return

        const res = await fetch(`/api/admin/garde/pharmacies/${pharmacy.id}?confirm=1`, { method: 'DELETE' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Échec')
      } else if (!probe.ok) {
        throw new Error(info.error || 'Échec')
      }

      onDeleted(pharmacy.id)
    } catch (err: any) {
      setError(err.message || 'Échec de la suppression.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
        ✏️ Fiche — tous les champs
      </div>

      <div style={grid}>
        <div>
          <label style={label}>Nom (français)</label>
          <input style={input} value={draft.name_fr} onChange={e => set('name_fr', e.target.value)} placeholder="Pharmacie…" />
        </div>
        <div>
          <label style={label}>Nom (arabe)</label>
          <input style={input} dir="rtl" lang="ar" value={draft.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="صيدلية…" />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={label}>Adresse (arabe)</label>
        <input style={input} dir="rtl" lang="ar" value={draft.address_ar} onChange={e => set('address_ar', e.target.value)} placeholder="العنوان بالعربية" />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={label}>Adresse (français)</label>
        <input style={input} value={draft.address_fr} onChange={e => set('address_fr', e.target.value)} placeholder="Rue, quartier, repère…" />
      </div>

      <div style={grid}>
        <div>
          <label style={label}>Téléphone (tel que sur le document)</label>
          <input style={input} value={draft.phone_raw} onChange={e => set('phone_raw', e.target.value)} placeholder="07.91.90.96.97" />
        </div>
        <div>
          <label style={label}>Téléphone E.164 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(déduit si vide)</span></label>
          <input style={input} value={draft.phone_e164} onChange={e => set('phone_e164', e.target.value)} placeholder="+213791909697" />
        </div>
      </div>

      <div style={grid}>
        <div>
          <label style={label}>Commune</label>
          <input style={input} value={draft.commune_name_fr} onChange={e => set('commune_name_fr', e.target.value)} />
        </div>
        <div>
          <label style={label}>Commune (arabe)</label>
          <input style={input} dir="rtl" lang="ar" value={draft.commune_name_ar} onChange={e => set('commune_name_ar', e.target.value)} />
        </div>
      </div>

      <div style={grid}>
        <div>
          <label style={label}>Code commune <span style={{ fontWeight: 400, color: '#94a3b8' }}>(clé des pages publiques)</span></label>
          <input style={input} value={draft.commune_code} onChange={e => set('commune_code', e.target.value)} />
        </div>
        <div>
          <label style={label}>Type</label>
          <input style={input} value={draft.type} onChange={e => set('type', e.target.value)} placeholder="officine" />
        </div>
      </div>

      {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={save}
          disabled={saving || !dirty}
          style={{
            background: saving || !dirty ? '#cbd5e1' : '#0284c7', color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700,
            cursor: saving || !dirty ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Enregistrement…' : '✓ Enregistrer la fiche'}
        </button>
        {saved && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Fiche enregistrée</span>}

        <button
          onClick={remove}
          disabled={deleting}
          style={{
            marginInlineStart: 'auto', background: 'none', color: '#dc2626',
            border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px',
            fontSize: 12, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer',
          }}
        >
          {deleting ? 'Suppression…' : '🗑 Supprimer la pharmacie'}
        </button>
      </div>

      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
        Un réimport DSP ne réécrit pas ces champs : l&apos;extraction ne remplit que les cases vides.
      </div>
    </div>
  )
}
