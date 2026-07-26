'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import type { Lang } from '@/lib/i18n'

type Medicament = {
  id: number
  n_enreg: string | null
  dci: string
  nom_marque: string
  forme: string | null
  dosage: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  statut: string | null
  annee: number | null
  date_init: string | null
  date_final: string | null
  retrait_annee?: number | null
  version_label?: string | null
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}


type ApiMeta = {
  availableRemovedYears?: number[]
  availableAnnees?: number[]
}
const TYPE_LABELS: Record<Lang, Record<string, string>> = {
  fr: { GE: 'Générique', 'Gé': 'Générique', I: 'Innovateur', RE: 'Référence', BIO: 'Biologique' },
  ar: { GE: 'جنيس', 'Gé': 'جنيس', I: 'مبتكر', RE: 'مرجعي', BIO: 'بيولوجي' },
}


function TypeBadge({ type, lang }: { type: string | null; lang: Lang }) {
  if (!type) return null
  const colors: Record<string, string> = {
    GE: '#dcfce7', 'Gé': '#dcfce7',
    I: '#ede9fe',
    RE: '#fef9c3',
    BIO: '#fce7f3',
  }
  const textColors: Record<string, string> = {
    GE: '#166534', 'Gé': '#166534',
    I: '#5b21b6',
    RE: '#854d0e',
    BIO: '#9d174d',
  }
  const borderColors: Record<string, string> = {
    GE: '#bbf7d0', 'Gé': '#bbf7d0',
    I: '#ddd6fe',
    RE: '#fef08a',
    BIO: '#fbcfe8',
  }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
      background: colors[type] || '#f1f5f9',
      color: textColors[type] || '#475569',
      border: `1px solid ${borderColors[type] || '#e2e8f0'}`,
    }}>
      {TYPE_LABELS[lang][type] || type}
    </span>
  )
}

export function MedicamentsClient() {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => (lang === 'ar' ? ar : fr)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Medicament[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'all' | 'new' | 'removed'>('all')
  const [filterType, setFilterType] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [filterAnnee, setFilterAnnee] = useState('')
  const [removedYear, setRemovedYear] = useState('')
  const [meta, setMeta] = useState<ApiMeta>({})

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50', mode })
      if (mode !== 'removed' && filterType) params.set('type_prod', filterType)
      if (mode !== 'removed' && filterStatut) params.set('statut', filterStatut)
      if (mode !== 'removed' && filterAnnee) params.set('annee', filterAnnee)
      if (mode === 'removed' && removedYear) params.set('removed_year', removedYear)

      const res = await fetch(`/api/medicaments?${params}`)
      if (!res.ok) throw new Error('Erreur serveur')
      const json = await res.json()
      setData(json.data || [])
      setPagination(json.pagination)
      setMeta(json.meta || {})
    } catch {
      setError(lang === 'ar' ? 'تعذّر تحميل الأدوية. يرجى إعادة المحاولة.' : 'Impossible de charger les médicaments. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }, [mode, filterType, filterStatut, filterAnnee, removedYear, lang])

  useEffect(() => {
    setPage(1)
  }, [mode, filterType, filterStatut, filterAnnee, removedYear])

  useEffect(() => {
    fetchData(page)
  }, [page, fetchData])

  function handleFilter() {
    fetchData(1)
  }

  return (
    <div>
      {/* Filtres */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 24,
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{t('Vue', 'العرض')}</label>
          <select
            value={mode}
            onChange={e => setMode(e.target.value as 'all' | 'new' | 'removed')}
            style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              color: '#1e293b', borderRadius: 8, padding: '8px 12px', fontSize: 14,
            }}
          >
            <option value="all">{t('Tous les médicaments', 'كل الأدوية')}</option>
            <option value="new">{t('Nouveaux médicaments (version en cours)', 'الأدوية الجديدة (الإصدار الحالي)')}</option>
            <option value="removed">{t('Médicaments retirés par année', 'الأدوية المسحوبة حسب السنة')}</option>
          </select>
        </div>

        {mode !== 'removed' && (
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{t('Type', 'النوع')}</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              color: '#1e293b', borderRadius: 8, padding: '8px 12px', fontSize: 14,
            }}
          >
            <option value="">{t('Tous les types', 'كل الأنواع')}</option>
            <option value="GE">{t('Générique', 'جنيس')}</option>
            <option value="I">{t('Innovateur', 'مبتكر')}</option>
            <option value="RE">{t('Référence', 'مرجعي')}</option>
            <option value="BIO">{t('Biologique', 'بيولوجي')}</option>
          </select>
        </div>
        )}

        {mode !== 'removed' && (
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{t('Statut', 'الحالة')}</label>
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              color: '#1e293b', borderRadius: 8, padding: '8px 12px', fontSize: 14,
            }}
          >
            <option value="">{t('Tous', 'الكل')}</option>
            <option value="F">{t('Fabriqué en Algérie', 'مصنوع في الجزائر')}</option>
            <option value="I">{t('Importé', 'مستورد')}</option>
          </select>
        </div>
        )}

        {mode !== 'removed' && (
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{t('Année', 'السنة')}</label>
          <select
            value={filterAnnee}
            onChange={e => setFilterAnnee(e.target.value)}
            style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              color: '#1e293b', borderRadius: 8, padding: '8px 12px', fontSize: 14,
            }}
          >
            <option value="">{t('Toutes les années', 'كل السنوات')}</option>
            {(meta.availableAnnees || []).map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
        )}

        {mode === 'removed' && (
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{t('Année de retrait', 'سنة السحب')}</label>
            <select
              value={removedYear}
              onChange={e => setRemovedYear(e.target.value)}
              style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                color: '#1e293b', borderRadius: 8, padding: '8px 12px', fontSize: 14,
              }}
            >
              <option value="">{t('Toutes les années', 'كل السنوات')}</option>
              {(meta.availableRemovedYears || []).map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleFilter}
          style={{
            background: '#0284c7', border: 'none',
            color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 14,
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          {t('Filtrer', 'تصفية')}
        </button>

        {(mode !== 'all' || filterType || filterStatut || filterAnnee || removedYear) && (
          <button
            onClick={() => { setMode('all'); setFilterType(''); setFilterStatut(''); setFilterAnnee(''); setRemovedYear('') }}
            style={{
              background: 'transparent', border: '1px solid #e2e8f0',
              color: '#64748b', borderRadius: 8, padding: '8px 14px',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            {t('Réinitialiser', 'إعادة تعيين')}
          </button>
        )}
      </div>

      {/* Compteur */}
      {pagination && (
        <div style={{ marginBottom: 16, color: '#64748b', fontSize: 14 }}>
          {pagination.total.toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ')}{' '}
          {mode === 'removed'
            ? t('médicaments retirés', 'دواء مسحوب')
            : mode === 'new'
              ? t('nouveaux médicaments', 'دواء جديد')
              : t('médicaments enregistrés', 'دواء مسجل')}
          {' — '}{t('page', 'الصفحة')} {pagination.page} / {pagination.totalPages}
        </div>
      )}

      {/* États */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', color: '#dc2626', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569', fontSize: 15 }}>
          {t('⏳ Chargement…', '⏳ جارٍ التحميل…')}
        </div>
      )}

      {/* Liste */}
      {!loading && !error && (
        <div style={{ display: 'grid', gap: 10 }}>
          {data.map((med) => (
            <Link
              key={`${mode}-${med.id}-${med.version_label || ''}`}
              href={`/medicament/enregistrement/${med.id}`}
              style={{
                display: 'block', textDecoration: 'none', color: 'inherit',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 10, padding: '14px 18px',
                transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLAnchorElement).style.background = '#f8fafc'
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = '#cbd5e1'
                ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLAnchorElement).style.background = '#fff'
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = '#e2e8f0'
                ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3, color: '#0f172a' }}>
                    {med.nom_marque}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {med.dci}
                    {med.forme && ` — ${med.forme}`}
                    {med.dosage && ` ${med.dosage}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                  {mode !== 'removed' && <TypeBadge type={med.type_prod} lang={lang} />}
                  {mode === 'new' && (
                    <span style={{ fontSize: 11, color: '#166534', background: '#dcfce7', border: '1px solid #86efac', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                      {t('Nouveau', 'جديد')}
                    </span>
                  )}
                  {mode === 'removed' && (
                    <span style={{ fontSize: 11, color: '#991b1b', background: '#fee2e2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                      {t('Retiré', 'مسحوب')}
                    </span>
                  )}
                  {mode !== 'removed' && med.statut === 'F' && (
                    <span style={{ fontSize: 11, color: '#0369a1', background: '#e0f2fe', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                      {t('🇩🇿 Local', '🇩🇿 محلي')}
                    </span>
                  )}
                </div>
              </div>
              {med.labo && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}>
                  {med.labo}{med.pays && ` · ${med.pays}`}
                  {mode === 'removed' ? (med.retrait_annee ? ` · ${t('Retiré en', 'سُحب في')} ${med.retrait_annee}` : '') : (med.annee ? ` · ${med.annee}` : '')}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setPage(1); window.scrollTo(0, 0) }}
            disabled={!pagination.hasPrev}
            style={{
              background: '#fff', border: '1px solid #e2e8f0',
              color: pagination.hasPrev ? '#334155' : '#cbd5e1',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: pagination.hasPrev ? 'pointer' : 'default',
            }}
          >
            {t('« Premier', '« الأولى')}
          </button>
          <button
            onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0) }}
            disabled={!pagination.hasPrev}
            style={{
              background: '#fff', border: '1px solid #e2e8f0',
              color: pagination.hasPrev ? '#334155' : '#cbd5e1',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: pagination.hasPrev ? 'pointer' : 'default',
            }}
          >
            {t('‹ Précédent', '‹ السابقة')}
          </button>

          {/* Pages numérotées */}
          {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(pagination.page - 3, pagination.totalPages - 6))
            const p = start + i
            if (p > pagination.totalPages) return null
            return (
              <button
                key={p}
                onClick={() => { setPage(p); window.scrollTo(0, 0) }}
                style={{
                  background: p === pagination.page ? '#0284c7' : '#fff',
                  border: `1px solid ${p === pagination.page ? '#0284c7' : '#e2e8f0'}`,
                  color: p === pagination.page ? '#fff' : '#334155',
                  borderRadius: 8, padding: '8px 13px', fontSize: 13, cursor: 'pointer', fontWeight: p === pagination.page ? 700 : 400,
                }}
              >
                {p}
              </button>
            )
          })}

          <button
            onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0) }}
            disabled={!pagination.hasNext}
            style={{
              background: '#fff', border: '1px solid #e2e8f0',
              color: pagination.hasNext ? '#334155' : '#cbd5e1',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: pagination.hasNext ? 'pointer' : 'default',
            }}
          >
            {t('Suivant ›', 'التالية ›')}
          </button>
          <button
            onClick={() => { setPage(pagination.totalPages); window.scrollTo(0, 0) }}
            disabled={!pagination.hasNext}
            style={{
              background: '#fff', border: '1px solid #e2e8f0',
              color: pagination.hasNext ? '#334155' : '#cbd5e1',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: pagination.hasNext ? 'pointer' : 'default',
            }}
          >
            {t('Dernier »', 'الأخيرة »')}
          </button>
        </div>
      )}
    </div>
  )
}
