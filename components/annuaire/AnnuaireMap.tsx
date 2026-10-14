'use client'

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export type MapPin = {
  id: number
  lat: number
  lng: number
  name: string
  href: string
  state: 'garde' | 'open' | 'closing' | 'closed'
}

const COLORS: Record<MapPin['state'], string> = {
  garde: '#dc2626', open: '#059669', closing: '#d97706', closed: '#64748b',
}

function Fit({ pins, userPos }: { pins: MapPin[]; userPos: { lat: number; lng: number } | null }) {
  const map = useMap()
  const points: [number, number][] = pins.map(p => [p.lat, p.lng])
  if (userPos) points.push([userPos.lat, userPos.lng])
  if (points.length > 1) map.fitBounds(points, { padding: [28, 28], maxZoom: 16 })
  else if (points.length === 1) map.setView(points[0], 15)
  return null
}

export default function AnnuaireMap({
  pins, userPos = null, selectedId = null, openLabel,
}: {
  pins: MapPin[]
  userPos?: { lat: number; lng: number } | null
  selectedId?: number | null
  openLabel: string
}) {
  const center: [number, number] = pins[0] ? [pins[0].lat, pins[0].lng] : [36.75, 3.06]
  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {userPos && (
        <CircleMarker center={[userPos.lat, userPos.lng]} radius={7}
          pathOptions={{ color: '#0284c7', fillColor: '#0284c7', fillOpacity: 1, weight: 2 }} />
      )}
      {pins.map(p => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={p.id === selectedId ? 9 : 6}
          pathOptions={{ color: '#fff', fillColor: COLORS[p.state], fillOpacity: 1, weight: 2 }}>
          <Popup>
            <strong>{p.name}</strong>{openLabel && <br />}
            {openLabel && <a href={p.href}>{openLabel}</a>}
          </Popup>
        </CircleMarker>
      ))}
      <Fit pins={pins} userPos={userPos} />
    </MapContainer>
  )
}
