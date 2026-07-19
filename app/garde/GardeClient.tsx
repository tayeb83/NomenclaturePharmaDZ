'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { GardeShift, GardeCoverageEntry, GardeRosterMeta } from '@/lib/db-types'

const GardeMap = dynamic(() => import('./GardeMap'), { ssr: false })

type Mode = 'now' | 'tonight' | 'friday'

type GardeResponse = {
  current: GardeShift | null
  day_schedule: GardeShift[]
  coverage: GardeRosterMeta | null
}

function algiersDateStr(d?: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(d || new Date())
}

function nextFridayStr() {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Algiers', weekday: 'short' })
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86400000)
    if (fmt.format(d) === 'Fri') return algiersDateStr(d)
  }
  return algiersDateStr(now)
}

function formatTimeRange(startsAt: string, endsAt: string) {
  const hm = (iso: string) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Algiers' }).format(new Date(iso))
  return `${hm(startsAt)} – ${hm(endsAt)}`
}

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

function mapsHref(shift: GardeShift) {
  const query = (shift.lat != null && shift.lng != null)
    ? `${shift.lat},${shift.lng}`
    : [shift.name_fr, shift.address_fr].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function GardeClient() {
  const [coverage, setCoverage] = useState<GardeCoverageEntry[]>([])
  const [coverageLoading, setCoverageLoading] = useState(true)
  const [coverageError, setCoverageError] = useState('')
  const [wilaya, setWilaya] = useState('')
  const [commune, setCommune] = useState('')
  const [mode, setMode] = useState<Mode>('now')
  const [data, setData] = useState<GardeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)

  // Couverture disponible
  useEffect(() => {
    let cancelled = false
    setCoverageLoading(true)
    fetch('/api/garde/coverage')
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(json => {
        if (cancelled) return
        const rows: GardeCoverageEntry[] = json.data || []
        setCoverage(rows)
        if (rows[0]) {
          setWilaya(rows[0].wilaya_code)
          setCommune(rows[0].commune_code)
        }
      })
      .catch(() => { if (!cancelled) setCoverageError("Impossible de charger les zones couvertes.") })
      .finally(() => { if (!cancelled) setCoverageLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Géolocalisation (uniquement pour trier par distance / afficher un point sur la carte)
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

  const communes = useMemo(
    () => coverage.filter(c => c.wilaya_code === wilaya),
    [coverage, wilaya]
  )

  const fetchGarde = useCallback(async () => {
    if (!wilaya || !commune) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ wilaya, commune })
      if (mode === 'tonight') params.set('date', algiersDateStr())
      if (mode === 'friday') params.set('date', nextFridayStr())

      const res = await fetch(`/api/garde?${params}`)
      if (!res.ok) throw new Error('Erreur serveur')
      const json = await res.json()
      setData(json)
    } catch {
      setError('Impossible de charger les pharmacies de garde.')
    } finally {
      setLoading(false)
    }
  }, [wilaya, commune, mode])

  useEffect(() => { fetchGarde() }, [fetchGarde])

  const sortedSchedule = useMemo(() => {
    const rows = (data?.day_schedule || []).map(shift => ({
      shift,
      distanceKm: (userPos && shift.lat != null && shift.lng != null)
        ? haversineKm(userPos.lat, userPos.lng, shift.lat, shift.lng)
        : null,
    }))
    rows.sort((a, b) => {
      if (!!a.shift.active_now !== !!b.shift.active_now) return a.shift.active_now ? -1 : 1
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm
      if (a.distanceKm != null) return -1
      if (b.distanceKm != null) return 1
      return new Date(a.shift.starts_at).getTime() - new Date(b.shift.starts_at).getTime()
    })
    return rows
  }, [data, userPos])

  const communeName = communes.find(c => c.commune_code === commune)?.commune_name_fr || ''

  return (
    <div>
      {/* Sélecteur wilaya / commune */}
      <div style={{
        background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 12,
        padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--slate-500)', marginBottom: 6, fontWeight: 600 }}>Wilaya</label>
          <select
            value={wilaya}
            onChange={e => {
              const newWilaya = e.target.value
              setWilaya(newWilaya)
              // Une seule commune disponible (cas le plus courant) : on la
              // sélectionne directement, sinon le <select> commune reste
              // désynchronisé de l'état tant que l'utilisateur ne le
              // touche pas lui-même — et fetchGarde() n'est jamais rappelé.
              const matches = coverage.filter(c => c.wilaya_code === newWilaya)
              setCommune(matches.length === 1 ? matches[0].commune_code : '')
            }}
            disabled={coverageLoading || wilayas.length === 0}
            style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', color: 'var(--navy)', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 180 }}
          >
            {wilayas.length === 0 && <option value="">Aucune wilaya couverte</option>}
            {wilayas.map(w => <option key={w.wilaya_code} value={w.wilaya_code}>{w.wilaya_name_fr}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--slate-500)', marginBottom: 6, fontWeight: 600 }}>Commune</label>
          <select
            value={commune}
            onChange={e => setCommune(e.target.value)}
            disabled={communes.length === 0}
            style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', color: 'var(--navy)', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 180 }}
          >
            <option value="">Choisir une commune…</option>
            {communes.map(c => <option key={c.commune_code} value={c.commune_code}>{c.commune_name_fr}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {([['now', 'Maintenant'], ['tonight', 'Cette nuit'], ['friday', 'Vendredi']] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? 'var(--blue)' : '#fff',
                border: `1px solid ${mode === m ? 'var(--blue)' : 'var(--slate-200)'}`,
                color: mode === m ? '#fff' : 'var(--slate-700)',
                borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {coverageError && <div className="alert-banner error">{coverageError}</div>}

      {!coverageLoading && wilayas.length === 0 && !coverageError && (
        <div className="alert-banner info">
          Aucune wilaya n&apos;est encore couverte pour le moment — revenez bientôt.
        </div>
      )}

      {error && <div className="alert-banner error">{error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--slate-600)', fontSize: 15 }}>⏳ Chargement…</div>
      )}

      {!loading && !error && data && (
        <>
          {/* Carte */}
          {(userPos || sortedSchedule.some(r => r.shift.lat != null)) && (
            <div style={{ height: 320, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--slate-200)', marginBottom: 20 }}>
              <GardeMap userPos={userPos} pins={data.day_schedule} />
            </div>
          )}

          {data.coverage && (
            <div style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 14 }}>
              Source : {data.coverage.issuer_fr || 'DSP'} · période {data.coverage.period_from} → {data.coverage.period_to}
            </div>
          )}

          {sortedSchedule.length === 0 && (
            <div className="alert-banner info">Aucune garde trouvée pour cette date à {communeName}.</div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {sortedSchedule.map(({ shift, distanceKm }) => (
              <div key={shift.id} style={{
                background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--navy)' }}>{shift.name_fr}</div>
                  {shift.active_now ? (
                    <span className="badge badge-green">De garde maintenant</span>
                  ) : (
                    <span className="badge badge-gray">{shift.shift === 'nuit' ? 'Nuit' : 'Jour'}</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 4 }}>
                  {shift.address_fr}{distanceKm != null && ` · ${formatDistance(distanceKm)}`}
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 6 }}>
                  {formatTimeRange(shift.starts_at, shift.ends_at)}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {shift.phone_e164 ? (
                    <a href={`tel:${shift.phone_e164}`} style={{
                      background: 'var(--blue)', color: '#fff', borderRadius: 8, padding: '8px 14px',
                      fontSize: 13, fontWeight: 700, textDecoration: 'none',
                    }}>
                      📞 Appeler
                    </a>
                  ) : (
                    <span style={{ color: 'var(--slate-400)', fontSize: 13, padding: '8px 14px' }}>📞 Indisponible</span>
                  )}
                  <a href={mapsHref(shift)} target="_blank" rel="noopener noreferrer" style={{
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
    </div>
  )
}
