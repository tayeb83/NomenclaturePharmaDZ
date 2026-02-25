'use client'
import { useState } from 'react'

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [nom, setNom] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nom }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMsg('✅ Inscription réussie ! Vérifiez votre email pour confirmer.')
        setEmail(''); setNom('')
      } else {
        setStatus('error')
        setMsg(data.error || 'Une erreur est survenue.')
      }
    } catch {
      setStatus('error')
      setMsg('Erreur de connexion. Réessayez.')
    } finally { setLoading(false) }
  }

  return (
    <section className="newsletter-section">
      <h2>📧 Restez informé</h2>
      <p>Recevez les alertes retraits et nouveaux enregistrements directement dans votre boîte mail. Réservé aux pharmaciens algériens.</p>

      {status === 'success' ? (
        <div style={{ background: 'rgba(5,150,105,0.2)', border: '1px solid #34d399', padding: '14px 20px', borderRadius: 8, color: '#6ee7b7', fontWeight: 600 }}>
          {msg}
        </div>
      ) : (
        <form className="newsletter-form" onSubmit={handleSubmit}>
          <input
            type="text" placeholder="Votre prénom (optionnel)"
            value={nom} onChange={e => setNom(e.target.value)}
            style={{ minWidth: 150 }}
          />
          <input
            type="email" placeholder="Votre email professionnel"
            value={email} onChange={e => setEmail(e.target.value)}
            required style={{ flex: 2, minWidth: 200 }}
          />
          <button type="submit" disabled={loading}>
            {loading ? '...' : "S'abonner"}
          </button>
        </form>
      )}
      {status === 'error' && (
        <div style={{ marginTop: 10, color: '#fca5a5', fontSize: 13 }}>{msg}</div>
      )}
      <p style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 0 }}>
        Fréquence : hebdomadaire ou lors d'alertes urgentes. Désinscription en un clic.
      </p>
    </section>
  )
}
