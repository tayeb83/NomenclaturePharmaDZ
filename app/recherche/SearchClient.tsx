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
          placeholder={lang === 'ar' ? 'بحث شامل: DCI، الاسم التجاري، الشكل، الجرعة، المخبر...' : 'Recherche simple sur tout: DCI, marque, forme, dosage, labo...'}
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
          {results.length === 0 ? (lang === 'ar' ? 'لا توجد نتائج' : 'Aucun résultat') : `${results.length} ${lang === 'ar' ? 'نتيجة' : 'résultat(s) trouvés'}`}
        </div>
      )}

      {!loading && results.map((d, i) => (
        <DrugCard key={`${d.source}-${d.id}-${i}`} drug={d} type={d.source} />
      ))}
    </>
  )
}
