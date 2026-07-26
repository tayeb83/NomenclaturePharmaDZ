import { searchMedicamentsTolerant, type TolerantSearchResponse } from '@/lib/queries'
import type { SearchResult } from '@/lib/db-types'
import { SearchClient } from './SearchClient'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>
}): Promise<Metadata> {
  const params = await searchParams
  const q = (params.q || '').trim()

  if (q) {
    const title = `${q} en Algérie — médicaments, prix et disponibilité | DwaDZ`
    const description = `Résultats pour "${q}" dans la nomenclature pharmaceutique algérienne (MIPH). Statut, laboratoire, génériques disponibles en Algérie.`
    return {
      title,
      description,
      alternates: { canonical: `${APP_URL}/recherche?q=${encodeURIComponent(q)}` },
      openGraph: {
        title,
        description,
        type: 'website',
        siteName: 'DwaDZ',
        locale: 'fr_DZ',
        url: `${APP_URL}/recherche?q=${encodeURIComponent(q)}`,
      },
    }
  }

  return {
    title: 'Recherche de médicaments en Algérie | DwaDZ',
    description: 'Recherchez par DCI, nom de marque, laboratoire ou forme. Nomenclature pharmaceutique algérienne officielle MIPH.',
    alternates: { canonical: `${APP_URL}/recherche` },
    openGraph: {
      title: 'Recherche de médicaments en Algérie | DwaDZ',
      description: 'Recherchez par DCI, nom de marque, laboratoire ou forme. Nomenclature pharmaceutique algérienne officielle MIPH.',
      type: 'website',
      siteName: 'DwaDZ',
      locale: 'fr_DZ',
      url: `${APP_URL}/recherche`,
    },
  }
}

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

async function searchDrugs(query: string, scope: string, filters: SearchFilters): Promise<TolerantSearchResponse> {
  const hasAdvanced = (filters.advanced || []).some((condition) => condition.value?.trim())
  if (!query.trim() && !filters.labo?.trim() && !filters.substance?.trim() && !hasAdvanced) {
    return { results: [], fuzzy: false, matchedTerm: null, synonymTerm: null }
  }
  return searchMedicamentsTolerant(query, scope, 60, filters)
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
  searchParams: Promise<{ q?: string; scope?: string; labo?: string; substance?: string; activeOnly?: string; advanced?: string; algerieOnly?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const query = resolvedSearchParams.q || ''
  const scope = resolvedSearchParams.scope || 'all'
  const advanced = parseAdvanced(resolvedSearchParams.advanced)
  const algerieOnly = resolvedSearchParams.algerieOnly === '1'
  const filters: SearchFilters = {
    labo: resolvedSearchParams.labo || '',
    substance: resolvedSearchParams.substance || '',
    activeOnly: resolvedSearchParams.activeOnly === '1',
    advanced: algerieOnly
      ? [...advanced, { field: 'statut', operator: 'equals', value: 'F', bool: 'AND' }]
      : advanced,
  }

  let results: SearchResult[] = []
  let fuzzyInfo: { fuzzy: boolean; matchedTerm: string | null; synonymTerm: string | null } = { fuzzy: false, matchedTerm: null, synonymTerm: null }
  let searchError = false
  try {
    const response = await searchDrugs(query, scope, filters)
    results = response.results
    fuzzyInfo = { fuzzy: response.fuzzy, matchedTerm: response.matchedTerm, synonymTerm: response.synonymTerm }
  } catch {
    searchError = true
  }

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
          {searchError && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '14px 20px', marginBottom: 20, color: '#b91c1c', fontSize: 14 }}>
              ⚠️ La base de données est temporairement indisponible. Veuillez réessayer dans quelques instants.
            </div>
          )}
          <SearchClient
            initialQuery={query}
            initialScope={scope}
            initialResults={results}
            initialFuzzyInfo={fuzzyInfo}
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
