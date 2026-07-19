'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { GardePharmacy, GardeCoverageEntry } from '@/lib/db-types'

const PharmaciesMap = dynamic(() => import('./PharmaciesMap'), { ssr: false })

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km: number | null) {
  if (km == null) return null
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}

function displayName(p: GardePharmacy) {
  return p.name_fr || p.name_ar || 'Pharmacie'
}

function mapsHref(p: GardePharmacy) {
  const query = (p.lat != null && p.lng != null)
    ? `${p.lat},${p.lng}`
    : [p.name_fr || p.name_ar, p.address_fr || p.address_ar].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function PharmaciesClient() {
  const [coverage, setCoverage] = useState<GardeCoverageEntry[]>([])
  const [coverageLoading, setCoverageLoading] = useState(true)
  const [wilaya, setWilaya] = useState('')
  const [commune, setCommune] = useState('')
  const [pharmacies, setPharmacies] = useState<GardePharmacy[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    setCoverageLoading(true)
    fetch('/api/garde/coverage')
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(json => {
        if (cancelled) return
        const rows: GardeCoverageEntry[] = json.data || []
        setCoverage(rows)
        if (rows[0]) setWilaya(rows[0].wilaya_code)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCoverageLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }, [])

  const wilayas = useMemo(() => {
    const seen = new Set<string>()
    return coverage.filter(c => {
      if (seen.has(c.wilaya_code)) return false
      seen.add(c.wilaya_code)
      return true
    })
  }, [coverage])

  const communes = useMemo(() => coverage.filter(c => c.wilaya_code === wilaya), [coverage, wilaya])

  const fetchPharmacies = useCallback(async () => {
    if (!wilaya) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ wilaya })
      if (commune) params.set('commune', commune)
      const res = await fetch(`/api/garde/pharmacies?${params}`)
      if (!res.ok) throw new Error('Erreur serveur')
      const json = await res.json()
      setPharmacies(json.data || [])
    } catch {
      setError('Impossible de charger la liste des pharmacies.')
    } finally {
      setLoading(false)
    }
  }, [wilaya, commune])

  useEffect(() => { fetchPharmacies() }, [fetchPharmacies])

  const sorted = useMemo(() => {
    const rows = pharmacies.map(p => ({
      p,
      distanceKm: (userPos && p.lat != null && p.lng != null) ? haversineKm(userPos.lat, userPos.lng, p.lat, p.lng) : null,
    }))
    rows.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm
      if (a.distanceKm != null) return -1
      if (b.distanceKm != null) return 1
      return displayName(a.p).localeCompare(displayName(b.p))
    })
    return rows
  }, [pharmacies, userPos])

  return (
    <div>
      <div style={{
        background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 12,
        padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--slate-500)', marginBottom: 6, fontWeight: 600 }}>Wilaya</label>
          <select
            value={wilaya}
            onChange={e => { setWilaya(e.target.value); setCommune(''); }}
            disabled={coverageLoading || wilayas.length === 0}
            style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', color: 'var(--navy)', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 180 }}
          >
            {wilayas.length === 0 && <option value="">Aucune wilaya couverte</option>}
            {wilayas.map(w => <option key={w.wilaya_code} value={w.wilaya_code}>{w.wilaya_name_fr}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--slate-500)', marginBottom: 6, fontWeight: 600 }}>Commune (optionnel)</label>
          <select
            value={commune}
            onChange={e => setCommune(e.target.value)}
            disabled={communes.length === 0}
            style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', color: 'var(--navy)', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 180 }}
          >
            <option value="">Toute la wilaya</option>
            {communes.map(c => <option key={c.commune_code} value={c.commune_code}>{c.commune_name_fr}</option>)}
          </select>
        </div>
      </div>

      {!coverageLoading && wilayas.length === 0 && (
        <div className="alert-banner info">Aucune wilaya n&apos;est encore couverte pour le moment — revenez bientôt.</div>
      )}

      {error && <div className="alert-banner error">{error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--slate-600)', fontSize: 15 }}>⏳ Chargement…</div>
      )}

      {!loading && !error && pharmacies.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 14 }}>
            {pharmacies.length} pharmacie(s) référencée(s) — recensées au fil des plannings de garde officiels, liste non exhaustive.
          </div>

          {(userPos || sorted.some(r => r.p.lat != null)) && (
            <div style={{ height: 340, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--slate-200)', marginBottom: 20 }}>
              <PharmaciesMap userPos={userPos} pins={pharmacies} />
            </div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {sorted.map(({ p, distanceKm }) => (
              <div key={p.pharmacy_id} style={{
                background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--navy)' }}>{displayName(p)}</div>
                {p.name_fr && p.name_ar && <div dir="rtl" lang="ar" style={{ color: 'var(--slate-500)', fontSize: 14, marginTop: 2 }}>{p.name_ar}</div>}
                <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 6 }}>
                  {p.address_fr || p.address_ar}{distanceKm != null && ` · ${formatDistance(distanceKm)}`}
                  {!commune && p.commune_name_fr && ` — ${p.commune_name_fr}`}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {p.phone_e164 ? (
                    <a href={`tel:${p.phone_e164}`} style={{
                      background: 'var(--blue)', color: '#fff', borderRadius: 8, padding: '8px 14px',
                      fontSize: 13, fontWeight: 700, textDecoration: 'none',
                    }}>
                      📞 Appeler
                    </a>
                  ) : (
                    <span style={{ color: 'var(--slate-400)', fontSize: 13, padding: '8px 14px' }}>📞 Indisponible</span>
                  )}
                  <a href={mapsHref(p)} target="_blank" rel="noopener noreferrer" style={{
                    background: '#fff', border: '1px solid var(--slate-200)', color: 'var(--slate-700)',
                    borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  }}>
                    ↗ Itinéraire
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && !error && pharmacies.length === 0 && wilaya && (
        <div className="alert-banner info">Aucune pharmacie référencée pour cette zone pour le moment.</div>
      )}
    </div>
  )
}
