import { NewsletterSection } from '@/components/ui/NewsletterSection'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Newsletter' }

export default function NewsletterPage({
  searchParams,
}: {
  searchParams?: { confirmed?: string; unsubscribed?: string }
}) {
  const confirmed = searchParams?.confirmed === 'true'
  const unsubscribed = searchParams?.unsubscribed === 'true'

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

          {confirmed && (
            <div style={{
              background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12,
              padding: '20px 24px', marginBottom: 24, textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <h2 style={{ color: '#166534', margin: '0 0 8px' }}>Abonnement confirmé !</h2>
              <p style={{ color: '#15803d', margin: 0 }}>
                Votre abonnement est actif. Vous recevrez les prochaines alertes et résumés hebdomadaires.
              </p>
            </div>
          )}

          {unsubscribed && (
            <div style={{
              background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: 12,
              padding: '20px 24px', marginBottom: 24, textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
              <h2 style={{ color: '#9a3412', margin: '0 0 8px' }}>Désinscription effectuée</h2>
              <p style={{ color: '#c2410c', margin: 0 }}>
                Vous avez été désinscrit(e) avec succès. Vous pouvez vous réabonner à tout moment.
              </p>
            </div>
          )}

          {!confirmed && !unsubscribed && (
            <div style={{ background: 'white', borderRadius: 12, padding: 32, border: '1px solid #e2e8f0', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>Que contient la newsletter ?</h2>
              <ul style={{ lineHeight: 2.2, color: '#334155', paddingLeft: 20 }}>
                <li>🚨 <strong>Alertes urgentes</strong> — Retraits de médicaments dès leur publication</li>
                <li>🆕 <strong>Nouveaux médicaments</strong> — Ajouts et suppressions de la dernière version</li>
                <li>📋 <strong>Résumé hebdomadaire</strong> — Nouveaux enregistrements de la semaine</li>
                <li>♻️ <strong>Substitutions</strong> — Nouveaux génériques disponibles</li>
                <li>⚠️ <strong>AMM expirées</strong> — Médicaments dont l'autorisation n'a pas été renouvelée</li>
              </ul>
            </div>
          )}

          <NewsletterSection />

          <div style={{ marginTop: 20 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#334155' }}>📤 Comment sont envoyées les newsletters ?</h3>
              <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.7 }}>
                Les newsletters sont envoyées via <strong>Brevo</strong> (anciennement Sendinblue) —
                un outil gratuit jusqu'à 300 emails/jour. Les alertes urgentes (retraits) sont
                envoyées immédiatement. Le résumé hebdomadaire est envoyé chaque lundi matin.
                Vous pouvez vous désabonner en un clic depuis chaque email.
              </p>
            </div>
          </div>

          <div className="alert-banner info" style={{ marginTop: 16 }}>
            🔒 Vos données sont utilisées uniquement pour l'envoi de cette newsletter. Désinscription en un clic depuis chaque email.
          </div>
        </div>
      </div>
    </>
  )
}
