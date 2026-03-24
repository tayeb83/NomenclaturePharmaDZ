import { getStats, getLatestNouveautes, getLastRetraits, getLastVersionDate, searchMedicaments } from '@/lib/queries'
import type { SearchResult } from '@/lib/db-types'
import { HomeClient } from './HomeClient'

export const revalidate = 3600

type AdvancedSearchCondition = {
  field: string
  operator: string
  value: string
  bool?: 'AND' | 'OR'
}

function parseAdvanced(raw: string | undefined): AdvancedSearchCondition[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { q?: string; scope?: string; labo?: string; substance?: string; activeOnly?: string; advanced?: string; algerieOnly?: string }
}) {
  const q = searchParams?.q || ''
  const scope = searchParams?.scope || 'all'
  const labo = searchParams?.labo || ''
  const substance = searchParams?.substance || ''
  const activeOnly = searchParams?.activeOnly === '1'
  const algerieOnly = searchParams?.algerieOnly === '1'
  const advanced = parseAdvanced(searchParams?.advanced)

  const effectiveAdvanced = algerieOnly
    ? [...advanced, { field: 'statut', operator: 'equals', value: 'F', bool: 'AND' as const }]
    : advanced

  const hasSearch = q.trim() || labo.trim() || substance.trim() || effectiveAdvanced.some(c => c.value?.trim())

  const [stats, nouveautes, retraits, lastVersionDate, initialResults] = await Promise.all([
    getStats(),
    getLatestNouveautes(6),
    getLastRetraits(3),
    getLastVersionDate(),
    hasSearch
      ? searchMedicaments(q, scope, 60, { labo, substance, activeOnly, advanced: effectiveAdvanced })
      : Promise.resolve([] as SearchResult[]),
  ])

  return (
    <HomeClient
      stats={stats}
      nouveautes={nouveautes}
      retraits={retraits}
      lastVersionDate={lastVersionDate}
      initialQuery={q}
      initialScope={scope}
      initialLabo={labo}
      initialSubstance={substance}
      initialActiveOnly={activeOnly}
      initialAdvanced={advanced}
      initialAlgerieOnly={algerieOnly}
      initialResults={initialResults}
    />
  )
}
