import type { Metadata } from 'next'
import { getGardeCoverage, buildWilayaHub } from '@/lib/garde'
import { GardeWilayaGrid } from './GardeWilayaGrid'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Pharmacie de garde en Algérie — toutes les wilayas | DwaDZ',
  description: 'Trouvez la pharmacie de garde ouverte aujourd\'hui, cette nuit ou vendredi dans votre commune — Oran, Sidi Bel Abbès, Saïda et les 58 wilayas d\'Algérie. Listes officielles DSP, adresses, téléphones et horaires.',
  keywords: [
    'pharmacie de garde algérie', 'pharmacie de garde par wilaya', 'pharmacie de garde oran',
    'pharmacie de garde sidi bel abbès', 'pharmacie de garde saida', 'pharmacie de nuit algérie',
    'صيدلية المناوبة الجزائر', 'صيدلية مناوبة',
  ],
  alternates: {
    canonical: `${APP_URL}/pharmacie-de-garde`,
    languages: { fr: `${APP_URL}/pharmacie-de-garde`, ar: `${APP_URL}/ar/pharmacie-de-garde`, 'x-default': `${APP_URL}/pharmacie-de-garde` },
  },
  openGraph: {
    title: 'Pharmacie de garde en Algérie — toutes les wilayas | DwaDZ',
    description: 'Listes officielles DSP par wilaya et commune — adresses, téléphones, horaires.',
    url: `${APP_URL}/pharmacie-de-garde`,
    type: 'website',
  },
}

export default async function GardeHubPage() {
  const coverage = await getGardeCoverage()
  const wilayas = buildWilayaHub(coverage)

  return (
    <div className="container" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px 80px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: 'var(--navy)' }}>
          🏥 Pharmacie de garde en Algérie, par wilaya
        </h1>
        <p style={{ color: 'var(--slate-500)', fontSize: 16, maxWidth: 640, lineHeight: 1.6 }}>
          Choisissez votre wilaya puis votre commune pour voir la liste des pharmacies de garde
          aujourd&apos;hui, cette nuit ou vendredi — noms, adresses, téléphones et horaires, à partir
          des listes officielles des Directions de la Santé et de la Population (DSP).
        </p>
        <p style={{ fontSize: 13, marginTop: 8 }}>
          <a href="/garde" style={{ color: 'var(--blue)' }}>→ Trouver la pharmacie de garde la plus proche de moi</a>
          {' · '}
          <a href="/ar/pharmacie-de-garde" style={{ color: 'var(--blue)' }}>بالعربية</a>
        </p>
      </div>

      <GardeWilayaGrid wilayas={wilayas} lang="fr" basePath="/pharmacie-de-garde" />
    </div>
  )
}
