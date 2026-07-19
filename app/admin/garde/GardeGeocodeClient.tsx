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
  name_fr: string | null
  name_ar: string | null
  address_fr: string | null
  address_ar: string | null
  phone_e164: string | null
  geocode_status: string
}

type SearchResult = { label: string; lat: number; lng: number }

type WilayaStats = {
  wilaya_code: string
  wilaya_name_fr: string | null
  total_pharmacies: number
  geocoded_count: number
  last_imported_at: string | null
  period_from: string | null
  period_to: string | null
}

// Centre approximatif de l'Algérie — point de départ tant qu'aucune
// recherche/clic n'a encore positionné le repère.
const DEFAULT_CENTER: [number, number] = [28.0, 2.5]

// Accepte un lien copié depuis openstreetmap.org (?mlat=..&mlon=.. ou
// #map=zoom/lat/lng) ou simplement "lat, lng" collé à la main.
function parseCoordsInput(text: string): [number, number] | null {
  const trimmed = text.trim()

  const mlatMatch = trimmed.match(/mlat=(-?\d+\.?\d*)&mlon=(-?\d+\.?\d*)/)
  if (mlatMatch) return [parseFloat(mlatMatch[1]), parseFloat(mlatMatch[2])]

  const hashMatch = trimmed.match(/#map=\d+\.?\d*\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)/)
  if (hashMatch) return [parseFloat(hashMatch[1]), parseFloat(hashMatch[2])]

  const plainMatch = trimmed.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/)
  if (plainMatch) return [parseFloat(plainMatch[1]), parseFloat(plainMatch[2])]

  return null
}

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
  const [pasteInput, setPasteInput] = useState('')
  const [pasteError, setPasteError] = useState('')

  const [stats, setStats] = useState<WilayaStats[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/admin/garde/stats')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setStats(json.data || [])
    } catch {
      setStats([])
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

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
    setPasteInput('')
    setPasteError('')
  }

  function applyPaste() {
    const coords = parseCoordsInput(pasteInput)
    if (!coords) {
      setPasteError('Format non reconnu. Collez "lat, lng" ou un lien openstreetmap.org.')
      return
    }
    setPasteError('')
    setPosition(coords)
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
      loadStats()
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

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 0' }}>
        {/* Wilayas présentes en base — répond à "qu'est-ce qui a bien été importé ?" */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Wilayas en base</div>
            <button
              onClick={loadStats}
              style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
            >
              ⟳ Actualiser
            </button>
          </div>

          {statsLoading ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Chargement…</div>
          ) : stats.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Aucune wilaya importée pour l&apos;instant.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    <th style={{ padding: '4px 8px' }}>Wilaya</th>
                    <th style={{ padding: '4px 8px' }}>Pharmacies</th>
                    <th style={{ padding: '4px 8px' }}>Géocodées</th>
                    <th style={{ padding: '4px 8px' }}>Période garde</th>
                    <th style={{ padding: '4px 8px' }}>Dernier import</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(s => (
                    <tr key={s.wilaya_code} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>
                        {s.wilaya_name_fr || s.wilaya_code} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({s.wilaya_code})</span>
                      </td>
                      <td style={{ padding: '6px 8px' }}>{s.total_pharmacies}</td>
                      <td style={{ padding: '6px 8px' }}>
                        {s.geocoded_count} / {s.total_pharmacies}
                        {s.geocoded_count < s.total_pharmacies && (
                          <span className="badge badge-amber" style={{ marginLeft: 8 }}>à finir</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#64748b' }}>
                        {s.period_from && s.period_to ? `${s.period_from} → ${s.period_to}` : '—'}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#64748b' }}>
                        {s.last_imported_at ? new Date(s.last_imported_at).toLocaleString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 24px', display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
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
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{row.name_fr || row.name_ar || 'Pharmacie'}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {row.address_fr || row.address_ar || row.commune_name_fr} · {row.wilaya_name_fr || row.wilaya_code}
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
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{selected.name_fr || selected.name_ar || 'Pharmacie'}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {selected.address_fr || selected.address_ar} — {selected.commune_name_fr}, {selected.wilaya_name_fr || selected.wilaya_code}
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

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#334155', marginBottom: 8 }}>
                  💡 Astuce : cherchez la pharmacie sur{' '}
                  <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7' }}>
                    openstreetmap.org
                  </a>{' '}
                  vous-même, puis clic droit sur le bon point → « Afficher l&apos;adresse » → collez le lien ou les coordonnées ici.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={pasteInput}
                    onChange={e => setPasteInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') applyPaste() }}
                    placeholder="Ex: 34.83123, 0.15234 ou un lien openstreetmap.org"
                    style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                  />
                  <button
                    onClick={applyPaste}
                    style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Utiliser
                  </button>
                </div>
                {pasteError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>{pasteError}</div>}
              </div>

              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                Ou cliquez directement sur la carte pour ajuster précisément le repère, puis enregistrez.
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
