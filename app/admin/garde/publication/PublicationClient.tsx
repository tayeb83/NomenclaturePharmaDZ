'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { GardeCoverageEntry } from '@/lib/db-types'

// ─── Types ────────────────────────────────────────────────────

type Period = 'day' | 'friday' | 'month'
type Locale = 'fr' | 'ar'

type PublishResult = {
  wilaya_code: string
  wilaya_name_fr: string
  commune_name_fr?: string | null
  period?: Period
  date?: string
  month?: string
  locale: Locale
  pharmacies: number
  status: 'published' | 'already_published' | 'failed' | 'dry_run'
  postId?: string
  error?: string
  caption?: string
}

type PublishResponse = {
  date: string
  period: Period
  month?: string
  covered_wilayas: number
  targets: number
  results: PublishResult[]
  error?: string
}

type RecentPost = {
  id: number
  content: string
  status: string
  published_at: string | null
  error_msg: string | null
  created_at: string
}

type LogoMeta = {
  wilaya_code: string
  mime: string
  file_name: string | null
  byte_size: number | null
  updated_at: string
}

// ─── Couleurs du drapeau algérien ─────────────────────────────

const DZ_GREEN = '#006233'
const DZ_RED = '#D21034'

const PERIODS: { id: Period; emoji: string; title: string; hint: string }[] = [
  { id: 'day', emoji: '📅', title: "Aujourd'hui", hint: 'Les officines de garde du jour' },
  { id: 'friday', emoji: '🕌', title: 'Vendredi prochain', hint: 'Publié en amont, le jour le plus consulté' },
  { id: 'month', emoji: '🗓️', title: 'Le mois', hint: 'Planning complet, une publication par commune' },
]

const STATUS_STYLE: Record<PublishResult['status'], { label: string; color: string; bg: string }> = {
  published: { label: 'Publié', color: '#065f46', bg: '#d1fae5' },
  already_published: { label: 'Déjà publié', color: '#1e40af', bg: '#dbeafe' },
  failed: { label: 'Échec', color: '#991b1b', bg: '#fee2e2' },
  dry_run: { label: 'Simulation', color: '#92400e', bg: '#fef3c7' },
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Algiers',
  }).format(new Date(iso))
}

function fmtDayLabel(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`))
}

function fmtMonthLabel(month: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${month}-01T12:00:00Z`))
}

// ─── Composant principal ──────────────────────────────────────

export function PublicationClient() {
  const [coverage, setCoverage] = useState<GardeCoverageEntry[]>([])
  const [dates, setDates] = useState<{ today: string; friday: string; month: string } | null>(null)
  const [recent, setRecent] = useState<RecentPost[]>([])
  const [logos, setLogos] = useState<LogoMeta[]>([])

  const [wilaya, setWilaya] = useState('')
  const [commune, setCommune] = useState('')
  const [locales, setLocales] = useState<Locale[]>(['fr', 'ar'])
  const [granularity, setGranularity] = useState<'wilaya' | 'commune'>('wilaya')
  const [dryRun, setDryRun] = useState(false)

  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState<Period | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [results, setResults] = useState<PublishResponse | null>(null)
  const [previewLocale, setPreviewLocale] = useState<Locale>('fr')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pubRes, logoRes] = await Promise.all([
        fetch('/api/admin/garde/publish', { cache: 'no-store' }),
        fetch('/api/admin/garde/wilaya-logo', { cache: 'no-store' }),
      ])
      const data = await pubRes.json()
      if (pubRes.ok) {
        setCoverage(data.coverage || [])
        setDates(data.dates || null)
        setRecent(data.recent || [])
        setWilaya((w) => w || data.coverage?.[0]?.wilaya_code || '')
      } else {
        setMsg(data.error || 'Erreur de chargement')
      }
      const logoData = await logoRes.json().catch(() => ({}))
      if (logoRes.ok) setLogos(logoData.logos || [])
    } catch {
      setMsg('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Wilayas couvertes, dédoublonnées, dans l'ordre des codes.
  const wilayas = useMemo(() => {
    const map = new Map<string, { code: string; name_fr: string; name_ar: string | null }>()
    for (const c of coverage) {
      if (!map.has(c.wilaya_code)) {
        map.set(c.wilaya_code, { code: c.wilaya_code, name_fr: c.wilaya_name_fr, name_ar: c.wilaya_name_ar })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
  }, [coverage])

  const communes = useMemo(
    () => coverage.filter((c) => c.wilaya_code === wilaya).sort((a, b) => a.commune_name_fr.localeCompare(b.commune_name_fr)),
    [coverage, wilaya]
  )

  // La commune sélectionnée doit toujours appartenir à la wilaya courante.
  useEffect(() => {
    if (commune && !communes.some((c) => c.commune_code === commune)) setCommune('')
  }, [communes, commune])

  const currentWilaya = wilayas.find((w) => w.code === wilaya)
  const hasLogo = logos.some((l) => l.wilaya_code === wilaya)

  function previewUrl(period: Period): string {
    const params = new URLSearchParams({ wilaya, period, lang: previewLocale })
    if (commune) params.set('commune', commune)
    if (period === 'month' && dates) params.set('month', dates.month)
    return `/api/garde/social-image?${params.toString()}`
  }

  function periodDateLabel(period: Period): string {
    if (!dates) return ''
    if (period === 'day') return fmtDayLabel(dates.today)
    if (period === 'friday') return fmtDayLabel(dates.friday)
    return fmtMonthLabel(dates.month)
  }

  async function publish(period: Period) {
    if (!wilaya) { setMsg('Choisissez une wilaya.'); return }
    if (!locales.length) { setMsg('Choisissez au moins une langue.'); return }

    const scope = commune
      ? communes.find((c) => c.commune_code === commune)?.commune_name_fr
      : `toute la wilaya de ${currentWilaya?.name_fr}`
    const periodLabel = PERIODS.find((p) => p.id === period)?.title
    const confirmMsg = dryRun
      ? `Simuler la publication « ${periodLabel} » pour ${scope} ?`
      : `Publier sur la Page Facebook « ${periodLabel} » pour ${scope} (${locales.join(' + ').toUpperCase()}) ?`
    if (!window.confirm(confirmMsg)) return

    setPublishing(period); setMsg(null); setResults(null)
    try {
      const res = await fetch('/api/admin/garde/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period, wilaya, commune: commune || undefined, locales, dryRun,
          granularity: commune ? 'commune' : granularity,
          month: period === 'month' ? dates?.month : undefined,
        }),
      })
      const data: PublishResponse = await res.json()
      if (res.ok) {
        setResults(data)
        const published = data.results.filter((r) => r.status === 'published').length
        const failed = data.results.filter((r) => r.status === 'failed').length
        setMsg(dryRun
          ? `Simulation : ${data.results.length} publication(s) seraient envoyées.`
          : `${published} publication(s) envoyée(s)${failed ? `, ${failed} en échec` : ''}.`)
        await load()
      } else {
        setMsg(data.error || 'Erreur de publication')
      }
    } catch {
      setMsg('Erreur réseau — la publication a peut-être été interrompue, vérifiez la Page avant de relancer.')
    } finally {
      setPublishing(null)
    }
  }

  async function uploadLogo(file: File) {
    if (!wilaya) return
    setMsg(null)
    const fd = new FormData()
    fd.append('wilaya', wilaya)
    fd.append('file', file)
    try {
      const res = await fetch('/api/admin/garde/wilaya-logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) { setMsg('Logo enregistré.'); await load() }
      else setMsg(data.error || 'Erreur lors de l’envoi du logo')
    } catch {
      setMsg('Erreur réseau')
    }
  }

  async function removeLogo() {
    if (!wilaya || !window.confirm('Supprimer le logo de cette wilaya ?')) return
    try {
      const res = await fetch(`/api/admin/garde/wilaya-logo?wilaya=${encodeURIComponent(wilaya)}`, { method: 'DELETE' })
      if (res.ok) { setMsg('Logo supprimé.'); await load() }
    } catch {
      setMsg('Erreur réseau')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* Bandeau aux couleurs de l'Algérie */}
      <div style={{ display: 'flex', height: 6 }}>
        <div style={{ flex: 1, background: DZ_GREEN }} />
        <div style={{ flex: 1, background: '#ffffff' }} />
        <div style={{ flex: 1, background: DZ_RED }} />
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            🇩🇿 Publier les pharmacies de garde
          </h1>
          <div style={{ display: 'flex', gap: 14 }}>
            <Link href="/admin/garde" style={linkStyle}>🏥 Géocodage</Link>
            <Link href="/admin/social" style={linkStyle}>📣 Publications</Link>
            <Link href="/admin" style={linkStyle}>← Admin</Link>
          </div>
        </div>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>
          Choisissez la wilaya (et la commune) puis cliquez sur le visuel à publier sur la Page Facebook.
          Les mêmes visuels partent automatiquement chaque jour à 7h, le jeudi à 16h pour le vendredi, et
          le 1<sup>er</sup> du mois pour le planning mensuel.
        </p>

        {msg && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '10px 14px', borderRadius: 8, fontSize: 14, margin: '16px 0' }}>
            {msg}
          </div>
        )}

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Chargement…</p>
        ) : wilayas.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
            Aucune wilaya couverte pour l’instant — importez un programme de garde avant de publier.
          </p>
        ) : (
          <>
            {/* ─── Sélection ─────────────────────────────────── */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <Field label="Wilaya">
                  <select value={wilaya} onChange={(e) => setWilaya(e.target.value)} style={selectStyle}>
                    {wilayas.map((w) => (
                      <option key={w.code} value={w.code}>{w.code} — {w.name_fr}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Commune">
                  <select value={commune} onChange={(e) => setCommune(e.target.value)} style={selectStyle}>
                    <option value="">Toutes les communes</option>
                    {communes.map((c) => (
                      <option key={c.commune_code} value={c.commune_code}>{c.commune_name_fr}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Langues publiées">
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['fr', 'ar'] as Locale[]).map((l) => (
                      <label key={l} style={checkLabel}>
                        <input
                          type="checkbox"
                          checked={locales.includes(l)}
                          onChange={(e) => setLocales((prev) => e.target.checked ? [...prev, l] : prev.filter((x) => x !== l))}
                        />
                        {l === 'fr' ? 'Français' : 'العربية'}
                      </label>
                    ))}
                  </div>
                </Field>

                {!commune && (
                  <Field label="Découpage">
                    <select value={granularity} onChange={(e) => setGranularity(e.target.value as any)} style={selectStyle}>
                      <option value="wilaya">1 publication pour la wilaya</option>
                      <option value="commune">1 publication par commune</option>
                    </select>
                  </Field>
                )}

                <Field label="Aperçu">
                  <select value={previewLocale} onChange={(e) => setPreviewLocale(e.target.value as Locale)} style={selectStyle}>
                    <option value="fr">Français</option>
                    <option value="ar">العربية</option>
                  </select>
                </Field>

                <label style={{ ...checkLabel, paddingBottom: 8 }}>
                  <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                  Simuler sans publier
                </label>
              </div>

              {granularity === 'commune' && !commune && (
                <p style={{ fontSize: 13, color: '#92400e', background: '#fef3c7', padding: '8px 12px', borderRadius: 8, marginTop: 14, marginBottom: 0 }}>
                  ⚠️ {communes.length} publication(s) par langue seront envoyées — une par commune de la wilaya.
                </p>
              )}
            </div>

            {/* ─── Logo de la wilaya ─────────────────────────── */}
            <LogoSection
              wilaya={wilaya}
              wilayaName={currentWilaya?.name_fr || ''}
              hasLogo={hasLogo}
              onUpload={uploadLogo}
              onRemove={removeLogo}
            />

            {/* ─── Cartes de publication ─────────────────────── */}
            <h2 style={sectionTitle}>Que publier ?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
              {PERIODS.map((p) => (
                <PublishCard
                  key={p.id}
                  emoji={p.emoji}
                  title={p.title}
                  hint={p.hint}
                  dateLabel={periodDateLabel(p.id)}
                  previewUrl={previewUrl(p.id)}
                  busy={publishing === p.id}
                  disabled={publishing !== null}
                  dryRun={dryRun}
                  onPublish={() => publish(p.id)}
                />
              ))}
            </div>

            {/* ─── Résultats ─────────────────────────────────── */}
            {results && (
              <>
                <h2 style={sectionTitle}>
                  Résultat — {results.results.length} publication(s), {results.covered_wilayas} wilaya(s) concernée(s)
                </h2>
                {results.results.length === 0 && (
                  <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                    Aucune officine de garde trouvée pour cette période : rien n’a été publié.
                  </p>
                )}
                {results.results.map((r, i) => {
                  const st = STATUS_STYLE[r.status]
                  return (
                    <div key={i} style={{ ...cardStyle, padding: 14, marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>
                          {r.commune_name_fr ? `${r.commune_name_fr} (${r.wilaya_name_fr})` : r.wilaya_name_fr}
                          <span style={{ fontWeight: 400, color: '#64748b' }}>
                            {' '}· {r.locale.toUpperCase()} · {r.pharmacies} officine(s)
                            {r.month ? ` · ${r.month}` : r.date ? ` · ${r.date}` : ''}
                          </span>
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '3px 10px', borderRadius: 999 }}>
                          {st.label}
                        </span>
                      </div>
                      {r.error && <div style={{ marginTop: 6, fontSize: 12, color: '#b91c1c' }}>{r.error}</div>}
                      {r.caption && (
                        <details style={{ marginTop: 8 }}>
                          <summary style={{ cursor: 'pointer', fontSize: 12, color: '#64748b' }}>Voir la légende</summary>
                          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#334155', fontFamily: 'inherit', marginTop: 6 }}>{r.caption}</pre>
                        </details>
                      )}
                    </div>
                  )
                })}
              </>
            )}

            {/* ─── Historique ────────────────────────────────── */}
            <h2 style={sectionTitle}>Dernières publications de garde</h2>
            {recent.length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucune publication enregistrée.</p>}
            {recent.map((p) => (
              <div key={p.id} style={{ ...cardStyle, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#334155' }}>{p.content}</span>
                <span style={{ fontSize: 12, color: p.status === 'published' ? '#059669' : '#b91c1c' }}>
                  {p.status === 'published' ? `✓ ${fmtDate(p.published_at)}` : `✗ ${p.error_msg || 'échec'}`}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Carte cliquable aux couleurs de l'Algérie ────────────────

function PublishCard({
  emoji, title, hint, dateLabel, previewUrl, busy, disabled, dryRun, onPublish,
}: {
  emoji: string
  title: string
  hint: string
  dateLabel: string
  previewUrl: string
  busy: boolean
  disabled: boolean
  dryRun: boolean
  onPublish: () => void
}) {
  const [hover, setHover] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Un changement de wilaya/commune/langue change l'URL : on réessaie le rendu.
  useEffect(() => { setImageError(false) }, [previewUrl])

  return (
    <div style={{
      borderRadius: 16,
      padding: 3,
      background: `linear-gradient(135deg, ${DZ_GREEN} 0%, #ffffff 50%, ${DZ_RED} 100%)`,
      boxShadow: hover ? '0 10px 28px rgba(0,0,0,0.16)' : '0 2px 10px rgba(0,0,0,0.07)',
      transform: hover && !disabled ? 'translateY(-3px)' : 'none',
      transition: 'all .18s ease',
    }}>
      <div style={{ background: 'white', borderRadius: 13, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{emoji} {title}</div>
          <div style={{ fontSize: 13, color: DZ_GREEN, fontWeight: 700, marginTop: 2, textTransform: 'capitalize' }}>{dateLabel}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{hint}</div>
        </div>

        {/* L'aperçu est le bouton : c'est exactement l'image qui sera publiée. */}
        <button
          type="button"
          onClick={onPublish}
          disabled={disabled}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          title={`Publier « ${title} » sur Facebook`}
          style={{
            position: 'relative', border: 'none', padding: 0, margin: 0,
            background: '#0f172a', cursor: disabled ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 220, width: '100%',
          }}
        >
          {imageError ? (
            <span style={{ color: '#94a3b8', fontSize: 13, padding: 24, textAlign: 'center' }}>
              Aucune garde à afficher pour cette période.
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={`Aperçu — ${title}`}
              onError={() => setImageError(true)}
              style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 340 }}
            />
          )}

          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hover && !disabled ? 'rgba(0, 98, 51, 0.72)' : 'transparent',
            transition: 'background .18s ease',
          }}>
            {busy ? (
              <span style={publishBadge}>{dryRun ? '⏳ Simulation…' : '⏳ Publication en cours…'}</span>
            ) : hover && !disabled ? (
              <span style={publishBadge}>{dryRun ? '🔍 Simuler' : '📣 Publier sur Facebook'}</span>
            ) : null}
          </span>
        </button>

        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <a href={previewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>
            Ouvrir l’image ↗
          </a>
          <button type="button" onClick={onPublish} disabled={disabled} style={{
            fontSize: 13, fontWeight: 700, color: 'white', border: 'none', borderRadius: 8,
            padding: '7px 14px', cursor: disabled ? 'wait' : 'pointer',
            background: disabled ? '#94a3b8' : `linear-gradient(90deg, ${DZ_GREEN}, ${DZ_RED})`,
          }}>
            {busy ? '…' : dryRun ? 'Simuler' : 'Publier'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Logo de la wilaya ────────────────────────────────────────

function LogoSection({
  wilaya, wilayaName, hasLogo, onUpload, onRemove,
}: {
  wilaya: string
  wilayaName: string
  hasLogo: boolean
  onUpload: (file: File) => void
  onRemove: () => void
}) {
  // Force le rechargement de l'aperçu après un envoi/une suppression.
  const [version, setVersion] = useState(0)
  useEffect(() => { setVersion((v) => v + 1) }, [hasLogo, wilaya])

  return (
    <div style={{ ...cardStyle, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{
        width: 84, height: 84, borderRadius: 14, border: `2px solid ${DZ_GREEN}`,
        background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/admin/garde/wilaya-logo?wilaya=${encodeURIComponent(wilaya)}&raw=1&v=${version}`}
            alt={`Logo ${wilayaName}`}
            style={{ maxWidth: 68, maxHeight: 68, objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: 26 }}>🏛️</span>
        )}
      </div>

      <div style={{ flexGrow: 1, minWidth: 240 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Logo de la wilaya {wilayaName}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          Affiché en haut des visuels publiés. PNG ou JPEG, 400 Ko maximum — un fond transparent
          (PNG) rend le mieux sur le bandeau sombre.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{
            fontSize: 13, fontWeight: 600, color: 'white', background: DZ_GREEN,
            padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
          }}>
            {hasLogo ? 'Remplacer le logo' : 'Ajouter un logo'}
            <input
              type="file"
              accept="image/png,image/jpeg"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }}
            />
          </label>
          {hasLogo && (
            <button type="button" onClick={onRemove} style={{
              fontSize: 13, fontWeight: 600, color: '#64748b', background: 'transparent',
              border: '1px solid #cbd5e1', padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
            }}>
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Petits composants & styles ───────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{label}</label>
      {children}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
  padding: 18, marginTop: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
}

const selectStyle: React.CSSProperties = {
  fontSize: 14, padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1',
  background: 'white', color: '#0f172a', minWidth: 190,
}

const checkLabel: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155', cursor: 'pointer',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: '#334155', margin: '28px 0 12px',
  textTransform: 'uppercase', letterSpacing: 0.4,
}

const linkStyle: React.CSSProperties = { color: '#64748b', fontSize: 13, textDecoration: 'none' }

const publishBadge: React.CSSProperties = {
  color: 'white', fontWeight: 800, fontSize: 15, background: 'rgba(15,23,42,0.55)',
  padding: '10px 18px', borderRadius: 999, border: '2px solid rgba(255,255,255,0.7)',
}
