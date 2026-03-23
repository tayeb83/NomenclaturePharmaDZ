'use client'

import { useState, useTransition, useCallback, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchResult } from '@/lib/db'
import { DrugCard } from '@/components/drug/DrugCard'
import { useLanguage } from '@/components/i18n/LanguageProvider'

type AdvancedSearchCondition = {
  field: string
  operator: string
  value: string
  bool?: 'AND' | 'OR'
}

type FieldType = 'text' | 'number'

const TEXT_OPERATORS = [
  { value: 'contains', label: { fr: 'contient', ar: 'يحتوي' } },
  { value: 'equals', label: { fr: 'égal à', ar: 'يساوي' } },
  { value: 'starts_with', label: { fr: 'commence par', ar: 'يبدأ بـ' } },
]

const NUMBER_OPERATORS = [
  { value: 'equals', label: { fr: '=', ar: '=' } },
  { value: 'gt', label: { fr: '>', ar: '>' } },
  { value: 'gte', label: { fr: '>=', ar: '>=' } },
  { value: 'lt', label: { fr: '<', ar: '<' } },
  { value: 'lte', label: { fr: '<=', ar: '<=' } },
]

const SOURCE_LABELS: Record<SearchResult['source'], { fr: string; ar: string }> = {
  enregistrement: { fr: 'Enregistré', ar: 'مسجّل' },
  retrait: { fr: 'Retiré', ar: 'مسحوب' },
  non_renouvele: { fr: 'Non renouvelé', ar: 'غير مجدد' },
}

function getFieldType(field: string): FieldType {
  return field === 'dosage_num' || field === 'annee' ? 'number' : 'text'
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
  basePath = '/recherche',
}: {
  initialQuery: string
  initialScope: string
  initialResults: SearchResult[]
  initialLabo: string
  initialSubstance: string
  initialActiveOnly: boolean
  initialAdvanced: AdvancedSearchCondition[]
  initialAlgerieOnly: boolean
  basePath?: string
}) {
  const { lang } = useLanguage()
  const SCOPES = useMemo(() => ([
    { value: 'all', label: lang === 'ar' ? 'الكل' : 'Tous' },
    { value: 'enregistrement', label: lang === 'ar' ? '✅ مسجّلة' : '✅ Enregistrés' },
    { value: 'retrait', label: lang === 'ar' ? '🚫 مسحوبة' : '🚫 Retirés' },
    { value: 'non_renouvele', label: lang === 'ar' ? '⚠️ غير مجددة' : '⚠️ Non renouvelés' },
  ]), [lang])

  const ADVANCED_FIELDS: Array<{ value: string; label: string; type: FieldType }> = useMemo(() => ([
    { value: 'dci', label: lang === 'ar' ? 'المادة الفعالة (DCI)' : 'Substance (DCI)', type: 'text' },
    { value: 'nom_marque', label: lang === 'ar' ? 'الاسم التجاري' : 'Nom de marque', type: 'text' },
    { value: 'forme', label: lang === 'ar' ? 'الشكل' : 'Forme', type: 'text' },
    { value: 'dosage', label: lang === 'ar' ? 'الجرعة (نص)' : 'Dosage (texte)', type: 'text' },
    { value: 'dosage_num', label: lang === 'ar' ? 'الجرعة (رقم)' : 'Dosage (valeur numérique)', type: 'number' },
    { value: 'labo', label: lang === 'ar' ? 'المخبر' : 'Laboratoire', type: 'text' },
    { value: 'pays', label: lang === 'ar' ? 'البلد' : 'Pays', type: 'text' },
    { value: 'type_prod', label: lang === 'ar' ? 'نوع المنتج' : 'Type produit', type: 'text' },
    { value: 'statut', label: lang === 'ar' ? 'الحالة' : 'Statut', type: 'text' },
    { value: 'n_enreg', label: lang === 'ar' ? 'رقم التسجيل' : 'N° enregistrement', type: 'text' },
    { value: 'annee', label: lang === 'ar' ? 'السنة' : 'Année', type: 'number' },
  ]), [lang])

  const [query, setQuery] = useState(initialQuery)
  const [scope, setScope] = useState(initialScope)
  const [labo, setLabo] = useState(initialLabo)
  const [substance, setSubstance] = useState(initialSubstance)
  const [activeOnly, setActiveOnly] = useState(initialActiveOnly)
  const [algerieOnly, setAlgerieOnly] = useState(initialAlgerieOnly)
  const [advanced, setAdvanced] = useState<AdvancedSearchCondition[]>(initialAdvanced.length ? initialAdvanced : [{ field: 'dci', operator: 'contains', value: '', bool: 'AND' }])
  const [results, setResults] = useState<SearchResult[]>(initialResults)
  const [loading, setLoading] = useState(false)
  const [selectedPays, setSelectedPays] = useState('')
  const [selectedLaboFacet, setSelectedLaboFacet] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [selectedAnnee, setSelectedAnnee] = useState('')
  const [selectedAtc, setSelectedAtc] = useState('')
  const [selectedSubstanceFacet, setSelectedSubstanceFacet] = useState('')
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
      router.replace(`${basePath}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
    })
  }, [router, startTransition, basePath])

  const search = useCallback(async (q: string, s: string, l: string, sub: string, active: boolean, adv: AdvancedSearchCondition[]) => {
    if (!q.trim() && !l.trim() && !sub.trim() && !hasAdvancedFilters(adv)) { setResults([]); return }
    setLoading(true)
    try {
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

  const trackResultOpen = useCallback((drug: SearchResult) => {
    const searchQuery = query.trim() || substance.trim() || labo.trim() || 'recherche_avancee'
    const payload = {
      search_query: searchQuery,
      scope: activeOnly ? 'enregistrement' : scope,
      result_source: drug.source,
      result_id: drug.id,
      result_name: drug.nom_marque,
      result_dci: drug.dci,
      result_labo: drug.labo,
    }

    try {
      const body = JSON.stringify(payload)
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/search-click', blob)
        return
      }
      fetch('/api/analytics/search-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    } catch {
      // analytics non bloquant
    }
  }, [activeOnly, labo, query, scope, substance])

  const facets = useMemo(() => {
    const counts = {
      pays: new Map<string, number>(),
      labo: new Map<string, number>(),
      source: new Map<string, number>(),
      annee: new Map<string, number>(),
      atc: new Map<string, number>(),
      substance: new Map<string, number>(),
    }

    for (const row of results) {
      const pays = row.pays?.trim()
      const labo = row.labo?.trim()
      const atc = row.code_atc?.trim()
      const substance = row.dci?.trim()
      counts.source.set(row.source, (counts.source.get(row.source) || 0) + 1)
      if (pays) counts.pays.set(pays, (counts.pays.get(pays) || 0) + 1)
      if (labo) counts.labo.set(labo, (counts.labo.get(labo) || 0) + 1)
      if (row.annee) counts.annee.set(String(row.annee), (counts.annee.get(String(row.annee)) || 0) + 1)
      if (atc) counts.atc.set(atc, (counts.atc.get(atc) || 0) + 1)
      if (substance) counts.substance.set(substance, (counts.substance.get(substance) || 0) + 1)
    }

    const toSorted = (map: Map<string, number>) => Array.from(map.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

    return {
      pays: toSorted(counts.pays),
      labo: toSorted(counts.labo),
      source: toSorted(counts.source),
      annee: toSorted(counts.annee),
      atc: toSorted(counts.atc),
      substance: toSorted(counts.substance),
    }
  }, [results])

  useEffect(() => {
    if (selectedPays && !facets.pays.some(([value]) => value === selectedPays)) setSelectedPays('')
    if (selectedLaboFacet && !facets.labo.some(([value]) => value === selectedLaboFacet)) setSelectedLaboFacet('')
    if (selectedSource && !facets.source.some(([value]) => value === selectedSource)) setSelectedSource('')
    if (selectedAnnee && !facets.annee.some(([value]) => value === selectedAnnee)) setSelectedAnnee('')
    if (selectedAtc && !facets.atc.some(([value]) => value === selectedAtc)) setSelectedAtc('')
    if (selectedSubstanceFacet && !facets.substance.some(([value]) => value === selectedSubstanceFacet)) setSelectedSubstanceFacet('')
  }, [facets, selectedPays, selectedLaboFacet, selectedSource, selectedAnnee, selectedAtc, selectedSubstanceFacet])

  const filteredResults = useMemo(() => {
    return results.filter((row) => {
      if (selectedPays && row.pays?.trim() !== selectedPays) return false
      if (selectedLaboFacet && row.labo?.trim() !== selectedLaboFacet) return false
      if (selectedSource && row.source !== selectedSource) return false
      if (selectedAnnee && String(row.annee || '') !== selectedAnnee) return false
      if (selectedAtc && row.code_atc?.trim() !== selectedAtc) return false
      if (selectedSubstanceFacet && row.dci?.trim() !== selectedSubstanceFacet) return false
      return true
    })
  }, [results, selectedPays, selectedLaboFacet, selectedSource, selectedAnnee, selectedAtc, selectedSubstanceFacet])
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
          placeholder={lang === 'ar' ? 'بحث شامل: DCI، الاسم التجاري، الشكل، الجرعة، المخبر...' : 'Recherche simple sur tout: DCI, marque, forme, dosage, labo...'}
          autoFocus
        />
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#475569', fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, pointerEvents: 'none', userSelect: 'none' }}>/</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#334155' }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => handleActiveOnly(e.target.checked)}
          />
          {lang === 'ar' ? 'فقط الأدوية النشطة (المسجلة)' : 'Uniquement médicaments actifs (enregistrés)'}
        </label>
        <button
          onClick={exportCsv}
          disabled={!results.length}
          style={{ padding: '7px 12px', borderRadius: 20, border: '1px solid #bfdbfe', background: results.length ? '#dbeafe' : '#f1f5f9', cursor: results.length ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600 }}
        >{lang === 'ar' ? 'تصدير CSV' : 'Extraire CSV'}</button>
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
          title={lang === 'ar' ? 'عرض الأدوية المصنّعة في الجزائر فقط (F)' : 'Afficher uniquement les médicaments fabriqués en Algérie (statut F)'}
        >
          🇩🇿 {lang === 'ar' ? 'مصنوع في الجزائر' : 'Fabriqué en Algérie'}
        </button>
      </div>

      <details style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#f8fafc' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#334155' }}>{lang === 'ar' ? 'بحث متقدم (منطقي)' : 'Recherche avancée (booléenne)'}</summary>
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
                    <option value="AND">{lang === 'ar' ? 'و' : 'ET'}</option>
                    <option value="OR">{lang === 'ar' ? 'أو' : 'OU'}</option>
                  </select>
                )}

                <select value={condition.field} onChange={(e) => updateAdvanced(index, { field: e.target.value })} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}>
                  {ADVANCED_FIELDS.map((field) => (
                    <option key={field.value} value={field.value}>{field.label}</option>
                  ))}
                </select>

                <select value={condition.operator} onChange={(e) => updateAdvanced(index, { operator: e.target.value })} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}>
                  {operators.map((operator) => (
                    <option key={operator.value} value={operator.value}>{operator.label[lang]}</option>
                  ))}
                </select>

                <input
                  type={type === 'number' ? 'number' : 'text'}
                  value={condition.value}
                  onChange={(e) => updateAdvanced(index, { value: e.target.value })}
                  placeholder={type === 'number' ? 'ex: 500' : (lang === 'ar' ? 'القيمة المراد البحث عنها' : 'valeur à rechercher')}
                  style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}
                />

                <button onClick={() => removeAdvancedCondition(index)} style={{ border: '1px solid #fecaca', color: '#b91c1c', background: '#fff1f2', borderRadius: 8, padding: '0 10px', cursor: 'pointer', fontWeight: 700 }} title={lang === 'ar' ? 'حذف الشرط' : 'Supprimer la condition'}>
                  ✕
                </button>
              </div>
            )
          })}

          <div>
            <button onClick={addAdvancedCondition} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              + {lang === 'ar' ? 'إضافة شرط' : 'Ajouter une condition'}
            </button>
          </div>
        </div>
      </details>

      {loading && (
        <div className="loading-spinner">
          <div className="spinner" /> {lang === 'ar' ? 'جاري البحث...' : 'Recherche en cours...'}
        </div>
      )}

      {!loading && (query || labo || substance || hasAdvancedFilters(advanced)) && (
        <div className="search-count">
          {filteredResults.length === 0 ? (lang === 'ar' ? 'لا توجد نتائج' : 'Aucun résultat') : `${filteredResults.length} ${lang === 'ar' ? 'نتيجة' : 'résultat(s) trouvés'}`}
          {results.length !== filteredResults.length && ` (${results.length} ${lang === 'ar' ? 'إجمالي' : 'total'})`}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ marginBottom: 18, border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#f8fafc' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>
            {lang === 'ar' ? 'الواجهات (Facettes) لتضييق النتائج' : 'Facettes pour affiner les résultats'}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ fontSize: 12, color: '#475569', minWidth: 58 }}>{lang === 'ar' ? 'البلد' : 'Pays'}</strong>
              {facets.pays.slice(0, 8).map(([value, count]) => (
                <button
                  key={`facet-pays-${value}`}
                  onClick={() => setSelectedPays(selectedPays === value ? '' : value)}
                  style={{ padding: '6px 10px', borderRadius: 999, border: selectedPays === value ? '1px solid #2563eb' : '1px solid #cbd5e1', background: selectedPays === value ? '#dbeafe' : '#fff', cursor: 'pointer', fontSize: 12 }}
                >{value} ({count})</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ fontSize: 12, color: '#475569', minWidth: 58 }}>{lang === 'ar' ? 'المخبر' : 'Labo'}</strong>
              {facets.labo.slice(0, 8).map(([value, count]) => (
                <button
                  key={`facet-labo-${value}`}
                  onClick={() => setSelectedLaboFacet(selectedLaboFacet === value ? '' : value)}
                  style={{ padding: '6px 10px', borderRadius: 999, border: selectedLaboFacet === value ? '1px solid #2563eb' : '1px solid #cbd5e1', background: selectedLaboFacet === value ? '#dbeafe' : '#fff', cursor: 'pointer', fontSize: 12 }}
                >{value} ({count})</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ fontSize: 12, color: '#475569', minWidth: 58 }}>{lang === 'ar' ? 'البيانات' : 'Données'}</strong>
              {facets.source.map(([value, count]) => (
                <button
                  key={`facet-source-${value}`}
                  onClick={() => setSelectedSource(selectedSource === value ? '' : value)}
                  style={{ padding: '6px 10px', borderRadius: 999, border: selectedSource === value ? '1px solid #2563eb' : '1px solid #cbd5e1', background: selectedSource === value ? '#dbeafe' : '#fff', cursor: 'pointer', fontSize: 12 }}
                >{SOURCE_LABELS[value as SearchResult['source']][lang]} ({count})</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ fontSize: 12, color: '#475569', minWidth: 58 }}>{lang === 'ar' ? 'السنة' : 'Année'}</strong>
              {facets.annee.slice(0, 8).map(([value, count]) => (
                <button
                  key={`facet-annee-${value}`}
                  onClick={() => setSelectedAnnee(selectedAnnee === value ? '' : value)}
                  style={{ padding: '6px 10px', borderRadius: 999, border: selectedAnnee === value ? '1px solid #2563eb' : '1px solid #cbd5e1', background: selectedAnnee === value ? '#dbeafe' : '#fff', cursor: 'pointer', fontSize: 12 }}
                >{value} ({count})</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ fontSize: 12, color: '#475569', minWidth: 58 }}>ATC</strong>
              {facets.atc.slice(0, 8).map(([value, count]) => (
                <button
                  key={`facet-atc-${value}`}
                  onClick={() => setSelectedAtc(selectedAtc === value ? '' : value)}
                  style={{ padding: '6px 10px', borderRadius: 999, border: selectedAtc === value ? '1px solid #2563eb' : '1px solid #cbd5e1', background: selectedAtc === value ? '#dbeafe' : '#fff', cursor: 'pointer', fontSize: 12 }}
                >{value} ({count})</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ fontSize: 12, color: '#475569', minWidth: 58 }}>{lang === 'ar' ? 'المادة' : 'Substance'}</strong>
              {facets.substance.slice(0, 8).map(([value, count]) => (
                <button
                  key={`facet-substance-${value}`}
                  onClick={() => setSelectedSubstanceFacet(selectedSubstanceFacet === value ? '' : value)}
                  style={{ padding: '6px 10px', borderRadius: 999, border: selectedSubstanceFacet === value ? '1px solid #2563eb' : '1px solid #cbd5e1', background: selectedSubstanceFacet === value ? '#dbeafe' : '#fff', cursor: 'pointer', fontSize: 12 }}
                >{value} ({count})</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && filteredResults.map((d, i) => (
        <DrugCard key={`${d.source}-${d.id}-${i}`} drug={d} type={d.source} onOpen={() => trackResultOpen(d)} />
      ))}
    </>
  )
}
