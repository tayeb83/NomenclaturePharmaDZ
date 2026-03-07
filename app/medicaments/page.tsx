import type { Metadata } from 'next'
import Link from 'next/link'
import { MedicamentsClient } from './MedicamentsClient'
import { AdHorizontal } from '@/components/ads/AdBanner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Tous les médicaments en Algérie',
  description: 'Liste complète et paginée de tous les médicaments enregistrés en Algérie. Nomenclature officielle MIPH — noms de marque, DCI, laboratoires, formes, dosages.',
  keywords: [
    'liste médicaments algérie', 'nomenclature médicaments algériens', 'tous les médicaments dz',
    'médicaments enregistrés algérie', 'DCI algérie', 'génériques algérie',
    'liste pharmacopée algérienne', 'MIPH médicaments', 'قائمة الأدوية الجزائر',
  ],
  alternates: { canonical: `${APP_URL}/medicaments` },
  openGraph: {
    title: 'Tous les médicaments enregistrés en Algérie | PharmaVeille DZ',
    description: 'Nomenclature pharmaceutique algérienne complète — liste paginée, filtrable par type, statut et année.',
    url: `${APP_URL}/medicaments`,
    type: 'website',
  },
}

export default function MedicamentsPage() {
  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      {/* En-tête */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: '#0f172a' }}>
          💊 Tous les médicaments
        </h1>
        <p style={{ color: '#64748b', fontSize: 16, maxWidth: 620, lineHeight: 1.6 }}>
          Nomenclature pharmaceutique officielle algérienne (MIPH). Liste complète des médicaments enregistrés,
          filtrables par type, statut de fabrication et année.
        </p>
        <Link href="/api-docs" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 14, fontSize: 13, fontWeight: 600,
          color: '#0284c7', textDecoration: 'none',
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 8, padding: '6px 12px',
        }}>
          🔌 Documentation API
        </Link>
      </div>

      {/* Publicité entre l'en-tête et la liste */}
      <AdHorizontal slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_MEDICAMENTS || '0000000000'} />

      <MedicamentsClient />
    </div>
  )
}
