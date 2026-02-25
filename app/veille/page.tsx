import { getAllEnregistrements, getStatsByYear } from '@/lib/queries'
import { DrugCard } from '@/components/drug/DrugCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Veille réglementaire' }
export const revalidate = 3600

export default async function VeillePage({ searchParams }: { searchParams: { annee?: string } }) {
  const annee = parseInt(searchParams.annee || '2025')
  const [drugs, stats] = await Promise.all([getAllEnregistrements(annee, 50), getStatsByYear(annee)])
  const typeLabels: Record<string, string> = { GE: 'Génériques', 'Gé': 'Génériques', RE: 'Réf. étrangères', BIO: 'Biologiques', I: 'Innovateurs', 'Ré': 'Réf. étrangères' }

  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0284c7)' }}>
        <div className="container">
          <h1>📋 Veille réglementaire</h1>
          <p>Nouveaux médicaments enregistrés sur le marché algérien — Données MIPH</p>
        </div>
      </div>
      <div className="page-body">
        <div className="container">
          {/* Tabs années */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {[2025, 2024].map(y => (
              <a key={y} href={`/veille?annee=${y}`} style={{
                padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14,
                textDecoration: 'none', border: '1.5px solid',
                borderColor: annee === y ? '#0284c7' : '#e2e8f0',
                background: annee === y ? '#0284c7' : 'white',
                color: annee === y ? 'white' : '#475569',
              }}>
                {y} {annee === y ? '←' : ''}
              </a>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
            <div>
              <div className="section-title">Enregistrements {annee} ({drugs.length} affichés)</div>
              <div className="section-sub">Triés par date d'enregistrement décroissante</div>
              {drugs.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'enregistrement', similarity_score: 1 } as any} type="enregistrement" />
              ))}
            </div>

            {/* Stats sidebar */}
            <div>
              <div style={{ background: 'white', borderRadius: 10, padding: '18px', border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>📊 Stats {annee}</div>

                <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Par type</div>
                {Object.entries(stats.types).sort((a,b)=>b[1]-a[1]).map(([type, n]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span>{typeLabels[type] || type}</span>
                    <span style={{ fontWeight: 700, color: '#0284c7' }}>{n}</span>
                  </div>
                ))}

                <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', margin: '14px 0 8px' }}>Fabrication</div>
                {Object.entries(stats.statuts).map(([s, n]) => (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span>{s === 'F' ? '🇩🇿 Algérie' : '🌍 Importé'}</span>
                    <span style={{ fontWeight: 700, color: s === 'F' ? '#059669' : '#7c3aed' }}>{n}</span>
                  </div>
                ))}

                {stats.topPays.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', margin: '14px 0 8px' }}>Top pays</div>
                    {stats.topPays.map(([pays, n]) => (
                      <div key={pays} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: '#334155' }}>{pays}</span>
                        <span style={{ fontWeight: 700, color: '#64748b' }}>{n}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
