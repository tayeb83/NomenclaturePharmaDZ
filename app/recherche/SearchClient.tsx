'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchResult } from '@/lib/db'
import { DrugCard } from '@/components/drug/DrugCard'

const SCOPES = [
  { value: 'all', label: 'Tous' },
  { value: 'enregistrement', label: '✅ Enregistrés' },
  { value: 'retrait', label: '🚫 Retirés' },
  { value: 'non_renouvele', label: '⚠️ Non renouvelés' },
]

type AdvancedSearchCondition = {
  field: string
  operator: string
  value: string
  bool?: 'AND' | 'OR'
}

type FieldType = 'text' | 'number'

const ADVANCED_FIELDS: Array<{ value: string; label: string; type: FieldType }> = [
  { value: 'dci', label: 'Substance (DCI)', type: 'text' },
  { value: 'nom_marque', label: 'Nom de marque', type: 'text' },
  { value: 'forme', label: 'Forme', type: 'text' },
  { value: 'dosage', label: 'Dosage (texte)', type: 'text' },
  { value: 'dosage_num', label: 'Dosage (valeur numérique)', type: 'number' },
  { value: 'labo', label: 'Laboratoire', type: 'text' },
  { value: 'pays', label: 'Pays', type: 'text' },
  { value: 'type_prod', label: 'Type produit', type: 'text' },
  { value: 'statut', label: 'Statut', type: 'text' },
  { value: 'n_enreg', label: 'N° enregistrement', type: 'text' },
  { value: 'annee', label: 'Année', type: 'number' },
]

const TEXT_OPERATORS = [
  { value: 'contains', label: 'contient' },
  { value: 'equals', label: 'égal à' },
  { value: 'starts_with', label: 'commence par' },
]

const NUMBER_OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
]

function getFieldType(field: string): FieldType {
  return ADVANCED_FIELDS.find(item => item.value === field)?.type || 'text'
}

function getDefaultOperator(field: string): string {
  return getFieldType(field) === 'number' ? 'equals' : 'contains'
}

function hasAdvancedFilters(advanced: AdvancedSearchCondition[]) {
  return advanced.some((condition) => condition.value?.trim())
}

function buildSearchParams(
  q: string,
  scope: string,
  labo: string,
  substance: string,
  activeOnly: boolean,
  advanced: AdvancedSearchCondition[],
  algerieOnly: boolean,
) {
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q)
  if (scope !== 'all') params.set('scope', scope)
  if (labo.trim()) params.set('labo', labo)
  if (substance.trim()) params.set('substance', substance)
  if (activeOnly) params.set('activeOnly', '1')
  if (algerieOnly) params.set('algerieOnly', '1')
  if (hasAdvancedFilters(advanced)) params.set('advanced', JSON.stringify(advanced))
  return params
}

function effectiveAdvanced(base: AdvancedSearchCondition[], algerieOnly: boolean): AdvancedSearchCondition[] {
  if (!algerieOnly) return base
  return [...base, { field: 'statut', operator: 'equals', value: 'F', bool: 'AND' as const }]
}

export function SearchClient({
  initialQuery,
  initialScope,
  initialResults,
  initialLabo,
  initialSubstance,
  initialActiveOnly,
  initialAdvanced,
  initialAlgerieOnly,
}: {
  initialQuery: string
  initialScope: string
  initialResults: SearchResult[]
  initialLabo: string
  initialSubstance: string
  initialActiveOnly: boolean
  initialAdvanced: AdvancedSearchCondition[]
  initialAlgerieOnly: boolean
}) {
  const [query, setQuery] = useState(initialQuery)
  const [scope, setScope] = useState(initialScope)
  const [labo, setLabo] = useState(initialLabo)
  const [substance, setSubstance] = useState(initialSubstance)
  const [activeOnly, setActiveOnly] = useState(initialActiveOnly)
  const [algerieOnly, setAlgerieOnly] = useState(initialAlgerieOnly)
  const [advanced, setAdvanced] = useState<AdvancedSearchCondition[]>(initialAdvanced.length ? initialAdvanced : [{ field: 'dci', operator: 'contains', value: '', bool: 'AND' }])
  const [results, setResults] = useState<SearchResult[]>(initialResults)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const syncUrl = useCallback((nextQ: string, nextScope: string, nextLabo: string, nextSubstance: string, nextActiveOnly: boolean, nextAdvanced: AdvancedSearchCondition[], nextAlgerieOnly: boolean) => {
    const params = buildSearchParams(nextQ, nextScope, nextLabo, nextSubstance, nextActiveOnly, nextAdvanced, nextAlgerieOnly)
    startTransition(() => {
      router.replace(`/recherche${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
    })
  }, [router, startTransition])

  const search = useCallback(async (q: string, s: string, l: string, sub: string, active: boolean, adv: AdvancedSearchCondition[]) => {
    if (!q.trim() && !l.trim() && !sub.trim() && !hasAdvancedFilters(adv)) { setResults([]); return }
    setLoading(true)
    try {
      // On passe l'algerieOnly courant via l'advanced effectif (pas de param supplémentaire à l'API)
      const params = buildSearchParams(q, s, l, sub, active, adv, false)
      const res = await fetch(`/api/search?${params.toString()}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally { setLoading(false) }
  }, [])

  function handleInput(val: string) {
    setQuery(val)
    syncUrl(val, scope, labo, substance, activeOnly, advanced, algerieOnly)
    const effAdv = effectiveAdvanced(advanced, algerieOnly)
    if (val.length >= 2 || labo || substance || hasAdvancedFilters(effAdv)) search(val, scope, labo, substance, activeOnly, effAdv)
    else if (val.length === 0) setResults([])
  }

  function handleScope(s: string) {
    setScope(s)
    const effAdv = effectiveAdvanced(advanced, algerieOnly)
    if (query.trim() || labo.trim() || substance.trim() || hasAdvancedFilters(effAdv)) search(query, s, labo, substance, activeOnly, effAdv)
    syncUrl(query, s, labo, substance, activeOnly, advanced, algerieOnly)
  }

  function handleActiveOnly(checked: boolean) {
    setActiveOnly(checked)
    syncUrl(query, scope, labo, substance, checked, advanced, algerieOnly)
    const effAdv = effectiveAdvanced(advanced, algerieOnly)
    if (query.trim() || labo.trim() || substance.trim() || hasAdvancedFilters(effAdv)) search(query, scope, labo, substance, checked, effAdv)
  }

  function handleAlgerieOnly(next: boolean) {
    setAlgerieOnly(next)
    syncUrl(query, scope, labo, substance, activeOnly, advanced, next)
    const effAdv = effectiveAdvanced(advanced, next)
    if (query.trim() || labo.trim() || substance.trim() || hasAdvancedFilters(effAdv)) search(query, scope, labo, substance, activeOnly, effAdv)
    else setResults([])
  }

  function updateAdvanced(index: number, patch: Partial<AdvancedSearchCondition>) {
    const next = advanced.map((condition, idx) => {
      if (idx !== index) return condition
      const updated = { ...condition, ...patch }
      if (patch.field) updated.operator = getDefaultOperator(patch.field)
      return updated
    })
    setAdvanced(next)
    syncUrl(query, scope, labo, substance, activeOnly, next, algerieOnly)
    const effAdv = effectiveAdvanced(next, algerieOnly)
    if (query.trim() || labo.trim() || substance.trim() || hasAdvancedFilters(effAdv)) search(query, scope, labo, substance, activeOnly, effAdv)
    else setResults([])
  }

  function addAdvancedCondition() {
    const next = [...advanced, { field: 'dci', operator: 'contains', value: '', bool: 'AND' as const }]
    setAdvanced(next)
  }

  function removeAdvancedCondition(index: number) {
    const next = advanced.filter((_, idx) => idx !== index)
    const safeNext = next.length ? next : [{ field: 'dci', operator: 'contains', value: '', bool: 'AND' as const }]
    setAdvanced(safeNext)
    syncUrl(query, scope, labo, substance, activeOnly, safeNext, algerieOnly)
    const effAdv = effectiveAdvanced(safeNext, algerieOnly)
    if (query.trim() || labo.trim() || substance.trim() || hasAdvancedFilters(effAdv)) search(query, scope, labo, substance, activeOnly, effAdv)
    else setResults([])
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
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="Recherche simple sur tout: DCI, marque, forme, dosage, labo..."
          autoFocus
        />
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, pointerEvents: 'none', userSelect: 'none' }}>/</span>
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
        <button
          className={`filter-tab${algerieOnly ? ' active' : ''}`}
          onClick={() => handleAlgerieOnly(!algerieOnly)}
          title="Afficher uniquement les médicaments fabriqués en Algérie (statut F)"
        >
          🇩🇿 Fabriqué en Algérie
        </button>
      </div>

      <details style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#f8fafc' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#334155' }}>Recherche avancée (booléenne)</summary>
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {advanced.map((condition, index) => {
            const type = getFieldType(condition.field)
            const operators = type === 'number' ? NUMBER_OPERATORS : TEXT_OPERATORS
            return (
              <div key={`advanced-${index}`} style={{ display: 'grid', gridTemplateColumns: index === 0 ? '1fr 1fr 1.2fr auto' : '90px 1fr 1fr 1.2fr auto', gap: 8 }}>
                {index > 0 && (
                  <select
                    value={condition.bool || 'AND'}
                    onChange={(e) => updateAdvanced(index, { bool: e.target.value as 'AND' | 'OR' })}
                    style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}
                  >
                    <option value="AND">ET</option>
                    <option value="OR">OU</option>
                  </select>
                )}

                <select
                  value={condition.field}
                  onChange={(e) => updateAdvanced(index, { field: e.target.value })}
                  style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}
                >
                  {ADVANCED_FIELDS.map((field) => (
                    <option key={field.value} value={field.value}>{field.label}</option>
                  ))}
                </select>

                <select
                  value={condition.operator}
                  onChange={(e) => updateAdvanced(index, { operator: e.target.value })}
                  style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}
                >
                  {operators.map((operator) => (
                    <option key={operator.value} value={operator.value}>{operator.label}</option>
                  ))}
                </select>

                <input
                  type={type === 'number' ? 'number' : 'text'}
                  value={condition.value}
                  onChange={(e) => updateAdvanced(index, { value: e.target.value })}
                  placeholder={type === 'number' ? 'ex: 500' : 'valeur à rechercher'}
                  style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}
                />

                <button
                  onClick={() => removeAdvancedCondition(index)}
                  style={{ border: '1px solid #fecaca', color: '#b91c1c', background: '#fff1f2', borderRadius: 8, padding: '0 10px', cursor: 'pointer', fontWeight: 700 }}
                  title="Supprimer la condition"
                >
                  ✕
                </button>
              </div>
            )
          })}

          <div>
            <button
              onClick={addAdvancedCondition}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >+ Ajouter une condition</button>
          </div>
        </div>
      </details>

      {loading && (
        <div className="loading-spinner">
          <div className="spinner" /> Recherche en cours...
        </div>
      )}

      {!loading && (query || labo || substance || hasAdvancedFilters(advanced)) && (
        <div className="search-count">
          {results.length === 0
            ? `Aucun résultat — essayez d'élargir les critères.`
            : `${results.length} résultat(s) trouvés`
          }
        </div>
      )}

      {!loading && results.map((d, i) => (
        <DrugCard key={`${d.source}-${d.id}-${i}`} drug={d} type={d.source} />
      ))}

      {!query && !labo && !substance && !hasAdvancedFilters(advanced) && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>💊</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Tapez une recherche globale ou ouvrez la recherche avancée</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Exemples: substance contient "paracétamol", dosage numérique &gt; 500, labo commence par "SAI".</div>
        </div>
      )}
    </>
  )
}
