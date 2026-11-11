import { rechercheAvecFacettes, type RechercheFacettes } from '@/lib/recherche-facettes'
import { facettesDepuisParams, type FacetteSel } from '@/lib/facettes'
import { allergieDepuisParams, type AllergieChoisie } from '@/lib/allergies-params'
import type { SearchResult } from '@/lib/db-types'
import { SearchClient } from './SearchClient'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>
}): Promise<Metadata> {
  const params = await searchParams
  const q = (params.q || '').trim()

  if (q) {
    const title = `${q} en Algérie — médicaments, prix et disponibilité`
    const description = `Résultats pour "${q}" dans la nomenclature pharmaceutique algérienne (MIPH). Statut, laboratoire, génériques disponibles en Algérie.`
    return {
      title,
      description,
      // Page de résultats internes : contenu mince et quasi infini (une URL par
      // requête). Google les signalait « page en double sans canonique ». On
      // les laisse explorables (follow) pour que le maillage vers les fiches
      // continue de circuler, mais hors de l'index.
      robots: { index: false, follow: true },
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
    title: 'Recherche de médicaments en Algérie',
    description: 'Recherchez par DCI, nom de marque, laboratoire ou forme. Nomenclature pharmaceutique algérienne officielle MIPH.',
    alternates: { canonical: `${APP_URL}/recherche` },
    openGraph: {
      title: 'Recherche de médicaments en Algérie',
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
  dciMode?: boolean
}

const FACETTES_VIDES = { voie: [], forme: [], dosage: [], origine: [] }

async function searchDrugs(query: string, scope: string, filters: SearchFilters, choix: FacetteSel, allergie: AllergieChoisie | null = null): Promise<RechercheFacettes> {
  const hasAdvanced = (filters.advanced || []).some((condition) => condition.value?.trim())
  if (!query.trim() && !filters.labo?.trim() && !filters.substance?.trim() && !hasAdvanced) {
    return { results: [], fuzzy: false, matchedTerm: null, synonymTerm: null, total: 0, tronque: false, facettes: FACETTES_VIDES, selection: {}, ignores: [], allergie: null }
  }
  return rechercheAvecFacettes(query, scope, 60, filters, choix, allergie)
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
  searchParams: Promise<{ q?: string; scope?: string; labo?: string; substance?: string; activeOnly?: string; advanced?: string; algerieOnly?: string; avancee?: string; onglet?: string; mode?: string; voie?: string; forme?: string; dosage?: string; origine?: string; allergie?: string; allergie_mode?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const ongletGuide = resolvedSearchParams.onglet === 'guide'
  const query = resolvedSearchParams.q || ''
  const scope = resolvedSearchParams.scope || 'all'
  const advanced = parseAdvanced(resolvedSearchParams.advanced)
  const algerieOnly = resolvedSearchParams.algerieOnly === '1'
  const filters: SearchFilters = {
    labo: resolvedSearchParams.labo || '',
    substance: resolvedSearchParams.substance || '',
    activeOnly: resolvedSearchParams.activeOnly === '1',
    dciMode: resolvedSearchParams.mode === 'dci',
    advanced: algerieOnly
      ? [...advanced, { field: 'statut', operator: 'equals', value: 'F', bool: 'AND' }]
      : advanced,
  }

  const choixFacettes = facettesDepuisParams(n => (resolvedSearchParams as Record<string, string | undefined>)[n])
  const allergieChoisie = allergieDepuisParams(n => (resolvedSearchParams as Record<string, string | undefined>)[n])
  let results: SearchResult[] = []
  let facettes: RechercheFacettes['facettes'] = FACETTES_VIDES
  let selectionFacettes: FacetteSel = {}
  let totalFacettes = 0
  let tronque = false
  let bilanAllergie: RechercheFacettes['allergie'] = null
  let fuzzyInfo: { fuzzy: boolean; matchedTerm: string | null; synonymTerm: string | null } = { fuzzy: false, matchedTerm: null, synonymTerm: null }
  let searchError = false
  try {
    // Onglet guidé : ses paramètres (voie, forme, dosage…) n'ont pas le sens des facettes ; pas de recherche côté serveur.
    const response = ongletGuide ? await searchDrugs('', scope, {}, {}) : await searchDrugs(query, scope, filters, choixFacettes, allergieChoisie)
    results = response.results
    facettes = response.facettes
    selectionFacettes = response.selection
    totalFacettes = response.total
    tronque = response.tronque
    bilanAllergie = response.allergie
    fuzzyInfo = { fuzzy: response.fuzzy, matchedTerm: response.matchedTerm, synonymTerm: response.synonymTerm }
  } catch {
    searchError = true
  }

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>🔍 Recherche de médicaments</h1>
          <p>Une recherche, des filtres par voie, forme et dosage, et des conditions avancées (ET / OU) au besoin.</p>
        </div>
      </div>
      <div className="page-body">
        <div className="container" style={{ maxWidth: 1080 }}>
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
            initialDciMode={Boolean(filters.dciMode)}
            initialFacettes={facettes}
            initialFacSel={selectionFacettes}
            initialTotal={totalFacettes}
            initialTronque={tronque}
            initialAllergie={allergieChoisie}
            initialAllergieBilan={bilanAllergie}
            initialAdvancedOpen={resolvedSearchParams.avancee === '1'}
            initialOnglet={ongletGuide ? 'guidee' : 'simple'}
          />
        </div>
      </div>
    </>
  )
}
