'use client'

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { GardeShift } from '@/lib/db-types'

type Props = {
  userPos: { lat: number; lng: number } | null
  pins: GardeShift[]
}

function FitBounds({ userPos, pins }: Props) {
  const map = useMap()

  const points: [number, number][] = []
  if (userPos) points.push([userPos.lat, userPos.lng])
  pins.forEach(p => { if (p.lat != null && p.lng != null) points.push([p.lat, p.lng]) })

  if (points.length > 1) {
    map.fitBounds(points, { padding: [32, 32] })
  } else if (points.length === 1) {
    map.setView(points[0], 14)
  }

  return null
}

export default function GardeMap({ userPos, pins }: Props) {
  const center: [number, number] = userPos
    ? [userPos.lat, userPos.lng]
    : (pins[0]?.lat != null && pins[0]?.lng != null ? [pins[0].lat, pins[0].lng] : [36.75, 3.06])

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap, &copy; CARTO"
        subdomains="abcd"
        maxZoom={19}
      />
      {userPos && (
        <CircleMarker
          center={[userPos.lat, userPos.lng]}
          radius={7}
          pathOptions={{ color: '#0284c7', fillColor: '#0284c7', fillOpacity: 1, weight: 2 }}
        >
          <Popup>Votre position</Popup>
        </CircleMarker>
      )}
      {pins.filter(p => p.lat != null && p.lng != null).map(p => (
        <CircleMarker
          key={p.id}
          center={[p.lat as number, p.lng as number]}
          radius={6}
          pathOptions={{ color: '#059669', fillColor: '#059669', fillOpacity: 1, weight: 2 }}
        >
          <Popup>{p.name_fr || p.name_ar}</Popup>
        </CircleMarker>
      ))}
      <FitBounds userPos={userPos} pins={pins} />
    </MapContainer>
  )
}
