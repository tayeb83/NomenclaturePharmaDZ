import Link from 'next/link'
import { Suspense } from 'react'
import type { CSSProperties } from 'react'
import { getCriticalWithMeds, getCriticalMapping } from '@/lib/queries'
import { ClassificationView } from './ClassificationView'
import { MappingView } from './MappingView'

export const revalidate = 3600

export const metadata = {
  title: 'Médicaments critiques — PharmaVeille DZ',
  description: 'Liste des médicaments critiques (DCI + forme + dosage) publiée par les autorités sanitaires, avec correspondances dans la nomenclature pharmaceutique algérienne.',
}

type Props = {
  searchParams?: { q?: string; vue?: string }
}

// ─── Contenu mapping pré-calculé ─────────────────────────────

async function MappingContent({ q }: { q: string }) {
  const rows = await getCriticalMapping(q)

  if (rows.length === 0) {
    // Fallback : afficher la vue classification si pas de données mapping
    return <FallbackContent q={q} />
  }

  return <MappingView rows={rows} />
}

// ─── Contenu fallback (ancienne vue) ─────────────────────────

async function FallbackContent({ q }: { q: string }) {
  const criticalWithMeds = await getCriticalWithMeds(q)
  const totalCount = new Set(criticalWithMeds.map(r => r.critical_id)).size

  if (criticalWithMeds.length === 0) {
    return (
      <div className="empty-state">
        <h3>Aucune donnée disponible.</h3>
        <p>
          Importez les données via <code>scripts/import_critical_mapping.py</code>{' '}
          ou <code>scripts/import_critical_medicaments.py</code>.
        </p>
        <Link href="/admin" className="btn-primary" style={{ marginTop: 8, display: 'inline-flex' }}>
          Ouvrir l&apos;admin
        </Link>
      </div>
    )
  }

  return (
    <>
      <div style={styles.infoBar}>
        <span style={styles.infoCount}>
          {totalCount} entrée{totalCount !== 1 ? 's' : ''} critique{totalCount !== 1 ? 's' : ''}
          {q ? ` pour « ${q} »` : ''}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <a href={`/api/critical/export?format=csv${q ? `&q=${encodeURIComponent(q)}` : ''}`} style={styles.exportBtn}>
            ⬇ CSV
          </a>
          <a href={`/api/critical/export?format=xlsx${q ? `&q=${encodeURIComponent(q)}` : ''}`} style={styles.exportBtn}>
            ⬇ Excel
          </a>
        </div>
      </div>
      <ClassificationView rows={criticalWithMeds} />
    </>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Stats skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 6 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ ...styles.skeleton, height: 60, borderRadius: 8 }} />
        ))}
      </div>
      {/* Filters skeleton */}
      <div style={{ ...styles.skeleton, height: 54, borderRadius: 8 }} />
      {/* Cards skeleton */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ ...styles.skeleton, height: 46, borderRadius: 8 }} />
      ))}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────

export default async function MedicamentsCritiquesPage({ searchParams }: Props) {
  const q = (searchParams?.q || '').trim()

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1 className="section-title">🚨 Médicaments critiques</h1>
          <p className="section-subtitle">
            Référentiel DCI + forme + dosage — correspondances avec la nomenclature pharmaceutique algérienne.
          </p>

          {/* Barre de recherche */}
          <form method="GET" style={styles.searchForm}>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Rechercher : DCI, marque, dosage, classe…"
              className="search-input"
              style={{ flex: 1 }}
            />
            <button type="submit" style={styles.searchBtn}>Rechercher</button>
            {q && (
              <a href="/medicaments-critiques" style={styles.clearBtn}>✕ Effacer</a>
            )}
          </form>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>
          <Suspense fallback={<LoadingSkeleton />}>
            <MappingContent q={q} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  searchForm: {
    marginTop: 12,
    maxWidth: 640,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchBtn: {
    padding: '0 18px',
    height: 40,
    background: '#0284c7',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13.5,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  clearBtn: {
    padding: '0 12px',
    height: 40,
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  infoBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
    padding: '8px 0',
  },
  infoCount: {
    fontSize: 13,
    color: '#475569',
    fontWeight: 600,
  },
  exportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#475569',
    fontSize: 12,
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  skeleton: {
    borderRadius: 8,
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
}
