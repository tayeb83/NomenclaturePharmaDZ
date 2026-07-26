import type { Metadata } from 'next'
import { ProClient } from './ProClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Espace Pro — veille réglementaire, API nomenclature, fiche pharmacie | DwaDZ',
  description: 'Offres professionnelles DwaDZ : veille réglementaire personnalisée pour laboratoires et distributeurs, API de la nomenclature algérienne structurée, fiche pharmacie premium vérifiée.',
  alternates: { canonical: `${APP_URL}/pro` },
  openGraph: {
    title: 'Espace Pro DwaDZ — services pour laboratoires, éditeurs et pharmaciens',
    description: 'Veille réglementaire ciblée, API de la nomenclature MIPH nettoyée et versionnée, fiches pharmacies premium.',
    type: 'website',
    siteName: 'DwaDZ',
    locale: 'fr_DZ',
    url: `${APP_URL}/pro`,
  },
}

export default function ProPage() {
  return <ProClient />
}
