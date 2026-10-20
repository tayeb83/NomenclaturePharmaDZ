'use client'

import { useState } from 'react'
import type { Lang } from '@/lib/i18n'
import { ALGERIA_WILAYAS } from '@/lib/wilayas'

const LABELS = {
  fr: {
    title: 'Vous cherchez ce médicament en Algérie ?',
    sub: 'Signalez anonymement votre expérience : elle aide à mieux comprendre les difficultés d’accès.',
    introuvable: 'Je ne l’ai pas trouvé en pharmacie',
    prix: 'Je l’ai trouvé, mais à un prix inattendu',
    trouve: 'Je l’ai trouvé en pharmacie',
    wilaya: 'Dans quelle wilaya ?',
    choose: 'Choisir…',
    count: 'Combien de pharmacies avez-vous consultées ?',
    p1: '1', p2: '2 à 3', p3: '4 ou plus',
    preview: 'Prévisualiser mon signalement',
    recap: 'Votre signalement',
    send: 'Envoyer', back: 'Modifier', sending: 'Envoi…',
    thanks: '✓ Merci ! Votre signalement anonyme a été enregistré.',
    failed: 'Échec de l’envoi, réessayez.',
    note: 'Aucune donnée personnelle n’est collectée. Il s’agit de déclarations de visiteurs, pas d’une mesure officielle des stocks.',
    pharm: (n: string) => `${n} pharmacie(s) consultée(s)`,
  },
  ar: {
    title: 'هل تبحث عن هذا الدواء في الجزائر؟',
    sub: 'شارك تجربتك بشكل مجهول: تساعدنا على فهم صعوبات الحصول على الأدوية.',
    introuvable: 'لم أجده في الصيدلية',
    prix: 'وجدته ولكن بسعر غير متوقع',
    trouve: 'وجدته في الصيدلية',
    wilaya: 'في أي ولاية؟',
    choose: 'اختر…',
    count: 'كم صيدلية زرت؟',
    p1: '1', p2: '2 إلى 3', p3: '4 أو أكثر',
    preview: 'معاينة بلاغي',
    recap: 'بلاغك',
    send: 'إرسال', back: 'تعديل', sending: 'جارٍ الإرسال…',
    thanks: '✓ شكرًا! تم تسجيل بلاغك المجهول.',
    failed: 'فشل الإرسال، حاول مرة أخرى.',
    note: 'لا يتم جمع أي بيانات شخصية. هذه تصريحات من الزوار وليست قياسًا رسميًا للمخزون.',
    pharm: (n: string) => `${n} صيدلية تمت زيارتها`,
  },
}

type SignalType = 'introuvable' | 'prix_inattendu' | 'trouve'
type Bucket = '1' | '2-3' | '4+'

const box: React.CSSProperties = {
  marginTop: 24, padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc',
}
const input: React.CSSProperties = {
  border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', fontSize: 14, background: '#fff', minWidth: 200,
}
const chip = (active: boolean): React.CSSProperties => ({
  border: `1px solid ${active ? '#2563eb' : '#cbd5e1'}`, background: active ? '#eff6ff' : '#fff',
  color: active ? '#1d4ed8' : '#334155', borderRadius: 999, padding: '7px 14px', fontSize: 13.5,
  fontWeight: 600, cursor: 'pointer',
})

export function AccesSignalement({
  lang, medSource, medId, medName, dci,
}: {
  lang: Lang; medSource: string; medId: number; medName: string; dci: string | null
}) {
  const t = LABELS[lang]
  const [type, setType] = useState<SignalType | null>(null)
  const [wilaya, setWilaya] = useState('')
  const [bucket, setBucket] = useState<Bucket | null>(null)
  const [step, setStep] = useState<'form' | 'preview' | 'done'>('form')
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState(false)

  const typeLabel = type === 'introuvable' ? t.introuvable : type === 'prix_inattendu' ? t.prix : t.trouve
  const w = ALGERIA_WILAYAS.find(x => x.code === wilaya)
  const wLabel = w ? `${w.code} - ${lang === 'ar' ? w.name_ar : w.name_fr}` : ''
  const ready = !!type && !!wilaya && !!bucket

  async function send() {
    setBusy(true); setFail(false)
    try {
      const res = await fetch('/api/acces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          med_source: medSource, med_id: medId, med_name: medName, dci,
          wilaya_code: wilaya, signal_type: type, pharmacies: bucket,
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setStep('done')
    } catch {
      setFail(true)
    } finally {
      setBusy(false)
    }
  }

  if (step === 'done') return <div style={box}><strong>{t.thanks}</strong></div>

  return (
    <section style={box} aria-label="NAQESS">
      <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{t.title}</div>
      <p style={{ margin: '4px 0 12px', fontSize: 13.5, color: '#475569' }}>{t.sub}</p>

      {step === 'form' ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {([['introuvable', t.introuvable], ['prix_inattendu', t.prix], ['trouve', t.trouve]] as const).map(([k, l]) => (
              <button key={k} type="button" style={chip(type === k)} aria-pressed={type === k} onClick={() => setType(k)}>{l}</button>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 13.5, fontWeight: 600 }}>{t.wilaya}{' '}
              <select style={input} value={wilaya} onChange={e => setWilaya(e.target.value)}>
                <option value="">{t.choose}</option>
                {ALGERIA_WILAYAS.map(x => (
                  <option key={x.code} value={x.code}>{x.code} - {lang === 'ar' ? x.name_ar : x.name_fr}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>{t.count}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['1', t.p1], ['2-3', t.p2], ['4+', t.p3]] as const).map(([k, l]) => (
                <button key={k} type="button" style={chip(bucket === k)} aria-pressed={bucket === k} onClick={() => setBucket(k)}>{l}</button>
              ))}
            </div>
          </div>
          <button type="button" disabled={!ready} onClick={() => setStep('preview')}
            style={{ ...chip(true), marginTop: 16, background: ready ? '#2563eb' : '#cbd5e1', color: '#fff', border: 'none', cursor: ready ? 'pointer' : 'not-allowed' }}>
            {t.preview}
          </button>
        </>
      ) : (
        <>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 14 }}>
            <div style={{ fontWeight: 700 }}>{t.recap}</div>
            <div>{medName}{dci ? ` · ${dci}` : ''}</div>
            <div>{typeLabel}</div>
            <div>{wLabel} · {t.pharm(bucket === '1' ? t.p1 : bucket === '2-3' ? t.p2 : t.p3)}</div>
          </div>
          {fail && <p style={{ color: '#b91c1c', fontSize: 13 }}>{t.failed}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" style={chip(false)} onClick={() => setStep('form')} disabled={busy}>{t.back}</button>
            <button type="button" style={{ ...chip(true), background: '#2563eb', color: '#fff' }} onClick={send} disabled={busy}>
              {busy ? t.sending : t.send}
            </button>
          </div>
        </>
      )}
      <p style={{ margin: '12px 0 0', fontSize: 12, color: '#64748b' }}>{t.note}</p>
    </section>
  )
}
