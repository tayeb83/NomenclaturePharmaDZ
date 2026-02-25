import { searchMedicaments } from '@/lib/queries'
import type { SearchResult } from '@/lib/db'
import { DrugCard } from '@/components/drug/DrugCard'
import { SearchClient } from './SearchClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Recherche' }

async function searchDrugs(query: string, scope: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  return searchMedicaments(query, scope, 40)
}

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: { q?: string; scope?: string }
}) {
  const query = searchParams.q || ''
  const scope = searchParams.scope || 'all'
  const results = await searchDrugs(query, scope)

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>🔍 Recherche de médicaments</h1>
          <p>Recherchez par DCI (dénomination commune internationale) ou par nom de marque dans toute la nomenclature</p>
        </div>
      </div>
      <div className="page-body">
        <div className="container" style={{ maxWidth: 860 }}>
          <SearchClient initialQuery={query} initialScope={scope} initialResults={results} />
        </div>
      </div>
    </>
  )
}
