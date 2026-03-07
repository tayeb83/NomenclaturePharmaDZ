import Link from 'next/link'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">💊 PharmaVeille DZ</div>
            <p className="footer-desc">
              La référence pour les pharmaciens algériens. Données officielles du Ministère de l'Industrie Pharmaceutique (MIPH). Recherche, alertes retraits, nouveaux enregistrements.
            </p>
            <div style={{ marginTop: 14 }}>
              <span className="footer-badge">DONNÉES MIPH 2025</span>
            </div>
          </div>

          <div className="footer-col">
            <h4>Navigation</h4>
            <ul className="footer-links">
              <li><Link href="/">Accueil</Link></li>
              <li><Link href="/recherche">Recherche</Link></li>
              <li><Link href="/alertes">Alertes & Retraits</Link></li>
              <li><Link href="/substitution">Substitution générique</Link></li>
              <li><Link href="/veille">Veille réglementaire</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Ressources</h4>
            <ul className="footer-links">
              <li><Link href="/medicaments">Tous les médicaments</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/a-propos">À propos</Link></li>
              <li><a href="https://www.industrie.gov.dz" target="_blank" rel="noopener">MIPH Algérie</a></li>
              <li><a href="https://www.ands.dz" target="_blank" rel="noopener">ANDS</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Suivez-nous</h4>
            <ul className="footer-links">
              <li><a href="https://facebook.com/pharmaveille.dz" target="_blank" rel="noopener">📘 Facebook</a></li>
              <li><a href="https://twitter.com/pharmaveilledz" target="_blank" rel="noopener">🐦 Twitter / X</a></li>
              <li><a href="https://t.me/pharmaveille_dz" target="_blank" rel="noopener">✈️ Telegram</a></li>
            </ul>
          </div>
        </div>

        {/* Mobile quick-links bar — always visible on small screens */}
        <div className="footer-mobile-quicklinks">
          <Link href="/recherche">🔍 Recherche</Link>
          <Link href="/alertes">🚨 Alertes</Link>
          <Link href="/substitution">♻️ Substitution</Link>
          <Link href="/a-propos">ℹ️ À propos</Link>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} PharmaVeille DZ — Données à titre informatif uniquement. Consultez toujours les sources officielles.</span>
          <div className="footer-social">
            <a href="https://facebook.com/pharmaveille.dz" target="_blank" rel="noopener" title="Facebook">📘</a>
            <a href="https://twitter.com/pharmaveilledz" target="_blank" rel="noopener" title="Twitter">🐦</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
