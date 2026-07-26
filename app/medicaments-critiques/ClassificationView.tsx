'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import type { CriticalWithMed } from '@/lib/queries'

// ─── Types internes ────────────────────────────────────────────

type Med = {
  med_id: number
  med_source: 'enregistrement' | 'retrait'
  nom_marque: string
  n_enreg: string | null
  labo: string | null
  pays: string | null
  statut: string | null
  source_version: string | null
  date_retrait: string | null
  motif_retrait: string | null
  med_forme: string | null
  med_dosage: string | null
}

type ComboRow = {
  forme: string
  dosage: string
  classe: string | null
  fullMeds: Med[]
  partialMeds: Med[]
}

type DciGroup = {
  dci: string
  classe: string | null
  combos: ComboRow[]
  totalFull: number
}

// ─── Groupement ─────────────────────────────────────────────────

function groupRows(rows: CriticalWithMed[]): DciGroup[] {
  // dci → forme → dosage → ComboRow
  const map = new Map<string, Map<string, Map<string, ComboRow>>>()
  const dciClasse = new Map<string, string | null>()

  for (const row of rows) {
    if (!map.has(row.dci)) {
      map.set(row.dci, new Map())
      dciClasse.set(row.dci, row.classe_therapeutique)
    }
    const formeMap = map.get(row.dci)!
    if (!formeMap.has(row.forme)) formeMap.set(row.forme, new Map())
    const dosageMap = formeMap.get(row.forme)!
    if (!dosageMap.has(row.dosage)) {
      dosageMap.set(row.dosage, {
        forme: row.forme,
        dosage: row.dosage,
        classe: row.classe_therapeutique,
        fullMeds: [],
        partialMeds: [],
      })
    }
    const combo = dosageMap.get(row.dosage)!

    if (row.med_id !== null) {
      const already = dosageGroup.meds.some(m => m.med_id === row.med_id)
      if (!already) {
        dosageGroup.meds.push({
          med_id: row.med_id,
          med_source: row.med_source!,
          nom_marque: row.nom_marque!,
          n_enreg: row.n_enreg,
          labo: row.labo,
          pays: row.pays,
          statut: row.statut,
          source_version: row.source_version,
          date_retrait: row.date_retrait,
          motif_retrait: row.motif_retrait,
          med_forme: row.med_forme,
          forme_approx: row.forme_approx,
        })
      }
      // dci_only meds are omitted from table view for clarity
    }
  }

  const result: DciGroup[] = []
  for (const [dci, formeMap] of map) {
    const combos: ComboRow[] = []
    let totalFull = 0
    for (const dosageMap of formeMap.values()) {
      for (const combo of dosageMap.values()) {
        combos.push(combo)
        totalFull += combo.fullMeds.length
      }
    }
    result.push({ dci, classe: dciClasse.get(dci) ?? null, combos, totalFull })
  }
  return result
}

// ─── Chip médicament ────────────────────────────────────────────

function MedChip({ med }: { med: Med }) {
  const isRetrait = med.med_source === 'retrait'
  return (
    <Link
      href={`/recherche?q=${encodeURIComponent(med.nom_marque)}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        textDecoration: 'none',
        background: isRetrait ? '#fee2e2' : '#dcfce7',
        color: isRetrait ? '#991b1b' : '#14532d',
        border: `1px solid ${isRetrait ? '#fca5a5' : '#86efac'}`,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: 'opacity .15s',
      }}
      title={[
        med.n_enreg ? `N° ${med.n_enreg}` : null,
        med.labo,
        isRetrait && med.motif_retrait ? `Retiré : ${med.motif_retrait}` : null,
        isRetrait && med.date_retrait ? `Date : ${med.date_retrait}` : null,
        med.med_forme || med.med_dosage ? `${med.med_forme ?? ''} ${med.med_dosage ?? ''}`.trim() : null,
      ].filter(Boolean).join(' · ')}
    >
      {isRetrait && <span style={{ fontSize: 10 }}>🚫</span>}
      {med.nom_marque}
      {med.pays && <span style={{ opacity: .6, fontSize: 10, fontWeight: 500 }}>{med.pays}</span>}
    </Link>
  )
}

// ─── Composant principal ────────────────────────────────────────

export function ClassificationView({ rows }: { rows: CriticalWithMed[] }) {
  const groups = useMemo(() => groupRows(rows), [rows])
  const [openDcis, setOpenDcis] = useState(() => new Set<string>())
  const [onlyWithMatches, setOnlyWithMatches] = useState(false)

  const filteredGroups = useMemo(
    () => onlyWithMatches ? groups.filter(g => g.totalFull > 0) : groups,
    [groups, onlyWithMatches]
  )

  const toggleDci = (dci: string) =>
    setOpenDcis(prev => {
      const s = new Set(prev)
      s.has(dci) ? s.delete(dci) : s.add(dci)
      return s
    })

  const expandAll = () => setOpenDcis(new Set(filteredGroups.map(g => g.dci)))
  const collapseAll = () => setOpenDcis(new Set())

  if (groups.length === 0) {
    return (
      <div className="empty-state">
        <p>Aucun résultat pour cette classification.</p>
      </div>
    )
  }

  const withMatchCount = groups.filter(g => g.totalFull > 0).length

  return (
    <div>
      {/* ─── Barre de contrôle ────────────────────────────────── */}
      <div style={S.controls}>
        <label style={S.toggle}>
          <input
            type="checkbox"
            checked={onlyWithMatches}
            onChange={e => setOnlyWithMatches(e.target.checked)}
            style={{ accentColor: '#0284c7' }}
          />
          <span>
            Afficher seulement les DCI avec correspondances
            <span style={S.toggleCount}>({withMatchCount}/{groups.length})</span>
          </span>
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={expandAll} style={S.smallBtn}>Tout ouvrir</button>
          <button type="button" onClick={collapseAll} style={S.smallBtn}>Tout fermer</button>
        </div>
      </div>

      {/* ─── Liste DCI ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredGroups.map(g => {
          const isOpen = openDcis.has(g.dci)
          const hasMatches = g.totalFull > 0
          return (
            <div key={g.dci} style={S.dciCard}>
              {/* En-tête DCI */}
              <button
                type="button"
                onClick={() => toggleDci(g.dci)}
                style={S.dciHeader}
              >
                <span style={{ ...S.statusDot, background: hasMatches ? '#22c55e' : '#cbd5e1' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={S.dciName}>{g.dci}</span>
                  {g.classe && <span style={S.dciClasse}> — {g.classe}</span>}
                </div>
                <div style={S.dciMeta}>
                  <span style={{ ...S.pill, background: hasMatches ? '#dcfce7' : '#f1f5f9', color: hasMatches ? '#15803d' : '#64748b' }}>
                    {hasMatches ? `${g.totalFull} correspondance${g.totalFull > 1 ? 's' : ''}` : 'Aucune correspondance'}
                  </span>
                  <span style={S.pill}>{g.combos.length} combinaison{g.combos.length > 1 ? 's' : ''}</span>
                  <span style={S.caret}>{isOpen ? '▾' : '▸'}</span>
                </div>
              </button>

                      {/* ─── Dosages ───────────────────────── */}
                      {isFormeOpen && (
                        <div style={styles.formeBody}>
                          {formeGroup.dosages.map(dosageGroup => (
                            <div key={dosageGroup.dosage} style={styles.dosageRow}>
                              <div style={styles.dosageHeader}>
                                <span style={styles.dosageBadge}>DOSAGE</span>
                                <span style={styles.dosageValue}>{dosageGroup.dosage}</span>
                                {dosageGroup.meds.length === 0 && (
                                  <span style={styles.noMatchBadge}>Aucun médicament correspondant</span>
                                )}
                              </div>
                              {dosageGroup.meds.length > 0 && (
                                <div style={styles.medsList}>
                                  {dosageGroup.meds.map(med => (
                                    <div key={med.med_id} style={styles.medCard}>
                                      <div style={styles.medName}>{med.nom_marque}</div>
                                      <div style={styles.medMeta}>
                                        {med.n_enreg && <span>{med.n_enreg}</span>}
                                        {med.labo && <span>🏭 {med.labo}</span>}
                                        {med.pays && <span>🌍 {med.pays}</span>}
                                        {med.forme_approx && med.med_forme && (
                                          <span style={styles.approxBadge} title="Forme approchante">
                                            ~ {med.med_forme}
                                          </span>
                                        )}
                                        {med.statut && (
                                          <span style={{
                                            ...styles.statutBadge,
                                            background: med.statut.toLowerCase().includes('actif') ? '#dcfce7' : '#fff7ed',
                                            color: med.statut.toLowerCase().includes('actif') ? '#15803d' : '#9a3412',
                                          }}>
                                            {med.statut}
                                          </span>
                                        )}
                                        <span style={{
                                          ...styles.statutBadge,
                                          background: med.med_source === 'retrait' ? '#fee2e2' : '#dbeafe',
                                          color: med.med_source === 'retrait' ? '#991b1b' : '#1e40af',
                                        }}>
                                          {med.med_source === 'retrait' ? 'Retiré' : 'Actif'}
                                        </span>
                                        {med.med_source === 'retrait' && med.date_retrait && (
                                          <span style={styles.withdrawMeta}>
                                            📅 Retrait: {new Date(med.date_retrait).toLocaleDateString('fr-FR')}
                                          </span>
                                        )}
                                        {med.med_source === 'retrait' && med.motif_retrait && (
                                          <span style={styles.withdrawMeta} title={med.motif_retrait}>
                                            📝 {med.motif_retrait}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {combo.partialMeds.length > 0 && (
                                    <>
                                      {combo.fullMeds.length > 0 && (
                                        <span style={S.separator}>|</span>
                                      )}
                                      <span style={S.approxLabel}>~approx</span>
                                      {combo.partialMeds.map(m => (
                                        <MedChip key={`${m.med_id}-${m.med_source}`} med={m} />
                                      ))}
                                    </>
                                  )}
                                </div>
                              )}
                              {!hasFullMatch && combo.partialMeds.length === 0 && (
                                <span style={S.noMatch}>Aucun médicament enregistré</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Légende chips */}
      <div style={S.legendBox}>
        <span style={{ ...S.chip, background: '#dcfce7', color: '#14532d', border: '1px solid #86efac' }}>Médicament actif</span>
        <span style={{ ...S.chip, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>🚫 Médicament retiré</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Survolez un médicament pour voir ses détails</span>
      </div>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 12,
    fontSize: 13,
    color: '#374151',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    userSelect: 'none',
    fontWeight: 600,
  },
  toggleCount: {
    marginLeft: 4,
    fontWeight: 400,
    color: '#64748b',
  },
  smallBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: 'white',
    fontSize: 12,
    color: '#475569',
    cursor: 'pointer',
    fontWeight: 600,
  },

  dciCard: {
    background: 'white',
    border: '1.5px solid #e2e8f0',
    borderLeft: '4px solid #0284c7',
    borderRadius: 8,
    overflow: 'hidden',
  },
  dciHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-block',
  },
  dciName: {
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    fontSize: 13.5,
    color: '#0f172a',
  },
  dciClasse: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 400,
  },
  dciMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    flexWrap: 'wrap' as const,
  },
  caret: { fontSize: 14, color: '#94a3b8', flexShrink: 0 },
  pill: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 20,
    background: '#f1f5f9',
    color: '#475569',
    whiteSpace: 'nowrap' as const,
  },

  dciBody: { borderTop: '1px solid #e2e8f0', overflowX: 'auto' },

  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 12.5 },
  thForme: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    fontWeight: 700,
    fontSize: 11,
    color: '#059669',
    textTransform: 'uppercase' as const,
    letterSpacing: '.04em',
    background: '#f0fdf4',
    whiteSpace: 'nowrap' as const,
    width: '22%',
  },
  thDosage: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    fontWeight: 700,
    fontSize: 11,
    color: '#d97706',
    textTransform: 'uppercase' as const,
    letterSpacing: '.04em',
    background: '#fffbeb',
    whiteSpace: 'nowrap' as const,
    width: '20%',
  },
  thMeds: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    fontWeight: 700,
    fontSize: 11,
    color: '#1d4ed8',
    textTransform: 'uppercase' as const,
    letterSpacing: '.04em',
    background: '#eff6ff',
  },
  row: { borderTop: '1px solid #f1f5f9' },
  tdForme: {
    padding: '9px 12px',
    verticalAlign: 'top' as const,
    color: '#065f46',
    fontWeight: 600,
  },
  tdDosage: {
    padding: '9px 12px',
    verticalAlign: 'top' as const,
  },
  tdMeds: {
    padding: '9px 12px',
    verticalAlign: 'top' as const,
  },
  formeBadge: { fontSize: 12, fontWeight: 600, color: '#065f46' },
  dosageValue: { fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: '#92400e' },
  noMatch: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' as const },
  separator: { color: '#cbd5e1', fontWeight: 300, fontSize: 12 },
  approxLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#b45309',
    background: '#fef3c7',
    padding: '2px 6px',
    borderRadius: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '.04em',
  },

  legendBox: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    marginTop: 16,
    padding: '8px 12px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 12,
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 11.5,
    fontWeight: 700,
  },
  withdrawMeta: {
    fontSize: 10.5,
    color: '#7f1d1d',
  },
}
