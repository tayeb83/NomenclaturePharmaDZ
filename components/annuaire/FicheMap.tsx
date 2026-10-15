'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const AnnuaireMap = dynamic(() => import('./AnnuaireMap'), { ssr: false })

type Pos = { lat: number; lng: number }

const CACHE_PREFIX = 'fichegeo:'

async function geocode(queries: string[]): Promise<Pos | null> {
  for (const q of queries) {
    const key = CACHE_PREFIX + q
    try {
      const cached = localStorage.getItem(key)
      if (cached) return JSON.parse(cached) as Pos
    } catch { /* stockage indisponible */ }
    try {
      const params = new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'dz', limit: '1' })
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { Accept: 'application/json' } })
      if (!res.ok) continue
      const r = (await res.json())[0]
      if (!r) continue
      const pos = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) }
      try { localStorage.setItem(key, JSON.stringify(pos)) } catch { /* ignore */ }
      return pos
    } catch { /* essaie la requête suivante */ }
  }
  return null
}

/**
 * Carte d'une seule pharmacie (fiche). Sans coordonnées en base, on géocode
 * l'adresse (puis la commune) côté navigateur : position alors approximative.
 */
export function FicheMap({
  lat, lng, name, queries = [], approxLabel,
}: {
  lat: number | null
  lng: number | null
  name: string
  queries?: string[]
  approxLabel?: string
}) {
  const hasCoords = lat != null && lng != null
  const [pos, setPos] = useState<Pos | null>(hasCoords ? { lat: lat as number, lng: lng as number } : null)
  const [approx, setApprox] = useState(false)
  const [failed, setFailed] = useState(false)
  const key = queries.join('|')

  useEffect(() => {
    if (hasCoords) return
    let alive = true
    geocode(queries).then(p => {
      if (!alive) return
      if (p) { setPos(p); setApprox(true) } else setFailed(true)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords, key])

  if (failed) return null
  if (!pos) return <div className="an-map-loading" aria-busy="true" />

  return (
    <>
      <AnnuaireMap pins={[{ id: 0, lat: pos.lat, lng: pos.lng, name, href: '#', state: 'open' }]} openLabel="" />
      {approx && approxLabel && <div className="an-map-note">{approxLabel}</div>}
    </>
  )
}
