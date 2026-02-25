'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────

type UploadStats = {
  total_enregistrements: number
  added_count: number
  removed_count: number
  total_retraits: number
  total_non_renouveles: number
}

type UploadResult = {
  success: boolean
  versionLabel: string
  stats: UploadStats
  error?: string
}

type Version = {
  id: number
  version_label: string
  reference_date: string | null
  previous_label: string | null
  total_enregistrements: number
  total_nouveautes: number
  total_retraits: number
  total_non_renouveles: number
  removed_count: number
  uploaded_file: string | null
  created_at: string
}

// ─── Composant principal ──────────────────────────────────────

export default function AdminClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [authed, setAuthed] = useState(isAuthenticated)

  if (!authed) return <LoginForm onLogin={() => setAuthed(true)} />
  return <AdminDashboard onLogout={() => setAuthed(false)} />
}

// ─── Formulaire de connexion ──────────────────────────────────

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (res.ok) {
        onLogin()
      } else {
        setError(data.error || 'Erreur de connexion')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ width: 380, background: 'white', borderRadius: 16, padding: 40, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💊</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            PharmaVeille DZ
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>Administration — Accès restreint</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
            Mot de passe administrateur
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: error ? '2px solid #dc2626' : '2px solid #e2e8f0',
              fontSize: 14, outline: 'none', marginBottom: 8,
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ color: '#dc2626', fontSize: 12, marginBottom: 12 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '11px', borderRadius: 8,
              background: loading ? '#94a3b8' : '#0284c7',
              color: 'white', border: 'none', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8,
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/" style={{ color: '#64748b', fontSize: 12, textDecoration: 'none' }}>
            ← Retour au site
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard admin ──────────────────────────────────────────

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'upload' | 'archive'>('upload')

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    onLogout()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: '#0f172a', color: 'white',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>💊</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800 }}>
              PharmaVeille DZ
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              ADMINISTRATION
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>
            ← Site public
          </Link>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', padding: '6px 14px', borderRadius: 7,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', fontFamily: "'Playfair Display', serif", margin: 0 }}>
            Gestion de la Nomenclature
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>
            Importez un fichier Excel MIPH pour mettre à jour la base de données
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
          {[
            { id: 'upload', label: '📤 Importer un fichier' },
            { id: 'archive', label: '🗂️ Archive des versions' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              style={{
                padding: '10px 20px', fontSize: 14, fontWeight: 600,
                border: 'none', background: 'none', cursor: 'pointer',
                color: tab === t.id ? '#0284c7' : '#64748b',
                borderBottom: tab === t.id ? '2px solid #0284c7' : '2px solid transparent',
                marginBottom: -2,
                transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'upload' && <UploadTab />}
        {tab === 'archive' && <ArchiveTab />}
      </div>
    </div>
  )
}

// ─── Onglet Import ────────────────────────────────────────────

function UploadTab() {
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(f: File | null) {
    if (!f) return
    setFile(f)
    setResult(null)
    setError('')
    // Auto-inférer le label depuis le nom de fichier
    if (!label) {
      const base = f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
      const months = 'janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre'
      const m = base.match(new RegExp(`(${months})\\s*(20\\d{2})`, 'i'))
      if (m) {
        const monthStr = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()
        setLabel(`${monthStr} ${m[2]}`)
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.match(/\.(xlsx|xls)$/i)) handleFileChange(f)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      if (label.trim()) fd.append('label', label.trim())

      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()

      if (res.ok) {
        setResult(data)
        setFile(null)
        setLabel('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setError(data.error || 'Erreur lors de l\'importation')
      }
    } catch {
      setError('Erreur réseau — vérifiez votre connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Formulaire */}
      <div>
        <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
            Importation fichier Excel MIPH
          </h2>

          <form onSubmit={handleUpload}>
            {/* Zone de dépôt */}
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragOver ? '2px dashed #0284c7' : file ? '2px solid #059669' : '2px dashed #cbd5e1',
                borderRadius: 12, padding: '32px 20px', textAlign: 'center',
                cursor: 'pointer', transition: 'all .15s',
                background: dragOver ? '#eff6ff' : file ? '#f0fdf4' : '#f8fafc',
                marginBottom: 20,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
              />
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {file ? '✅' : '📂'}
              </div>
              {file ? (
                <>
                  <div style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>{file.name}</div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                    {(file.size / 1024 / 1024).toFixed(1)} Mo — cliquez pour changer
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600, color: '#334155', fontSize: 14 }}>
                    Glissez le fichier ici ou cliquez pour choisir
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    Formats acceptés : .xlsx, .xls
                  </div>
                </>
              )}
            </div>

            {/* Label de version */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Libellé de version
                <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 6 }}>(optionnel — inféré depuis le nom de fichier)</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Ex : Décembre 2025"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '2px solid #e2e8f0', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                color: '#dc2626', fontSize: 13,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              style={{
                width: '100%', padding: '12px',
                background: !file || loading ? '#94a3b8' : '#0284c7',
                color: 'white', border: 'none', borderRadius: 9,
                fontSize: 15, fontWeight: 700, cursor: !file || loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                  Ingestion en cours…
                </>
              ) : (
                '📤 Lancer l\'importation'
              )}
            </button>
          </form>
        </div>

        {/* Info */}
        <div style={{
          background: '#eff6ff', border: '1px solid #bae6fd',
          borderRadius: 12, padding: 16, marginTop: 16,
        }}>
          <div style={{ fontWeight: 700, color: '#0284c7', fontSize: 13, marginBottom: 8 }}>
            ℹ️ Format attendu (MIPH)
          </div>
          <ul style={{ color: '#0369a1', fontSize: 12.5, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Feuille <strong>Nomenclature</strong> — enregistrements actifs</li>
            <li>Feuille <strong>Non Renouvelés</strong> — AMM expirées</li>
            <li>Feuille <strong>Retraits</strong> — médicaments retirés</li>
          </ul>
          <div style={{ color: '#64748b', fontSize: 11.5, marginTop: 8 }}>
            La nomenclature actuelle sera remplacée. L&apos;historique est conservé dans l&apos;archive.
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div>
        {result ? (
          <UploadResultCard result={result} />
        ) : (
          <div style={{
            background: 'white', borderRadius: 14, padding: 40,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            textAlign: 'center', color: '#94a3b8',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Résultats de l&apos;importation</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Les statistiques apparaîtront ici après l&apos;importation
            </div>
          </div>
        )}

        {loading && (
          <div style={{
            background: 'white', borderRadius: 14, padding: 40,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <div style={{ fontWeight: 700, color: '#0284c7', fontSize: 15 }}>Ingestion en cours…</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
              Analyse et insertion des données dans la base.
              <br />Cela peut prendre jusqu&apos;à 30 secondes.
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Résultat d'import ────────────────────────────────────────

function UploadResultCard({ result }: { result: UploadResult }) {
  const { versionLabel, stats } = result

  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: 28,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 24,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 50,
          background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>✅</div>
        <div>
          <div style={{ fontWeight: 800, color: '#059669', fontSize: 15 }}>Importation réussie</div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Version : {versionLabel}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StatBadge
          icon="✅"
          label="Enregistrements actifs"
          value={stats.total_enregistrements}
          color="#0284c7"
          bg="#eff6ff"
        />
        <StatBadge
          icon="🆕"
          label="Nouveaux ajoutés"
          value={stats.added_count}
          color="#059669"
          bg="#f0fdf4"
        />
        <StatBadge
          icon="➖"
          label="Retirés de la nomenclature"
          value={stats.removed_count}
          color="#f59e0b"
          bg="#fffbeb"
        />
        <StatBadge
          icon="🚫"
          label="Retraits (feuille)"
          value={stats.total_retraits}
          color="#dc2626"
          bg="#fef2f2"
        />
        <StatBadge
          icon="⚠️"
          label="Non renouvelés"
          value={stats.total_non_renouveles}
          color="#f59e0b"
          bg="#fffbeb"
        />
      </div>

      <div style={{
        marginTop: 20, padding: '12px 16px',
        background: '#f8fafc', borderRadius: 8,
        fontSize: 12.5, color: '#64748b',
      }}>
        La nomenclature publique a été mise à jour. La version <strong>{versionLabel}</strong> est maintenant active.
      </div>
    </div>
  )
}

function StatBadge({ icon, label, value, color, bg }: {
  icon: string; label: string; value: number; color: string; bg: string
}) {
  return (
    <div style={{
      background: bg, borderRadius: 10, padding: '14px 16px',
      border: `1px solid ${color}22`,
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value.toLocaleString('fr')}</div>
      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ─── Onglet Archive ───────────────────────────────────────────

function ArchiveTab() {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadVersions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/versions')
      if (!res.ok) throw new Error('Erreur API')
      const data = await res.json()
      setVersions(data.versions || [])
    } catch {
      setError('Impossible de charger l\'historique')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadVersions() }, [loadVersions])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div>Chargement de l&apos;historique…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        background: '#fef2f2', border: '1px solid #fecaca',
        borderRadius: 12, padding: 20, color: '#dc2626',
      }}>
        ⚠️ {error}
        <button onClick={loadVersions} style={{ marginLeft: 12, color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          Réessayer
        </button>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div style={{
        background: 'white', borderRadius: 14, padding: 60,
        textAlign: 'center', color: '#94a3b8',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🗂️</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Aucune version importée</div>
        <div style={{ fontSize: 13, marginTop: 8 }}>Utilisez l&apos;onglet &quot;Importer&quot; pour ajouter la première version</div>
      </div>
    )
  }

  // Grouper par année
  const byYear: Record<string, Version[]> = {}
  for (const v of versions) {
    const year = v.reference_date
      ? new Date(v.reference_date).getFullYear().toString()
      : v.version_label.match(/20\d{2}/)?.[0] || 'Autre'
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(v)
  }

  return (
    <div>
      {/* Version courante */}
      {versions[0] && (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #0c2340 100%)',
          borderRadius: 14, padding: 24, marginBottom: 24, color: 'white',
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{ fontSize: 40 }}>📋</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '.08em', marginBottom: 4 }}>
              VERSION ACTIVE
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>
              {versions[0].version_label}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, marginTop: 4 }}>
              Importée le {new Date(versions[0].created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {versions[0].uploaded_file && ` — ${versions[0].uploaded_file}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <MiniStat label="Enregistrements" value={versions[0].total_enregistrements} />
            <MiniStat label="Ajoutés" value={versions[0].total_nouveautes} color="#34d399" />
            <MiniStat label="Retirés" value={versions[0].removed_count} color="#f87171" />
            <MiniStat label="Retraits" value={versions[0].total_retraits} color="#fbbf24" />
          </div>
        </div>
      )}

      {/* Archive par année */}
      {Object.entries(byYear)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([year, yearVersions]) => (
          <div key={year} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#64748b',
              letterSpacing: '.06em', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ flex: 1, height: 1, background: '#e2e8f0', display: 'block' }} />
              {year}
              <span style={{ flex: 1, height: 1, background: '#e2e8f0', display: 'block' }} />
            </div>

            <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Version', 'Date import', 'Enregistrements', 'Ajoutés', 'Retirés', 'Retraits', 'Non renouvelés', 'Fichier'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left',
                        fontSize: 11.5, fontWeight: 700, color: '#64748b',
                        letterSpacing: '.04em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearVersions.map((v, i) => (
                    <tr
                      key={v.id}
                      style={{
                        borderBottom: i < yearVersions.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: i === 0 && year === Object.keys(byYear).sort((a, b) => Number(b) - Number(a))[0]
                          ? '#eff6ff' : 'white',
                      }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                          {v.version_label}
                          {i === 0 && year === Object.keys(byYear).sort((a, b) => Number(b) - Number(a))[0] && (
                            <span style={{
                              marginLeft: 8, fontSize: 10, fontWeight: 700,
                              background: '#0284c7', color: 'white',
                              padding: '2px 7px', borderRadius: 10,
                            }}>ACTIVE</span>
                          )}
                        </div>
                        {v.previous_label && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            vs {v.previous_label}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#64748b' }}>
                        {new Date(v.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 700, color: '#0284c7', fontSize: 13 }}>
                          {v.total_enregistrements.toLocaleString('fr')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 700, color: '#059669', fontSize: 13 }}>
                          +{v.total_nouveautes.toLocaleString('fr')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 700, color: v.removed_count > 0 ? '#f59e0b' : '#94a3b8', fontSize: 13 }}>
                          -{v.removed_count.toLocaleString('fr')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>
                          {v.total_retraits.toLocaleString('fr')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: 13 }}>
                          {v.total_non_renouveles.toLocaleString('fr')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {v.uploaded_file ? (
                          <span style={{
                            fontSize: 11, color: '#64748b', fontFamily: 'monospace',
                            background: '#f1f5f9', padding: '2px 6px', borderRadius: 4,
                          }}>
                            {v.uploaded_file.length > 20 ? '…' + v.uploaded_file.slice(-18) : v.uploaded_file}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button
          onClick={loadVersions}
          style={{
            background: 'none', border: '1px solid #e2e8f0',
            padding: '8px 18px', borderRadius: 7,
            color: '#64748b', fontSize: 12, cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ↻ Actualiser
        </button>
      </div>
    </div>
  )
}

function MiniStat({ label, value, color = 'white' }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value.toLocaleString('fr')}</div>
      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
