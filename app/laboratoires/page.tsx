import { getAllLaboratoires } from '@/lib/queries'
import { LaboratoiresClient } from './LaboratoiresClient'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Laboratoires pharmaceutiques — Nomenclature Algérie',
  description:
    "Annuaire complet des laboratoires pharmaceutiques enregistrés en Algérie. Consultez le portefeuille produits, les retraits et les AMM non renouvelées de chaque laboratoire — Données MIPH officielles.",
  keywords: [
    'laboratoire pharmaceutique algérie',
    'labo pharma DZ',
    'nomenclature MIPH laboratoires',
    'enregistrement médicament algérie',
    'liste labos pharma',
  ],
  alternates: { canonical: `${APP_URL}/laboratoires` },
  openGraph: {
    title: 'Laboratoires pharmaceutiques — DwaDZ',
    description: "Annuaire des laboratoires pharmaceutiques enregistrés en Algérie avec statistiques produits.",
    url: `${APP_URL}/laboratoires`,
    type: 'website',
  },
}

export const revalidate = 3600

export default async function LaboratoiresPage() {
  const labos = await getAllLaboratoires()

  return <LaboratoiresClient labos={labos} />
}
