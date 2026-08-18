import type { Metadata } from 'next'
import { MedicamentsClient } from './MedicamentsClient'
import { AdHorizontal } from '@/components/ads/AdBanner'
import { CatalogueIndex } from '@/components/seo/CatalogueIndex'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

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
    title: 'Tous les médicaments enregistrés en Algérie | DwaDZ',
    description: 'Nomenclature pharmaceutique algérienne complète — liste paginée avec filtres (type, statut, année), nouveautés de version et médicaments retirés par année.',
    url: `${APP_URL}/medicaments`,
    type: 'website',
  },
}

// La liste elle-même est chargée côté client ; l'index de bas de page,
// lui, est rendu au serveur et mis en cache 24 h comme le reste du catalogue.
export const revalidate = 86400

export default async function MedicamentsPage() {
  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      {/* En-tête */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: '#0f172a' }}>
          💊 Tous les médicaments
        </h1>
        <p style={{ color: '#64748b', fontSize: 16, maxWidth: 620, lineHeight: 1.6 }}>
          Nomenclature pharmaceutique officielle algérienne (MIPH). Liste complète des médicaments enregistrés,
          filtrables par type, statut de fabrication, année, nouveautés de la version courante et médicaments retirés par année.
        </p>
      </div>

      {/* Publicité entre l'en-tête et la liste */}
      <AdHorizontal slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_MEDICAMENTS || '0000000000'} />

      <MedicamentsClient />

      <CatalogueIndex />
    </div>
  )
}
