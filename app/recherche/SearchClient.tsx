'use client'

import { Suspense, useState, useTransition, useCallback, useRef, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import type { SearchResult } from '@/lib/db-types'
import { DrugCard } from '@/components/drug/DrugCard'
import { AdInContent } from '@/components/ads/AdBanner'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { SuggestionList } from '@/components/search/SuggestionList'
import { useSuggestions } from '@/components/search/useSuggestions'
import { FiltresRecherche, type GroupeFiltre, type OptionFiltre } from '@/components/search/FiltresRecherche'
// Types seulement : le code de normalisation reste côté serveur (il est lourd pour un bundle navigateur).
import type { Facette, Facettes, FacetteSel } from '@/lib/facettes'
import { CHOIX_ALLERGIES } from '@/lib/allergies-choix'
import type { AllergieChoisie, ModeAllergie } from '@/lib/allergies-params'
import Link from 'next/link'

// Recherche guidée (Lab) : chargée seulement quand on ouvre l'onglet.
const GuideClient = dynamic(() => import('@/app/lab/guide/GuideClient').then(m => m.GuideClient), { ssr: false })

type Onglet = 'simple' | 'guidee'

type AdvancedSearchCondition = {
  field: string
  operator: string
  value: string
  bool?: 'AND' | 'OR'
}

type FieldType = 'text' | 'number'

const TEXT_OPERATORS = [
  { value: 'contains', label: { fr: 'contient', ar: 'يحتوي' } },
  { value: 'not_contains', label: { fr: 'ne contient pas', ar: 'لا يحتوي' } },
  { value: 'equals', label: { fr: 'égal à', ar: 'يساوي' } },
  { value: 'starts_with', label: { fr: 'commence par', ar: 'يبدأ بـ' } },
  { value: 'ends_with', label: { fr: 'se termine par', ar: 'ينتهي بـ' } },
  { value: 'is_empty', label: { fr: 'est vide', ar: 'فارغ' } },
  { value: 'is_not_empty', label: { fr: "n'est pas vide", ar: 'غير فارغ' } },
]

const NO_VALUE_OPERATORS = new Set(['is_empty', 'is_not_empty'])

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

const FACETTES_VIDES: Facettes = { voie: [], forme: [], dosage: [], origine: [] }
const GROUPES_FACETTES: Array<{ id: Facette; fr: string; ar: string }> = [
  { id: 'voie', fr: 'Voie', ar: 'طريقة الاستعمال' },
  { id: 'forme', fr: 'Forme', ar: 'الشكل' },
  { id: 'dosage', fr: 'Dosage', ar: 'الجرعة' },
  { id: 'origine', fr: 'Origine', ar: 'المصدر' },
]

function buildSearchParams(
  q: string,
  scope: string,
  labo: string,
  substance: string,
  activeOnly: boolean,
  advanced: AdvancedSearchCondition[],
  algerieOnly: boolean,
  dciMode = false,
  fac: FacetteSel = {},
  allergie: AllergieChoisie | null = null,
) {
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q)
  if (scope !== 'all') params.set('scope', scope)
  if (labo.trim()) params.set('labo', labo)
  if (substance.trim()) params.set('substance', substance)
  if (activeOnly) params.set('activeOnly', '1')
  if (algerieOnly) params.set('algerieOnly', '1')
  if (dciMode) params.set('mode', 'dci')
  for (const f of ['voie', 'forme', 'dosage', 'origine'] as const) if (fac[f]) params.set(f, fac[f]!)
  if (allergie) { params.set('allergie', allergie.code); params.set('allergie_mode', allergie.mode) }
  if (hasAdvancedFilters(advanced)) params.set('advanced', JSON.stringify(advanced))
  return params
}

function effectiveAdvanced(base: AdvancedSearchCondition[], algerieOnly: boolean): AdvancedSearchCondition[] {
  if (!algerieOnly) return base
  return [...base, { field: 'statut', operator: 'equals', value: 'F', bool: 'AND' as const }]
}

/** Ce que le serveur a trouvé pour l'allergie choisie, dans le lot de résultats analysé. */
type BilanAllergie = { code: string; mode: ModeAllergie; signales: number; signales_total: number; masques: number } | null

type FuzzyInfo = {
  fuzzy: boolean
  matchedTerm: string | null
  synonymTerm: string | null
}

const NO_FUZZY: FuzzyInfo = { fuzzy: false, matchedTerm: null, synonymTerm: null }

export function SearchClient({
  initialQuery,
  initialScope,
  initialResults,
  initialFuzzyInfo,
  initialLabo,
  initialSubstance,
  initialActiveOnly,
  initialAdvanced,
  initialAlgerieOnly,
  initialDciMode = false,
  initialAdvancedOpen = false,
  initialOnglet = 'simple',
  guideDispo = true,
  initialFacettes = FACETTES_VIDES,
  initialFacSel = {},
  initialTotal = 0,
  initialTronque = false,
  initialAllergie = null,
  initialAllergieBilan = null,
  basePath = '/recherche',
}: {
  initialQuery: string
  initialScope: string
  initialResults: SearchResult[]
  initialFuzzyInfo?: FuzzyInfo
  initialLabo: string
  initialSubstance: string
  initialActiveOnly: boolean
  initialAdvanced: AdvancedSearchCondition[]
  initialAlgerieOnly: boolean
  /** Liste d'une substance (DCI) choisie : toutes ses présentations, par ordre alphabétique. */
  initialDciMode?: boolean
  /** Panneau « Recherche avancée » ouvert d'emblée (lien ?avancee=1, ou filtres déjà posés). */
  initialAdvancedOpen?: boolean
  initialOnglet?: Onglet
  /** Onglet « Guidée » proposé. */
  guideDispo?: boolean
  /** Facettes calculées côté serveur sur tout le lot de résultats (voie, forme, dosage, origine). */
  initialFacettes?: Facettes
  initialFacSel?: FacetteSel
  /** Lignes qui respectent les facettes, avant troncature de la liste affichée. */
  initialTotal?: number
  initialTronque?: boolean
  /** Allergie connue (?allergie=…&allergie_mode=…) : signaler ou masquer les présentations concernées. */
  initialAllergie?: AllergieChoisie | null
  initialAllergieBilan?: BilanAllergie
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
  const [fuzzyInfo, setFuzzyInfo] = useState<FuzzyInfo>(initialFuzzyInfo ?? NO_FUZZY)
  const [facettes, setFacettes] = useState<Facettes>(initialFacettes)
  const [facSel, setFacSel] = useState<FacetteSel>(initialFacSel)
  const [totalServeur, setTotalServeur] = useState(initialTotal)
  const [tronque, setTronque] = useState(initialTronque)
  // Lue par syncUrl et search sans les re-créer à chaque clic sur une facette.
  const facRef = useRef<FacetteSel>(initialFacSel)
  // L'allergie connue reste choisie d'une saisie à l'autre (contrairement aux facettes) : c'est une donnée du patient, pas de la liste.
  const allergieRef = useRef<AllergieChoisie | null>(initialAllergie)
  const [allergie, setAllergie] = useState<AllergieChoisie | null>(initialAllergie)
  const [bilanAllergie, setBilanAllergie] = useState<BilanAllergie>(initialAllergieBilan)
  const [allergieOuverte, setAllergieOuverte] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedPays, setSelectedPays] = useState('')
  const [selectedLaboFacet, setSelectedLaboFacet] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [selectedAnnee, setSelectedAnnee] = useState('')
  const [selectedAtc, setSelectedAtc] = useState('')
  const [selectedSubstanceFacet, setSelectedSubstanceFacet] = useState('')
  // Vrai quand l'utilisateur a cliqué une DCI dans les suggestions ; repasse à faux dès qu'il retape.
  const dciModeRef = useRef(initialDciMode)
  const router = useRouter()
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const [onglet, setOnglet] = useState<Onglet>(initialOnglet === 'guidee' && guideDispo ? 'guidee' : 'simple')
  // Conditions avancées : un panneau de la recherche normale (mêmes filtres latéraux), ouvert si des conditions existent
  const [advancedOpen, setAdvancedOpen] = useState(initialAdvancedOpen || hasAdvancedFilters(initialAdvanced))

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
    const params = buildSearchParams(nextQ, nextScope, nextLabo, nextSubstance, nextActiveOnly, nextAdvanced, nextAlgerieOnly, dciModeRef.current, facRef.current, allergieRef.current)
    startTransition(() => {
      router.replace(`${basePath}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
    })
  }, [router, startTransition, basePath])

  const search = useCallback(async (q: string, s: string, l: string, sub: string, active: boolean, adv: AdvancedSearchCondition[]) => {
    if (!q.trim() && !l.trim() && !sub.trim() && !hasAdvancedFilters(adv)) { setResults([]); setFuzzyInfo(NO_FUZZY); setFacettes(FACETTES_VIDES); setTotalServeur(0); return }
    setLoading(true)
    try {
      const params = buildSearchParams(q, s, l, sub, active, adv, false, dciModeRef.current, facRef.current, allergieRef.current)
      const res = await fetch(`/api/search?${params.toString()}`)
      const data = await res.json()
      setResults(data.results || [])
      setFacettes(data.facettes ?? FACETTES_VIDES)
      setTotalServeur(data.total ?? (data.results || []).length)
      setTronque(Boolean(data.tronque))
      setBilanAllergie(data.allergie ?? null)
      // le serveur retire les choix devenus impossibles : on s'aligne sur ce qu'il a réellement appliqué
      if (data.selection) { facRef.current = data.selection; setFacSel(data.selection) }
      setFuzzyInfo(data.fuzzy ? { fuzzy: true, matchedTerm: data.matchedTerm ?? null, synonymTerm: data.synonymTerm ?? null } : NO_FUZZY)
    } catch {
      setResults([])
      setFuzzyInfo(NO_FUZZY)
      setFacettes(FACETTES_VIDES)
    } finally { setLoading(false) }
  }, [])

  function changerOnglet(next: Onglet) {
    if (next === onglet) return
    setOnglet(next)
    if (next === 'guidee') {
      startTransition(() => { router.replace(`${basePath}?onglet=guide`, { scroll: false }) })
      return
    }
    syncUrl(query, scope, labo, substance, activeOnly, advanced, algerieOnly)
  }

  function handleInput(val: string, dci = false) {
    dciModeRef.current = dci
    // une nouvelle saisie repart d'une liste entière : les choix de facettes de la précédente n'ont plus de sens
    facRef.current = {}
    setFacSel({})
    setQuery(val)
    syncUrl(val, scope, labo, substance, activeOnly, advanced, algerieOnly)
    const effAdv = effectiveAdvanced(advanced, algerieOnly)
    if (val.length >= 2 || labo || substance || hasAdvancedFilters(effAdv)) search(val, scope, labo, substance, activeOnly, effAdv)
    else if (val.length === 0) setResults([])
  }

  function handleFacette(groupe: Facette, id: string) {
    const next: FacetteSel = { ...facRef.current }
    if (next[groupe] === id) delete next[groupe]
    else next[groupe] = id
    facRef.current = next
    setFacSel(next)
    syncUrl(query, scope, labo, substance, activeOnly, advanced, algerieOnly)
    search(query, scope, labo, substance, activeOnly, effectiveAdvanced(advanced, algerieOnly))
  }

  function clearFacettes() {
    facRef.current = {}
    setFacSel({})
    syncUrl(query, scope, labo, substance, activeOnly, advanced, algerieOnly)
    search(query, scope, labo, substance, activeOnly, effectiveAdvanced(advanced, algerieOnly))
  }

  /** Choisir, changer de mode ou retirer l'allergie connue : la liste est recalculée côté serveur. */
  function majAllergie(next: AllergieChoisie | null) {
    allergieRef.current = next
    setAllergie(next)
    if (!next) setBilanAllergie(null)
    syncUrl(query, scope, labo, substance, activeOnly, advanced, algerieOnly)
    const effAdv = effectiveAdvanced(advanced, algerieOnly)
    if (query.trim() || labo.trim() || substance.trim() || hasAdvancedFilters(effAdv)) search(query, scope, labo, substance, activeOnly, effAdv)
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

  const sg = useSuggestions(query, s => handleInput(s.label, s.kind === 'dci'))

  const ar = lang === 'ar'
  const optsLocales = (entries: [string, number][], label?: (v: string) => string): OptionFiltre[] =>
    entries.map(([v, n]) => ({ id: v, label: label ? label(v) : v, n }))
  const pickLocal = (courant: string, set: (v: string) => void) => (id: string) => set(courant === id ? '' : id)

  const groupesPrincipaux: GroupeFiltre[] = GROUPES_FACETTES
    .filter(g => facettes[g.id].length > 1 || facSel[g.id])
    .map(g => ({
      id: g.id,
      titre: ar ? g.ar : g.fr,
      actif: facSel[g.id],
      options: facettes[g.id].map(o => ({ id: o.id, label: ar && o.libelle_ar ? o.libelle_ar : o.libelle, n: o.n, drapeau: g.id === 'origine' && o.id === 'f' ? '🇩🇿 ' : undefined })),
      onPick: (id: string) => handleFacette(g.id, id),
    }))

  const groupesSecondaires: GroupeFiltre[] = ([
    { id: 'pays', titre: ar ? 'البلد' : 'Pays', options: optsLocales(facets.pays), actif: selectedPays, onPick: pickLocal(selectedPays, setSelectedPays) },
    { id: 'labo', titre: ar ? 'المخبر' : 'Laboratoire', options: optsLocales(facets.labo), actif: selectedLaboFacet, onPick: pickLocal(selectedLaboFacet, setSelectedLaboFacet) },
    { id: 'source', titre: ar ? 'الحالة' : 'Statut', options: optsLocales(facets.source, v => SOURCE_LABELS[v as SearchResult['source']][lang]), actif: selectedSource, onPick: pickLocal(selectedSource, setSelectedSource) },
    { id: 'annee', titre: ar ? 'السنة' : 'Année', options: optsLocales(facets.annee), actif: selectedAnnee, onPick: pickLocal(selectedAnnee, setSelectedAnnee) },
    { id: 'atc', titre: 'ATC', options: optsLocales(facets.atc), actif: selectedAtc, onPick: pickLocal(selectedAtc, setSelectedAtc) },
    { id: 'substance', titre: ar ? 'المادة' : 'Substance', options: optsLocales(facets.substance), actif: selectedSubstanceFacet, onPick: pickLocal(selectedSubstanceFacet, setSelectedSubstanceFacet) },
  ] as GroupeFiltre[]).filter(g => g.options.length > 1 || g.actif)

  function clearTout() {
    setSelectedPays(''); setSelectedLaboFacet(''); setSelectedSource(''); setSelectedAnnee(''); setSelectedAtc(''); setSelectedSubstanceFacet('')
    if (Object.keys(facRef.current).length) clearFacettes()
  }

  const onglets: Array<{ id: Onglet; icone: string; fr: string; ar: string }> = [
    { id: 'simple', icone: '🔍', fr: 'Recherche', ar: 'بحث' },
    ...(guideDispo ? [{ id: 'guidee' as Onglet, icone: '🧭', fr: 'Guidée', ar: 'موجَّه' }] : []),
  ]
  const nbConditions = advanced.filter(c => c.value?.trim()).length
  const aDesCriteres = Boolean(query || labo || substance || hasAdvancedFilters(advanced))
  const afficherFiltres = (results.length > 0 || Object.keys(facSel).length > 0) && (groupesPrincipaux.length > 0 || groupesSecondaires.length > 0)

  return (
    <>
      <div className="rech-onglets" role="tablist" aria-label={ar ? 'أنماط البحث' : 'Modes de recherche'} dir={ar ? 'rtl' : 'ltr'}>
        {onglets.map(o => (
          <button key={o.id} type="button" role="tab" aria-selected={onglet === o.id} className={`rech-onglet${onglet === o.id ? ' actif' : ''}`} onClick={() => changerOnglet(o.id)}>
            <span aria-hidden>{o.icone}</span> {ar ? o.ar : o.fr}
            {o.id === 'guidee' && <em className="rech-onglet-lab">{ar ? 'جديد' : 'Nouveau'}</em>}
          </button>
        ))}
      </div>

      {onglet === 'guidee' ? (
        <Suspense fallback={null}><GuideClient embedded basePath={basePath} extraParams={{ onglet: 'guide' }} /></Suspense>
      ) : (<>
      <div className="search-bar rech-barre">
        <span className="search-bar-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { handleInput(e.target.value); sg.setOpen(true) }}
          onKeyDown={e => { sg.onKeyDown(e) }}
          onFocus={() => sg.items.length > 0 && sg.setOpen(true)}
          onBlur={() => sg.setOpen(false)}
          role="combobox"
          aria-expanded={sg.open}
          aria-controls="search-sg"
          aria-autocomplete="list"
          aria-activedescendant={sg.active >= 0 ? `search-sg-${sg.active}` : undefined}
          autoComplete="off"
          placeholder={ar ? 'بحث شامل: DCI، الاسم التجاري، الشكل، الجرعة، المخبر...' : 'DCI, marque, forme, dosage, labo…'}
          autoFocus
        />
        <kbd className="rech-raccourci" aria-hidden>/</kbd>
        {sg.open && sg.items.length > 0 && (
          <SuggestionList id="search-sg" items={sg.items} active={sg.active} lang={lang} onPick={sg.pick} onHover={sg.setActive} />
        )}
      </div>

      <div className="rech-options">
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
            title={ar ? 'عرض الأدوية المصنّعة في الجزائر فقط (F)' : 'Afficher uniquement les médicaments fabriqués en Algérie (statut F)'}
          >
            🇩🇿 {ar ? 'مصنوع في الجزائر' : 'Fabriqué en Algérie'}
          </button>
        </div>
        <div className="rech-outils">
          <label className="rech-interrupteur">
            <input type="checkbox" checked={activeOnly} onChange={(e) => handleActiveOnly(e.target.checked)} />
            <span>{ar ? 'الأدوية النشطة فقط' : 'Médicaments actifs uniquement'}</span>
          </label>
          <button type="button" className={`rech-csv${allergieOuverte || allergie ? ' actif' : ''}`} aria-expanded={allergieOuverte || Boolean(allergie)} onClick={() => setAllergieOuverte(!(allergieOuverte || allergie))}>
            🩺 {ar ? 'حساسية معروفة' : 'Allergie connue'}{allergie && <span className="fl-badge" style={{ marginInlineStart: 6 }}>1</span>}
          </button>
          <button type="button" className={`rech-csv${advancedOpen ? ' actif' : ''}`} aria-expanded={advancedOpen} onClick={() => setAdvancedOpen(!advancedOpen)}>
            ⚙ {ar ? 'شروط متقدمة' : 'Conditions avancées'}{nbConditions > 0 && <span className="fl-badge" style={{ marginInlineStart: 6 }}>{nbConditions}</span>}
          </button>
          <button type="button" className="rech-csv" onClick={exportCsv} disabled={!results.length}>⬇ {ar ? 'تصدير CSV' : 'Exporter en CSV'}</button>
        </div>
      </div>

      {(allergieOuverte || allergie) && (
        <section className="rech-avancee rech-allergie" aria-label={ar ? 'حساسية معروفة' : 'Allergie connue'}>
          <p className="rech-avancee-aide">
            {ar
              ? 'اختر حساسية معروفة لتمييز الأدوية المعنية أو إخفائها. يُميَّز فقط ما يخص مادة هذه الحساسية أو صنفها المعلن، ولا يُستنتج أي تصالب مع مواد متقاربة. معلومة وليست رأيًا طبيًا.'
              : 'Choisissez une allergie connue pour signaler (ou masquer) les médicaments concernés. Seules la substance de cette allergie, ou sa classe déclarée, sont visées : aucune allergie croisée n\'est déduite. Information, pas un avis médical.'}
          </p>
          <Link className="guide-mode-emploi" href={`/articles/allergie-connue-medicaments-algerie-mode-emploi${ar ? '-ar' : ''}`}>
            📖 {ar ? 'دليل الاستعمال مع أمثلة' : 'Mode d’emploi avec exemples'}
          </Link>
          <div className="rech-allergie-ligne">
            <label>
              <span>{ar ? 'الحساسية' : 'Allergie'}</span>
              <select
                className="rech-champ"
                value={allergie?.code ?? ''}
                onChange={e => majAllergie(e.target.value ? { code: e.target.value, mode: allergie?.mode ?? 'signaler' } : null)}
              >
                <option value="">{ar ? '— لا شيء —' : '— aucune —'}</option>
                <optgroup label={ar ? 'أصناف' : 'Classes'}>
                  {CHOIX_ALLERGIES.filter(c => c.classe).map(c => <option key={c.code} value={c.code}>{c.code} · {c.fr}</option>)}
                </optgroup>
                <optgroup label={ar ? 'مواد' : 'Substances'}>
                  {CHOIX_ALLERGIES.filter(c => !c.classe).map(c => <option key={c.code} value={c.code}>{c.code} · {c.fr}{c.proche ? ' ≈' : ''}</option>)}
                </optgroup>
              </select>
            </label>
            <div className="rech-allergie-mode" role="group" aria-label={ar ? 'الوضع' : 'Mode'}>
              {(['signaler', 'masquer'] as const).map(m => (
                <button key={m} type="button" aria-pressed={allergie?.mode === m} disabled={!allergie}
                  className={`filter-tab${allergie?.mode === m ? ' active' : ''}`}
                  onClick={() => allergie && majAllergie({ ...allergie, mode: m })}>
                  {m === 'signaler' ? (ar ? 'تمييز' : 'Signaler') : (ar ? 'إخفاء' : 'Masquer')}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {advancedOpen && (
        <section className="rech-avancee" aria-label={ar ? 'بحث متقدم' : 'Recherche avancée'}>
          <p className="rech-avancee-aide">{ar ? 'اجمع عدة شروط بالمنطق «و» / «أو» على كل خصائص الدواء. تظهر المرشحات الجانبية كما في البحث العادي.' : 'Combinez plusieurs conditions (ET / OU) sur toutes les propriétés ; les filtres latéraux s’appliquent aussi.'}</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {advanced.map((condition, index) => {
              const type = getFieldType(condition.field)
              const operators = type === 'number' ? NUMBER_OPERATORS : TEXT_OPERATORS
              return (
                <div key={`advanced-${index}`} className={`rech-condition${index === 0 ? ' premiere' : ''}`}>
                  {index > 0 && (
                    <select className="rech-champ" value={condition.bool || 'AND'} onChange={(e) => updateAdvanced(index, { bool: e.target.value as 'AND' | 'OR' })}>
                      <option value="AND">{ar ? 'و' : 'ET'}</option>
                      <option value="OR">{ar ? 'أو' : 'OU'}</option>
                    </select>
                  )}
                  <select className="rech-champ" value={condition.field} onChange={(e) => updateAdvanced(index, { field: e.target.value })}>
                    {ADVANCED_FIELDS.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}
                  </select>
                  <select className="rech-champ" value={condition.operator} onChange={(e) => updateAdvanced(index, { operator: e.target.value })}>
                    {operators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label[lang]}</option>)}
                  </select>
                  {NO_VALUE_OPERATORS.has(condition.operator) ? (
                    <div className="rech-champ sans-valeur">{ar ? '(بدون قيمة)' : '(sans valeur)'}</div>
                  ) : (
                    <input
                      className="rech-champ"
                      type={type === 'number' ? 'number' : 'text'}
                      value={condition.value}
                      onChange={(e) => updateAdvanced(index, { value: e.target.value })}
                      placeholder={type === 'number' ? 'ex: 500' : (ar ? 'القيمة المراد البحث عنها' : 'valeur à rechercher')}
                    />
                  )}
                  <button type="button" className="rech-condition-x" onClick={() => removeAdvancedCondition(index)} title={ar ? 'حذف الشرط' : 'Supprimer la condition'} aria-label={ar ? 'حذف الشرط' : 'Supprimer la condition'}>✕</button>
                </div>
              )
            })}
          </div>
          <button type="button" className="page-btn" onClick={addAdvancedCondition} style={{ marginTop: 12 }}>+ {ar ? 'إضافة شرط' : 'Ajouter une condition'}</button>
        </section>
      )}

      <div className={afficherFiltres ? 'rech-mise' : undefined}>
        {afficherFiltres && (
          <FiltresRecherche
            ar={ar}
            principaux={groupesPrincipaux}
            secondaires={groupesSecondaires}
            onClear={clearTout}
            textes={ar
              ? { filtres: 'تصفية', plus: '+ مزيد من المرشحات', moins: 'إخفاء', effacer: 'مسح الكل', chercher: 'بحث في القائمة…', autres: n => `عرض ${n} أخرى`, aucun: 'لا شيء', actifs: 'المرشحات النشطة', fermer: 'عرض النتائج' }
              : { filtres: 'Filtrer', plus: '+ Plus de filtres', moins: 'Moins de filtres', effacer: 'Tout effacer', chercher: 'Chercher dans la liste…', autres: n => `Voir les ${n} autres`, aucun: 'Aucun choix', actifs: 'Filtres actifs', fermer: 'Voir les résultats' }}
          />
        )}
        <div className="rech-colonne">
          {!loading && !aDesCriteres && (
            <p className="rech-indice">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
              {ar ? 'بعد البحث، تظهر مرشحات «الطريقة والشكل والجرعة والمصدر» هنا لتضييق النتائج.' : 'Après une recherche, la barre « Filtrer » apparaît ici : voie, forme, dosage, origine, pour affiner les résultats.'}
            </p>
          )}

          {loading && (
            <div className="loading-spinner">
              <div className="spinner" /> {ar ? 'جاري البحث...' : 'Recherche en cours...'}
            </div>
          )}

          {!loading && fuzzyInfo.fuzzy && results.length > 0 && (
            <div className="rech-astuce">
              {fuzzyInfo.matchedTerm ? (
                ar
                  ? <>💡 لم يتم العثور على &laquo;{query}&raquo; في التسمية — نعرض نتائج المادة الفعالة <strong>{fuzzyInfo.matchedTerm}</strong>{fuzzyInfo.synonymTerm ? <> (الاسم الشائع: {fuzzyInfo.synonymTerm})</> : null}.</>
                  : <>💡 &laquo;{query}&raquo; n&apos;est pas dans la nomenclature — résultats pour la substance <strong>{fuzzyInfo.matchedTerm}</strong>{fuzzyInfo.synonymTerm ? <> (nom courant : {fuzzyInfo.synonymTerm})</> : null}.</>
              ) : (
                ar
                  ? <>💡 لا توجد نتيجة مطابقة تمامًا لـ &laquo;{query}&raquo; — نعرض أقرب النتائج (تصحيح إملائي/صوتي).</>
                  : <>💡 Aucun résultat exact pour &laquo;&nbsp;{query}&nbsp;&raquo; — voici les résultats les plus proches (correction orthographique/phonétique).</>
              )}
            </div>
          )}
          {allergie && (() => {
            const choix = CHOIX_ALLERGIES.find(c => c.code === allergie.code)
            return (
              <div className="rech-allergie-actif" role="status">
                <Link href={`/allergies/${allergie.code}`} className="fiche-code hdo" dir="ltr" title={ar ? 'بطاقة الحساسية' : 'Fiche de l\'allergie'}>
                  HDO {allergie.code}{choix?.classe ? ' ⊂' : choix?.proche ? ' ≈' : ''}
                </Link>
                <span>
                  {ar ? 'حساسية معروفة: ' : 'Allergie connue : '}<strong>{choix?.fr ?? allergie.code}</strong>
                  {bilanAllergie && !loading && aDesCriteres && (
                    allergie.mode === 'masquer'
                      ? (ar ? ` — ${bilanAllergie.masques} تقديمًا مخفيًا` : ` — ${bilanAllergie.masques} présentation${bilanAllergie.masques > 1 ? 's' : ''} masquée${bilanAllergie.masques > 1 ? 's' : ''}`)
                      : (ar ? ` — ${bilanAllergie.signales} تقديمًا مميّزًا` : ` — ${bilanAllergie.signales} présentation${bilanAllergie.signales > 1 ? 's' : ''} signalée${bilanAllergie.signales > 1 ? 's' : ''}`)
                        + (bilanAllergie.signales_total > bilanAllergie.signales
                          ? (ar ? ` (و${bilanAllergie.signales_total - bilanAllergie.signales} أخرى بعد النتائج المعروضة: ضيّق البحث)` : ` (+ ${bilanAllergie.signales_total - bilanAllergie.signales} au-delà de la liste affichée : affinez la recherche)`)
                          : '')
                  )}
                </span>
                <Link href={`/allergies/${allergie.code}`} className="rech-allergie-lien">{ar ? 'بطاقة الحساسية ›' : 'Fiche de l\'allergie ›'}</Link>
                <button type="button" className="rech-allergie-x" onClick={() => majAllergie(null)} aria-label={ar ? 'إزالة الحساسية' : 'Retirer l\'allergie'}>✕</button>
                <small>{ar ? 'تمييز فقط، دون استنتاج أي حساسية متصالبة.' : 'Signalement seulement : aucune allergie croisée n\'est déduite. Absence de signalement ≠ absence de risque.'}</small>
              </div>
            )
          })()}
          {!loading && aDesCriteres && (
            <div className="search-count">
              {filteredResults.length === 0 ? (ar ? 'لا توجد نتائج' : 'Aucun résultat') : <><b>{filteredResults.length}</b> {ar ? 'نتيجة' : filteredResults.length > 1 ? 'résultats' : 'résultat'}</>}
              {results.length !== filteredResults.length && ` (${results.length} ${ar ? 'إجمالي' : 'au total'})`}
              {totalServeur > results.length && (
                <span className="search-count-note">
                  {ar ? ` — عرض ${results.length} من ${totalServeur}، ضيّق النتائج بالمرشحات` : ` · ${results.length} affichés sur ${totalServeur} : affinez avec les filtres`}
                </span>
              )}
              {tronque && Object.keys(facSel).length === 0 && (
                <span className="search-count-note">{ar ? ' · الأعداد على أول 300 نتيجة' : ' · compteurs sur les 300 premiers résultats'}</span>
              )}
            </div>
          )}
          {!loading && filteredResults.slice(0, 3).map((d, i) => (
            <DrugCard key={`${d.source}-${d.id}-${i}`} drug={d} type={d.source} onOpen={() => trackResultOpen(d)} />
          ))}
          {/* Pub après les 3 premiers résultats : la recherche n'en affichait aucune. */}
          {!loading && filteredResults.length > 3 && <AdInContent style={{ margin: '16px auto' }} />}
          {!loading && filteredResults.slice(3).map((d, i) => (
            <DrugCard key={`${d.source}-${d.id}-${i + 3}`} drug={d} type={d.source} onOpen={() => trackResultOpen(d)} />
          ))}
        </div>
      </div>
      </>)}
    </>
  )
}
