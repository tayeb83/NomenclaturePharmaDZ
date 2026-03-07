'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

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
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

const TYPE_LABELS: Record<string, string> = {
  GE: 'Générique', 'Gé': 'Générique', I: 'Innovateur', RE: 'Référence', BIO: 'Biologique',
}

const STATUT_LABELS: Record<string, string> = {
  F: '🇩🇿 Fabriqué en Algérie',
  I: '🌍 Importé',
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null
  const colors: Record<string, string> = {
    GE: 'rgba(34,197,94,0.15)', 'Gé': 'rgba(34,197,94,0.15)',
    I: 'rgba(99,102,241,0.15)',
    RE: 'rgba(251,191,36,0.15)',
    BIO: 'rgba(236,72,153,0.15)',
  }
  const textColors: Record<string, string> = {
    GE: '#86efac', 'Gé': '#86efac',
    I: '#a5b4fc',
    RE: '#fde68a',
    BIO: '#f9a8d4',
  }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
      background: colors[type] || 'rgba(255,255,255,0.08)',
      color: textColors[type] || 'rgba(255,255,255,0.6)',
      border: `1px solid ${colors[type] || 'rgba(255,255,255,0.1)'}`,
    }}>
      {TYPE_LABELS[type] || type}
    </span>
  )
}

export function MedicamentsClient() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Medicament[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [filterAnnee, setFilterAnnee] = useState('')

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' })
      if (filterType) params.set('type_prod', filterType)
      if (filterStatut) params.set('statut', filterStatut)
      if (filterAnnee) params.set('annee', filterAnnee)

      const res = await fetch(`/api/medicaments?${params}`)
      if (!res.ok) throw new Error('Erreur serveur')
      const json = await res.json()
      setData(json.data || [])
      setPagination(json.pagination)
    } catch {
      setError('Impossible de charger les médicaments. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }, [filterType, filterStatut, filterAnnee])

  useEffect(() => {
    setPage(1)
  }, [filterType, filterStatut, filterAnnee])

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
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 24,
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'flex-end',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Type</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 14,
            }}
          >
            <option value="">Tous les types</option>
            <option value="GE">Générique</option>
            <option value="I">Innovateur</option>
            <option value="RE">Référence</option>
            <option value="BIO">Biologique</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Statut</label>
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 14,
            }}
          >
            <option value="">Tous</option>
            <option value="F">Fabriqué en Algérie</option>
            <option value="I">Importé</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Année</label>
          <select
            value={filterAnnee}
            onChange={e => setFilterAnnee(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 14,
            }}
          >
            <option value="">Toutes les années</option>
            {[2025, 2024, 2023, 2022, 2021, 2020].map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleFilter}
          style={{
            background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
            color: '#a5b4fc', borderRadius: 8, padding: '8px 18px', fontSize: 14,
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          Filtrer
        </button>

        {(filterType || filterStatut || filterAnnee) && (
          <button
            onClick={() => { setFilterType(''); setFilterStatut(''); setFilterAnnee('') }}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '8px 14px',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Compteur */}
      {pagination && (
        <div style={{ marginBottom: 16, color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          {pagination.total.toLocaleString('fr-DZ')} médicaments enregistrés
          {' — '}page {pagination.page} / {pagination.totalPages}
        </div>
      )}

      {/* États */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '14px 18px', color: '#fca5a5', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>
          ⏳ Chargement…
        </div>
      )}

      {/* Liste */}
      {!loading && !error && (
        <div style={{ display: 'grid', gap: 10 }}>
          {data.map((med) => (
            <Link
              key={med.id}
              href={`/medicament/enregistrement/${med.id}`}
              style={{
                display: 'block', textDecoration: 'none', color: 'inherit',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '14px 18px',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)'
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.15)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.03)'
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.08)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
                    {med.nom_marque}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                    {med.dci}
                    {med.forme && ` — ${med.forme}`}
                    {med.dosage && ` ${med.dosage}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                  <TypeBadge type={med.type_prod} />
                  {med.statut === 'F' && (
                    <span style={{ fontSize: 11, color: '#67e8f9', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                      🇩🇿 Local
                    </span>
                  )}
                </div>
              </div>
              {med.labo && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {med.labo}{med.pays && ` · ${med.pays}`}
                  {med.annee && ` · ${med.annee}`}
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
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: pagination.hasPrev ? '#fff' : 'rgba(255,255,255,0.3)',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: pagination.hasPrev ? 'pointer' : 'default',
            }}
          >
            « Premier
          </button>
          <button
            onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0) }}
            disabled={!pagination.hasPrev}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: pagination.hasPrev ? '#fff' : 'rgba(255,255,255,0.3)',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: pagination.hasPrev ? 'pointer' : 'default',
            }}
          >
            ‹ Précédent
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
                  background: p === pagination.page ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${p === pagination.page ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  color: p === pagination.page ? '#a5b4fc' : '#fff',
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
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: pagination.hasNext ? '#fff' : 'rgba(255,255,255,0.3)',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: pagination.hasNext ? 'pointer' : 'default',
            }}
          >
            Suivant ›
          </button>
          <button
            onClick={() => { setPage(pagination.totalPages); window.scrollTo(0, 0) }}
            disabled={!pagination.hasNext}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: pagination.hasNext ? '#fff' : 'rgba(255,255,255,0.3)',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: pagination.hasNext ? 'pointer' : 'default',
            }}
          >
            Dernier »
          </button>
        </div>
      )}
    </div>
  )
}
