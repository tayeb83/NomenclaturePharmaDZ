import type { Metadata } from 'next'
import { PharmaciesClient } from './PharmaciesClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Annuaire des pharmacies en Algérie',
  description: 'Toutes les pharmacies référencées par wilaya et commune, avec adresse, téléphone et position — recensées au fil des plannings de garde officiels DSP.',
  keywords: [
    'pharmacie algérie', 'annuaire pharmacies algérie', 'liste pharmacies wilaya',
    'pharmacie proche de moi algérie', 'صيدلية الجزائر',
  ],
  alternates: { canonical: `${APP_URL}/pharmacies` },
  openGraph: {
    title: 'Annuaire des pharmacies en Algérie | DwaDZ',
    description: 'Toutes les pharmacies référencées par wilaya et commune, avec adresse, téléphone et position.',
    url: `${APP_URL}/pharmacies`,
    type: 'website',
  },
}

export default function PharmaciesPage() {
  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: 'var(--navy)' }}>
          📍 Annuaire des pharmacies
        </h1>
        <p style={{ color: 'var(--slate-500)', fontSize: 16, maxWidth: 620, lineHeight: 1.6 }}>
          Toutes les pharmacies référencées par wilaya et commune, avec adresse, téléphone et position —
          recensées au fil des plannings de garde officiels DSP. Pour savoir laquelle est ouverte
          maintenant, consultez plutôt les <a href="/garde" style={{ color: 'var(--blue)' }}>pharmacies de garde</a>.
        </p>
      </div>

      <PharmaciesClient />
    </div>
  )
}
