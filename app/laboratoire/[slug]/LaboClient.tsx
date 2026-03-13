'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  LaboStats,
  LaboNouveauteParAnnee,
  LaboDciItem,
  LaboLocalImporte,
} from '@/lib/queries'

interface Product {
  id: number
  source: string
  n_enreg: string | null
  dci: string
  nom_marque: string
  forme: string | null
  dosage: string | null
  statut: string | null
  annee: number | null
}

interface Props {
  labo: string
  slug: string
  stats: LaboStats
  nouveautesByYear: LaboNouveauteParAnnee[]
  portfolioDci: LaboDciItem[]
  localImporte: LaboLocalImporte
  products: Product[]
}

// ── Petite barre de progression ──────────────────────────────────────────
function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ height: 8, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
    </div>
  )
}

// ── Carte stat ────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: number | string; sub?: string; color: string
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '20px 22px',
      border: '1.5px solid #e2e8f0', flex: '1 1 160px',
    }}>
      <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function LaboClient({
  labo,
  slug,
  stats,
  nouveautesByYear,
  portfolioDci,
  localImporte,
  products,
}: Props) {
  const router = useRouter()
  const [showAllDci, setShowAllDci] = useState(false)
  const [showAllProducts, setShowAllProducts] = useState(false)

  const maxYearNb = Math.max(...nouveautesByYear.map(n => n.nb), 1)
  const totalLocal = localImporte.local + localImporte.importe + localImporte.inconnu || 1
  const visibleDci = showAllDci ? portfolioDci : portfolioDci.slice(0, 15)
  const maxDci = portfolioDci[0]?.nb ?? 1
  const visibleProducts = showAllProducts ? products : products.slice(0, 20)

  const actifRate = stats.total_enregistres > 0
    ? Math.round((stats.total_actifs / stats.total_enregistres) * 100)
    : 0

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
        <Link href="/laboratoires" style={{ color: '#3b82f6', textDecoration: 'none' }}>
          ← Laboratoires
        </Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>{labo}</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            🏭 {labo}
          </h1>
          {stats.pays_origine && (
            <span style={{
              background: '#f1f5f9', color: '#475569', fontSize: 13, fontWeight: 500,
              padding: '4px 12px', borderRadius: 20, border: '1px solid #e2e8f0',
            }}>
              {stats.pays_origine}
            </span>
          )}
        </div>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>
          Portefeuille réglementaire — Nomenclature officielle MIPH Algérie
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 14 }}>
          Aperçu du portefeuille
        </h2>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <StatCard
            icon="💊" label="Enregistrés" value={stats.total_enregistres}
            sub="Total AMM nomenclature" color="#1d4ed8"
          />
          <StatCard
            icon="✅" label="Actifs"
            value={`${stats.total_actifs} (${actifRate}%)`}
            sub="Statut actif" color="#16a34a"
          />
          <StatCard
            icon="🚨" label="Retraits" value={stats.total_retraits}
            sub="Retirés du marché" color="#be123c"
          />
          <StatCard
            icon="📋" label="Non renouvelés" value={stats.total_non_renouveles}
            sub="AMM expirées" color="#b45309"
          />
        </div>
      </section>

      {/* ── Local / Importé ── */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 14 }}>
          Répartition local / importé
        </h2>
        <div style={{
          background: '#fff', borderRadius: 14, padding: '22px 24px',
          border: '1.5px solid #e2e8f0',
        }}>
          {[
            { label: 'Fabrication locale 🇩🇿', value: localImporte.local, color: '#16a34a' },
            { label: 'Importé', value: localImporte.importe, color: '#3b82f6' },
            { label: 'Non renseigné', value: localImporte.inconnu, color: '#94a3b8' },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 14 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 13, color: '#334155', marginBottom: 5,
              }}>
                <span style={{ fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontWeight: 700, color: item.color }}>
                  {item.value} ({Math.round((item.value / totalLocal) * 100)}%)
                </span>
              </div>
              <Bar value={item.value} max={totalLocal} color={item.color} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Nouveautés par année ── */}
      {nouveautesByYear.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 14 }}>
            Nouveautés par année d&apos;enregistrement
          </h2>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '22px 24px',
            border: '1.5px solid #e2e8f0', overflowX: 'auto',
          }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', minHeight: 100 }}>
              {nouveautesByYear.map(y => (
                <div key={y.annee} style={{ flex: 1, minWidth: 32, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    {y.nb}
                  </div>
                  <div style={{
                    height: Math.max(4, Math.round((y.nb / maxYearNb) * 80)),
                    background: '#3b82f6', borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s',
                  }} />
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, whiteSpace: 'nowrap' }}>
                    {y.annee}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Portefeuille DCI ── */}
      {portfolioDci.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 14 }}>
            Portefeuille par DCI (substance active)
          </h2>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '22px 24px',
            border: '1.5px solid #e2e8f0',
          }}>
            {visibleDci.map(dci => (
              <div key={dci.dci} style={{ marginBottom: 12 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, marginBottom: 5,
                }}>
                  <Link
                    href={`/recherche?q=${encodeURIComponent(dci.dci)}`}
                    style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}
                  >
                    {dci.dci}
                  </Link>
                  <span style={{ color: '#475569', fontWeight: 700 }}>{dci.nb}</span>
                </div>
                <Bar value={dci.nb} max={maxDci} color="#6366f1" />
              </div>
            ))}
            {portfolioDci.length > 15 && (
              <button
                onClick={() => setShowAllDci(!showAllDci)}
                style={{
                  marginTop: 8, background: 'none', border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: '7px 16px', fontSize: 13,
                  color: '#3b82f6', cursor: 'pointer', fontWeight: 600,
                }}
              >
                {showAllDci
                  ? '▲ Réduire'
                  : `▼ Voir les ${portfolioDci.length - 15} autres DCI`}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Liste des produits ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 14 }}>
          Produits enregistrés ({stats.total_enregistres})
        </h2>
        <div style={{
          background: '#fff', borderRadius: 14,
          border: '1.5px solid #e2e8f0', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['N° Enreg.', 'DCI', 'Nom de marque', 'Forme', 'Dosage', 'Statut', 'Année'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left', fontSize: 11,
                    fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((p, i) => (
                <tr
                  key={`${p.source}-${p.id}`}
                  onClick={() => router.push(`/medicament/${p.source}/${p.id}`)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: i % 2 === 0 ? '#fff' : '#fafafa',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa')}
                >
                  <td style={{ padding: '8px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {p.n_enreg ?? '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#334155' }}>
                    {p.dci}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                    {p.nom_marque}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#64748b' }}>{p.forme ?? '—'}</td>
                  <td style={{ padding: '8px 12px', color: '#64748b' }}>{p.dosage ?? '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      background: p.statut === 'A' ? '#dcfce7' : '#f1f5f9',
                      color: p.statut === 'A' ? '#16a34a' : '#64748b',
                      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    }}>
                      {p.statut === 'A' ? 'Actif' : (p.statut ?? '—')}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{p.annee ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length > 20 && (
            <div style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setShowAllProducts(!showAllProducts)}
                style={{
                  background: 'none', border: '1px solid #e2e8f0', borderRadius: 8,
                  padding: '7px 16px', fontSize: 13, color: '#3b82f6',
                  cursor: 'pointer', fontWeight: 600,
                }}
              >
                {showAllProducts
                  ? '▲ Réduire'
                  : `▼ Voir les ${products.length - 20} autres produits`}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Contact ── */}
      <section style={{
        background: '#f8fafc',
        borderRadius: 16,
        padding: '28px 24px',
        marginBottom: 20,
        border: '1.5px solid #e2e8f0',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>📩</div>
        <h2 style={{ color: '#0f172a', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>
          Besoin d&apos;une mise à jour ou d&apos;une correction ?
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 18px' }}>
          Notre équipe reste disponible pour toute demande concernant la fiche laboratoire.
        </p>
        <Link href="/contact" style={{
          background: '#3b82f6', color: '#fff', padding: '12px 28px',
          borderRadius: 10, fontWeight: 700, fontSize: 14,
          textDecoration: 'none', display: 'inline-block',
        }}>
          Contacter l&apos;équipe →
        </Link>
      </section>

    </main>
  )
}
