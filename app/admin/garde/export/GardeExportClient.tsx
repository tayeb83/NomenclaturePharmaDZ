'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PrintButton } from '@/components/ui/PrintButton'
import type { GardeShift, GardeCoverageEntry, GardeRosterMeta } from '@/lib/db-types'

type GardeMonthResponse = {
  month: string
  coverage: GardeRosterMeta | null
  data: GardeShift[]
}

function currentMonthStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit' })
    .format(new Date()).replace('/', '-')
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, 1))
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
}

function formatDateNumeric(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'UTC' }).format(d).replace(/-/g, '/')
}

function formatWeekdayAr(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  return new Intl.DateTimeFormat('ar-DZ', { weekday: 'long', timeZone: 'UTC' }).format(d)
}

// Le doc DSP source exprime les horaires en heures pleines locales (08h/19h) —
// on dérive les mêmes libellés depuis starts_at/ends_at plutôt que de coder
// en dur "jour"/"nuit", au cas où une DSP publie des horaires différents.
function formatHoursAr(startsAt: string, endsAt: string) {
  const hour = (iso: string) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', hour12: false, timeZone: 'Africa/Algiers' }).format(new Date(iso))
  return `${hour(startsAt)} سا الى غاية ${hour(endsAt)} سا`
}

function formatHoursFr(startsAt: string, endsAt: string) {
  const hour = (iso: string) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Algiers' }).format(new Date(iso))
  return `${hour(startsAt)} – ${hour(endsAt)}`
}

function displayName(shift: GardeShift) {
  return shift.name_ar || shift.name_fr || 'Pharmacie'
}

export function GardeExportClient() {
  const [coverage, setCoverage] = useState<GardeCoverageEntry[]>([])
  const [coverageLoading, setCoverageLoading] = useState(true)
  const [coverageError, setCoverageError] = useState('')
  const [wilaya, setWilaya] = useState('')
  const [commune, setCommune] = useState('')
  const [monthStr, setMonthStr] = useState(currentMonthStr())
  const [monthData, setMonthData] = useState<GardeMonthResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setCoverageLoading(true)
    fetch('/api/garde/coverage')
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(json => {
        if (cancelled) return
        const rows: GardeCoverageEntry[] = json.data || []
        setCoverage(rows)
        if (rows[0]) {
          setWilaya(rows[0].wilaya_code)
          setCommune(rows[0].commune_code)
        }
      })
      .catch(() => { if (!cancelled) setCoverageError("Impossible de charger les zones couvertes.") })
      .finally(() => { if (!cancelled) setCoverageLoading(false) })
    return () => { cancelled = true }
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

  const selectedEntry = useMemo(
    () => coverage.find(c => c.wilaya_code === wilaya && c.commune_code === commune) || null,
    [coverage, wilaya, commune]
  )

  const fetchMonth = useCallback(async () => {
    if (!wilaya || !commune) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/garde/month?${new URLSearchParams({ wilaya, commune, month: monthStr })}`)
      if (!res.ok) throw new Error('Erreur serveur')
      const json = await res.json()
      setMonthData(json)
    } catch {
      setError('Impossible de charger le planning du mois.')
    } finally {
      setLoading(false)
    }
  }, [wilaya, commune, monthStr])

  useEffect(() => { fetchMonth() }, [fetchMonth])

  const sortedShifts = useMemo(() => {
    return [...(monthData?.data || [])].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  }, [monthData])

  const generatedAt = useMemo(() => new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Algiers',
  }).format(new Date()), [])

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <header className="no-print" style={{
        background: '#0f172a', color: 'white', padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>🖨️ Export imprimable — Pharmacies de garde</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/admin/garde" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>
            🏥 Géocodage garde
          </Link>
          <Link href="/admin" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>
            ← Admin
          </Link>
        </div>
      </header>

      {/* Sélecteurs — masqués à l'impression */}
      <div className="no-print" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: '18px 20px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>Wilaya</label>
            <select
              value={wilaya}
              onChange={e => {
                const newWilaya = e.target.value
                setWilaya(newWilaya)
                const matches = coverage.filter(c => c.wilaya_code === newWilaya)
                setCommune(matches.length === 1 ? matches[0].commune_code : (matches[0]?.commune_code || ''))
              }}
              disabled={coverageLoading || wilayas.length === 0}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 200 }}
            >
              {wilayas.length === 0 && <option value="">Aucune wilaya couverte</option>}
              {wilayas.map(w => <option key={w.wilaya_code} value={w.wilaya_code}>{w.wilaya_name_fr}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>Commune</label>
            <select
              value={commune}
              onChange={e => setCommune(e.target.value)}
              disabled={communes.length === 0}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 200 }}
            >
              <option value="">Choisir une commune…</option>
              {communes.map(c => <option key={c.commune_code} value={c.commune_code}>{c.commune_name_fr}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setMonthStr(m => shiftMonth(m, -1))} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>←</button>
            <div style={{ fontWeight: 700, fontSize: 14, minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>{formatMonthLabel(monthStr)}</div>
            <button onClick={() => setMonthStr(m => shiftMonth(m, 1))} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>→</button>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <PrintButton label="Imprimer / PDF" />
          </div>
        </div>

        {coverageError && <div className="alert-banner error" style={{ marginTop: 14 }}>{coverageError}</div>}
        {error && <div className="alert-banner error" style={{ marginTop: 14 }}>{error}</div>}
        {loading && <div style={{ padding: '16px 0', color: '#64748b', fontSize: 14 }}>⏳ Chargement…</div>}
      </div>

      {/* Zone imprimable */}
      {!loading && monthData && commune && (
        <div style={{ maxWidth: 900, margin: '20px auto 60px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '32px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 16 }}>
            <Image src="/dwadz-logo.svg" alt="" width={40} height={40} />
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 18, color: '#0f172a' }}>DwaDZ</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>dwadz.app — Pharmacies de garde en Algérie</div>
            </div>
          </div>

          <div dir="rtl" lang="ar" style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>جدول تناوب الصيدليات</div>
            <div style={{ fontSize: 13.5, color: '#334155', marginTop: 4 }}>
              {(selectedEntry?.commune_name_ar || selectedEntry?.commune_name_fr) && (
                <>بلدية {selectedEntry?.commune_name_ar || selectedEntry?.commune_name_fr} — </>
              )}
              {selectedEntry?.wilaya_name_ar || selectedEntry?.wilaya_name_fr || wilaya}
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 12.5, color: '#64748b', marginBottom: 22 }}>
            Planning des pharmacies de garde — {selectedEntry?.commune_name_fr}, {selectedEntry?.wilaya_name_fr} · {formatMonthLabel(monthStr)}
          </div>

          {sortedShifts.length === 0 ? (
            <div className="alert-banner info">Aucune garde référencée pour {formatMonthLabel(monthStr)} à {selectedEntry?.commune_name_fr || commune}.</div>
          ) : (
            <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {[
                    ['رقم الهاتف', 'Téléphone'],
                    ['العنوان', 'Adresse'],
                    ['الصيدلية المناوبة', 'Pharmacie'],
                    ['التوقيت', 'Horaire'],
                    ['تاريخ التناوب', 'Date'],
                  ].map(([ar, fr]) => (
                    <th key={ar} style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700 }}>{ar}</div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 400 }}>{fr}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedShifts.map(shift => (
                  <tr key={shift.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '7px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {shift.phone_e164 || '—'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '7px 10px' }}>
                      {shift.address_ar || shift.address_fr || '—'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '7px 10px', fontWeight: 600 }}>
                      {displayName(shift)}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '7px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {formatHoursAr(shift.starts_at, shift.ends_at)}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '7px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div>{formatDateNumeric(shift.duty_date)}</div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>{formatWeekdayAr(shift.duty_date)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #e2e8f0', fontSize: 10.5, color: '#94a3b8' }}>
            Document généré automatiquement par DwaDZ à partir des plannings publiés par la DSP{monthData.coverage?.issuer_fr ? ` (${monthData.coverage.issuer_fr})` : ''} — à vérifier auprès de la pharmacie avant tout déplacement. Généré le {generatedAt}.
          </div>
        </div>
      )}
    </div>
  )
}
