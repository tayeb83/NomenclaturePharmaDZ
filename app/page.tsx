import Link from 'next/link'
import { getStats, getRecentEnregistrements, getLastRetraits } from '@/lib/queries'
import type { Stats, Enregistrement, Retrait } from '@/lib/db'
import { DrugCard } from '@/components/drug/DrugCard'
import { NewsletterSection } from '@/components/ui/NewsletterSection'

export const revalidate = 3600

export default async function HomePage() {
  const [stats, recents, retraits] = await Promise.all([getStats(), getRecentEnregistrements(2025, 6), getLastRetraits(3)])

  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="container hero-content">
          <h1>La nomenclature pharmaceutique<br /><span>algérienne</span> en un clic</h1>
          <p>Recherchez parmi {stats?.total_enregistrements?.toLocaleString('fr') || '4 700'}+ médicaments. Vérifiez les retraits, trouvez des génériques, suivez les nouveaux enregistrements.</p>
          <div className="hero-search">
            <span className="hero-search-icon">🔍</span>
            <form action="/recherche" method="GET">
              <input name="q" type="text" placeholder="DCI ou nom de marque... Ex: PARACETAMOL, DOLIPRANE" autoComplete="off" />
              <button type="submit" className="hero-search-btn">Rechercher</button>
            </form>
          </div>
        </div>
      </section>

      {/* ─── STATS ────────────────────────────────────────── */}
      <div className="container">
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats?.total_enregistrements?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">Enregistrements actifs</div>
            <div className="stat-sub">2024 + 2025</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">🆕</div>
            <div className="stat-value">{stats?.enreg_2025 || '—'}</div>
            <div className="stat-label">Nouveaux en 2025</div>
            <div className="stat-sub">depuis janvier 2025</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon">🚫</div>
            <div className="stat-value">{stats?.total_retraits?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">Médicaments retirés</div>
            <div className="stat-sub">au 31 août 2025</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">{stats?.total_non_renouveles?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">AMM non renouvelées</div>
            <div className="stat-sub">au 31 août 2025</div>
          </div>
        </div>
      </div>

      {/* ─── BODY ─────────────────────────────────────────── */}
      <div className="page-body">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {/* Nouveaux enregistrements */}
            <div>
              <div className="section-title">🆕 Derniers enregistrements 2025</div>
              <div className="section-sub">Médicaments récemment autorisés sur le marché algérien</div>
              {recents.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'enregistrement', similarity_score: 1 } as any} type="enregistrement" />
              ))}
              <Link href="/veille" style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#eff6ff', borderRadius: 8, color: '#0284c7', fontWeight: 700, textDecoration: 'none', marginTop: 8 }}>
                Voir tous les enregistrements 2024/2025 →
              </Link>
            </div>

            {/* Derniers retraits + fonctionnalités */}
            <div>
              <div className="section-title">🚨 Derniers retraits</div>
              <div className="section-sub">Médicaments récemment retirés du marché</div>
              {retraits.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'retrait', similarity_score: 1 } as any} type="retrait" />
              ))}
              <Link href="/alertes" style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontWeight: 700, textDecoration: 'none', marginTop: 8 }}>
                Voir toutes les alertes →
              </Link>

              {/* Features rapides */}
              <div style={{ marginTop: 28 }}>
                <div className="section-title">⚡ Accès rapide</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  {[
                    { href: '/recherche', icon: '🔍', title: 'Recherche', sub: 'Par DCI ou marque' },
                    { href: '/substitution', icon: '♻️', title: 'Substitution', sub: 'Trouver un générique' },
                    { href: '/alertes', icon: '🚨', title: 'Alertes', sub: 'Retraits & AMM expirées' },
                    { href: '/veille', icon: '📋', title: 'Veille', sub: 'Nouveaux enregistrements' },
                  ].map(f => (
                    <Link key={f.href} href={f.href} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', textDecoration: 'none', transition: 'box-shadow .15s', display: 'block' }}
                      onMouseEnter={undefined}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{f.title}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{f.sub}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <NewsletterSection />

          {/* Source info */}
          <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
            📋 Données officielles du <strong>Ministère de l'Industrie Pharmaceutique (MIPH)</strong> — République Algérienne Démocratique et Populaire<br />
            <span style={{ fontSize: 11 }}>Mise à jour : août 2025 — Ce site est informatif et ne remplace pas les sources officielles</span>
          </div>
        </div>
      </div>
    </>
  )
}
