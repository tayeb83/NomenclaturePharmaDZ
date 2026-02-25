'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchResult } from '@/lib/db'
import { DrugCard } from '@/components/drug/DrugCard'

const SCOPES = [
  { value: 'all', label: 'Tous' },
  { value: 'enregistrement', label: '✅ Enregistrés' },
  { value: 'retrait', label: '🚫 Retirés' },
  { value: 'non_renouvele', label: '⚠️ Non renouvelés' },
]

export function SearchClient({
  initialQuery, initialScope, initialResults,
}: {
  initialQuery: string
  initialScope: string
  initialResults: SearchResult[]
}) {
  const [query, setQuery] = useState(initialQuery)
  const [scope, setScope] = useState(initialScope)
  const [results, setResults] = useState<SearchResult[]>(initialResults)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [, startTransition] = useTransition()

  const search = useCallback(async (q: string, s: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&scope=${s}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally { setLoading(false) }
  }, [])

  function handleInput(val: string) {
    setQuery(val)
    startTransition(() => {
      router.replace(`/recherche?q=${encodeURIComponent(val)}&scope=${scope}`, { scroll: false })
    })
    if (val.length >= 2) search(val, scope)
    else if (val.length === 0) setResults([])
  }

  function handleScope(s: string) {
    setScope(s)
    if (query.trim()) search(query, s)
    startTransition(() => {
      router.replace(`/recherche?q=${encodeURIComponent(query)}&scope=${s}`, { scroll: false })
    })
  }

  return (
    <>
      <div className="search-bar">
        <span className="search-bar-icon">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="Ex: PARACETAMOL, DOLIPRANE, AMOXICILLINE..."
          autoFocus
        />
      </div>

      <div className="filter-tabs">
        {SCOPES.map(s => (
          <button
            key={s.value}
            className={`filter-tab${scope === s.value ? ' active' : ''}`}
            onClick={() => handleScope(s.value)}
          >{s.label}</button>
        ))}
      </div>

      {loading && (
        <div className="loading-spinner">
          <div className="spinner" /> Recherche en cours...
        </div>
      )}

      {!loading && query && (
        <div className="search-count">
          {results.length === 0
            ? `Aucun résultat pour "${query}" — Vérifiez l'orthographe ou essayez une DCI.`
            : `${results.length} résultat(s) pour "${query}"`
          }
        </div>
      )}

      {!loading && results.map((d, i) => (
        <DrugCard key={`${d.source}-${d.id}-${i}`} drug={d} type={d.source} />
      ))}

      {!query && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>💊</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Tapez le nom d'un médicament</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Recherche sur DCI et nom commercial simultanément</div>
          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['PARACETAMOL', 'AMOXICILLINE', 'METFORMINE', 'IBUPROFEN', 'OMEPRAZOLE'].map(s => (
              <button
                key={s}
                onClick={() => handleInput(s)}
                style={{ padding: '6px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}
              >{s}</button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
