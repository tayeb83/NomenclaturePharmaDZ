import { getDiffData } from '@/lib/queries'
import { DiffClient } from './DiffClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nouveautés — Comparaison des versions' }
export const revalidate = 0

export default async function DiffPage() {
  const data = await getDiffData()

  return (
    <DiffClient
      latestVersion={data.latestVersion}
      previousVersion={data.previousVersion}
      addedDrugs={data.addedDrugs}
      removedDrugs={data.removedDrugs}
      addedCount={data.addedCount}
      removedCount={data.removedCount}
    />
  )
}
