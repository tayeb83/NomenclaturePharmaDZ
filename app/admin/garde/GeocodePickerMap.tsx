'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type Props = {
  position: [number, number]
  onChange: (lat: number, lng: number) => void
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function Recenter({ position }: { position: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.setView(position, map.getZoom()) }, [position, map])
  return null
}

export default function GeocodePickerMap({ position, onChange }: Props) {
  return (
    <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap, &copy; CARTO"
        subdomains="abcd"
        maxZoom={19}
      />
      <CircleMarker
        center={position}
        radius={9}
        pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 1, weight: 2 }}
      />
      <ClickHandler onChange={onChange} />
      <Recenter position={position} />
    </MapContainer>
  )
}
