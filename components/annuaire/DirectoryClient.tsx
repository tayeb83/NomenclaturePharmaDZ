'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Lang } from '@/lib/i18n'
import { labels } from './labels'
import { StatusPill } from './StatusPill'
import { StateMedal } from './StateMedal'
import { useNow } from './useNow'
import { computeStatus, gardeLaterToday, isAvailableNow } from '@/lib/annuaire-hours'
import { displayName, formatPhoneDisplay, pharmacyPath, type ListPharmacy } from '@/lib/annuaire-types'
import type { MapPin } from './AnnuaireMap'

const AnnuaireMap = dynamic(() => import('./AnnuaireMap'), { ssr: false })

export type CommuneOption = { slug: string; name_fr: string; name_ar: string | null; count: number }

type Props = {
  lang: Lang
  pharmacies: ListPharmacy[]
  /** Rendu serveur : sert d'heure initiale pour éviter un écart d'hydratation. */
  renderedAt: number
  /** Liste des communes (page wilaya) ; vide sur une page commune. */
  communes: CommuneOption[]
}

/** Minuscules, sans accents ni voyelles brèves arabes : « Saïda » = « saida ». */
function norm(s: string | null | undefined): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ًͯ-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type Sort = 'name' | 'open' | 'distance'

/** Lignes affichées d'un coup : au-delà, « Afficher plus » (la page reste légère sur Alger, Oran…). */
const PAGE_SIZE = 60

export function DirectoryClient({ lang, pharmacies, renderedAt, communes }: Props) {
  const t = labels(lang)
  const now = useNow(renderedAt)
  const [q, setQ] = useState('')
  const [commune, setCommune] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [onlyGarde, setOnlyGarde] = useState(false)
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [sort, setSort] = useState<Sort>('name')
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [toast, setToast] = useState('')
  const [ready, setReady] = useState(false)
  const [limit, setLimit] = useState(PAGE_SIZE)

  // Les filtres vivent dans l'URL (?q=…&garde=1) : une recherche se partage
  // par simple copie du lien. Lecture au montage seulement, pour que le HTML
  // serveur (liste complète, indexable) reste identique à l'hydratation.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    setQ(sp.get('q') || '')
    setCommune(sp.get('commune') || '')
    setOnlyOpen(sp.get('ouvert') === '1')
    setOnlyGarde(sp.get('garde') === '1')
    setOnlyVerified(sp.get('verifie') === '1')
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    const sp = new URLSearchParams()
    if (q.trim()) sp.set('q', q.trim())
    if (commune) sp.set('commune', commune)
    if (onlyOpen) sp.set('ouvert', '1')
    if (onlyGarde) sp.set('garde', '1')
    if (onlyVerified) sp.set('verifie', '1')
    const qs = sp.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [ready, q, commune, onlyOpen, onlyGarde, onlyVerified])

  const flash = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 1800)
  }, [])

  function locate() {
    if (!navigator.geolocation) { flash(t.locationDenied); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      p => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setSort('distance'); setLocating(false) },
      () => { flash(t.locationDenied); setLocating(false) },
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  const rows = useMemo(() => {
    const needle = norm(q.trim())
    const list = pharmacies
      .map(p => ({
        p,
        status: computeStatus(p.hours, p.garde, now),
        gardeAt: gardeLaterToday(p.garde, now),
        km: pos && p.lat != null && p.lng != null ? haversineKm(pos.lat, pos.lng, p.lat, p.lng) : null,
      }))
      .filter(({ p, status, gardeAt }) => {
        if (commune && p.commune_slug !== commune) return false
        if (onlyGarde && status.state !== 'garde' && !gardeAt) return false
        if (onlyOpen && !isAvailableNow(status)) return false
        if (onlyVerified && !p.verified) return false
        if (!needle) return true
        return norm([p.name_fr, p.name_ar, p.address_fr, p.address_ar, p.commune_name_fr, p.commune_name_ar].join(' ')).includes(needle)
      })
    const rank = { garde: 0, open: 1, closing: 2, closed: 3 } as const
    list.sort((a, b) => {
      if (sort === 'distance' && a.km != null && b.km != null) return a.km - b.km
      if (sort === 'open') return rank[a.status.state] - rank[b.status.state] || displayName(a.p, lang).localeCompare(displayName(b.p, lang))
      return displayName(a.p, lang).localeCompare(displayName(b.p, lang), lang)
    })
    return list
  }, [pharmacies, q, commune, onlyOpen, onlyGarde, onlyVerified, sort, pos, now, lang])

  const pins: MapPin[] = rows
    .filter(r => r.p.lat != null && r.p.lng != null)
    .map(r => ({
      id: r.p.id, lat: r.p.lat as number, lng: r.p.lng as number,
      name: displayName(r.p, lang), href: pharmacyPath(r.p, lang), state: r.status.state,
    }))

  // Nouveau filtre ou nouveau tri : on repart du début de liste.
  useEffect(() => { setLimit(PAGE_SIZE) }, [q, commune, onlyOpen, onlyGarde, onlyVerified, sort])

  const filtered = q.trim() || commune || onlyOpen || onlyGarde || onlyVerified
  function reset() { setQ(''); setCommune(''); setOnlyOpen(false); setOnlyGarde(false); setOnlyVerified(false) }

  async function copyLink() {
    const url = window.location.href
    try { await navigator.clipboard.writeText(url); flash(t.linkCopied) } catch { flash(url) }
  }

  return (
    <div className="an-split">
      <aside className="an-rail" aria-label={t.search}>
      <div className="an-bar" role="search">
        <input
          type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder={t.searchPh} aria-label={t.search} autoComplete="off"
        />
        {communes.length > 1 ? (
          <select value={commune} onChange={e => setCommune(e.target.value)} aria-label={t.commune}>
            <option value="">{t.allCommunes}</option>
            {communes.map(c => (
              <option key={c.slug} value={c.slug}>{(lang === 'ar' ? c.name_ar || c.name_fr : c.name_fr)} ({c.count})</option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="an-chips">
        <button type="button" className="an-chip" aria-pressed={onlyOpen} onClick={() => setOnlyOpen(v => !v)}>{t.onlyOpen}</button>
        <button type="button" className="an-chip garde" aria-pressed={onlyGarde} onClick={() => setOnlyGarde(v => !v)}>{t.onlyGarde}</button>
        <button type="button" className="an-chip" aria-pressed={onlyVerified} onClick={() => setOnlyVerified(v => !v)}>{t.onlyVerified}</button>
        <button type="button" className="an-chip" aria-pressed={sort === 'distance'} onClick={locate} disabled={locating}>
          {locating ? t.locating : `📍 ${t.nearMe}`}
        </button>
        <button type="button" className="an-chip" aria-pressed={sort === 'open'} onClick={() => setSort(s => (s === 'open' ? 'name' : 'open'))}>{t.sortOpen}</button>
      </div>

      </aside>

      <div style={{ minWidth: 0 }}>
      <div className="an-count">
        <strong aria-live="polite">{t.count(rows.length)}</strong>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filtered && <button type="button" className="an-chip link" onClick={reset}>{t.reset}</button>}
          {filtered && <button type="button" className="an-chip link" onClick={copyLink}>🔗 {t.copyLink}</button>}
          {pins.length > 0 && (
            <button type="button" className="an-chip link" onClick={() => setShowMap(v => !v)}>
              🗺 {showMap ? t.hideMap : t.showMap}
            </button>
          )}
        </span>
      </div>

      {showMap && pins.length > 0 && (
        <div className="an-map"><AnnuaireMap pins={pins} userPos={pos} openLabel={t.seeCard} /></div>
      )}

      {rows.length === 0 ? (
        <div className="alert-banner info">{t.none}</div>
      ) : (
        <div className="an-list">
          {rows.slice(0, limit).map(({ p, status, gardeAt, km }) => {
            const name = displayName(p, lang)
            const other = lang === 'ar' ? p.name_fr : p.name_ar
            const href = pharmacyPath(p, lang)
            const hl = lang === 'ar' ? p.highlight_ar || p.highlight_fr : p.highlight_fr || p.highlight_ar
            const address = lang === 'ar' ? p.address_ar || p.address_fr : p.address_fr || p.address_ar
            const phone = formatPhoneDisplay(p.phone_e164, p.phone_raw)
            return (
              <article key={p.id} className={`an-card${p.is_premium ? ' premium' : ''}`}>
                <StateMedal state={status.state} size={50} />
                <div style={{ minWidth: 0 }}>
                  <h3>
                    <a href={href}>{name}</a>
                    {p.verified && <span className="an-pill verified">✓ {t.verified}</span>}
                  </h3>
                  {other && other !== name && (
                    <div className="an-sub">
                      <bdi dir={lang === 'ar' ? 'ltr' : 'rtl'} lang={lang === 'ar' ? 'fr' : 'ar'}>{other}</bdi>
                    </div>
                  )}
                  <div className="an-sub">
                    {address}{address ? ' · ' : ''}{lang === 'ar' ? p.commune_name_ar || p.commune_name_fr : p.commune_name_fr}
                    {km != null && ` · ${km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' ' + t.km}`}
                  </div>
                  {hl && <div className="an-sub" style={{ color: '#047857' }}>{hl}</div>}
                  <div className="an-meta">
                    <StatusPill status={status} t={t} />
                    {status.state !== 'garde' && gardeAt && <span className="an-pill garde">{t.gardeLater(gardeAt)}</span>}
                  </div>
                </div>
                <div className="an-side">
                  {p.phone_e164 ? (
                    <a className="an-btn" href={`tel:${p.phone_e164}`} aria-label={`${t.call} ${name}`}>
                      📞 <span className="an-tel">{phone}</span>
                    </a>
                  ) : null}
                  <a className="an-btn ghost" href={href}>{t.seeCard}</a>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {rows.length > limit && (
        <p style={{ textAlign: 'center', marginTop: 14 }}>
          <button type="button" className="an-btn ghost" onClick={() => setLimit(l => l + PAGE_SIZE)}>
            {t.showMore} ({rows.length - limit})
          </button>
        </p>
      )}
      </div>
      {toast && <div className="an-toast" role="status">{toast}</div>}
    </div>
  )
}
