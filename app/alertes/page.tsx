import { getRetraits, getNonRenouveles, getMotifStats } from '@/lib/queries'
import type { Retrait, NonRenouvele } from '@/lib/db'
import { DrugCard } from '@/components/drug/DrugCard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alertes & Retraits',
  description: 'Liste officielle des médicaments retirés du marché algérien et AMM non renouvelées — Source MIPH.',
}
export const revalidate = 3600

const MOTIF_GROUPS: { label: string; color: string; keywords: string[] }[] = [
  { label: "🚫 Interdictions d'importation", color: '#dc2626', keywords: ["INTERDICTION D'IMPORTATION"] },
  { label: '💼 Motifs commerciaux', color: '#f59e0b', keywords: ['COMMERCIAL', 'ARRET DE COMMERCIALISATION'] },
  { label: '🌍 Retrait dans le pays d\'origine', color: '#7c3aed', keywords: ["PAYS D'ORIGINE"] },
  { label: '🏭 Interdiction du laboratoire', color: '#dc2626', keywords: ['LABORATOIRE'] },
  { label: '📋 Non commercialisé', color: '#64748b', keywords: ['NON COMMERCIALISE'] },
]

export default async function AlertesPage() {
  const [retraits, nonRenouveles, motifStatsRaw] = await Promise.all([getRetraits(100), getNonRenouveles(50), getMotifStats()])
  const motifStats: [string, number][] = motifStatsRaw.map(r => [r.motif, parseInt(r.n)])

  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #7f1d1d, #991b1b)' }}>
        <div className="container">
          <h1>🚨 Alertes & Retraits</h1>
          <p>Liste des médicaments retirés du marché algérien et des AMM non renouvelées — Source : MIPH</p>
        </div>
      </div>

      <div className="page-body">
        <div className="container">
          {/* Alerte principale */}
          <div className="alert-banner error" style={{ marginBottom: 24 }}>
            <strong>⚠️ Attention :</strong> Un médicament apparaissant sur cette liste ne doit plus être dispensé aux patients. En cas de doute, consultez les sources officielles du MIPH.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
            {/* Liste retraits */}
            <div>
              <div className="section-title">🚫 Médicaments retirés ({retraits.length} affichés)</div>
              <div className="section-sub">Dernier retrait en date</div>
              {retraits.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'retrait', similarity_score: 1, annee: null } as any} type="retrait" />
              ))}

              {/* Non renouvelés */}
              <div style={{ marginTop: 36 }}>
                <div className="section-title">⚠️ AMM non renouvelées ({nonRenouveles.length} affichés)</div>
                <div className="section-sub">Autorisations de mise sur le marché expirées sans renouvellement</div>
                {nonRenouveles.map(d => (
                  <DrugCard key={d.id} drug={{ ...d, source: 'non_renouvele', similarity_score: 1, annee: null, date_retrait: null, motif_retrait: null } as any} type="non_renouvele" />
                ))}
              </div>
            </div>

            {/* Sidebar motifs */}
            <div>
              <div className="section-title">📊 Répartition par motif</div>
              <div className="section-sub">Raisons des retraits</div>
              <div style={{ background: 'white', borderRadius: 10, padding: '16px', border: '1px solid #e2e8f0', marginBottom: 20 }}>
                {motifStats.map(([motif, count]) => (
                  <div key={motif} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      <span style={{ flex: 1, paddingRight: 8, lineHeight: 1.4 }}>{motif}</span>
                      <span style={{ color: '#0284c7', flexShrink: 0 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#0284c7', width: `${Math.min(100, (count / motifStats[0][1]) * 100)}%`, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Infos */}
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '16px', fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 8 }}>ℹ️ Que faire face à un retrait ?</div>
                <ul style={{ color: '#78716c', paddingLeft: 16, lineHeight: 1.8 }}>
                  <li>Ne plus délivrer le médicament</li>
                  <li>Retirer les stocks en rayon</li>
                  <li>Informer les patients concernés</li>
                  <li>Proposer une alternative thérapeutique</li>
                  <li>Contacter le laboratoire titulaire</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
