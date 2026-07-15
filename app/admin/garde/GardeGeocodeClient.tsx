'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const GeocodePickerMap = dynamic(() => import('./GeocodePickerMap'), { ssr: false })

type PharmacyRow = {
  id: number
  wilaya_code: string
  wilaya_name_fr: string | null
  commune_name_fr: string
  name_fr: string
  address_fr: string | null
  phone_e164: string | null
  geocode_status: string
}

type SearchResult = { label: string; lat: number; lng: number }

// Centre approximatif de l'Algérie — point de départ tant qu'aucune
// recherche/clic n'a encore positionné le repère.
const DEFAULT_CENTER: [number, number] = [28.0, 2.5]

export function GardeGeocodeClient() {
  const [wilayaFilter, setWilayaFilter] = useState('')
  const [rows, setRows] = useState<PharmacyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selected, setSelected] = useState<PharmacyRow | null>(null)
  const [position, setPosition] = useState<[number, number]>(DEFAULT_CENTER)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ status: 'none' })
      if (wilayaFilter) params.set('wilaya', wilayaFilter)
      const res = await fetch(`/api/admin/garde/pharmacies?${params}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setRows(json.data || [])
    } catch {
      setError('Impossible de charger la liste.')
    } finally {
      setLoading(false)
    }
  }, [wilayaFilter])

  useEffect(() => { load() }, [load])

  const wilayaOptions = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach(r => { if (!map.has(r.wilaya_code)) map.set(r.wilaya_code, r.wilaya_name_fr || r.wilaya_code) })
    return Array.from(map.entries())
  }, [rows])

  function selectPharmacy(row: PharmacyRow) {
    setSelected(row)
    setSearchQuery([row.address_fr, row.commune_name_fr, 'Algérie'].filter(Boolean).join(', '))
    setSearchResults([])
    setPosition(DEFAULT_CENTER)
  }

  async function runSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchResults([])
    try {
      const res = await fetch(`/api/admin/garde/geocode-search?q=${encodeURIComponent(searchQuery)}`)
      const json = await res.json()
      setSearchResults(json.data || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/garde/pharmacies/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: position[0], lng: position[1] }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Échec')
      }
      setRows(prev => prev.filter(r => r.id !== selected.id))
      setSelected(null)
    } catch (err: any) {
      alert(err.message || "Échec de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <header style={{
        background: '#0f172a', color: 'white', padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>💊 Géocodage — Pharmacies de garde</div>
        <Link href="/admin" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>
          ← Admin
        </Link>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
        {/* Colonne liste */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, height: 'fit-content' }}>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>Wilaya</label>
          <select
            value={wilayaFilter}
            onChange={e => setWilayaFilter(e.target.value)}
            style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: 8, padding: '8px 12px', fontSize: 14, marginBottom: 14 }}
          >
            <option value="">Toutes les wilayas</option>
            {wilayaOptions.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>

          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
            {loading ? 'Chargement…' : `${rows.length} pharmacie(s) à géocoder`}
          </div>

          {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 560, overflowY: 'auto' }}>
            {rows.map(row => (
              <button
                key={row.id}
                onClick={() => selectPharmacy(row)}
                style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                  border: `1px solid ${selected?.id === row.id ? '#0284c7' : '#e2e8f0'}`,
                  background: selected?.id === row.id ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{row.name_fr}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {row.address_fr || row.commune_name_fr} · {row.wilaya_name_fr || row.wilaya_code}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Colonne pointage */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
          {!selected ? (
            <div style={{ color: '#64748b', fontSize: 14, padding: 40, textAlign: 'center' }}>
              Sélectionnez une pharmacie à gauche pour la positionner sur la carte.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{selected.name_fr}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {selected.address_fr} — {selected.commune_name_fr}, {selected.wilaya_name_fr || selected.wilaya_code}
                  {selected.phone_e164 && ` · ${selected.phone_e164}`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
                  placeholder="Rechercher un lieu (quartier, rue, repère…)"
                  style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}
                />
                <button
                  onClick={runSearch}
                  disabled={searching}
                  style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {searching ? '…' : 'Chercher'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setPosition([r.lat, r.lng])}
                      style={{
                        textAlign: 'left', fontSize: 12, color: '#334155', background: '#f8fafc',
                        border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
                      }}
                    >
                      📍 {r.label}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                Cliquez sur la carte pour ajuster précisément le repère, puis enregistrez.
              </div>

              <div style={{ height: 420, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 14 }}>
                <GeocodePickerMap position={position} onChange={(lat, lng) => setPosition([lat, lng])} />
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={save}
                  disabled={saving}
                  style={{
                    background: saving ? '#94a3b8' : '#059669', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Enregistrement…' : '✓ Enregistrer la position'}
                </button>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
