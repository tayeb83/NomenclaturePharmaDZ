'use client'

import { useState } from 'react'
import type { Lang } from '@/lib/i18n'

const LABELS = {
  fr: {
    confirm: '✔ Ouverte, je confirme',
    confirmed: '✓ Merci !',
    reportError: '⚠ Signaler une erreur',
    claim: '🏪 C\'est ma pharmacie',
    errorPlaceholder: 'Décrivez l\'erreur (horaire, adresse, téléphone, pharmacie fermée…)',
    contactPlaceholder: 'Contact (facultatif : téléphone ou email)',
    send: 'Envoyer',
    cancel: 'Annuler',
    sending: 'Envoi…',
    thanks: '✓ Merci, votre signalement a bien été transmis.',
    claimIntro: 'Vous êtes le/la pharmacien(ne) titulaire ? Revendiquez votre fiche pour mettre à jour vous-même horaires, garde, téléphone et WhatsApp.',
    claimName: 'Nom et prénom du pharmacien *',
    claimPhone: 'Téléphone *',
    claimWhatsapp: 'WhatsApp',
    claimEmail: 'Email',
    claimMessage: 'Message (facultatif)',
    claimSend: 'Revendiquer ma fiche',
    claimThanks: '✓ Demande transmise. Nous vous contactons pour vérification, puis vous pourrez mettre à jour votre fiche.',
    failed: 'Échec de l\'envoi, réessayez.',
  },
  ar: {
    confirm: '✔ مفتوحة، أؤكد',
    confirmed: '✓ شكرًا!',
    reportError: '⚠ الإبلاغ عن خطأ',
    claim: '🏪 هذه صيدليتي',
    errorPlaceholder: 'صف الخطأ (التوقيت، العنوان، الهاتف، الصيدلية مغلقة…)',
    contactPlaceholder: 'وسيلة اتصال (اختياري: هاتف أو بريد إلكتروني)',
    send: 'إرسال',
    cancel: 'إلغاء',
    sending: 'جارٍ الإرسال…',
    thanks: '✓ شكرًا، تم إرسال البلاغ.',
    claimIntro: 'هل أنت الصيدلي(ة) صاحب(ة) الصيدلية؟ اطلب إدارة صفحتك لتحديث التوقيت والمناوبة والهاتف والواتساب بنفسك.',
    claimName: 'اسم ولقب الصيدلي *',
    claimPhone: 'الهاتف *',
    claimWhatsapp: 'واتساب',
    claimEmail: 'البريد الإلكتروني',
    claimMessage: 'رسالة (اختياري)',
    claimSend: 'طلب إدارة صفحتي',
    claimThanks: '✓ تم إرسال الطلب. سنتصل بك للتحقق، ثم يمكنك تحديث صفحتك.',
    failed: 'فشل الإرسال، حاول مرة أخرى.',
  },
}

type Panel = 'none' | 'error' | 'claim'

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--slate-200, #e2e8f0)', borderRadius: 8,
  padding: '8px 10px', fontSize: 13, background: '#fff',
}

const smallBtnStyle = (accent?: boolean): React.CSSProperties => ({
  background: accent ? 'var(--blue, #2563eb)' : '#fff',
  border: `1px solid ${accent ? 'var(--blue, #2563eb)' : 'var(--slate-200, #e2e8f0)'}`,
  color: accent ? '#fff' : 'var(--slate-600, #475569)',
  borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
})

export function GardeFeedback({
  lang,
  wilayaCode,
  communeCode,
  pharmacyExternalId,
  pharmacyName,
}: {
  lang: Lang
  wilayaCode: string
  communeCode: string
  pharmacyExternalId: string | null
  pharmacyName: string
}) {
  const t = LABELS[lang]
  const [panel, setPanel] = useState<Panel>('none')
  const [busy, setBusy] = useState(false)
  const [confirmState, setConfirmState] = useState<'idle' | 'done'>('idle')
  const [sentPanel, setSentPanel] = useState<Panel>('none')
  const [failMsg, setFailMsg] = useState('')

  const [errorMessage, setErrorMessage] = useState('')
  const [errorContact, setErrorContact] = useState('')

  const [claimName, setClaimName] = useState('')
  const [claimPhone, setClaimPhone] = useState('')
  const [claimWhatsapp, setClaimWhatsapp] = useState('')
  const [claimEmail, setClaimEmail] = useState('')
  const [claimMessage, setClaimMessage] = useState('')

  const basePayload = {
    wilaya_code: wilayaCode,
    commune_code: communeCode,
    pharmacy_external_id: pharmacyExternalId,
    pharmacy_name: pharmacyName,
  }

  async function post(url: string, payload: object): Promise<boolean> {
    setBusy(true)
    setFailMsg('')
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(String(res.status))
      return true
    } catch {
      setFailMsg(t.failed)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function confirmOpen() {
    if (confirmState === 'done' || busy) return
    const ok = await post('/api/garde/report', { ...basePayload, report_type: 'confirme_ouverte' })
    if (ok) setConfirmState('done')
  }

  async function submitError(e: React.FormEvent) {
    e.preventDefault()
    if (!errorMessage.trim()) return
    const ok = await post('/api/garde/report', {
      ...basePayload,
      report_type: 'erreur',
      message: errorMessage,
      contact: errorContact || undefined,
    })
    if (ok) { setSentPanel('error'); setPanel('none') }
  }

  async function submitClaim(e: React.FormEvent) {
    e.preventDefault()
    if (!claimName.trim() || !claimPhone.trim()) return
    const ok = await post('/api/garde/claim', {
      ...basePayload,
      pharmacist_name: claimName,
      phone: claimPhone,
      whatsapp: claimWhatsapp || undefined,
      email: claimEmail || undefined,
      message: claimMessage || undefined,
    })
    if (ok) { setSentPanel('claim'); setPanel('none') }
  }

  return (
    <div style={{ marginTop: 12, borderTop: '1px dashed var(--slate-200, #e2e8f0)', paddingTop: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={confirmOpen} disabled={busy || confirmState === 'done'} style={{
          ...smallBtnStyle(false),
          color: confirmState === 'done' ? '#16a34a' : 'var(--slate-600, #475569)',
          borderColor: confirmState === 'done' ? '#bbf7d0' : 'var(--slate-200, #e2e8f0)',
          background: confirmState === 'done' ? '#f0fdf4' : '#fff',
        }}>
          {confirmState === 'done' ? t.confirmed : t.confirm}
        </button>
        <button type="button" onClick={() => setPanel(p => p === 'error' ? 'none' : 'error')} style={smallBtnStyle(false)}>
          {t.reportError}
        </button>
        <button type="button" onClick={() => setPanel(p => p === 'claim' ? 'none' : 'claim')} style={smallBtnStyle(false)}>
          {t.claim}
        </button>
      </div>

      {failMsg && <div style={{ marginTop: 8, fontSize: 12.5, color: '#b91c1c' }}>{failMsg}</div>}
      {sentPanel === 'error' && panel === 'none' && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: '#16a34a' }}>{t.thanks}</div>
      )}
      {sentPanel === 'claim' && panel === 'none' && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: '#16a34a' }}>{t.claimThanks}</div>
      )}

      {panel === 'error' && (
        <form onSubmit={submitError} style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <textarea
            value={errorMessage}
            onChange={e => setErrorMessage(e.target.value)}
            placeholder={t.errorPlaceholder}
            rows={3}
            maxLength={1000}
            required
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <input
            type="text"
            value={errorContact}
            onChange={e => setErrorContact(e.target.value)}
            placeholder={t.contactPlaceholder}
            maxLength={200}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={busy} style={smallBtnStyle(true)}>{busy ? t.sending : t.send}</button>
            <button type="button" onClick={() => setPanel('none')} style={smallBtnStyle(false)}>{t.cancel}</button>
          </div>
        </form>
      )}

      {panel === 'claim' && (
        <form onSubmit={submitClaim} style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12.5, color: 'var(--slate-600, #475569)', lineHeight: 1.5 }}>{t.claimIntro}</div>
          <input type="text" value={claimName} onChange={e => setClaimName(e.target.value)} placeholder={t.claimName} maxLength={200} required style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type="tel" value={claimPhone} onChange={e => setClaimPhone(e.target.value)} placeholder={t.claimPhone} maxLength={30} required style={inputStyle} />
            <input type="tel" value={claimWhatsapp} onChange={e => setClaimWhatsapp(e.target.value)} placeholder={t.claimWhatsapp} maxLength={30} style={inputStyle} />
          </div>
          <input type="email" value={claimEmail} onChange={e => setClaimEmail(e.target.value)} placeholder={t.claimEmail} maxLength={200} style={inputStyle} />
          <textarea value={claimMessage} onChange={e => setClaimMessage(e.target.value)} placeholder={t.claimMessage} rows={2} maxLength={1000} style={{ ...inputStyle, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={busy} style={smallBtnStyle(true)}>{busy ? t.sending : t.claimSend}</button>
            <button type="button" onClick={() => setPanel('none')} style={smallBtnStyle(false)}>{t.cancel}</button>
          </div>
        </form>
      )}
    </div>
  )
}
