import type { Metadata } from 'next'
import { GardeClient } from './GardeClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Pharmacies de garde en Algérie',
  description: 'Trouvez la pharmacie de garde ouverte maintenant, cette nuit ou vendredi près de chez vous — listes officielles des Directions de la Santé et de la Population (DSP), wilaya par wilaya.',
  keywords: [
    'pharmacie de garde algérie', 'pharmacie de garde', 'pharmacie ouverte maintenant algérie',
    'pharmacie de nuit algérie', 'garde pharmacie wilaya', 'DSP pharmacie de garde',
    'صيدلية الحراسة الجزائر',
  ],
  alternates: { canonical: `${APP_URL}/garde` },
  openGraph: {
    title: 'Pharmacies de garde en Algérie | DwaDZ',
    description: 'Pharmacie ouverte maintenant, cette nuit ou vendredi, triée par distance — listes officielles DSP par wilaya et commune.',
    url: `${APP_URL}/garde`,
    type: 'website',
  },
}

export default function GardePage() {
  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: 'var(--navy)' }}>
          🏥 Pharmacies de garde
        </h1>
        <p style={{ color: 'var(--slate-500)', fontSize: 16, maxWidth: 620, lineHeight: 1.6 }}>
          Trouvez la pharmacie de garde ouverte maintenant, cette nuit ou vendredi près de chez vous —
          listes officielles des Directions de la Santé et de la Population (DSP), wilaya par wilaya.
        </p>
      </div>

      <GardeClient />
    </div>
  )
}
