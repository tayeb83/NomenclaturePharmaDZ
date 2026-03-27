import Link from 'next/link'
import type { CSSProperties } from 'react'
import { getCriticalWithMeds } from '@/lib/queries'
import { ClassificationView } from './ClassificationView'

export const revalidate = 3600

export const metadata = {
  title: 'Médicaments critiques — PharmaVeille DZ',
  description: 'Liste des médicaments critiques (DCI + forme + dosage) publiée par les autorités sanitaires.',
}

type Props = {
  searchParams?: { q?: string }
}

export default async function MedicamentsCritiquesPage({ searchParams }: Props) {
  const q = (searchParams?.q || '').trim()
  const criticalWithMeds = await getCriticalWithMeds(q)
  const totalCount = new Set(criticalWithMeds.map(r => r.critical_id)).size

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
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Ex: PARACETAMOL, INJ, 10MG/ML"
              className="search-input"
              style={{ flex: 1 }}
            />
            <button type="submit" style={styles.searchBtn}>Rechercher</button>
          </form>

          {/* ─── Actions ────────────────────────────────────── */}
          <div style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href={`/api/critical/export?format=csv${q ? `&q=${encodeURIComponent(q)}` : ''}`} style={styles.viewBtn}>
              ⬇️ Export CSV
            </a>
            <a href={`/api/critical/export?format=xlsx${q ? `&q=${encodeURIComponent(q)}` : ''}`} style={styles.viewBtn}>
              ⬇️ Export Excel
            </a>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>
              {totalCount} résultat{totalCount !== 1 ? 's' : ''}{q ? ` pour « ${q} »` : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>
          {criticalWithMeds.length === 0 ? (
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
          )}
        </div>
      </div>
    </>
  )
}

// ─── Styles ────────────────────────────────────────────────────

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
    border: '1.5px solid #0284c7',
    background: '#0284c7',
    color: 'white',
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
