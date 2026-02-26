import Link from 'next/link'
import { getStats, getLatestNouveautes, getLastRetraits, getLastVersionDate } from '@/lib/queries'
import { DrugCard } from '@/components/drug/DrugCard'
import { NewsletterSection } from '@/components/ui/NewsletterSection'

export const revalidate = 3600

function formatDateFR(d: string | null): string | null {
  if (!d) return null
  const parts = d.slice(0, 10).split('-')
  if (parts.length !== 3) return null
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export default async function HomePage() {
  const [stats, nouveautes, retraits, lastVersionDate] = await Promise.all([
    getStats(), getLatestNouveautes(6), getLastRetraits(3), getLastVersionDate(),
  ])

  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <h1>La nomenclature pharmaceutique<br /><span>algérienne</span> en un clic</h1>
          <p>Recherchez parmi {stats?.total_enregistrements?.toLocaleString('fr') || '—'} médicaments, consultez les alertes officielles et trouvez des alternatives de substitution.</p>
          <div className="hero-search">
            <span className="hero-search-icon">🔍</span>
            <form action="/recherche" method="GET">
              <input name="q" type="text" placeholder="DCI ou nom de marque... Ex: PARACETAMOL, DOLIPRANE" autoComplete="off" />
              <button type="submit" className="hero-search-btn">Rechercher</button>
            </form>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats?.total_enregistrements?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">Enregistrements actifs</div>
            <div className="stat-sub">
              Version {stats?.last_version || '—'}
              {formatDateFR(lastVersionDate) && (
                <> · MàJ <strong style={{ color: '#0284c7' }}>{formatDateFR(lastVersionDate)}</strong></>
              )}
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">🆕</div>
            <div className="stat-value">{stats?.total_nouveautes != null ? stats.total_nouveautes.toLocaleString('fr') : '—'}</div>
            <div className="stat-label">Nouveautés</div>
            <div className="stat-sub">vs version précédente</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon">🚫</div>
            <div className="stat-value">{stats?.total_retraits?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">Médicaments retirés</div>
            <div className="stat-sub">Source MIPH</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">{stats?.total_non_renouveles?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">AMM non renouvelées</div>
            <div className="stat-sub">Source MIPH</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <div className="section-title">🆕 Nouveautés ({stats?.last_version || 'dernière version'})</div>
              <div className="section-sub">Comparaison automatique avec la version précédente de la nomenclature</div>
              {nouveautes.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'enregistrement', similarity_score: 1 } as any} type="enregistrement" />
              ))}
              <Link href="/recherche?scope=enregistrement" style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#eff6ff', borderRadius: 8, color: '#0284c7', fontWeight: 700, textDecoration: 'none', marginTop: 8 }}>
                Rechercher dans la nomenclature active →
              </Link>
            </div>

            <div>
              <div className="section-title">🚨 Derniers retraits</div>
              <div className="section-sub">Médicaments retirés du marché (feuille Retraits)</div>
              {retraits.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'retrait', similarity_score: 1 } as any} type="retrait" />
              ))}
              <Link href="/alertes" style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontWeight: 700, textDecoration: 'none', marginTop: 8 }}>
                Voir toutes les alertes →
              </Link>

              <div style={{ marginTop: 28 }}>
                <div className="section-title">⚡ Accès rapide</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  {[
                    { href: '/recherche', icon: '🔍', title: 'Recherche', sub: 'Par DCI ou marque' },
                    { href: '/substitution', icon: '♻️', title: 'Substitution', sub: 'Trouver un générique' },
                    { href: '/alertes', icon: '🚨', title: 'Alertes !', sub: 'Retraits & non renouvelés' },
                  ].map(f => (
                    <Link key={f.href} href={f.href} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', textDecoration: 'none', display: 'block' }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{f.title}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{f.sub}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <NewsletterSection />
        </div>
      </div>
    </>
  )
}
