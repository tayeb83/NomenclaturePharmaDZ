import Link from 'next/link'
import type { CSSProperties } from 'react'
import { getCriticalMedicaments, getCriticalWithMeds } from '@/lib/queries'
import { ClassificationView } from './ClassificationView'

export const metadata = {
  title: 'Médicaments critiques — PharmaVeille DZ',
  description: 'Liste des médicaments critiques (DCI + forme + dosage) publiée par les autorités sanitaires.',
}

type Props = {
  searchParams?: { q?: string; view?: string }
}

export default async function MedicamentsCritiquesPage({ searchParams }: Props) {
  const q = (searchParams?.q || '').trim()
  const view = searchParams?.view === 'classification' ? 'classification' : 'list'

  const [rows, criticalWithMeds] = await Promise.all([
    view === 'list' ? getCriticalMedicaments(q, 800) : Promise.resolve([]),
    view === 'classification' ? getCriticalWithMeds(q) : Promise.resolve([]),
  ])

  const totalCount = view === 'list' ? rows.length : new Set(criticalWithMeds.map(r => r.critical_id)).size

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1 className="section-title">🚨 Médicaments critiques</h1>
          <p className="section-subtitle">
            Référentiel DCI + forme + dosage utilisé pour marquer automatiquement les médicaments critiques.
          </p>

          {/* ─── Barre de recherche ─────────────────────────── */}
          <form method="GET" style={{ marginTop: 12, maxWidth: 560, display: 'flex', gap: 8 }}>
            <input
              type="hidden"
              name="view"
              value={view}
            />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Ex: PARACETAMOL, INJ, 10MG/ML"
              className="search-input"
              style={{ flex: 1 }}
            />
            <button type="submit" style={styles.searchBtn}>Rechercher</button>
          </form>

          {/* ─── Toggle vue ─────────────────────────────────── */}
          <div style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`/medicaments-critiques?view=list${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              style={{
                ...styles.viewBtn,
                background: view === 'list' ? '#0284c7' : 'rgba(255,255,255,0.08)',
                color: view === 'list' ? 'white' : 'rgba(255,255,255,0.65)',
                borderColor: view === 'list' ? '#0284c7' : 'rgba(255,255,255,0.18)',
              }}
            >
              📋 Liste
            </Link>
            <Link
              href={`/medicaments-critiques?view=classification${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              style={{
                ...styles.viewBtn,
                background: view === 'classification' ? '#0284c7' : 'rgba(255,255,255,0.08)',
                color: view === 'classification' ? 'white' : 'rgba(255,255,255,0.65)',
                borderColor: view === 'classification' ? '#0284c7' : 'rgba(255,255,255,0.18)',
              }}
            >
              🗂️ Classification
            </Link>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>
              {totalCount} résultat{totalCount !== 1 ? 's' : ''}{q ? ` pour « ${q} »` : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>
          {/* ─── Vue Liste ──────────────────────────────────── */}
          {view === 'list' && (
            rows.length === 0 ? (
              <div className="empty-state">
                <h3>Aucun médicament critique trouvé.</h3>
                <p>Importe d&apos;abord la liste critique, puis relance la recherche.</p>
                <Link href="/admin" className="btn-primary" style={{ marginTop: 8, display: 'inline-flex' }}>
                  Ouvrir l&apos;admin
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={th}>DCI</th>
                      <th style={th}>Forme</th>
                      <th style={th}>Dosage</th>
                      <th style={th}>Classe thérapeutique</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td style={td}>{row.dci}</td>
                        <td style={td}>{row.forme}</td>
                        <td style={td}>{row.dosage}</td>
                        <td style={td}>{row.classe_therapeutique || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ─── Vue Classification ──────────────────────────── */}
          {view === 'classification' && (
            criticalWithMeds.length === 0 ? (
              <div className="empty-state">
                <h3>Aucun médicament critique trouvé.</h3>
                <p>Importe d&apos;abord la liste critique, puis relance la recherche.</p>
                <Link href="/admin" className="btn-primary" style={{ marginTop: 8, display: 'inline-flex' }}>
                  Ouvrir l&apos;admin
                </Link>
              </div>
            ) : (
              <>
                <div style={styles.legendeBox}>
                  <div style={styles.legendeItem}>
                    <span style={{ ...styles.legendeDot, background: '#0284c7' }} /> DCI
                  </div>
                  <div style={styles.legendeItem}>
                    <span style={{ ...styles.legendeDot, background: '#059669' }} /> Forme pharmaceutique
                  </div>
                  <div style={styles.legendeItem}>
                    <span style={{ ...styles.legendeDot, background: '#f59e0b' }} /> Dosage
                  </div>
                  <div style={styles.legendeItem}>
                    <span style={{ ...styles.legendeDot, background: '#e2e8f0' }} /> Médicament correspondant
                  </div>
                </div>
                <ClassificationView rows={criticalWithMeds} />
              </>
            )
          )}
        </div>
      </div>
    </>
  )
}

// ─── Styles ────────────────────────────────────────────────────

const th: CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e2e8f0',
  fontWeight: 700,
  color: '#0f172a',
}

const td: CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #f1f5f9',
  color: '#334155',
}

const styles: Record<string, CSSProperties> = {
  searchBtn: {
    padding: '0 18px',
    background: '#0284c7',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13.5,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  viewBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 14px',
    borderRadius: 999,
    border: '1.5px solid',
    fontSize: 13,
    fontWeight: 700,
    textDecoration: 'none',
    transition: 'all .15s',
    cursor: 'pointer',
  },
  legendeBox: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'center',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 16px',
    marginBottom: 16,
    fontSize: 12,
    color: '#475569',
    fontWeight: 600,
  },
  legendeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  legendeDot: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
}
