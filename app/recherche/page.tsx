import { searchMedicaments } from '@/lib/queries'
import type { SearchResult } from '@/lib/db'
import { SearchClient } from './SearchClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Recherche' }

type AdvancedSearchCondition = {
  field: string
  operator: string
  value: string
  bool?: 'AND' | 'OR'
}

type SearchFilters = {
  labo?: string
  substance?: string
  activeOnly?: boolean
  advanced?: AdvancedSearchCondition[]
}

async function searchDrugs(query: string, scope: string, filters: SearchFilters): Promise<SearchResult[]> {
  const hasAdvanced = (filters.advanced || []).some((condition) => condition.value?.trim())
  if (!query.trim() && !filters.labo?.trim() && !filters.substance?.trim() && !hasAdvanced) return []
  return searchMedicaments(query, scope, 60, filters)
}

function parseAdvanced(advancedRaw: string | undefined): AdvancedSearchCondition[] {
  if (!advancedRaw) return []
  try {
    const parsed = JSON.parse(advancedRaw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: { q?: string; scope?: string; labo?: string; substance?: string; activeOnly?: string; advanced?: string; algerieOnly?: string }
}) {
  const query = searchParams.q || ''
  const scope = searchParams.scope || 'all'
  const advanced = parseAdvanced(searchParams.advanced)
  const algerieOnly = searchParams.algerieOnly === '1'
  const filters: SearchFilters = {
    labo: searchParams.labo || '',
    substance: searchParams.substance || '',
    activeOnly: searchParams.activeOnly === '1',
    advanced: algerieOnly
      ? [...advanced, { field: 'statut', operator: 'equals', value: 'F', bool: 'AND' }]
      : advanced,
  }

  const results = await searchDrugs(query, scope, filters)

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>🔍 Recherche de médicaments</h1>
          <p>Recherche simple globale + recherche avancée booléenne sur toutes les propriétés.</p>
        </div>
      </div>
      <div className="page-body">
        <div className="container" style={{ maxWidth: 860 }}>
          <SearchClient
            initialQuery={query}
            initialScope={scope}
            initialResults={results}
            initialLabo={filters.labo || ''}
            initialSubstance={filters.substance || ''}
            initialActiveOnly={Boolean(filters.activeOnly)}
            initialAdvanced={advanced}
            initialAlgerieOnly={algerieOnly}
          />
        </div>
      </div>
    </>
  )
}
