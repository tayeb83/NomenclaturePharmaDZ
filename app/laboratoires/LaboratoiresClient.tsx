'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { LaboSummary } from '@/lib/queries'
import { getCountryFlag } from '@/lib/countryFlag'

interface Props {
  labos: LaboSummary[]
}

export function LaboratoiresClient({ labos }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return labos
    const q = search.toLowerCase()
    return labos.filter(l => l.labo.toLowerCase().includes(q))
  }, [labos, search])

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>🏭</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Laboratoires pharmaceutiques
          </h1>
        </div>
        <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 20px' }}>
          {labos.length} laboratoires référencés dans la nomenclature officielle MIPH — Algérie
        </p>

        {/* Search */}
        <input
          type="search"
          placeholder="Rechercher un laboratoire..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 420, padding: '10px 16px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none',
            background: '#f8fafc', color: '#0f172a',
          }}
        />
      </div>

      {/* Pro mode banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 14, padding: '18px 24px', marginBottom: 32,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 28 }}>⭐</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
            Mode Pro — Laboratoires
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            Fiche sponsorisée · Rapport concurrentiel · Dashboard privé — Contactez-nous pour accéder à nos offres premium.
          </div>
        </div>
        <Link href="/contact" style={{
          background: '#3b82f6', color: '#fff', padding: '9px 20px',
          borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}>
          En savoir plus →
        </Link>
      </div>

      {/* Stats summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14, marginBottom: 32,
      }}>
        {[
          { label: 'Laboratoires', value: labos.length, icon: '🏭' },
          { label: 'Produits enregistrés', value: labos.reduce((s, l) => s + l.total_enregistres, 0).toLocaleString('fr-DZ'), icon: '💊' },
          { label: 'Retraits cumulés', value: labos.reduce((s, l) => s + l.total_retraits, 0).toLocaleString('fr-DZ'), icon: '🚨' },
          { label: 'AMM non renouvelées', value: labos.reduce((s, l) => s + l.total_non_renouveles, 0).toLocaleString('fr-DZ'), icon: '📋' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#f8fafc', borderRadius: 12, padding: '16px 20px',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Labs grid */}
      {filtered.length === 0 ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>
          Aucun laboratoire trouvé pour &quot;{search}&quot;
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 14,
        }}>
          {filtered.map(labo => (
            <Link
              key={labo.slug}
              href={`/laboratoire/${labo.slug}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: '#fff', borderRadius: 12, padding: '18px 20px',
                border: '1.5px solid #e2e8f0', transition: 'border-color 0.15s, box-shadow 0.15s',
                cursor: 'pointer',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(59,130,246,0.1)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: '#0f172a',
                      marginBottom: 4, lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {labo.pays_origine && getCountryFlag(labo.pays_origine)
                        ? `${getCountryFlag(labo.pays_origine)} `
                        : '🏭 '
                      }
                      {labo.labo}
                    </div>
                    {labo.pays_origine && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                        {labo.pays_origine}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: 600,
                    padding: '3px 8px', borderRadius: 6,
                  }}>
                    💊 {labo.total_enregistres} enreg.
                  </span>
                  {labo.total_retraits > 0 && (
                    <span style={{
                      background: '#fff1f2', color: '#be123c', fontSize: 11, fontWeight: 600,
                      padding: '3px 8px', borderRadius: 6,
                    }}>
                      🚨 {labo.total_retraits} retraits
                    </span>
                  )}
                  {labo.total_non_renouveles > 0 && (
                    <span style={{
                      background: '#fffbeb', color: '#b45309', fontSize: 11, fontWeight: 600,
                      padding: '3px 8px', borderRadius: 6,
                    }}>
                      📋 {labo.total_non_renouveles} non-ren.
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
