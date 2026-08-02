'use client'

import { useState } from 'react'

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
  wilayaOptions: [string, string][]
  defaultWilaya: string
  onCreated: (id: number) => void
  onCancel: () => void
}

/**
 * Ajout d'une pharmacie absente du document DSP. Le code commune n'est pas
 * demandé : le serveur reprend celui déjà utilisé pour cette commune, sinon
 * la fiche n'apparaîtrait sur aucune page publique.
 */
export function NewPharmacyForm({ wilayaOptions, defaultWilaya, onCreated, onCancel }: Props) {
  const [wilayaCode, setWilayaCode] = useState(defaultWilaya || (wilayaOptions[0]?.[0] ?? ''))
  const [nameFr, setNameFr] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [communeFr, setCommuneFr] = useState('')
  const [communeAr, setCommuneAr] = useState('')
  const [communeCode, setCommuneCode] = useState('')
  const [addressFr, setAddressFr] = useState('')
  const [addressAr, setAddressAr] = useState('')
  const [phoneRaw, setPhoneRaw] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/garde/pharmacies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wilaya_code: wilayaCode,
          name_fr: nameFr,
          name_ar: nameAr,
          commune_name_fr: communeFr,
          commune_name_ar: communeAr,
          commune_code: communeCode,
          address_fr: addressFr,
          address_ar: addressAr,
          phone_raw: phoneRaw,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec')
      onCreated(json.id)
    } catch (err: any) {
      setError(err.message || 'Échec de la création.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#065f46', marginBottom: 10 }}>
        ➕ Nouvelle pharmacie
      </div>

      <div style={grid}>
        <div>
          <label style={label}>Wilaya</label>
          <select style={input} value={wilayaCode} onChange={e => setWilayaCode(e.target.value)}>
            {wilayaOptions.map(([code, name]) => (
              <option key={code} value={code}>{name} ({code})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={label}>Commune</label>
          <input style={input} value={communeFr} onChange={e => setCommuneFr(e.target.value)} placeholder="Saïda" />
        </div>
      </div>

      <div style={grid}>
        <div>
          <label style={label}>Nom (français)</label>
          <input style={input} value={nameFr} onChange={e => setNameFr(e.target.value)} />
        </div>
        <div>
          <label style={label}>Nom (arabe)</label>
          <input style={input} dir="rtl" lang="ar" value={nameAr} onChange={e => setNameAr(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={label}>Adresse (arabe)</label>
        <input style={input} dir="rtl" lang="ar" value={addressAr} onChange={e => setAddressAr(e.target.value)} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={label}>Adresse (français)</label>
        <input style={input} value={addressFr} onChange={e => setAddressFr(e.target.value)} />
      </div>

      <div style={grid}>
        <div>
          <label style={label}>Téléphone</label>
          <input style={input} value={phoneRaw} onChange={e => setPhoneRaw(e.target.value)} placeholder="07.91.90.96.97" />
        </div>
        <div>
          <label style={label}>Commune (arabe)</label>
          <input style={input} dir="rtl" lang="ar" value={communeAr} onChange={e => setCommuneAr(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={label}>
          Code commune <span style={{ fontWeight: 400, color: '#94a3b8' }}>(vide = repris d&apos;une fiche existante de la commune)</span>
        </label>
        <input style={input} value={communeCode} onChange={e => setCommuneCode(e.target.value)} />
      </div>

      {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={submit}
          disabled={saving || !wilayaCode || !communeFr || (!nameFr && !nameAr)}
          style={{
            background: saving ? '#a7f3d0' : '#059669', color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Création…' : '✓ Créer la fiche'}
        </button>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}
        >
          Annuler
        </button>
      </div>

      <div style={{ fontSize: 11, color: '#047857', marginTop: 8 }}>
        La fiche est créée sans garde : rattachez-la ensuite via un import DSP, ou elle n&apos;apparaîtra pas dans un planning.
      </div>
    </div>
  )
}
