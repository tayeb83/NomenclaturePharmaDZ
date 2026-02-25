import { NewsletterSection } from '@/components/ui/NewsletterSection'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Newsletter' }

export default function NewsletterPage() {
  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>📧 Newsletter PharmaVeille DZ</h1>
          <p>Restez informé des retraits urgents et des nouveaux enregistrements</p>
        </div>
      </div>
      <div className="page-body">
        <div className="container" style={{ maxWidth: 700 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, border: '1px solid #e2e8f0', marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>Que contient la newsletter ?</h2>
            <ul style={{ lineHeight: 2.2, color: '#334155', paddingLeft: 20 }}>
              <li>🚨 <strong>Alertes urgentes</strong> — Retraits de médicaments dès leur publication</li>
              <li>📋 <strong>Résumé hebdomadaire</strong> — Nouveaux enregistrements de la semaine</li>
              <li>♻️ <strong>Substitutions</strong> — Nouveaux génériques disponibles</li>
              <li>⚠️ <strong>AMM expirées</strong> — Médicaments dont l'autorisation n'a pas été renouvelée</li>
            </ul>
          </div>

          <NewsletterSection />

          <div className="alert-banner info">
            🔒 Vos données sont utilisées uniquement pour l'envoi de cette newsletter. Désinscription en un clic depuis chaque email.
          </div>
        </div>
      </div>
    </>
  )
}
