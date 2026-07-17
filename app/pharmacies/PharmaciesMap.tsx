'use client'

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type Pin = { pharmacy_id: string; lat: number | null; lng: number | null; name_fr: string }

type Props = {
  userPos: { lat: number; lng: number } | null
  pins: Pin[]
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

export default function PharmaciesMap({ userPos, pins }: Props) {
  const geolocated = pins.filter(p => p.lat != null && p.lng != null)
  const center: [number, number] = userPos
    ? [userPos.lat, userPos.lng]
    : (geolocated[0] ? [geolocated[0].lat as number, geolocated[0].lng as number] : [36.75, 3.06])

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
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
      {geolocated.map(p => (
        <CircleMarker
          key={p.pharmacy_id}
          center={[p.lat as number, p.lng as number]}
          radius={6}
          pathOptions={{ color: '#059669', fillColor: '#059669', fillOpacity: 1, weight: 2 }}
        >
          <Popup>{p.name_fr}</Popup>
        </CircleMarker>
      ))}
      <FitBounds userPos={userPos} pins={pins} />
    </MapContainer>
  )
}
