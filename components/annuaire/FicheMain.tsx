'use client'

import { useEffect, useState } from 'react'
import type { Lang } from '@/lib/i18n'
import type { DirectoryPharmacy } from '@/lib/annuaire'
import { displayName, formatPhoneDisplay, pharmacyPath } from '@/lib/annuaire-types'
import { algiersParts, computeStatus, effectiveHours, formatAlgiersTime, gardeLaterToday, WEEK_ORDER } from '@/lib/annuaire-hours'
import { labels } from './labels'
import { StatusPill } from './StatusPill'
import { StateMedal } from './StateMedal'
import { useNow } from './useNow'

function mapsHref(p: DirectoryPharmacy) {
  const query = p.lat != null && p.lng != null
    ? `${p.lat},${p.lng}`
    : [p.name_fr || p.name_ar, p.address_fr || p.address_ar, p.commune_name_fr].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function dayMonth(ms: number) {
  const d = new Date(ms + 3600_000)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function FicheMain({ pharmacy: p, lang, renderedAt }: { pharmacy: DirectoryPharmacy; lang: Lang; renderedAt: number }) {
  const t = labels(lang)
  const now = useNow(renderedAt)
  const [toast, setToast] = useState('')
  const status = computeStatus(p.hours, p.garde, now)
  const gardeAt = status.state === 'garde' ? null : gardeLaterToday(p.garde, now)
  const name = displayName(p, lang)
  const other = lang === 'ar' ? p.name_fr : p.name_ar
  const hours = effectiveHours(p.hours)
  const today = algiersParts(now).weekday
  const hl = lang === 'ar' ? p.highlight_ar || p.highlight_fr : p.highlight_fr || p.highlight_ar
  const hoursText = lang === 'ar' ? p.hours_ar || p.hours_fr : p.hours_fr || p.hours_ar
  const address = lang === 'ar' ? p.address_ar || p.address_fr : p.address_fr || p.address_ar
  const phone = formatPhoneDisplay(p.phone_e164, p.phone_raw)
  const communeLabel = lang === 'ar' ? p.commune_name_ar || p.commune_name_fr : p.commune_name_fr
  const wilayaLabel = lang === 'ar' ? p.wilaya_name_ar || p.wilaya_name_fr : p.wilaya_name_fr
  const placeLine = communeLabel.trim().toLowerCase() === wilayaLabel.trim().toLowerCase()
    ? communeLabel
    : `${communeLabel}${lang === 'ar' ? '،' : ','} ${wilayaLabel}`
  const mobile = formatPhoneDisplay(p.mobile_e164, p.mobile_raw)
  const customHours = p.hours.opens != null || p.hours.closes != null || p.hours.closedDays.length > 0
  const wa = p.whatsapp_e164 ? p.whatsapp_e164.replace(/\D/g, '') : null

  // Compteur de consultations (statistique promise aux fiches premium) :
  // une seule fois par affichage, sans identifiant visiteur.
  useEffect(() => {
    fetch('/api/garde/view', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wilaya_code: p.wilaya_code, pharmacy_external_id: p.external_id }),
      keepalive: true,
    }).catch(() => {})
  }, [p.wilaya_code, p.external_id])

  function flash(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 1800)
  }

  async function copy(text: string, message: string) {
    try { await navigator.clipboard.writeText(text); flash(message) } catch { flash(text) }
  }

  async function share() {
    const url = `${window.location.origin}${pharmacyPath(p, lang)}`
    const nav = navigator as Navigator & { share?: (d: { title: string; url: string }) => Promise<void> }
    if (nav.share) {
      try { await nav.share({ title: name, url }); return } catch { /* annulé : on retombe sur la copie */ }
    }
    copy(url, t.linkCopied)
  }

  return (
    <div>
      <div className="an-panel an-fhead">
        <StateMedal state={status.state} size={72} />
        <div>
        <h1 className="an-h1" style={{ marginBottom: 4 }}>{name}</h1>
        {other && other !== name && (
          <div style={{ color: 'var(--slate-500)', fontSize: 18 }}>
            <bdi dir={lang === 'ar' ? 'ltr' : 'rtl'} lang={lang === 'ar' ? 'fr' : 'ar'}>{other}</bdi>
          </div>
        )}
        <div className="an-meta" style={{ marginTop: 12 }}>
          <StatusPill status={status} t={t} />
          {gardeAt && <span className="an-pill garde">{t.gardeLater(gardeAt)}</span>}
          {p.verified && <span className="an-pill verified">✓ {t.verified}</span>}
          {p.is_premium && <span className="an-pill plain" style={{ color: '#b45309' }}>★ {t.premium}</span>}
        </div>
        {hl && <div className="an-hl">{hl}</div>}
        <div className="an-actions">
          {p.phone_e164 && <a className="an-btn big" href={`tel:${p.phone_e164}`}>📞 {t.call}</a>}
          {wa && <a className="an-btn big wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">💬 {t.whatsapp}</a>}
          <a className="an-btn big ghost" href={mapsHref(p)} target="_blank" rel="noopener noreferrer">🧭 {t.route}</a>
          <button type="button" className="an-btn big ghost" onClick={share}>↗ {t.share}</button>
        </div>
        </div>
      </div>

      <div className="an-panel">
        <h2>{t.address} · {t.phone}</h2>
        <dl className="an-dl">
          <dt>{t.address}</dt>
          <dd>
            {address && <div>{address}</div>}
            <div style={{ color: 'var(--slate-500)', fontSize: 13.5 }}>
              {placeLine}
            </div>
          </dd>
          {p.phone_e164 && (
            <>
              <dt>{t.phone}</dt>
              <dd>
                <a href={`tel:${p.phone_e164}`} className="an-tel" style={{ fontWeight: 600 }}>{phone}</a>{' '}
                <button type="button" className="an-chip link" style={{ padding: '2px 10px', fontSize: 12 }}
                  onClick={() => copy(phone, t.numberCopied)}>{t.copyNumber}</button>
              </dd>
            </>
          )}
          {p.mobile_e164 && (
            <>
              <dt>{t.mobile}</dt>
              <dd>
                <a href={`tel:${p.mobile_e164}`} className="an-tel" style={{ fontWeight: 600 }}>{mobile}</a>{' '}
                <button type="button" className="an-chip link" style={{ padding: '2px 10px', fontSize: 12 }}
                  onClick={() => copy(mobile, t.numberCopied)}>{t.copyNumber}</button>
              </dd>
            </>
          )}
        </dl>
      </div>

      <div className="an-panel">
        <h2>{t.hours}</h2>
        {hoursText && <p style={{ margin: '0 0 10px', fontSize: 14.5 }}><strong>{t.hoursText} : </strong>{hoursText}</p>}
        <table className="an-hours">
          <tbody>
            {WEEK_ORDER.map(d => {
              const off = p.hours.closedDays.includes(d)
              return (
                <tr key={d} className={`${d === today ? 'today' : ''} ${off ? 'off' : ''}`}>
                  <td>{t.weekdays[d]}{d === today ? ` · ${t.today}` : ''}</td>
                  <td><bdi dir="ltr" className="an-tel">{off ? t.closedDay : `${hours.opens} – ${hours.closes}`}</bdi></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p style={{ fontSize: 12.5, color: 'var(--slate-500)', margin: '10px 0 0' }}>
          {customHours ? t.hoursNote : t.hoursDefaultNote}
        </p>
      </div>

      <div className="an-panel">
        <h2>{t.gardeTitle}</h2>
        {p.garde.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--slate-500)' }}>{t.gardeNone}</p>
        ) : (
          <div className="an-gardes">
            {p.garde.slice(0, 12).map(([s, e]) => {
              const wd = algiersParts(s).weekday
              return (
                <div key={s}>
                  <bdi dir="ltr" className="an-tel">
                    {t.gardeLine(`${t.weekdays[wd]} ${dayMonth(s)}`, formatAlgiersTime(s), formatAlgiersTime(e))}
                  </bdi>
                </div>
              )
            })}
          </div>
        )}
        <p style={{ fontSize: 12.5, color: 'var(--slate-500)', margin: '10px 0 0' }}>{t.gardeNote}</p>
      </div>
      {toast && <div className="an-toast" role="status">{toast}</div>}
    </div>
  )
}
