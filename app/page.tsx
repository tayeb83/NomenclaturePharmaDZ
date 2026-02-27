import { getStats, getLatestNouveautes, getLastRetraits, getLastVersionDate } from '@/lib/queries'
import { HomeClient } from './HomeClient'

export const revalidate = 3600

export default async function HomePage() {
  const [stats, nouveautes, retraits, lastVersionDate] = await Promise.all([
    getStats(), getLatestNouveautes(6), getLastRetraits(3), getLastVersionDate(),
  ])

  return (
    <HomeClient
      stats={stats}
      nouveautes={nouveautes}
      retraits={retraits}
      lastVersionDate={lastVersionDate}
    />
  )
}
