'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import type { CriticalWithMed } from '@/lib/queries'

// ─── Types internes ────────────────────────────────────────────

type Med = {
  med_id: number
  med_source: 'enregistrement' | 'retrait' | null
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
  forme_approx: boolean
  match_quality: 'full' | 'dci_only' | null
}

type DosageGroup = {
  dosage: string
  classe: string | null
  meds: Med[]
}

type FormeGroup = {
  forme: string
  dosages: DosageGroup[]
}

type DciGroup = {
  dci: string
  classe: string | null
  formes: FormeGroup[]
  totalCombos: number
  totalMeds: number
  /** Médicaments avec la même DCI mais une forme/dosage différente */
  dciOnlyMeds: Med[]
}

// ─── Groupement des données ────────────────────────────────────

function groupRows(rows: CriticalWithMed[]): DciGroup[] {
  const dciMap = new Map<string, Map<string, Map<string, DosageGroup>>>()
  const dciClasse = new Map<string, string | null>()
  // dci → Map<"med_id:source", Med> to deduplicate across multiple critical entries for same DCI
  const dciOnlyMap = new Map<string, Map<string, Med>>()

  for (const row of rows) {
    if (!dciMap.has(row.dci)) {
      dciMap.set(row.dci, new Map())
      dciClasse.set(row.dci, row.classe_therapeutique)
      dciOnlyMap.set(row.dci, new Map())
    }
    const formeMap = dciMap.get(row.dci)!
    if (!formeMap.has(row.forme)) formeMap.set(row.forme, new Map())
    const dosageMap = formeMap.get(row.forme)!
    if (!dosageMap.has(row.dosage)) {
      dosageMap.set(row.dosage, { dosage: row.dosage, classe: row.classe_therapeutique, meds: [] })
    }

    if (row.med_id !== null) {
      const med: Med = {
        med_id: row.med_id,
        med_source: row.med_source,
        nom_marque: row.nom_marque!,
        n_enreg: row.n_enreg,
        labo: row.labo,
        pays: row.pays,
        statut: row.statut,
        source_version: row.source_version,
        date_retrait: row.date_retrait,
        motif_retrait: row.motif_retrait,
        med_forme: row.med_forme,
        med_dosage: row.med_dosage,
        forme_approx: row.forme_approx,
        match_quality: row.match_quality,
      }

      if (row.match_quality === 'dci_only') {
        // Add at DCI level, deduplicated
        const key = `${row.med_id}:${row.med_source}`
        dciOnlyMap.get(row.dci)!.set(key, med)
      } else {
        // Full match — add to specific dosage group
        const dosageGroup = dosageMap.get(row.dosage)!
        const already = dosageGroup.meds.some(m => m.med_id === row.med_id && m.med_source === row.med_source)
        if (!already) dosageGroup.meds.push(med)
      }
    }
  }

  const result: DciGroup[] = []
  for (const [dci, formeMap] of dciMap) {
    const formes: FormeGroup[] = []
    let totalCombos = 0
    let totalMeds = 0
    for (const [forme, dosageMap] of formeMap) {
      const dosages: DosageGroup[] = []
      for (const dosageGroup of dosageMap.values()) {
        dosages.push(dosageGroup)
        totalCombos++
        totalMeds += dosageGroup.meds.length
      }
      formes.push({ forme, dosages })
    }
    // DCI-only meds that didn't match any specific forme/dosage combination
    const allDciOnly = Array.from(dciOnlyMap.get(dci)!.values())
    // Exclude any that are already surfaced as full matches
    const fullMatchKeys = new Set(
      formes.flatMap(f => f.dosages.flatMap(d => d.meds.map(m => `${m.med_id}:${m.med_source}`)))
    )
    const dciOnlyMeds = allDciOnly.filter(m => !fullMatchKeys.has(`${m.med_id}:${m.med_source}`))

    result.push({ dci, classe: dciClasse.get(dci) ?? null, formes, totalCombos, totalMeds, dciOnlyMeds })
  }
  return result
}

// ─── Carte médicament ──────────────────────────────────────────

function MedCard({ med, showFormeDosage = false }: { med: Med; showFormeDosage?: boolean }) {
  return (
    <div style={styles.medCard}>
      <Link
        href={`/recherche?q=${encodeURIComponent(med.nom_marque)}`}
        style={styles.medNameLink}
        title={`Rechercher ${med.nom_marque}`}
      >
        {med.nom_marque}
      </Link>
      <div style={styles.medMeta}>
        {med.n_enreg && <span>{med.n_enreg}</span>}
        {med.labo && <span>🏭 {med.labo}</span>}
        {med.pays && <span>🌍 {med.pays}</span>}
        {showFormeDosage && med.med_forme && (
          <span style={styles.formeDosageBadge}>
            {med.med_forme}{med.med_dosage ? ` · ${med.med_dosage}` : ''}
          </span>
        )}
        {!showFormeDosage && med.forme_approx && med.med_forme && (
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
        {med.med_source === 'retrait' && (
          <span style={styles.retraitBadge}>🚫 Retiré</span>
        )}
        {med.med_source === 'retrait' && med.date_retrait && (
          <span style={styles.retraitDate}>📅 {med.date_retrait}</span>
        )}
        {med.med_source === 'retrait' && med.motif_retrait && (
          <span style={styles.retraitMotif}>⚠️ {med.motif_retrait}</span>
        )}
      </div>
    </div>
  )
}

// ─── Composant principal ───────────────────────────────────────

export function ClassificationView({ rows }: { rows: CriticalWithMed[] }) {
  const groups = useMemo(() => groupRows(rows), [rows])
  const [openDcis, setOpenDcis] = useState<Set<string>>(new Set())
  const [openFormes, setOpenFormes] = useState<Set<string>>(new Set())

  const toggleDci = (dci: string) =>
    setOpenDcis(prev => {
      const s = new Set(prev)
      s.has(dci) ? s.delete(dci) : s.add(dci)
      return s
    })

  const toggleForme = (key: string) =>
    setOpenFormes(prev => {
      const s = new Set(prev)
      s.has(key) ? s.delete(key) : s.add(key)
      return s
    })

  if (groups.length === 0) {
    return (
      <div className="empty-state">
        <p>Aucun résultat pour cette classification.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groups.map(dciGroup => {
        const isDciOpen = openDcis.has(dciGroup.dci)
        return (
          <div key={dciGroup.dci} style={styles.dciCard}>
            {/* ─── En-tête DCI ─────────────────────────────── */}
            <button
              type="button"
              onClick={() => toggleDci(dciGroup.dci)}
              style={styles.dciHeader}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <span style={styles.dciCaret}>{isDciOpen ? '▾' : '▸'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={styles.dciName}>{dciGroup.dci}</div>
                  {dciGroup.classe && (
                    <div style={styles.dciClasse}>{dciGroup.classe}</div>
                  )}
                </div>
              </div>
              <div style={styles.dciStats}>
                <span style={styles.statPill}>
                  {dciGroup.totalCombos} combinaison{dciGroup.totalCombos > 1 ? 's' : ''}
                </span>
                <span style={{
                  ...styles.statPill,
                  background: dciGroup.totalMeds > 0 ? '#dcfce7' : '#f1f5f9',
                  color: dciGroup.totalMeds > 0 ? '#15803d' : '#64748b',
                }}>
                  {dciGroup.totalMeds > 0
                    ? `${dciGroup.totalMeds} médicament${dciGroup.totalMeds > 1 ? 's' : ''}`
                    : 'Aucune correspondance'}
                </span>
                {dciGroup.dciOnlyMeds.length > 0 && (
                  <span style={styles.statPillDciOnly}>
                    ~{dciGroup.dciOnlyMeds.length} autre{dciGroup.dciOnlyMeds.length > 1 ? 's' : ''} (DCI)
                  </span>
                )}
              </div>
            </button>

            {/* ─── Contenu DCI déroulé ──────────────────────── */}
            {isDciOpen && (
              <div style={styles.dciBody}>
                {dciGroup.formes.map(formeGroup => {
                  const formeKey = `${dciGroup.dci}||${formeGroup.forme}`
                  const isFormeOpen = openFormes.has(formeKey)
                  const formeMedsCount = formeGroup.dosages.reduce((s, d) => s + d.meds.length, 0)

                  return (
                    <div key={formeGroup.forme} style={styles.formeCard}>
                      {/* ─── En-tête Forme ─────────────────── */}
                      <button
                        type="button"
                        onClick={() => toggleForme(formeKey)}
                        style={styles.formeHeader}
                      >
                        <span style={styles.formeCaret}>{isFormeOpen ? '▾' : '▸'}</span>
                        <span style={styles.formeName}>
                          <span style={styles.formeBadge}>FORME</span>
                          {formeGroup.forme}
                        </span>
                        <div style={styles.formeStats}>
                          <span style={styles.statPillSm}>
                            {formeGroup.dosages.length} dosage{formeGroup.dosages.length > 1 ? 's' : ''}
                          </span>
                          {formeMedsCount > 0 && (
                            <span style={{ ...styles.statPillSm, background: '#dcfce7', color: '#15803d' }}>
                              {formeMedsCount} méd.
                            </span>
                          )}
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
                                    <MedCard key={`${med.med_id}-${med.med_source}`} med={med} />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* ─── Correspondances DCI uniquement ───── */}
                {dciGroup.dciOnlyMeds.length > 0 && (
                  <div style={styles.dciOnlySection}>
                    <div style={styles.dciOnlyTitle}>
                      Médicaments avec la même DCI (forme ou dosage différent)
                    </div>
                    <div style={styles.medsList}>
                      {dciGroup.dciOnlyMeds.map(med => (
                        <MedCard key={`${med.med_id}-${med.med_source}`} med={med} showFormeDosage />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Styles inline ─────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  dciCard: {
    background: 'white',
    border: '1.5px solid #e2e8f0',
    borderLeft: '4px solid #0284c7',
    borderRadius: 10,
    overflow: 'hidden',
  },
  dciHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 18px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background .12s',
  },
  dciCaret: { fontSize: 14, color: '#0284c7', flexShrink: 0 },
  dciName: { fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 14, color: '#0f172a' },
  dciClasse: { fontSize: 11.5, color: '#475569', marginTop: 2 },
  dciStats: { display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' },
  dciBody: { padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 },

  formeCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderLeft: '3px solid #059669',
    borderRadius: 8,
    overflow: 'hidden',
  },
  formeHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  formeCaret: { fontSize: 12, color: '#059669', flexShrink: 0 },
  formeName: { fontSize: 13, fontWeight: 600, color: '#0f172a', flex: 1, display: 'flex', alignItems: 'center', gap: 7 },
  formeStats: { display: 'flex', gap: 5, flexShrink: 0 },
  formeBody: { padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 },

  dosageRow: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderLeft: '3px solid #f59e0b',
    borderRadius: 7,
    overflow: 'hidden',
    padding: '10px 14px',
  },
  dosageHeader: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 0 },
  dosageValue: { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  noMatchBadge: { fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 6, fontWeight: 600 },

  medsList: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 },
  medCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '8px 12px',
  },
  medName: { fontWeight: 700, fontSize: 13, color: '#0369a1', marginBottom: 4 },
  medNameLink: {
    display: 'inline-block',
    fontWeight: 700,
    fontSize: 13,
    color: '#0369a1',
    marginBottom: 4,
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  },
  medMeta: { display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11.5, color: '#64748b', alignItems: 'center' },

  statPill: {
    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
    background: '#eff6ff', color: '#1d4ed8', whiteSpace: 'nowrap' as const,
  },
  statPillSm: {
    fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
    background: '#eff6ff', color: '#1d4ed8', whiteSpace: 'nowrap' as const,
  },
  formeBadge: {
    fontSize: 9, fontWeight: 900, letterSpacing: '.06em',
    background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: 4,
  },
  dosageBadge: {
    fontSize: 9, fontWeight: 900, letterSpacing: '.06em',
    background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4,
  },
  approxBadge: {
    fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
    background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a',
    whiteSpace: 'nowrap' as const,
  },
  formeDosageBadge: {
    fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
    background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd',
    whiteSpace: 'nowrap' as const,
  },
  dciOnlySection: {
    background: '#fffbeb',
    border: '1px dashed #fbbf24',
    borderRadius: 8,
    padding: '10px 14px',
  },
  dciOnlyTitle: {
    fontSize: 11, fontWeight: 700, color: '#92400e', letterSpacing: '.04em',
    textTransform: 'uppercase' as const, marginBottom: 8,
  },
  statPillDciOnly: {
    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
    background: '#fef3c7', color: '#92400e', whiteSpace: 'nowrap' as const,
  },
  statutBadge: {
    fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 5,
  },
  retraitBadge: {
    fontSize: 10.5, fontWeight: 800, padding: '1px 7px', borderRadius: 5,
    background: '#fee2e2', color: '#991b1b',
  },
  retraitDate: {
    fontSize: 10.5, color: '#7f1d1d', fontWeight: 600,
  },
  retraitMotif: {
    fontSize: 10.5, color: '#b91c1c', fontWeight: 600,
  },
}
