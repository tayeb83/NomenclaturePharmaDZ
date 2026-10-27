'use client'

import { useId, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { CASBAH as C } from '@/lib/garde-ornaments'
import { ROLES, type TrainingRole } from '@/lib/training/validation.ts'
import { getCopy } from '@/lib/training/copy'

const DISPLAY = 'var(--font-display, Amiri, Georgia, serif)'

const champ: React.CSSProperties = { font: 'inherit', fontSize: 15.5, padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, background: 'white', width: '100%', boxSizing: 'border-box' }
const bouton: React.CSSProperties = { font: 'inherit', fontSize: 15.5, fontWeight: 700, padding: '10px 18px', borderRadius: 999, border: `2px solid ${C.brass}`, background: C.navy, color: C.brassLight, cursor: 'pointer' }

const TEXTES = {
  fr: {
    titre: 'Comparateur de deux médicaments',
    chapeau: 'Mettez deux médicaments côte à côte : substance, forme, dosage, laboratoire, prix, et interactions entre les deux selon le Thesaurus ANSM.',
    limite: 'Outil à accès limité : l\'équipe valide chaque demande, puis un lien de connexion vous est envoyé par e-mail. Pas de mot de passe. Le même compte donne accès à Dzair-Pharma Training.',
    demander: 'Demander l\'accès',
    envoyee: 'Demande envoyée. Dès qu\'elle est validée, un lien de connexion arrive par e-mail.',
    dejaTitre: 'Vous avez déjà un accès ?',
    dejaTexte: 'Recevez un lien de connexion à votre adresse e-mail.',
    recevoir: 'Recevoir un lien',
    lienEnvoye: 'Si cette adresse a un accès validé, un lien vient de lui être envoyé.',
    erreurs: { email: 'Adresse e-mail invalide.', role: 'Choisissez votre profil.', rate: 'Trop de tentatives. Réessayez plus tard.', serveur: 'Une erreur est survenue. Réessayez.', reseau: 'Connexion impossible. Vérifiez votre réseau.' },
  },
  ar: {
    titre: 'مقارنة بين دواءين',
    chapeau: 'ضع دواءين جنبًا إلى جنب: المادة الفعالة والشكل والجرعة والمخبر والثمن، والتداخلات بينهما حسب دليل ANSM.',
    limite: 'أداة بولوج محدود: يراجع الفريق كل طلب ثم يصلك رابط دخول عبر البريد الإلكتروني، دون كلمة مرور. الحساب نفسه يفتح الولوج إلى Dzair-Pharma Training.',
    demander: 'اطلب الولوج',
    envoyee: 'تم إرسال الطلب. بمجرد قبوله يصلك رابط الدخول عبر البريد الإلكتروني.',
    dejaTitre: 'لديك ولوج بالفعل؟',
    dejaTexte: 'احصل على رابط دخول على بريدك الإلكتروني.',
    recevoir: 'احصل على رابط',
    lienEnvoye: 'إذا كان لهذا العنوان ولوج مقبول فقد أُرسل إليه رابط الدخول للتو.',
    erreurs: { email: 'عنوان بريد إلكتروني غير صالح.', role: 'اختر صفتك.', rate: 'محاولات كثيرة. أعد المحاولة لاحقًا.', serveur: 'حدث خطأ. أعد المحاولة.', reseau: 'تعذر الاتصال. تحقق من الشبكة.' },
  },
} as const

type Erreur = keyof (typeof TEXTES)['fr']['erreurs']

export function AccesComparateur() {
  const { lang } = useLanguage()
  const t = TEXTES[lang]
  const form = getCopy(lang).form
  const uid = useId()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TrainingRole | ''>('')
  const [faculte, setFaculte] = useState('')
  const [piege, setPiege] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [envoyee, setEnvoyee] = useState(false)
  const [erreur, setErreur] = useState<Erreur | null>(null)

  const [emailLien, setEmailLien] = useState('')
  const [lienOccupe, setLienOccupe] = useState(false)
  const [lienEnvoye, setLienEnvoye] = useState(false)
  const [lienErreur, setLienErreur] = useState<Erreur | null>(null)

  async function demander(e: React.FormEvent) {
    e.preventDefault()
    if (occupe) return
    setErreur(null)
    if (!role) { setErreur('role'); return }
    setOccupe(true)
    try {
      const res = await fetch('/api/training/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, faculte, website: piege, origine: 'comparateur' }),
      })
      if (res.ok) { setEnvoyee(true); return }
      const json = await res.json().catch(() => ({}))
      setErreur(res.status === 429 ? 'rate' : json?.error === 'email' ? 'email' : json?.error === 'role' ? 'role' : 'serveur')
    } catch {
      setErreur('reseau')
    } finally {
      setOccupe(false)
    }
  }

  async function recevoirLien(e: React.FormEvent) {
    e.preventDefault()
    if (lienOccupe) return
    setLienErreur(null)
    setLienOccupe(true)
    try {
      const res = await fetch('/api/training/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLien, suite: 'comparateur' }),
      })
      if (res.ok) { setLienEnvoye(true); return }
      setLienErreur(res.status === 429 ? 'rate' : 'serveur')
    } catch {
      setLienErreur('reseau')
    } finally {
      setLienOccupe(false)
    }
  }

  const carte: React.CSSProperties = { background: 'white', border: `1.5px solid ${C.brass}`, borderRadius: 14, padding: '18px 20px', display: 'grid', gap: 12, alignContent: 'start' }

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ display: 'grid', gap: 18 }}>
      <div style={{ background: C.navyDeep, color: 'white', borderRadius: 14, padding: '18px 22px', border: `2px solid ${C.brass}` }}>
        <h2 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 28, color: C.brassLight }}>{t.titre}</h2>
        <p style={{ margin: '6px 0 0', fontSize: 15, color: 'rgba(255,255,255,.9)', lineHeight: 1.7 }}>{t.chapeau}</p>
      </div>
      <p style={{ margin: 0, fontSize: 14.5, color: C.muted, lineHeight: 1.7 }}>{t.limite}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
        <form onSubmit={demander} noValidate style={carte}>
          {envoyee ? (
            <p role="status" style={{ margin: 0, fontWeight: 700, color: C.navy, lineHeight: 1.7 }}>{t.envoyee}</p>
          ) : (
            <>
              <h3 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 22, color: C.navy }}>{t.demander}</h3>
              <label style={{ display: 'grid', gap: 4, fontSize: 14, fontWeight: 700 }}>
                {form.email}
                <input type="email" inputMode="email" autoComplete="email" required maxLength={254} dir="ltr" value={email} onChange={e => setEmail(e.target.value)} placeholder={form.emailPlaceholder} style={champ} />
              </label>
              <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'grid', gap: 6 }}>
                <legend style={{ fontSize: 14, fontWeight: 700, padding: 0, marginBottom: 4 }}>{form.role}</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ROLES.map(r => (
                    <label key={`${uid}-${r}`} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '5px 12px', borderRadius: 999, border: `1.5px solid ${role === r ? C.brass : C.creamEdge}`, background: role === r ? C.cream : 'white', cursor: 'pointer', fontSize: 14.5 }}>
                      <input type="radio" name={`${uid}-role`} value={r} checked={role === r} onChange={() => setRole(r)} />
                      {form.roles[r]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label style={{ display: 'grid', gap: 4, fontSize: 14, fontWeight: 700 }}>
                <span>{form.faculte} <span style={{ fontWeight: 400, color: C.muted }}>({form.optional})</span></span>
                <input type="text" autoComplete="organization" maxLength={120} value={faculte} onChange={e => setFaculte(e.target.value)} placeholder={form.facultePlaceholder} style={champ} />
              </label>
              {/* piège à robots : hors écran */}
              <div aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
                <label>Site web<input type="text" tabIndex={-1} autoComplete="off" value={piege} onChange={e => setPiege(e.target.value)} /></label>
              </div>
              <div role="alert" aria-live="assertive" style={{ color: '#9b1c1c', fontSize: 14, minHeight: 18 }}>{erreur ? t.erreurs[erreur] : ''}</div>
              <button type="submit" disabled={occupe} style={bouton}>{occupe ? form.sending : t.demander}</button>
            </>
          )}
        </form>

        <form onSubmit={recevoirLien} noValidate style={carte}>
          <h3 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 22, color: C.navy }}>{t.dejaTitre}</h3>
          <p style={{ margin: 0, fontSize: 14.5, color: C.muted }}>{t.dejaTexte}</p>
          <label style={{ display: 'grid', gap: 4, fontSize: 14, fontWeight: 700 }}>
            {form.email}
            <input type="email" inputMode="email" autoComplete="email" required maxLength={254} dir="ltr" value={emailLien} onChange={e => setEmailLien(e.target.value)} placeholder={form.emailPlaceholder} style={champ} />
          </label>
          <div role="alert" aria-live="assertive" style={{ color: '#9b1c1c', fontSize: 14, minHeight: 18 }}>{lienErreur ? t.erreurs[lienErreur] : ''}</div>
          <div aria-live="polite">{lienEnvoye && <p style={{ margin: 0, fontWeight: 700, color: C.teal, lineHeight: 1.7 }}>{t.lienEnvoye}</p>}</div>
          <button type="submit" disabled={lienOccupe} style={bouton}>{lienOccupe ? form.sending : t.recevoir}</button>
        </form>
      </div>
    </div>
  )
}
