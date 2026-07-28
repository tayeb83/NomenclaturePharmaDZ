import { getMarketComparatorData } from '@/lib/queries'
import { ComparateurClient } from './ComparateurClient'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const metadata: Metadata = {
  title: 'Comparateur marché — Analyses & statistiques',
  description:
    'Analysez le marché pharmaceutique algérien : local vs importé, génériques vs références, top laboratoires, DCI les plus concurrentielles, évolution annuelle des enregistrements.',
  alternates: { canonical: `${APP_URL}/comparateur` },
}

export const dynamic = 'force-dynamic'

export default async function ComparateurPage() {
  const data = await getMarketComparatorData()
  return <ComparateurClient data={data} />
}
