'use client'
import { useState, useMemo } from 'react'

export function SubstitutionClient({ generiques }: { generiques: any[] }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() =>
    generiques.filter(g =>
      !search || g.dci.toLowerCase().includes(search.toLowerCase())
    ), [search, generiques])

  return (
    <>
      <div className="alert-banner info" style={{ marginBottom: 20 }}>
        💡 Ces données sont issues de la nomenclature officielle MIPH. Vérifiez toujours que le générique est actuellement disponible sur le marché algérien.
      </div>

      <div className="search-bar" style={{ marginBottom: 20 }}>
        <span className="search-bar-icon">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une DCI... Ex: METFORMINE, AMOXICILLINE"
        />
      </div>

      <div className="search-count">{filtered.length} DCI avec génériques disponibles</div>

      {filtered.map(g => (
        <div key={g.dci} style={{ background: 'white', border: `1.5px solid ${expanded === g.dci ? '#34d399' : '#bbf7d0'}`, borderLeft: `4px solid #059669`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
          {/* Header */}
          <button
            onClick={() => setExpanded(expanded === g.dci ? null : g.dci)}
            style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontFamily: 'inherit' }}
          >
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#065f46' }}>{g.dci}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                {g.marques.slice(0, 3).map((m: any) => m.nom_marque).join(' · ')}
                {g.count > 3 ? ` +${g.count - 3} autres` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
                {g.count} spécialités
              </span>
              <span style={{ color: '#94a3b8', fontSize: 18 }}>{expanded === g.dci ? '▲' : '▼'}</span>
            </div>
          </button>

          {/* Expanded */}
          {expanded === g.dci && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #d1fae5' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, marginTop: 12 }}>
                {g.marques.map((m: any, i: number) => (
                  <div key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#065f46' }}>💊 {m.nom_marque}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                      {m.forme}{m.dosage ? ` — ${m.dosage}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                      🏭 {m.labo} ({m.pays})
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ background: m.statut === 'F' ? '#d1fae5' : '#ede9fe', color: m.statut === 'F' ? '#065f46' : '#4c1d95', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>
                        {m.statut === 'F' ? 'Algérie' : 'Importé'}
                      </span>
                      {m.annee && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>{m.annee}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && search && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 600, color: '#475569' }}>Aucun générique trouvé pour "{search}"</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Essayez la recherche globale pour voir tous les résultats</div>
        </div>
      )}
    </>
  )
}
