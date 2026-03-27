'use client'

import { useState, useMemo } from 'react'
import type { CriticalMappingRow } from '@/lib/queries'

// ─── Types ────────────────────────────────────────────────────

type MatchRow = {
  statut_match: 'OUI' | 'A_REVOIR' | null
  score_global: number | null
  score_dci: number | null
  score_forme: number | null
  score_dosage: number | null
  source_base: 'ACTIVE' | 'RETRAIT' | 'NON_RENOUVELE' | null
  n_base: number | null
  code_base: string | null
  n_enregistrement: string | null
  dci_base: string | null
  marque: string | null
  forme_base: string | null
  dosage_base: string | null
  conditionnement: string | null
}

type CriticalEntry = {
  key: string
  n_critique: number | null
  dci_critique: string
  forme_critique: string | null
  dosage_critique: string | null
  classe_therapeutique: string | null
  matches: MatchRow[]
}

type ClassGroup = {
  classe: string
  entries: CriticalEntry[]
}

// ─── Groupement des données ───────────────────────────────────

function groupData(rows: CriticalMappingRow[]): ClassGroup[] {
  const classeMap = new Map<string, Map<string, CriticalEntry>>()

  for (const row of rows) {
    const classe = row.classe_therapeutique ?? 'AUTRE'
    const entryKey = `${row.n_critique ?? ''}||${row.dci_critique}||${row.forme_critique ?? ''}||${row.dosage_critique ?? ''}`

    if (!classeMap.has(classe)) classeMap.set(classe, new Map())
    const entryMap = classeMap.get(classe)!

    if (!entryMap.has(entryKey)) {
      entryMap.set(entryKey, {
        key: entryKey,
        n_critique: row.n_critique,
        dci_critique: row.dci_critique,
        forme_critique: row.forme_critique,
        dosage_critique: row.dosage_critique,
        classe_therapeutique: row.classe_therapeutique,
        matches: [],
      })
    }

    // N'ajouter une correspondance que si un médicament de base est présent
    if (row.marque || row.dci_base) {
      entryMap.get(entryKey)!.matches.push({
        statut_match: row.statut_match,
        score_global: row.score_global,
        score_dci: row.score_dci,
        score_forme: row.score_forme,
        score_dosage: row.score_dosage,
        source_base: row.source_base,
        n_base: row.n_base,
        code_base: row.code_base,
        n_enregistrement: row.n_enregistrement,
        dci_base: row.dci_base,
        marque: row.marque,
        forme_base: row.forme_base,
        dosage_base: row.dosage_base,
        conditionnement: row.conditionnement,
      })
    }
  }

  const result: ClassGroup[] = []
  for (const [classe, entryMap] of classeMap) {
    result.push({ classe, entries: Array.from(entryMap.values()) })
  }
  return result
}

// ─── Score Bar ────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  const pct = Math.min(100, Math.max(0, value))
  const color = pct >= 90 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 90 }}>
      <span style={{ fontSize: 10, color: '#64748b', width: 38, flexShrink: 0, fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 3, minWidth: 40 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 700, width: 26, textAlign: 'right', flexShrink: 0 }}>{pct}</span>
    </div>
  )
}

function getScoreLabel(statut: 'OUI' | 'A_REVOIR' | null, score: number | null): { label: string; color: string; bg: string } | null {
  if (statut === 'OUI') {
    return { label: 'Correspondance validée', color: '#166534', bg: '#dcfce7' }
  }
  if (score === null) return null
  if (score >= 90) return { label: 'Correspondance très probable', color: '#166534', bg: '#dcfce7' }
  if (score >= 75) return { label: 'Correspondance probable', color: '#92400e', bg: '#fef3c7' }
  return { label: 'Correspondance faible', color: '#991b1b', bg: '#fee2e2' }
}

// ─── Badge statut match ───────────────────────────────────────

function StatutBadge({ statut }: { statut: 'OUI' | 'A_REVOIR' | null }) {
  if (!statut) return null
  const isOui = statut === 'OUI'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '.03em',
      padding: '2px 8px', borderRadius: 20,
      background: isOui ? '#dbeafe' : '#fef3c7',
      color: isOui ? '#1d4ed8' : '#92400e',
      border: `1px solid ${isOui ? '#93c5fd' : '#fcd34d'}`,
      whiteSpace: 'nowrap',
    }}>
      {isOui ? '✓ OUI' : '⚠ À REVOIR'}
    </span>
  )
}

// ─── Badge source ─────────────────────────────────────────────

function SourceBadge({ source }: { source: 'ACTIVE' | 'RETRAIT' | 'NON_RENOUVELE' | null }) {
  if (!source) return null
  const cfg = {
    ACTIVE:       { bg: '#dcfce7', color: '#166534', border: '#86efac', label: '● ACTIF' },
    RETRAIT:      { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: '✕ RETIRÉ' },
    NON_RENOUVELE:{ bg: '#fff7ed', color: '#9a3412', border: '#fdba74', label: '○ NON RENOUVELÉ' },
  }[source]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 10, fontWeight: 700, letterSpacing: '.02em',
      padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Ligne de correspondance ──────────────────────────────────

function MatchCard({ match, idx }: { match: MatchRow; idx: number }) {
  const borderColor =
    match.source_base === 'ACTIVE'       ? '#86efac' :
    match.source_base === 'RETRAIT'      ? '#fca5a5' :
    match.source_base === 'NON_RENOUVELE'? '#fdba74' : '#e2e8f0'

  const bgColor =
    match.source_base === 'ACTIVE'       ? '#f0fdf4' :
    match.source_base === 'RETRAIT'      ? '#fff5f5' :
    match.source_base === 'NON_RENOUVELE'? '#fff7ed' : '#f8fafc'
  const scoreLabel = getScoreLabel(match.statut_match, match.score_global)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '10px 14px',
      background: bgColor,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 6,
      fontSize: 12,
    }}>
      {/* En-tête correspondance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontWeight: 800, fontSize: 13,
          color: '#0f172a', letterSpacing: '.01em',
        }}>
          {match.marque ?? match.dci_base ?? '—'}
        </span>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatutBadge statut={match.statut_match} />
          <SourceBadge source={match.source_base} />
          {match.score_global !== null && (
            <span style={{
              fontSize: 11, fontWeight: 800,
              color: match.score_global >= 90 ? '#15803d' : match.score_global >= 75 ? '#b45309' : '#b91c1c',
              background: 'white', padding: '2px 7px', borderRadius: 20,
              border: '1px solid #e2e8f0',
            }}>
              Score global {match.score_global}%
            </span>
          )}
          {scoreLabel && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 20,
              color: scoreLabel.color,
              background: scoreLabel.bg,
              border: `1px solid ${scoreLabel.color}33`,
            }}>
              {scoreLabel.label}
            </span>
          )}
        </div>
      </div>

      {/* Détails médicament */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 160 }}>
          {match.dci_base && (
            <span style={{ fontSize: 11, color: '#475569' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>DCI : </span>{match.dci_base}
            </span>
          )}
          {match.forme_base && (
            <span style={{ fontSize: 11, color: '#475569' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>Forme : </span>{match.forme_base}
            </span>
          )}
          {match.dosage_base && (
            <span style={{ fontSize: 11, color: '#475569' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>Dosage : </span>{match.dosage_base}
            </span>
          )}
          {match.conditionnement && (
            <span style={{ fontSize: 11, color: '#64748b' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>Cond. : </span>{match.conditionnement}
            </span>
          )}
          {match.n_enregistrement && (
            <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
              N° {match.n_enregistrement}{match.code_base ? ` · ${match.code_base}` : ''}
            </span>
          )}
        </div>

        {/* Scores détaillés */}
        {(match.score_dci !== null || match.score_forme !== null || match.score_dosage !== null) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center', minWidth: 140 }}>
            <ScoreBar label="DCI" value={match.score_dci} />
            <ScoreBar label="Forme" value={match.score_forme} />
            <ScoreBar label="Dosage" value={match.score_dosage} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Carte médicament critique ────────────────────────────────

function CriticalCard({ entry }: { entry: CriticalEntry }) {
  const [open, setOpen] = useState(false)

  const hasMatches = entry.matches.length > 0
  const hasConfirmed = entry.matches.some(m => m.statut_match === 'OUI')
  const hasActive = entry.matches.some(m => m.source_base === 'ACTIVE')
  const bestScore = entry.matches.reduce<number | null>((best, m) => {
    if (m.score_global === null) return best
    return best === null ? m.score_global : Math.max(best, m.score_global)
  }, null)

  const cardBorderColor = !hasMatches ? '#e2e8f0' : hasConfirmed && hasActive ? '#86efac' : '#fcd34d'
  const dotColor = !hasMatches ? '#cbd5e1' : hasConfirmed && hasActive ? '#22c55e' : '#f59e0b'

  return (
    <div style={{
      background: 'white',
      border: `1.5px solid ${cardBorderColor}`,
      borderLeft: `4px solid ${cardBorderColor}`,
      borderRadius: 8,
      overflow: 'hidden',
      transition: 'box-shadow .15s',
    }}>
      {/* En-tête cliquable */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Indicateur statut */}
        <span style={{
          width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
          background: dotColor, display: 'inline-block',
        }} />

        {/* N° et DCI */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            {entry.n_critique !== null && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>#{entry.n_critique}</span>
            )}
            <span style={{
              fontFamily: "'DM Mono', monospace", fontWeight: 800, fontSize: 13.5, color: '#0f172a',
            }}>
              {entry.dci_critique}
            </span>
            {entry.forme_critique && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>{entry.forme_critique}</span>
            )}
            {entry.dosage_critique && (
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: '#92400e',
              }}>
                {entry.dosage_critique}
              </span>
            )}
          </div>
        </div>

        {/* Meta droite */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          {hasMatches ? (
            <>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: hasActive ? '#dcfce7' : '#fff7ed',
                color: hasActive ? '#15803d' : '#9a3412',
              }}>
                {entry.matches.length} correspondance{entry.matches.length > 1 ? 's' : ''}
              </span>
              {bestScore !== null && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                  background: bestScore >= 90 ? '#dcfce7' : bestScore >= 75 ? '#fef3c7' : '#fee2e2',
                  color: bestScore >= 90 ? '#166534' : bestScore >= 75 ? '#92400e' : '#991b1b',
                }}>
                  {bestScore}%
                </span>
              )}
            </>
          ) : (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: '#f1f5f9', color: '#64748b',
            }}>
              Sans correspondance
            </span>
          )}
          <span style={{ color: '#94a3b8', fontSize: 14, marginLeft: 2 }}>{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {/* Corps dépliable */}
      {open && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 14px' }}>
          {entry.matches.length === 0 ? (
            <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
              Aucune correspondance trouvée dans la base.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entry.matches.map((match, i) => (
                <MatchCard key={i} match={match} idx={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Section classe thérapeutique ─────────────────────────────

function ClassSection({ group, defaultOpen }: { group: ClassGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  const withMatches = group.entries.filter(e => e.matches.length > 0).length
  const confirmed = group.entries.filter(e => e.matches.some(m => m.statut_match === 'OUI')).length

  return (
    <div style={{ marginBottom: 16 }}>
      {/* En-tête classe */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', background: '#0f172a', border: 'none',
          borderRadius: open ? '8px 8px 0 0' : 8, cursor: 'pointer', textAlign: 'left',
          color: 'white',
        }}
      >
        <span style={{ flex: 1, fontWeight: 800, fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase' }}>
          {group.classe}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
          }}>
            {group.entries.length} DCI
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: withMatches > 0 ? '#22c55e22' : 'rgba(255,255,255,0.08)',
            color: withMatches > 0 ? '#86efac' : 'rgba(255,255,255,0.4)',
          }}>
            {withMatches} avec correspondance
          </span>
          {confirmed > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: '#1d4ed822', color: '#93c5fd',
            }}>
              {confirmed} confirmé{confirmed > 1 ? 's' : ''}
            </span>
          )}
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div style={{
          border: '1.5px solid #e2e8f0', borderTop: 'none',
          borderRadius: '0 0 8px 8px', padding: 12,
          display: 'flex', flexDirection: 'column', gap: 8,
          background: '#f8fafc',
        }}>
          {group.entries.map(entry => (
            <CriticalCard key={entry.key} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Barre de stats ───────────────────────────────────────────

function StatsBar({ groups }: { groups: ClassGroup[] }) {
  const totalEntries = groups.reduce((s, g) => s + g.entries.length, 0)
  const withMatches = groups.reduce((s, g) => s + g.entries.filter(e => e.matches.length > 0).length, 0)
  const confirmed = groups.reduce((s, g) => s + g.entries.filter(e => e.matches.some(m => m.statut_match === 'OUI')).length, 0)
  const activeOnly = groups.reduce((s, g) => s + g.entries.filter(e => e.matches.some(m => m.source_base === 'ACTIVE')).length, 0)
  const pct = totalEntries > 0 ? Math.round((withMatches / totalEntries) * 100) : 0

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: 10, marginBottom: 16,
    }}>
      {[
        { label: 'Critiques', value: totalEntries, color: '#0284c7', bg: '#eff6ff' },
        { label: 'Avec correspondance', value: `${withMatches} (${pct}%)`, color: '#059669', bg: '#f0fdf4' },
        { label: 'Sans correspondance', value: totalEntries - withMatches, color: '#dc2626', bg: '#fff5f5' },
        { label: 'Match confirmé (OUI)', value: confirmed, color: '#1d4ed8', bg: '#dbeafe' },
        { label: 'Médicament actif', value: activeOnly, color: '#16a34a', bg: '#dcfce7' },
      ].map(stat => (
        <div key={stat.label} style={{
          padding: '10px 14px', borderRadius: 8,
          background: stat.bg, border: `1px solid ${stat.color}22`,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</span>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────

type Filters = {
  search: string
  statut: '' | 'OUI' | 'A_REVOIR'
  source: '' | 'ACTIVE' | 'RETRAIT' | 'NON_RENOUVELE'
  classe: string
  onlySansMatch: boolean
}

export function MappingView({ rows }: { rows: CriticalMappingRow[] }) {
  const [filters, setFilters] = useState<Filters>({
    search: '', statut: '', source: '', classe: '', onlySansMatch: false,
  })

  const allGroups = useMemo(() => groupData(rows), [rows])
  const allClasses = useMemo(() => allGroups.map(g => g.classe).sort(), [allGroups])

  const filteredGroups = useMemo(() => {
    const q = filters.search.toLowerCase()
    return allGroups
      .map(g => ({
        ...g,
        entries: g.entries.filter(entry => {
          // Filtre classe
          if (filters.classe && entry.classe_therapeutique !== filters.classe) return false
          // Filtre sans correspondance
          if (filters.onlySansMatch && entry.matches.length > 0) return false

          // Filtre search
          if (q) {
            const haystack = [
              entry.dci_critique, entry.forme_critique, entry.dosage_critique,
              ...entry.matches.map(m => `${m.marque ?? ''} ${m.dci_base ?? ''}`),
            ].join(' ').toLowerCase()
            if (!haystack.includes(q)) return false
          }

          // Filtre statut / source → filtre les matches, pas les entrées
          if (filters.statut || filters.source) {
            const filtered = entry.matches.filter(m =>
              (!filters.statut || m.statut_match === filters.statut) &&
              (!filters.source || m.source_base === filters.source)
            )
            // Garder l'entrée si elle a des matches après filtre OU si elle n'a pas de matches du tout
            return filtered.length > 0 || entry.matches.length === 0
          }

          return true
        }).map(entry => ({
          ...entry,
          matches: (filters.statut || filters.source)
            ? entry.matches.filter(m =>
                (!filters.statut || m.statut_match === filters.statut) &&
                (!filters.source || m.source_base === filters.source)
              )
            : entry.matches,
        })),
      }))
      .filter(g => g.entries.length > 0)
  }, [allGroups, filters])

  const set = (key: keyof Filters, val: string | boolean) =>
    setFilters(f => ({ ...f, [key]: val }))

  const expandAll = () => {
    // Handled per-section
  }

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <h3>Aucune donnée de mapping disponible.</h3>
        <p>
          Exécutez d&apos;abord le script SQL <code>sql/07_critical_mapping.sql</code>{' '}
          puis importez les données via <code>scripts/import_critical_mapping.py</code>.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* ── Stats ─────────────────────────────────────────────────── */}
      <StatsBar groups={allGroups} />

      {/* ── Filtres ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
        padding: '10px 14px', background: 'white', border: '1px solid #e2e8f0',
        borderRadius: 8, marginBottom: 14, fontSize: 12.5,
      }}>
        {/* Recherche */}
        <input
          type="search"
          placeholder="Rechercher DCI, marque…"
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          style={{
            flex: 1, minWidth: 160, height: 34, padding: '0 10px',
            border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12.5,
            outline: 'none',
          }}
        />

        {/* Classe thérapeutique */}
        <select
          value={filters.classe}
          onChange={e => set('classe', e.target.value)}
          style={{ height: 34, padding: '0 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#374151' }}
        >
          <option value="">Toutes les classes</option>
          {allClasses.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Statut match */}
        <select
          value={filters.statut}
          onChange={e => set('statut', e.target.value)}
          style={{ height: 34, padding: '0 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#374151' }}
        >
          <option value="">Tous statuts</option>
          <option value="OUI">✓ OUI</option>
          <option value="A_REVOIR">⚠ À REVOIR</option>
        </select>

        {/* Source */}
        <select
          value={filters.source}
          onChange={e => set('source', e.target.value)}
          style={{ height: 34, padding: '0 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#374151' }}
        >
          <option value="">Toutes sources</option>
          <option value="ACTIVE">● Actif</option>
          <option value="RETRAIT">✕ Retiré</option>
          <option value="NON_RENOUVELE">○ Non renouvelé</option>
        </select>

        {/* Toggle sans correspondance */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={filters.onlySansMatch}
            onChange={e => set('onlySansMatch', e.target.checked)}
            style={{ accentColor: '#dc2626' }}
          />
          Sans correspondance
        </label>

        {/* Reset */}
        {(filters.search || filters.statut || filters.source || filters.classe || filters.onlySansMatch) && (
          <button
            type="button"
            onClick={() => setFilters({ search: '', statut: '', source: '', classe: '', onlySansMatch: false })}
            style={{
              height: 34, padding: '0 10px', border: '1px solid #e2e8f0',
              borderRadius: 6, background: 'white', fontSize: 12, color: '#64748b', cursor: 'pointer',
            }}
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* ── Résultat filtre ───────────────────────────────────────── */}
      {filteredGroups.length === 0 ? (
        <div className="empty-state">
          <p>Aucun résultat pour ces filtres.</p>
        </div>
      ) : (
        <div>
          {filteredGroups.map((group, i) => (
            <ClassSection key={group.classe} group={group} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {/* ── Légende ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        marginTop: 20, padding: '10px 14px',
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11.5,
      }}>
        <span style={{ fontWeight: 700, color: '#475569', marginRight: 4 }}>Légende :</span>
        {[
          { bg: '#dcfce7', color: '#166534', border: '#86efac', label: '● ACTIF' },
          { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: '✕ RETIRÉ' },
          { bg: '#fff7ed', color: '#9a3412', border: '#fdba74', label: '○ NON RENOUVELÉ' },
          { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd', label: '✓ OUI (match confirmé)' },
          { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', label: '⚠ À REVOIR' },
        ].map(l => (
          <span key={l.label} style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 9px', borderRadius: 20, fontWeight: 700,
            background: l.bg, color: l.color, border: `1px solid ${l.border}`,
          }}>
            {l.label}
          </span>
        ))}
        <span style={{ color: '#94a3b8', marginLeft: 4 }}>
          Score : 0–100 (DCI + forme + dosage)
        </span>
      </div>
    </div>
  )
}
