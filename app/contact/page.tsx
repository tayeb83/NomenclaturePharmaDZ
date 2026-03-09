import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez PharmaVeille DZ — questions, suggestions, signalement d\'erreurs sur la nomenclature pharmaceutique algérienne.',
  alternates: { canonical: `${APP_URL}/contact` },
  openGraph: {
    title: 'Contact | PharmaVeille DZ',
    description: 'Contactez-nous pour toute question sur les médicaments en Algérie.',
    url: `${APP_URL}/contact`,
  },
}

export default function ContactPage() {
  return (
    <div className="container" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 16px 80px' }}>
      {/* En-tête */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>📬</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Contactez-nous</h1>
        <p style={{ color: 'var(--slate-500)', fontSize: 17, maxWidth: 500, margin: '0 auto' }}>
          Une question, une suggestion, une erreur à signaler dans la nomenclature ?<br />
          Nous sommes à votre écoute.
        </p>
      </div>

      {/* Carte contact */}
      <div style={{
        background: 'white',
        border: '1px solid var(--slate-200)',
        borderRadius: 16,
        padding: '36px 40px',
        marginBottom: 32,
        boxShadow: 'var(--shadow)',
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>✉️</span> Email
        </h2>

        <a
          href="mailto:sahaokbane@gmail.com"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: '#eef2ff',
            border: '1px solid #c7d2fe',
            borderRadius: 10,
            padding: '14px 22px',
            color: '#3730a3',
            fontSize: 18,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
        >
          <span>📧</span>
          sahaokbane@gmail.com
        </a>

        <p style={{ marginTop: 20, color: 'var(--slate-500)', fontSize: 14, lineHeight: 1.6 }}>
          Nous répondons généralement sous 24 à 48 heures (jours ouvrés).
        </p>
      </div>

      {/* Sujets */}
      <div style={{
        background: 'white',
        border: '1px solid var(--slate-200)',
        borderRadius: 16,
        padding: '32px 40px',
        marginBottom: 32,
        boxShadow: 'var(--shadow)',
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Pour quel sujet ?</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            { icon: '🔍', title: 'Médicament introuvable', desc: 'Un médicament n\'apparaît pas dans la recherche ou les données semblent incorrectes.' },
            { icon: '🚨', title: 'Signalement d\'erreur', desc: 'Une alerte retrait ou une information erronée à corriger.' },
            { icon: '💡', title: 'Suggestion d\'amélioration', desc: 'Idée de fonctionnalité ou amélioration de l\'interface.' },
            { icon: '🤝', title: 'Partenariat / Collaboration', desc: 'Propositions de partenariat avec officines, hôpitaux ou institutions.' },
          ].map((item) => (
            <div key={item.title} style={{
              display: 'flex',
              gap: 14,
              padding: '14px 16px',
              background: 'var(--slate-50)',
              border: '1px solid var(--slate-200)',
              borderRadius: 10,
            }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 3 }}>{item.title}</div>
                <div style={{ color: 'var(--slate-500)', fontSize: 13 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note MIPH */}
      <div style={{
        background: 'rgba(251,191,36,0.07)',
        border: '1px solid rgba(251,191,36,0.2)',
        borderRadius: 12,
        padding: '18px 22px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
        <p style={{ margin: 0, color: '#92400e', fontSize: 13, lineHeight: 1.6 }}>
          <strong style={{ color: '#78350f' }}>Important :</strong> PharmaVeille DZ est une plateforme indépendante
          qui diffuse les données officielles du MIPH. Pour toute question réglementaire officielle,
          contactez directement le{' '}
          <a href="https://www.industrie.gov.dz" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>
            Ministère de l&apos;Industrie Pharmaceutique
          </a>.
        </p>
      </div>
    </div>
  )
}
