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

function buildSearchParams(q: string, scope: string, labo: string, substance: string, activeOnly: boolean) {
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q)
  if (scope !== 'all') params.set('scope', scope)
  if (labo.trim()) params.set('labo', labo)
  if (substance.trim()) params.set('substance', substance)
  if (activeOnly) params.set('activeOnly', '1')
  return params
}

export function SearchClient({
  initialQuery, initialScope, initialResults, initialLabo, initialSubstance, initialActiveOnly,
}: {
  initialQuery: string
  initialScope: string
  initialResults: SearchResult[]
  initialLabo: string
  initialSubstance: string
  initialActiveOnly: boolean
}) {
  const [query, setQuery] = useState(initialQuery)
  const [scope, setScope] = useState(initialScope)
  const [labo, setLabo] = useState(initialLabo)
  const [substance, setSubstance] = useState(initialSubstance)
  const [activeOnly, setActiveOnly] = useState(initialActiveOnly)
  const [results, setResults] = useState<SearchResult[]>(initialResults)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [, startTransition] = useTransition()

  const syncUrl = useCallback((nextQ: string, nextScope: string, nextLabo: string, nextSubstance: string, nextActiveOnly: boolean) => {
    const params = buildSearchParams(nextQ, nextScope, nextLabo, nextSubstance, nextActiveOnly)
    startTransition(() => {
      router.replace(`/recherche${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
    })
  }, [router, startTransition])

  const search = useCallback(async (q: string, s: string, l: string, sub: string, active: boolean) => {
    if (!q.trim() && !l.trim() && !sub.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const params = buildSearchParams(q, s, l, sub, active)
      const res = await fetch(`/api/search?${params.toString()}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally { setLoading(false) }
  }, [])

  function handleInput(val: string) {
    setQuery(val)
    syncUrl(val, scope, labo, substance, activeOnly)
    if (val.length >= 2 || labo || substance) search(val, scope, labo, substance, activeOnly)
    else if (val.length === 0) setResults([])
  }

  function handleScope(s: string) {
    setScope(s)
    if (query.trim() || labo.trim() || substance.trim()) search(query, s, labo, substance, activeOnly)
    syncUrl(query, s, labo, substance, activeOnly)
  }

  function handleLabo(val: string) {
    setLabo(val)
    syncUrl(query, scope, val, substance, activeOnly)
    if (query.trim() || val.trim() || substance.trim()) search(query, scope, val, substance, activeOnly)
    else setResults([])
  }

  function handleSubstance(val: string) {
    setSubstance(val)
    syncUrl(query, scope, labo, val, activeOnly)
    if (query.trim() || labo.trim() || val.trim()) search(query, scope, labo, val, activeOnly)
    else setResults([])
  }

  function handleActiveOnly(checked: boolean) {
    setActiveOnly(checked)
    syncUrl(query, scope, labo, substance, checked)
    if (query.trim() || labo.trim() || substance.trim()) search(query, scope, labo, substance, checked)
  }

  function applyExtractionPreset(type: 'labo' | 'substance') {
    if (type === 'labo') {
      setActiveOnly(true)
      setScope('enregistrement')
      search(query, 'enregistrement', labo, substance, true)
      syncUrl(query, 'enregistrement', labo, substance, true)
      return
    }

    search(query, 'all', labo, substance, activeOnly)
    syncUrl(query, 'all', labo, substance, activeOnly)
    setScope('all')
  }

  function exportCsv() {
    if (!results.length) return
    const header = ['source', 'n_enreg', 'dci', 'nom_marque', 'forme', 'dosage', 'labo', 'pays', 'type_prod', 'statut']
    const lines = results.map(row => header.map((key) => {
      const val = (row as any)[key] ?? ''
      return `"${String(val).replaceAll('"', '""')}"`
    }).join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `extraction_medicaments_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="search-bar">
        <span className="search-bar-icon">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="Recherche globale: DCI, marque, forme, dosage, labo..."
          autoFocus
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <input
          type="text"
          value={labo}
          onChange={e => handleLabo(e.target.value)}
          placeholder="Extraction ciblée: laboratoire (ex: SAIDAL)"
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 13 }}
        />
        <input
          type="text"
          value={substance}
          onChange={e => handleSubstance(e.target.value)}
          placeholder="Extraction ciblée: substance active / DCI"
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 13 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#334155' }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => handleActiveOnly(e.target.checked)}
          />
          Uniquement médicaments actifs (enregistrés)
        </label>

        <button
          onClick={() => applyExtractionPreset('labo')}
          style={{ padding: '7px 12px', borderRadius: 20, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >Actifs d'un labo</button>
        <button
          onClick={() => applyExtractionPreset('substance')}
          style={{ padding: '7px 12px', borderRadius: 20, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >Par substance active</button>
        <button
          onClick={exportCsv}
          disabled={!results.length}
          style={{ padding: '7px 12px', borderRadius: 20, border: '1px solid #bfdbfe', background: results.length ? '#dbeafe' : '#f1f5f9', cursor: results.length ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600 }}
        >Extraire CSV</button>
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

      {!loading && (query || labo || substance) && (
        <div className="search-count">
          {results.length === 0
            ? `Aucun résultat — essayez d'élargir les critères (recherche globale, labo, substance, retirés).`
            : `${results.length} résultat(s) trouvés`
          }
        </div>
      )}

      {!loading && results.map((d, i) => (
        <DrugCard key={`${d.source}-${d.id}-${i}`} drug={d} type={d.source} />
      ))}

      {!query && !labo && !substance && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>💊</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Tapez un médicament, une DCI, un labo ou un dosage</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Exemples d'extractions: médicaments actifs d'un labo X, ou médicaments par substance active XX</div>
        </div>
      )}
    </>
  )
}
