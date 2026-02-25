import { searchMedicaments } from '@/lib/queries'
import type { SearchResult } from '@/lib/db'
import { SearchClient } from './SearchClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Recherche' }

type SearchFilters = {
  labo?: string
  substance?: string
  activeOnly?: boolean
}

async function searchDrugs(query: string, scope: string, filters: SearchFilters): Promise<SearchResult[]> {
  if (!query.trim() && !filters.labo?.trim() && !filters.substance?.trim()) return []
  return searchMedicaments(query, scope, 60, filters)
}

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: { q?: string; scope?: string; labo?: string; substance?: string; activeOnly?: string }
}) {
  const query = searchParams.q || ''
  const scope = searchParams.scope || 'all'
  const filters: SearchFilters = {
    labo: searchParams.labo || '',
    substance: searchParams.substance || '',
    activeOnly: searchParams.activeOnly === '1',
  }

  const results = await searchDrugs(query, scope, filters)

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>🔍 Recherche de médicaments</h1>
          <p>Recherchez sur toutes les propriétés (DCI, marque, forme, dosage, labo, pays, statut...) et appliquez des extractions ciblées.</p>
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
          />
        </div>
      </div>
    </>
  )
}
