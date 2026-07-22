'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { GardeShift, GardeCoverageEntry, GardeRosterMeta } from '@/lib/db-types'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import type { Lang } from '@/lib/i18n'

const GardeMap = dynamic(() => import('./GardeMap'), { ssr: false })

type Mode = 'now' | 'tonight' | 'friday' | 'month'

type GardeResponse = {
  current: GardeShift | null
  day_schedule: GardeShift[]
  coverage: GardeRosterMeta | null
}

type GardeMonthResponse = {
  month: string
  coverage: GardeRosterMeta | null
  data: GardeShift[]
}

function currentMonthStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit' })
    .format(new Date()).replace('/', '-')
}

function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month: string, lang: Lang = 'fr') {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, 1))
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
}

function formatDateShort(iso: string, lang: Lang = 'fr') {
  const d = new Date(iso + 'T00:00:00Z')
  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-FR'
  return {
    dnum: new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(d),
    dow: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(d),
    isFriday: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(d) === 'Fri',
  }
}

function algiersDateStr(d?: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(d || new Date())
}

function nextFridayStr() {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Algiers', weekday: 'short' })
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86400000)
    if (fmt.format(d) === 'Fri') return algiersDateStr(d)
  }
  return algiersDateStr(now)
}

function formatTimeRange(startsAt: string, endsAt: string) {
  const hm = (iso: string) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Algiers' }).format(new Date(iso))
  return `${hm(startsAt)} – ${hm(endsAt)}`
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km: number | null) {
  if (km == null) return null
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}

function displayName(shift: GardeShift, lang: Lang = 'fr') {
  if (lang === 'ar') return shift.name_ar || shift.name_fr || 'صيدلية'
  return shift.name_fr || shift.name_ar || 'Pharmacie'
}

function mapsHref(shift: GardeShift) {
  const query = (shift.lat != null && shift.lng != null)
    ? `${shift.lat},${shift.lng}`
    : [shift.name_fr || shift.name_ar, shift.address_fr || shift.address_ar].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function GardeClient({
  initialWilaya = '',
  initialCommune = '',
  initialMode = 'now',
  initialMonth = '',
}: {
  initialWilaya?: string
  initialCommune?: string
  initialMode?: Mode
  initialMonth?: string
} = {}) {
  const router = useRouter()
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => (lang === 'ar' ? ar : fr)
  const [coverage, setCoverage] = useState<GardeCoverageEntry[]>([])
  const [coverageLoading, setCoverageLoading] = useState(true)
  const [coverageError, setCoverageError] = useState('')
  const [wilaya, setWilaya] = useState(initialWilaya)
  const [commune, setCommune] = useState(initialCommune)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [data, setData] = useState<GardeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [monthStr, setMonthStr] = useState(isValidMonth(initialMonth) ? initialMonth : currentMonthStr())
  const [monthData, setMonthData] = useState<GardeMonthResponse | null>(null)
  const [monthLoading, setMonthLoading] = useState(false)
  const [monthError, setMonthError] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  // Couverture disponible — si wilaya/commune viennent d'un lien partagé,
  // on les garde (après vérification) plutôt que d'écraser par le 1er défaut.
  useEffect(() => {
    let cancelled = false
    setCoverageLoading(true)
    fetch('/api/garde/coverage')
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(json => {
        if (cancelled) return
        const rows: GardeCoverageEntry[] = json.data || []
        setCoverage(rows)
        const wilayaRows = initialWilaya ? rows.filter(r => r.wilaya_code === initialWilaya) : []
        if (wilayaRows.length > 0) {
          setWilaya(initialWilaya)
          const communeMatch = wilayaRows.some(r => r.commune_code === initialCommune)
          setCommune(communeMatch ? initialCommune : wilayaRows[0].commune_code)
        } else if (rows[0]) {
          setWilaya(rows[0].wilaya_code)
          setCommune(rows[0].commune_code)
        }
      })
      .catch(() => { if (!cancelled) setCoverageError(lang === 'ar' ? 'تعذّر تحميل المناطق المغطاة.' : 'Impossible de charger les zones couvertes.') })
      .finally(() => { if (!cancelled) setCoverageLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lien partageable : reflète toujours wilaya/commune/mode(/mois) dans l'URL,
  // pour que "aujourd'hui"/"vendredi prochain" restent calculés à l'ouverture
  // du lien, et que le mois choisi reste fixe.
  useEffect(() => {
    if (coverageLoading || !wilaya || !commune) return
    const params = new URLSearchParams({ wilaya, commune, mode })
    if (mode === 'month') params.set('month', monthStr)
    router.replace(`/garde?${params.toString()}`, { scroll: false })
  }, [wilaya, commune, mode, monthStr, coverageLoading, router])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1800)
    })
  }, [])

  // Géolocalisation (uniquement pour trier par distance / afficher un point sur la carte)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }, [])

  const wilayas = useMemo(() => {
    const seen = new Set<string>()
    return coverage.filter(c => {
      if (seen.has(c.wilaya_code)) return false
      seen.add(c.wilaya_code)
      return true
    })
  }, [coverage])

  const communes = useMemo(
    () => coverage.filter(c => c.wilaya_code === wilaya),
    [coverage, wilaya]
  )

  const fetchGarde = useCallback(async () => {
    if (!wilaya || !commune || mode === 'month') return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ wilaya, commune })
      if (mode === 'tonight') params.set('date', algiersDateStr())
      if (mode === 'friday') params.set('date', nextFridayStr())

      const res = await fetch(`/api/garde?${params}`)
      if (!res.ok) throw new Error('Erreur serveur')
      const json = await res.json()
      setData(json)
    } catch {
      setError(lang === 'ar' ? 'تعذّر تحميل صيدليات المناوبة.' : 'Impossible de charger les pharmacies de garde.')
    } finally {
      setLoading(false)
    }
  }, [wilaya, commune, mode, lang])

  useEffect(() => { fetchGarde() }, [fetchGarde])

  const fetchGardeMonth = useCallback(async () => {
    if (!wilaya || !commune || mode !== 'month') return
    setMonthLoading(true)
    setMonthError('')
    try {
      const res = await fetch(`/api/garde/month?${new URLSearchParams({ wilaya, commune, month: monthStr })}`)
      if (!res.ok) throw new Error('Erreur serveur')
      const json = await res.json()
      setMonthData(json)
    } catch {
      setMonthError(lang === 'ar' ? 'تعذّر تحميل برنامج الشهر.' : 'Impossible de charger le planning du mois.')
    } finally {
      setMonthLoading(false)
    }
  }, [wilaya, commune, mode, monthStr, lang])

  useEffect(() => { fetchGardeMonth() }, [fetchGardeMonth])

  const sortedSchedule = useMemo(() => {
    const rows = (data?.day_schedule || []).map(shift => ({
      shift,
      distanceKm: (userPos && shift.lat != null && shift.lng != null)
        ? haversineKm(userPos.lat, userPos.lng, shift.lat, shift.lng)
        : null,
    }))
    rows.sort((a, b) => {
      if (!!a.shift.active_now !== !!b.shift.active_now) return a.shift.active_now ? -1 : 1
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm
      if (a.distanceKm != null) return -1
      if (b.distanceKm != null) return 1
      return new Date(a.shift.starts_at).getTime() - new Date(b.shift.starts_at).getTime()
    })
    return rows
  }, [data, userPos])

  const communeEntry = communes.find(c => c.commune_code === commune)
  const communeName = (lang === 'ar' ? (communeEntry as any)?.commune_name_ar : undefined) || communeEntry?.commune_name_fr || ''

  return (
    <div>
      {/* Sélecteur wilaya / commune */}
      <div style={{
        background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 12,
        padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--slate-500)', marginBottom: 6, fontWeight: 600 }}>{t('Wilaya', 'الولاية')}</label>
          <select
            value={wilaya}
            onChange={e => {
              const newWilaya = e.target.value
              setWilaya(newWilaya)
              // Une seule commune disponible (cas le plus courant) : on la
              // sélectionne directement, sinon le <select> commune reste
              // désynchronisé de l'état tant que l'utilisateur ne le
              // touche pas lui-même — et fetchGarde() n'est jamais rappelé.
              const matches = coverage.filter(c => c.wilaya_code === newWilaya)
              setCommune(matches.length === 1 ? matches[0].commune_code : '')
            }}
            disabled={coverageLoading || wilayas.length === 0}
            style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', color: 'var(--navy)', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 180 }}
          >
            {wilayas.length === 0 && <option value="">{t('Aucune wilaya couverte', 'لا توجد ولاية مغطاة')}</option>}
            {wilayas.map(w => <option key={w.wilaya_code} value={w.wilaya_code}>{w.wilaya_name_fr}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--slate-500)', marginBottom: 6, fontWeight: 600 }}>{t('Commune', 'البلدية')}</label>
          <select
            value={commune}
            onChange={e => setCommune(e.target.value)}
            disabled={communes.length === 0}
            style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', color: 'var(--navy)', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 180 }}
          >
            <option value="">{t('Choisir une commune…', 'اختر بلدية…')}</option>
            {communes.map(c => <option key={c.commune_code} value={c.commune_code}>{c.commune_name_fr}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            ['now', t('Maintenant', 'الآن')],
            ['tonight', t('Cette nuit', 'هذه الليلة')],
            ['friday', t('Vendredi', 'الجمعة')],
            ['month', t('Vue du mois', 'عرض الشهر')],
          ] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? 'var(--blue)' : '#fff',
                border: `1px solid ${mode === m ? 'var(--blue)' : 'var(--slate-200)'}`,
                color: mode === m ? '#fff' : 'var(--slate-700)',
                borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {wilaya && commune && (
          <button
            onClick={copyLink}
            title={t('Copier un lien stable vers cette vue (wilaya, commune, période)', 'انسخ رابطاً ثابتاً لهذا العرض (الولاية، البلدية، الفترة)')}
            style={{
              background: linkCopied ? 'var(--green, #16a34a)' : '#fff',
              border: `1px solid ${linkCopied ? 'var(--green, #16a34a)' : 'var(--slate-200)'}`,
              color: linkCopied ? '#fff' : 'var(--slate-700)',
              borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            {linkCopied ? t('✓ Lien copié', '✓ تم نسخ الرابط') : t('🔗 Copier le lien', '🔗 نسخ الرابط')}
          </button>
        )}
      </div>

      {coverageError && <div className="alert-banner error">{coverageError}</div>}

      {!coverageLoading && wilayas.length === 0 && !coverageError && (
        <div className="alert-banner info">
          {t('Aucune wilaya n’est encore couverte pour le moment — revenez bientôt.', 'لا توجد أي ولاية مغطاة حالياً — عودوا قريباً.')}
        </div>
      )}

      {mode !== 'month' && error && <div className="alert-banner error">{error}</div>}

      {mode !== 'month' && loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--slate-600)', fontSize: 15 }}>{t('⏳ Chargement…', '⏳ جارٍ التحميل…')}</div>
      )}

      {mode !== 'month' && !loading && !error && data && (
        <>
          {/* Carte */}
          {(userPos || sortedSchedule.some(r => r.shift.lat != null)) && (
            <div style={{ height: 320, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--slate-200)', marginBottom: 20 }}>
              <GardeMap userPos={userPos} pins={data.day_schedule} />
            </div>
          )}

          {data.coverage && (
            <div style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 14 }}>
              {t('Source', 'المصدر')} : {data.coverage.issuer_fr || 'DSP'} · {t('période', 'الفترة')} {data.coverage.period_from} → {data.coverage.period_to}
            </div>
          )}

          {sortedSchedule.length === 0 && (
            <div className="alert-banner info">{lang === 'ar' ? `لم يُعثر على أي مناوبة في هذا التاريخ في ${communeName}.` : `Aucune garde trouvée pour cette date à ${communeName}.`}</div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {sortedSchedule.map(({ shift, distanceKm }) => (
              <div key={shift.id} style={{
                background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--navy)' }}>{displayName(shift, lang)}</div>
                    {shift.name_fr && shift.name_ar && (
                      lang === 'ar'
                        ? <div style={{ color: 'var(--slate-500)', fontSize: 13.5, marginTop: 2 }}>{shift.name_fr}</div>
                        : <div dir="rtl" lang="ar" style={{ color: 'var(--slate-500)', fontSize: 13.5, marginTop: 2 }}>{shift.name_ar}</div>
                    )}
                  </div>
                  {shift.active_now ? (
                    <span className="badge badge-green">{t('De garde maintenant', 'مناوبة الآن')}</span>
                  ) : (
                    <span className="badge badge-gray">{shift.shift === 'nuit' ? t('Nuit', 'ليل') : t('Jour', 'نهار')}</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 4 }}>
                  {(lang === 'ar' ? shift.address_ar || shift.address_fr : shift.address_fr || shift.address_ar)}{distanceKm != null && ` · ${formatDistance(distanceKm)}`}
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 6 }}>
                  {formatTimeRange(shift.starts_at, shift.ends_at)}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {shift.phone_e164 ? (
                    <a href={`tel:${shift.phone_e164}`} style={{
                      background: 'var(--blue)', color: '#fff', borderRadius: 8, padding: '8px 14px',
                      fontSize: 13, fontWeight: 700, textDecoration: 'none',
                    }}>
                      {t('📞 Appeler', '📞 اتصال')}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--slate-400)', fontSize: 13, padding: '8px 14px' }}>{t('📞 Indisponible', '📞 غير متوفر')}</span>
                  )}
                  <a href={mapsHref(shift)} target="_blank" rel="noopener noreferrer" style={{
                    background: '#fff', border: '1px solid var(--slate-200)', color: 'var(--slate-700)',
                    borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  }}>
                    {t('↗ Itinéraire', '↗ الاتجاهات')}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {mode === 'month' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button
              onClick={() => setMonthStr(m => shiftMonth(m, -1))}
              style={{ background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '6px 12px', fontSize: 14, cursor: 'pointer' }}
            >
              {t('← Mois précédent', '→ الشهر السابق')}
            </button>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', textTransform: 'capitalize', minWidth: 160, textAlign: 'center' }}>
              {formatMonthLabel(monthStr, lang)}
            </div>
            <button
              onClick={() => setMonthStr(m => shiftMonth(m, 1))}
              style={{ background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '6px 12px', fontSize: 14, cursor: 'pointer' }}
            >
              {t('Mois suivant →', 'الشهر التالي ←')}
            </button>
          </div>

          {monthError && <div className="alert-banner error">{monthError}</div>}

          {monthLoading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--slate-600)', fontSize: 15 }}>{t('⏳ Chargement…', '⏳ جارٍ التحميل…')}</div>
          )}

          {!monthLoading && !monthError && monthData && (
            <>
              {monthData.coverage && (
                <div style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 14 }}>
                  {t('Source', 'المصدر')} : {monthData.coverage.issuer_fr || 'DSP'} · {monthData.data.length} {lang === 'ar' ? `مناوبة مسجلة في ${communeName}` : `garde(s) référencée(s) pour ${communeName}`}
                </div>
              )}

              {monthData.data.length === 0 && (
                <div className="alert-banner info">{lang === 'ar' ? `لا توجد مناوبات مسجلة لشهر ${formatMonthLabel(monthStr, lang)} في ${communeName}.` : `Aucune garde référencée pour ${formatMonthLabel(monthStr)} à ${communeName}.`}</div>
              )}

              {monthData.data.length > 0 && (
                <div style={{ overflowX: 'auto', border: '1px solid var(--slate-200)', borderRadius: 12, background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead>
                      <tr style={{ background: 'var(--slate-50)' }}>
                        {[
                          t('Date', 'التاريخ'),
                          t('Horaire', 'التوقيت'),
                          t('Pharmacie', 'الصيدلية'),
                          t('Adresse', 'العنوان'),
                          t('Téléphone', 'الهاتف'),
                        ].map(h => (
                          <th key={h} style={{ textAlign: lang === 'ar' ? 'right' : 'left', padding: '10px 14px', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--slate-500)', borderBottom: '1px solid var(--slate-200)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthData.data.map(shift => {
                        const { dnum, dow, isFriday } = formatDateShort(shift.duty_date, lang)
                        return (
                          <tr key={shift.id} style={{ background: isFriday ? '#fefbf2' : undefined, borderBottom: '1px solid var(--slate-200)' }}>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{dnum}</div>
                              <div style={{ fontSize: 11.5, color: 'var(--slate-500)', textTransform: 'capitalize' }}>{dow}</div>
                            </td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              <span className={shift.shift === 'nuit' ? 'badge badge-blue' : 'badge badge-amber'}>
                                {shift.shift === 'nuit' ? t('☾ 19h → 08h', '☾ 19:00 ← 08:00') : t('☀ 08h → 19h', '☀ 08:00 ← 19:00')}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{displayName(shift, lang)}</div>
                              {shift.name_fr && shift.name_ar && (
                                lang === 'ar'
                                  ? <div style={{ color: 'var(--slate-500)', fontSize: 13 }}>{shift.name_fr}</div>
                                  : <div dir="rtl" lang="ar" style={{ color: 'var(--slate-500)', fontSize: 13 }}>{shift.name_ar}</div>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', maxWidth: 260 }}>
                              <div>{lang === 'ar' ? shift.address_ar || shift.address_fr : shift.address_fr || shift.address_ar}</div>
                              {shift.address_fr && shift.address_ar && (
                                lang === 'ar'
                                  ? <div style={{ color: 'var(--slate-500)', fontSize: 13 }}>{shift.address_fr}</div>
                                  : <div dir="rtl" lang="ar" style={{ color: 'var(--slate-500)', fontSize: 13 }}>{shift.address_ar}</div>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              {shift.phone_e164 ? (
                                <a href={`tel:${shift.phone_e164}`} style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
                                  {shift.phone_e164}
                                </a>
                              ) : (
                                <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>{t('non publié', 'غير منشور')}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
