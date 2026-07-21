import {
  getMarketComparatorData,
  getAvailableAnnees,
  getAllEnregistrements,
  getCriticalSample,
  getCriticalCount,
} from '@/lib/queries'
import { OutilsClient } from './OutilsClient'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Outils & analyses',
  description:
    'Espace outils DwaDZ : comparateur du marché pharmaceutique algérien, veille réglementaire des nouveaux enregistrements et liste des médicaments critiques.',
  alternates: { canonical: `${APP_URL}/outils` },
}
export const dynamic = 'force-dynamic'

export default async function OutilsPage() {
  const [market, annees] = await Promise.all([getMarketComparatorData(), getAvailableAnnees(1)])
  const annee = annees[0] ?? new Date().getFullYear()

  const [veilleSample, criticalSample, criticalCount] = await Promise.all([
    getAllEnregistrements(annee, 3),
    getCriticalSample(4),
    getCriticalCount(),
  ])

  return (
    <OutilsClient
      localImporte={market.localImporte}
      topLabos={market.topLabos.slice(0, 3)}
      veilleAnnee={annee}
      veilleSample={veilleSample.map(d => ({
        nom_marque: d.nom_marque,
        dci: d.dci,
        labo: d.labo,
        date_init: d.date_init,
      }))}
      criticalCount={criticalCount}
      criticalSample={criticalSample.map(r => ({
        dci_critique: r.dci_critique,
        forme_critique: r.forme_critique,
        dosage_critique: r.dosage_critique,
        classe_therapeutique: r.classe_therapeutique,
        marque: r.marque,
      }))}
    />
  )
}
