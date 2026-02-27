'use client'
import { useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [nom, setNom] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr

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
        setMsg(t('✅ Inscription réussie ! Vérifiez votre email pour confirmer.', '✅ تم التسجيل بنجاح! تحقق من بريدك للتأكيد.'))
        setEmail(''); setNom('')
      } else {
        setStatus('error')
        setMsg(data.error || t('Une erreur est survenue.', 'حدث خطأ.'))
      }
    } catch {
      setStatus('error')
      setMsg(t('Erreur de connexion. Réessayez.', 'خطأ في الاتصال. أعد المحاولة.'))
    } finally { setLoading(false) }
  }

  return (
    <section className="newsletter-section">
      <h2>📧 {t('Restez informé', 'ابق على اطلاع')}</h2>
      <p>{t(
        'Recevez les alertes retraits et nouveaux enregistrements directement dans votre boîte mail. Réservé aux pharmaciens algériens.',
        'احصل على تنبيهات الانسحابات والتسجيلات الجديدة مباشرة في بريدك. مخصص للصيادلة الجزائريين.'
      )}</p>

      {status === 'success' ? (
        <div style={{ background: 'rgba(5,150,105,0.2)', border: '1px solid #34d399', padding: '14px 20px', borderRadius: 8, color: '#6ee7b7', fontWeight: 600 }}>
          {msg}
        </div>
      ) : (
        <form className="newsletter-form" onSubmit={handleSubmit}>
          <input
            type="text" placeholder={t('Votre prénom (optionnel)', 'اسمك (اختياري)')}
            value={nom} onChange={e => setNom(e.target.value)}
            style={{ minWidth: 150 }}
          />
          <input
            type="email" placeholder={t('Votre email professionnel', 'بريدك الإلكتروني المهني')}
            value={email} onChange={e => setEmail(e.target.value)}
            required style={{ flex: 2, minWidth: 200 }}
          />
          <button type="submit" disabled={loading}>
            {loading ? '...' : t("S'abonner", 'اشترك')}
          </button>
        </form>
      )}
      {status === 'error' && (
        <div style={{ marginTop: 10, color: '#fca5a5', fontSize: 13 }}>{msg}</div>
      )}
      <p style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 0 }}>
        {t(
          "Fréquence : hebdomadaire ou lors d'alertes urgentes. Désinscription en un clic.",
          'التكرار: أسبوعي أو عند تنبيهات عاجلة. إلغاء الاشتراك بنقرة واحدة.'
        )}
      </p>
    </section>
  )
}
