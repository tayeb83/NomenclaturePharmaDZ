'use client'

import { useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'

type Offer = 'veille' | 'api' | 'fiche_pharmacie' | 'autre'

const OFFERS: Array<{
  id: Offer
  icon: string
  title: { fr: string; ar: string }
  subtitle: { fr: string; ar: string }
  price: { fr: string; ar: string }
  bullets: { fr: string[]; ar: string[] }
  cta: { fr: string; ar: string }
}> = [
  {
    id: 'veille',
    icon: '📡',
    title: { fr: 'Veille réglementaire Premium', ar: 'المراقبة التنظيمية المتقدمة' },
    subtitle: {
      fr: 'Pour laboratoires, importateurs et distributeurs',
      ar: 'للمخابر والمستوردين والموزعين',
    },
    price: { fr: 'à partir de 8 000 DZD / mois', ar: 'ابتداءً من 8000 دج / شهر' },
    bullets: {
      fr: [
        'Alertes ciblées : nouveaux enregistrements de vos concurrents dans vos classes ATC',
        'Notifications retraits et AMM non renouvelées dès publication MIPH',
        'Historique des versions de la nomenclature + diff automatique',
        'Export Excel et tableaux de bord personnalisés',
      ],
      ar: [
        'تنبيهات مستهدفة: التسجيلات الجديدة لمنافسيكم في فئاتكم العلاجية (ATC)',
        'إشعارات السحوبات وقرارات عدم التجديد فور صدورها عن MIPH',
        'أرشيف إصدارات التسمية + مقارنة تلقائية بين النسخ',
        'تصدير Excel ولوحات متابعة مخصصة',
      ],
    },
    cta: { fr: 'Demander une démo', ar: 'اطلب عرضًا تجريبيًا' },
  },
  {
    id: 'api',
    icon: '🔌',
    title: { fr: 'API Nomenclature structurée', ar: 'واجهة برمجية للتسمية المهيكلة' },
    subtitle: {
      fr: 'Pour éditeurs de logiciels d\'officine, startups santé, assurances',
      ar: 'لمطوري برامج الصيدليات وشركات الصحة الرقمية والتأمينات',
    },
    price: { fr: 'à partir de 20 000 DZD / mois', ar: 'ابتداءً من 20000 دج / شهر' },
    bullets: {
      fr: [
        'Nomenclature MIPH nettoyée, structurée et versionnée (vs PDF/Excel bruts)',
        'Enrichissement ATC + synonymie DCI ↔ marques ↔ appellations populaires',
        'Recherche tolérante (fautes de frappe, arabe/darija) prête à intégrer',
        'Webhooks nouveautés / retraits, SLA et support dédié',
      ],
      ar: [
        'تسمية MIPH منظّفة ومهيكلة ومؤرشفة بالإصدارات (بدل PDF/Excel الخام)',
        'إثراء ATC + مترادفات DCI ↔ الأسماء التجارية ↔ التسميات الشائعة',
        'بحث متسامح مع الأخطاء (إملاء، عربية/دارجة) جاهز للدمج',
        'إشعارات فورية (Webhooks) للجديد والمسحوب، مع دعم مخصص',
      ],
    },
    cta: { fr: 'Obtenir un accès API', ar: 'احصل على وصول API' },
  },
  {
    id: 'fiche_pharmacie',
    icon: '🏪',
    title: { fr: 'Fiche Pharmacie Premium', ar: 'صفحة صيدلية مميزة' },
    subtitle: {
      fr: 'Soyez trouvable quand vous êtes de garde',
      ar: 'كن ظاهرًا عندما تكون في المناوبة',
    },
    price: { fr: 'à partir de 500 DZD / mois', ar: 'ابتداءً من 500 دج / شهر' },
    bullets: {
      fr: [
        'Badge « Vérifiée » + mise en avant locale dans les pages de garde',
        'WhatsApp cliquable, photos, horaires détaillés',
        'Mise à jour autonome de votre fiche (garde, téléphone, adresse)',
        'Statistiques de consultation de votre fiche',
      ],
      ar: [
        'شارة «موثّقة» + إبراز محلي في صفحات المناوبة',
        'واتساب قابل للنقر، صور، وأوقات عمل مفصلة',
        'تحديث ذاتي لصفحتك (المناوبة، الهاتف، العنوان)',
        'إحصائيات زيارات صفحتك',
      ],
    },
    cta: { fr: 'Revendiquer ma pharmacie', ar: 'طلب إدارة صيدليتي' },
  },
]

const T = {
  fr: {
    headerTitle: '💼 Espace Pro',
    headerSub: 'Des services professionnels construits sur la nomenclature pharmaceutique algérienne : veille réglementaire, données structurées et visibilité des officines.',
    formTitle: 'Nous contacter',
    formSub: 'Laissez vos coordonnées, nous revenons vers vous sous 48h ouvrées.',
    offer: 'Offre concernée',
    offerOptions: {
      veille: '📡 Veille réglementaire Premium',
      api: '🔌 API Nomenclature',
      fiche_pharmacie: '🏪 Fiche Pharmacie Premium',
      autre: 'Autre demande',
    } as Record<Offer, string>,
    organisation: 'Organisation (labo, société, officine)',
    nom: 'Nom et prénom *',
    email: 'Email professionnel *',
    phone: 'Téléphone',
    message: 'Votre besoin',
    send: 'Envoyer la demande',
    sending: 'Envoi…',
    thanks: '✓ Demande transmise, merci ! Nous vous recontactons rapidement.',
    failed: 'Échec de l\'envoi, réessayez ou écrivez-nous via la page Contact.',
  },
  ar: {
    headerTitle: '💼 الفضاء المهني',
    headerSub: 'خدمات مهنية مبنية على التسمية الصيدلانية الجزائرية: مراقبة تنظيمية، بيانات مهيكلة، وإبراز للصيدليات.',
    formTitle: 'اتصل بنا',
    formSub: 'اترك معلوماتك وسنعاود الاتصال بك خلال 48 ساعة عمل.',
    offer: 'العرض المعني',
    offerOptions: {
      veille: '📡 المراقبة التنظيمية المتقدمة',
      api: '🔌 واجهة API للتسمية',
      fiche_pharmacie: '🏪 صفحة صيدلية مميزة',
      autre: 'طلب آخر',
    } as Record<Offer, string>,
    organisation: 'المؤسسة (مخبر، شركة، صيدلية)',
    nom: 'الاسم واللقب *',
    email: 'البريد الإلكتروني المهني *',
    phone: 'الهاتف',
    message: 'احتياجك',
    send: 'إرسال الطلب',
    sending: 'جارٍ الإرسال…',
    thanks: '✓ تم إرسال الطلب، شكرًا! سنتواصل معك قريبًا.',
    failed: 'فشل الإرسال، حاول مجددًا أو راسلنا عبر صفحة الاتصال.',
  },
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #cbd5e1', borderRadius: 8,
  padding: '10px 12px', fontSize: 14, background: '#fff',
}

export function ProClient() {
  const { lang } = useLanguage()
  const t = T[lang]

  const [offer, setOffer] = useState<Offer>('veille')
  const [organisation, setOrganisation] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function selectOffer(id: Offer) {
    setOffer(id)
    document.getElementById('pro-lead-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/pro/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer,
          organisation: organisation || undefined,
          nom,
          email,
          phone: phone || undefined,
          message: message || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || String(res.status))
      }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error && err.message.length < 120 ? err.message : t.failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
        <div className="container">
          <h1 style={{ color: 'white' }}>{t.headerTitle}</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 720 }}>{t.headerSub}</p>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>

          {/* Les 3 offres */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 44 }}>
            {OFFERS.map(o => (
              <div key={o.id} style={{
                background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14,
                padding: '22px 22px 18px', display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>{o.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>{o.title[lang]}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{o.subtitle[lang]}</div>
                <div style={{
                  marginTop: 10, fontWeight: 700, fontSize: 13.5, color: '#0284c7',
                  background: '#f0f9ff', borderRadius: 8, padding: '5px 10px', alignSelf: 'flex-start',
                }}>
                  {o.price[lang]}
                </div>
                <ul style={{ margin: '14px 0 18px', paddingInlineStart: 18, display: 'grid', gap: 7, flex: 1 }}>
                  {o.bullets[lang].map(b => (
                    <li key={b} style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{b}</li>
                  ))}
                </ul>
                <button onClick={() => selectOffer(o.id)} style={{
                  background: '#0284c7', color: 'white', border: 'none', borderRadius: 8,
                  padding: '10px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                }}>
                  {o.cta[lang]}
                </button>
              </div>
            ))}
          </div>

          {/* Formulaire lead */}
          <div id="pro-lead-form" style={{
            background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14,
            padding: '26px 26px 24px', maxWidth: 640, margin: '0 auto', scrollMarginTop: 90,
          }}>
            <div style={{ fontWeight: 800, fontSize: 19, color: '#0f172a' }}>{t.formTitle}</div>
            <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 4, marginBottom: 18 }}>{t.formSub}</div>

            {sent ? (
              <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', color: '#15803d', fontWeight: 600, fontSize: 14 }}>
                {t.thanks}
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{t.offer}</label>
                  <select value={offer} onChange={e => setOffer(e.target.value as Offer)} style={inputStyle}>
                    {(Object.keys(t.offerOptions) as Offer[]).map(id => (
                      <option key={id} value={id}>{t.offerOptions[id]}</option>
                    ))}
                  </select>
                </div>
                <input type="text" value={organisation} onChange={e => setOrganisation(e.target.value)} placeholder={t.organisation} maxLength={200} style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder={t.nom} maxLength={200} required style={inputStyle} />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t.phone} maxLength={30} style={inputStyle} />
                </div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.email} maxLength={200} required style={inputStyle} />
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t.message} rows={4} maxLength={2000} style={{ ...inputStyle, resize: 'vertical' }} />
                {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}
                <button type="submit" disabled={busy} style={{
                  background: '#0284c7', color: 'white', border: 'none', borderRadius: 8,
                  padding: '12px 18px', fontSize: 14.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
                }}>
                  {busy ? t.sending : t.send}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
