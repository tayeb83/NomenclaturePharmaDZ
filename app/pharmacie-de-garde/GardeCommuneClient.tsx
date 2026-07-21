'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { GardeShift, GardeCoverageEntry } from '@/lib/db-types'
import type { GardeNowResult, GardeMonthResult } from '@/lib/garde'
import { slugify } from '@/lib/slug'
import type { Lang } from '@/lib/i18n'

const GardeMap = dynamic(() => import('../garde/GardeMap'), { ssr: false })

type Mode = 'now' | 'tonight' | 'friday' | 'month'

const LABELS = {
  fr: {
    wilaya: 'Wilaya', commune: 'Commune',
    modes: { now: 'Maintenant', tonight: 'Cette nuit', friday: 'Vendredi', month: 'Vue du mois' } as Record<Mode, string>,
    pageTitle: (mode: Mode, commune: string, monthLabel: string) => {
      if (mode === 'tonight') return `Pharmacie de garde à ${commune} cette nuit`
      if (mode === 'friday') return `Pharmacie de garde à ${commune} vendredi`
      if (mode === 'month') return `Planning des pharmacies de garde à ${commune} — ${monthLabel}`
      return `Pharmacie de garde à ${commune} aujourd'hui`
    },
    pageDescription: (mode: Mode, count: number, commune: string, wilaya: string, monthLabel: string) => {
      if (mode === 'month') {
        return count > 0
          ? `${count} garde${count > 1 ? 's' : ''} référencée${count > 1 ? 's' : ''} pour ${monthLabel} à ${commune}, wilaya de ${wilaya}. Adresses, téléphones et horaires — source officielle DSP.`
          : `Planning des pharmacies de garde à ${commune}, wilaya de ${wilaya}, pour ${monthLabel}. Adresses, téléphones et horaires — source officielle DSP.`
      }
      const periodLabel = mode === 'tonight' ? 'cette nuit' : mode === 'friday' ? 'vendredi' : 'actuellement'
      return count > 0
        ? `${count} pharmacie${count > 1 ? 's' : ''} de garde ${periodLabel} à ${commune}, wilaya de ${wilaya}. Adresses, téléphones et horaires — source officielle DSP.`
        : `Planning des pharmacies de garde à ${commune}, wilaya de ${wilaya}. Adresses, téléphones et horaires — source officielle DSP.`
    },
    copy: '🔗 Copier le lien', copied: '✓ Lien copié',
    loading: '⏳ Chargement…',
    sourceLine: (issuer: string, from: string, to: string) => `Source : ${issuer} · période ${from} → ${to}`,
    updatedLine: (date: string) => `Mise à jour : ${date}`,
    none: (commune: string) => `Aucune garde trouvée pour cette date à ${commune}.`,
    noneMonth: (label: string, commune: string) => `Aucune garde référencée pour ${label} à ${commune}.`,
    monthCount: (issuer: string, n: number, commune: string) => `Source : ${issuer} · ${n} garde(s) référencée(s) pour ${commune}`,
    now_: 'De garde maintenant', night: 'Nuit', day: 'Jour',
    call: '📞 Appeler', unavailable: '📞 Indisponible', route: '↗ Itinéraire',
    prevMonth: '← Mois précédent', nextMonth: 'Mois suivant →',
    thDate: 'Date', thHours: 'Horaire', thName: 'Pharmacie', thAddress: 'Adresse', thPhone: 'Téléphone',
    unpublished: 'non publié', pharmacy: 'Pharmacie',
    changeLocation: 'Changer de commune',
  },
  ar: {
    wilaya: 'الولاية', commune: 'البلدية',
    modes: { now: 'الآن', tonight: 'هذه الليلة', friday: 'الجمعة القادمة', month: 'عرض الشهر' } as Record<Mode, string>,
    pageTitle: (mode: Mode, commune: string, monthLabel: string) => {
      if (mode === 'tonight') return `صيدلية الحراسة في ${commune} هذه الليلة`
      if (mode === 'friday') return `صيدلية الحراسة في ${commune} يوم الجمعة`
      if (mode === 'month') return `برنامج صيدليات الحراسة في ${commune} — ${monthLabel}`
      return `صيدلية الحراسة اليوم في ${commune}`
    },
    pageDescription: (mode: Mode, count: number, commune: string, wilaya: string, monthLabel: string) => {
      if (mode === 'month') {
        return count > 0
          ? `${count} مناوبة مسجلة لشهر ${monthLabel} في ${commune}، ولاية ${wilaya}. العناوين وأرقام الهاتف وأوقات المناوبة — مصدر رسمي (DSP).`
          : `برنامج صيدليات الحراسة في ${commune}، ولاية ${wilaya}، لشهر ${monthLabel}. مصدر رسمي (DSP).`
      }
      const periodLabel = mode === 'tonight' ? 'هذه الليلة' : mode === 'friday' ? 'يوم الجمعة' : 'حاليًا'
      return count > 0
        ? `${count} صيدلية مناوبة ${periodLabel} في ${commune}، ولاية ${wilaya}. العناوين وأرقام الهاتف وأوقات المناوبة — مصدر رسمي (DSP).`
        : `برنامج صيدليات الحراسة في ${commune}، ولاية ${wilaya}. العناوين وأرقام الهاتف وأوقات المناوبة — مصدر رسمي (DSP).`
    },
    copy: '🔗 نسخ الرابط', copied: '✓ تم النسخ',
    loading: '⏳ جارٍ التحميل…',
    sourceLine: (issuer: string, from: string, to: string) => `المصدر: ${issuer} · الفترة ${from} → ${to}`,
    updatedLine: (date: string) => `آخر تحديث: ${date}`,
    none: (commune: string) => `لا توجد صيدلية حراسة لهذا التاريخ في ${commune}.`,
    noneMonth: (label: string, commune: string) => `لا توجد بيانات لشهر ${label} في ${commune}.`,
    monthCount: (issuer: string, n: number, commune: string) => `المصدر: ${issuer} · ${n} مناوبة مسجلة في ${commune}`,
    now_: 'مناوبة الآن', night: 'ليل', day: 'نهار',
    call: '📞 اتصال', unavailable: '📞 غير متوفر', route: '↗ الاتجاهات',
    prevMonth: '← الشهر السابق', nextMonth: 'الشهر التالي →',
    thDate: 'التاريخ', thHours: 'التوقيت', thName: 'الصيدلية', thAddress: 'العنوان', thPhone: 'الهاتف',
    unpublished: 'غير منشور', pharmacy: 'صيدلية',
    changeLocation: 'تغيير البلدية',
  },
}

function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month: string, lang: Lang) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, 1))
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
}

function formatDateShort(iso: string, lang: Lang) {
  const d = new Date(iso + 'T00:00:00Z')
  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-FR'
  return {
    dnum: new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(d),
    dow: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(d),
    isFriday: d.getUTCDay() === 5,
  }
}

function formatUpdatedDate(iso: string | undefined, lang: Lang) {
  if (!iso) return ''
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))
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

function displayName(shift: GardeShift, lang: Lang) {
  return (lang === 'ar' ? shift.name_ar || shift.name_fr : shift.name_fr || shift.name_ar) || 'Pharmacie'
}

function mapsHref(shift: GardeShift) {
  const query = (shift.lat != null && shift.lng != null)
    ? `${shift.lat},${shift.lng}`
    : [shift.name_fr || shift.name_ar, shift.address_fr || shift.address_ar].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function GardeCommuneClient({
  lang,
  basePath,
  wilayaSlug,
  communeSlug,
  wilayaCode,
  communeCode,
  communeName,
  wilayaName,
  initialCoverage,
  initialData,
  initialMode = 'now',
  initialMonth = '',
  initialMonthData = null,
}: {
  lang: Lang
  basePath: string
  wilayaSlug: string
  communeSlug: string
  wilayaCode: string
  communeCode: string
  communeName: string
  wilayaName: string
  initialCoverage: GardeCoverageEntry[]
  initialData: GardeNowResult
  initialMode?: Mode
  initialMonth?: string
  initialMonthData?: GardeMonthResult | null
}) {
  const t = LABELS[lang]
  const router = useRouter()
  const pathname = usePathname()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [data, setData] = useState<GardeNowResult | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [monthStr, setMonthStr] = useState(isValidMonth(initialMonth) ? initialMonth : (() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit' }).format(new Date()).replace('/', '-')
  })())
  const [monthData, setMonthData] = useState<GardeMonthResult | null>(initialMonthData)
  const [monthLoading, setMonthLoading] = useState(false)
  const [monthError, setMonthError] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }, [])

  // Reflète mode/mois dans l'URL (query), en gardant le chemin propre
  // /pharmacie-de-garde/{wilaya}/{commune} intact pour rester canonique.
  useEffect(() => {
    const params = new URLSearchParams()
    if (mode !== 'now') params.set('mode', mode)
    if (mode === 'month') params.set('month', monthStr)
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, monthStr, pathname])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1800)
    })
  }, [])

  const fetchGarde = useCallback(async (targetMode: Mode) => {
    if (targetMode === 'month') return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ wilaya: wilayaCode, commune: communeCode })
      if (targetMode === 'tonight') params.set('date', algiersDateStr())
      if (targetMode === 'friday') params.set('date', nextFridayStr())
      const res = await fetch(`/api/garde?${params}`)
      if (!res.ok) throw new Error('Erreur serveur')
      setData(await res.json())
    } catch {
      setError(lang === 'ar' ? 'تعذّر تحميل صيدليات الحراسة.' : 'Impossible de charger les pharmacies de garde.')
    } finally {
      setLoading(false)
    }
  }, [wilayaCode, communeCode, lang])

  // Ne refetch pas au montage : la 1re vue vient déjà du SSR (initialData).
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!mounted) { setMounted(true); return }
    fetchGarde(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const fetchGardeMonth = useCallback(async () => {
    setMonthLoading(true)
    setMonthError('')
    try {
      const res = await fetch(`/api/garde/month?${new URLSearchParams({ wilaya: wilayaCode, commune: communeCode, month: monthStr })}`)
      if (!res.ok) throw new Error('Erreur serveur')
      setMonthData(await res.json())
    } catch {
      setMonthError(lang === 'ar' ? 'تعذّر تحميل برنامج الشهر.' : 'Impossible de charger le planning du mois.')
    } finally {
      setMonthLoading(false)
    }
  }, [wilayaCode, communeCode, monthStr, lang])

  const [monthMounted, setMonthMounted] = useState(false)
  useEffect(() => {
    if (mode !== 'month') return
    if (!monthMounted) { setMonthMounted(true); if (initialMonthData) return }
    fetchGardeMonth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, monthStr])

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

  const wilayas = useMemo(() => {
    const seen = new Set<string>()
    return initialCoverage.filter(c => {
      if (seen.has(c.wilaya_code)) return false
      seen.add(c.wilaya_code)
      return true
    })
  }, [initialCoverage])

  const communesInWilaya = useMemo(
    () => initialCoverage.filter(c => c.wilaya_code === wilayaCode),
    [initialCoverage, wilayaCode]
  )

  const goToLocation = useCallback((newWilayaCode: string, newCommuneCode: string) => {
    const entry = initialCoverage.find(c => c.wilaya_code === newWilayaCode && c.commune_code === newCommuneCode)
    if (!entry) return
    router.push(`${basePath}/${slugify(entry.wilaya_name_fr)}/${slugify(entry.commune_name_fr)}`)
  }, [initialCoverage, basePath, router])

  const updatedDate = formatUpdatedDate(data?.coverage?.imported_at, lang)

  const monthLabel = formatMonthLabel(monthStr, lang)
  const activeNowCount = useMemo(() => (data?.day_schedule || []).filter(s => s.active_now).length, [data])
  const scheduleCount = data?.day_schedule?.length ?? 0
  const displayCount = mode === 'now' ? activeNowCount : scheduleCount
  const pageTitle = t.pageTitle(mode, communeName, monthLabel)
  const pageDescription = t.pageDescription(
    mode,
    mode === 'month' ? (monthData?.data.length ?? 0) : displayCount,
    communeName,
    wilayaName,
    monthLabel
  )

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, color: 'var(--navy)' }}>
          🏥 {pageTitle}
        </h1>
        <p style={{ color: 'var(--slate-500)', fontSize: 16, maxWidth: 640, lineHeight: 1.6 }}>
          {pageDescription}
        </p>
      </div>

      <div style={{
        background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 12,
        padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--slate-500)', marginBottom: 6, fontWeight: 600 }}>{t.wilaya}</label>
          <select
            value={wilayaCode}
            onChange={e => {
              const newWilaya = e.target.value
              const matches = initialCoverage.filter(c => c.wilaya_code === newWilaya)
              if (matches.length > 0) goToLocation(newWilaya, matches[0].commune_code)
            }}
            style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', color: 'var(--navy)', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 180 }}
          >
            {wilayas.map(w => <option key={w.wilaya_code} value={w.wilaya_code}>{w.wilaya_name_fr}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--slate-500)', marginBottom: 6, fontWeight: 600 }}>{t.commune}</label>
          <select
            value={communeCode}
            onChange={e => goToLocation(wilayaCode, e.target.value)}
            style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', color: 'var(--navy)', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 180 }}
          >
            {communesInWilaya.map(c => <option key={c.commune_code} value={c.commune_code}>{c.commune_name_fr}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(Object.keys(t.modes) as Mode[]).map(m => (
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
              {t.modes[m]}
            </button>
          ))}
        </div>

        <button
          onClick={copyLink}
          style={{
            background: linkCopied ? 'var(--green, #16a34a)' : '#fff',
            border: `1px solid ${linkCopied ? 'var(--green, #16a34a)' : 'var(--slate-200)'}`,
            color: linkCopied ? '#fff' : 'var(--slate-700)',
            borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            marginInlineStart: 'auto',
          }}
        >
          {linkCopied ? t.copied : t.copy}
        </button>
      </div>

      {mode !== 'month' && error && <div className="alert-banner error">{error}</div>}
      {mode !== 'month' && loading && <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--slate-600)', fontSize: 15 }}>{t.loading}</div>}

      {mode !== 'month' && !loading && !error && data && (
        <>
          {(userPos || sortedSchedule.some(r => r.shift.lat != null)) && (
            <div style={{ height: 320, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--slate-200)', marginBottom: 20 }}>
              <GardeMap userPos={userPos} pins={data.day_schedule} />
            </div>
          )}

          {data.coverage && (
            <div style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 4 }}>
              {t.sourceLine(data.coverage.issuer_fr || 'DSP', data.coverage.period_from, data.coverage.period_to)}
            </div>
          )}
          {updatedDate && (
            <div style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 14 }}>
              {t.updatedLine(updatedDate)}
            </div>
          )}

          {sortedSchedule.length === 0 && (
            <div className="alert-banner info">{t.none(communeName)}</div>
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
                      <div dir={lang === 'ar' ? 'ltr' : 'rtl'} lang={lang === 'ar' ? 'fr' : 'ar'} style={{ color: 'var(--slate-500)', fontSize: 13.5, marginTop: 2 }}>
                        {lang === 'ar' ? shift.name_fr : shift.name_ar}
                      </div>
                    )}
                  </div>
                  {shift.active_now ? (
                    <span className="badge badge-green">{t.now_}</span>
                  ) : (
                    <span className="badge badge-gray">{shift.shift === 'nuit' ? t.night : t.day}</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 4 }}>
                  {(lang === 'ar' ? (shift.address_ar || shift.address_fr) : (shift.address_fr || shift.address_ar))}{distanceKm != null && ` · ${formatDistance(distanceKm)}`}
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
                      {t.call}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--slate-400)', fontSize: 13, padding: '8px 14px' }}>{t.unavailable}</span>
                  )}
                  <a href={mapsHref(shift)} target="_blank" rel="noopener noreferrer" style={{
                    background: '#fff', border: '1px solid var(--slate-200)', color: 'var(--slate-700)',
                    borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  }}>
                    {t.route}
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
            <button onClick={() => setMonthStr(m => shiftMonth(m, -1))} style={{ background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '6px 12px', fontSize: 14, cursor: 'pointer' }}>
              {t.prevMonth}
            </button>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', textTransform: 'capitalize', minWidth: 160, textAlign: 'center' }}>
              {formatMonthLabel(monthStr, lang)}
            </div>
            <button onClick={() => setMonthStr(m => shiftMonth(m, 1))} style={{ background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '6px 12px', fontSize: 14, cursor: 'pointer' }}>
              {t.nextMonth}
            </button>
          </div>

          {monthError && <div className="alert-banner error">{monthError}</div>}
          {monthLoading && <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--slate-600)', fontSize: 15 }}>{t.loading}</div>}

          {!monthLoading && !monthError && monthData && (
            <>
              {monthData.coverage && (
                <div style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 14 }}>
                  {t.monthCount(monthData.coverage.issuer_fr || 'DSP', monthData.data.length, communeName)}
                </div>
              )}

              {monthData.data.length === 0 && (
                <div className="alert-banner info">{t.noneMonth(formatMonthLabel(monthStr, lang), communeName)}</div>
              )}

              {monthData.data.length > 0 && (
                <div style={{ overflowX: 'auto', border: '1px solid var(--slate-200)', borderRadius: 12, background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead>
                      <tr style={{ background: 'var(--slate-50)' }}>
                        {[t.thDate, t.thHours, t.thName, t.thAddress, t.thPhone].map(h => (
                          <th key={h} style={{ textAlign: 'start', padding: '10px 14px', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--slate-500)', borderBottom: '1px solid var(--slate-200)' }}>
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
                                {shift.shift === 'nuit' ? '☾ 19h → 08h' : '☀ 08h → 19h'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{displayName(shift, lang)}</div>
                            </td>
                            <td style={{ padding: '10px 14px', maxWidth: 260 }}>
                              <div>{lang === 'ar' ? (shift.address_ar || shift.address_fr) : (shift.address_fr || shift.address_ar)}</div>
                            </td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              {shift.phone_e164 ? (
                                <a href={`tel:${shift.phone_e164}`} style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
                                  {shift.phone_e164}
                                </a>
                              ) : (
                                <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>{t.unpublished}</span>
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
