import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'

const USER_AGENT = 'DwaDZ-Garde-Geocoder/1.0 (+https://dzair-pharma.net)'

// Proxy vers Nominatim (recherche manuelle depuis /admin/garde) : le
// User-Agent et la limite de résultats restent centralisés ici plutôt
// que dans le navigateur de chaque admin.
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json({ data: [] })

  const params = new URLSearchParams({
    q, format: 'jsonv2', addressdetails: '1', countrycodes: 'dz', limit: '5',
  })

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!res.ok) throw new Error('Nominatim error')
    const results = await res.json()
    return NextResponse.json({
      data: (results as any[]).map(r => ({
        label: r.display_name as string,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      })),
    })
  } catch (err) {
    console.error('Geocode search proxy error:', err)
    return NextResponse.json({ error: 'Recherche indisponible' }, { status: 502 })
  }
}
