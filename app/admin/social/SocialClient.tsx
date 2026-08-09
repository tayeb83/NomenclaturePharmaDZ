'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Rubrique = 'classe' | 'algerie' | 'retrait' | 'nouveaute'

type SocialPost = {
  id: number
  rubrique: Rubrique
  titre: string
  corps: string
  lien: string | null
  statut: 'draft' | 'approuve' | 'publie' | 'ignore'
  scheduled_for: string | null
  published_at: string | null
  fb_post_id: string | null
  error: string | null
  created_at: string
}

const RUBRIQUE_LABEL: Record<Rubrique, string> = {
  classe: '💊 Classe thérapeutique',
  algerie: '🇩🇿 Fabriqué en Algérie',
  retrait: '⚠️ Retrait',
  nouveaute: '🆕 Nouveautés & chiffres',
}

const STATUT_LABEL: Record<SocialPost['statut'], { txt: string; color: string; bg: string }> = {
  draft: { txt: 'Brouillon', color: '#92400e', bg: '#fef3c7' },
  approuve: { txt: 'Approuvé', color: '#065f46', bg: '#d1fae5' },
  publie: { txt: 'Publié', color: '#1e40af', bg: '#dbeafe' },
  ignore: { txt: 'Ignoré', color: '#6b7280', bg: '#f3f4f6' },
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Algiers',
  }).format(new Date(iso))
}

function fmtDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  // datetime-local attend YYYY-MM-DDTHH:mm en heure locale du navigateur
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type FacebookDiagnostic = {
  configured: { pageId: boolean; token: boolean; appId: boolean; appSecret: boolean }
  tokenType?: string
  tokenAppId?: string
  tokenAppName?: string
  tokenUserId?: string
  expiresAt?: string | null
  scopes?: string[]
  missingScopes?: string[]
  page?: { id: string; name?: string; canPost: boolean }
  usedTokenSource?: 'page' | 'configured'
  ok: boolean
  problems: string[]
  hints: string[]
}

export function SocialClient() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | 'gen' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<number, { corps: string; scheduled_for: string }>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/social', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setPosts(data.posts || [])
      else setMsg(data.error || 'Erreur de chargement')
    } catch {
      setMsg('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function generate(count: number) {
    setBusy('gen'); setMsg(null)
    try {
      const res = await fetch('/api/admin/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg(data.count > 0 ? `${data.count} brouillon(s) généré(s).` : 'Aucun nouveau sujet à proposer pour le moment.')
        await load()
      } else setMsg(data.error || 'Erreur de génération')
    } catch {
      setMsg('Erreur réseau')
    } finally {
      setBusy(null)
    }
  }

  async function patch(id: number, body: any, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setBusy(id); setMsg(null)
    try {
      const res = await fetch(`/api/admin/social/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setEditing((e) => { const n = { ...e }; delete n[id]; return n })
        await load()
      } else setMsg(data.error || 'Erreur')
    } catch {
      setMsg('Erreur réseau')
    } finally {
      setBusy(null)
    }
  }

  function startEdit(p: SocialPost) {
    setEditing((e) => ({ ...e, [p.id]: { corps: p.corps, scheduled_for: fmtDateInput(p.scheduled_for) } }))
  }

  function saveEdit(id: number) {
    const e = editing[id]
    if (!e) return
    const body: any = { corps: e.corps }
    if (e.scheduled_for) body.scheduled_for = new Date(e.scheduled_for).toISOString()
    patch(id, body)
  }

  const drafts = posts.filter((p) => p.statut === 'draft')
  const approved = posts.filter((p) => p.statut === 'approuve')
  const published = posts.filter((p) => p.statut === 'publie')

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📣 Publications Facebook</h1>
          <Link href="/admin" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>← Admin</Link>
        </div>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 0 }}>
          Le site prépare des posts thématiques sur la nomenclature. Relisez, ajustez et validez —
          les posts approuvés partent automatiquement sur la Page Facebook à leur date.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
          <button onClick={() => generate(1)} disabled={busy === 'gen'} style={btnPrimary}>
            {busy === 'gen' ? '…' : '＋ Générer 1 brouillon'}
          </button>
          <button onClick={() => generate(5)} disabled={busy === 'gen'} style={btnSecondary}>
            Générer 5 brouillons
          </button>
          <button onClick={load} disabled={loading} style={btnSecondary}>↻ Rafraîchir</button>
          <Link href="/admin/garde/publication" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-block' }}>
            🇩🇿 Publier les gardes
          </Link>
        </div>

        <FacebookDiagnosticPanel />

        {msg && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '8px 12px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
            {msg}
          </div>
        )}

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Chargement…</p>
        ) : (
          <>
            <Section title={`Brouillons à valider (${drafts.length})`}>
              {drafts.length === 0 && <Empty>Aucun brouillon. Cliquez sur « Générer » pour en créer.</Empty>}
              {drafts.map((p) => (
                <PostCard key={p.id} p={p} busy={busy === p.id}
                  editing={editing[p.id]}
                  onStartEdit={() => startEdit(p)}
                  onChangeCorps={(v) => setEditing((e) => ({ ...e, [p.id]: { ...e[p.id], corps: v } }))}
                  onChangeDate={(v) => setEditing((e) => ({ ...e, [p.id]: { ...e[p.id], scheduled_for: v } }))}
                  onSaveEdit={() => saveEdit(p.id)}
                  onCancelEdit={() => setEditing((e) => { const n = { ...e }; delete n[p.id]; return n })}
                  actions={[
                    { label: '✓ Approuver', style: btnApprove, onClick: () => patch(p.id, { action: 'approve' }) },
                    { label: '⚡ Publier maintenant', style: btnPublish, onClick: () => patch(p.id, { action: 'publish' }, 'Publier ce post sur Facebook immédiatement ?') },
                    { label: 'Ignorer', style: btnGhost, onClick: () => patch(p.id, { action: 'ignore' }) },
                  ]}
                />
              ))}
            </Section>

            <Section title={`Approuvés — en attente de publication (${approved.length})`}>
              {approved.length === 0 && <Empty>Aucun post approuvé.</Empty>}
              {approved.map((p) => (
                <PostCard key={p.id} p={p} busy={busy === p.id}
                  editing={editing[p.id]}
                  onStartEdit={() => startEdit(p)}
                  onChangeCorps={(v) => setEditing((e) => ({ ...e, [p.id]: { ...e[p.id], corps: v } }))}
                  onChangeDate={(v) => setEditing((e) => ({ ...e, [p.id]: { ...e[p.id], scheduled_for: v } }))}
                  onSaveEdit={() => saveEdit(p.id)}
                  onCancelEdit={() => setEditing((e) => { const n = { ...e }; delete n[p.id]; return n })}
                  actions={[
                    { label: '⚡ Publier maintenant', style: btnPublish, onClick: () => patch(p.id, { action: 'publish' }, 'Publier ce post sur Facebook immédiatement ?') },
                    { label: '↩ Remettre en brouillon', style: btnGhost, onClick: () => patch(p.id, { statut: 'draft' }) },
                  ]}
                />
              ))}
            </Section>

            <Section title={`Publiés (${published.length})`}>
              {published.length === 0 && <Empty>Rien de publié pour l’instant.</Empty>}
              {published.map((p) => <PostCard key={p.id} p={p} busy={false} readOnly />)}
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

/**
 * Vérification de la configuration Facebook, sans rien publier. Répond à
 * l'erreur « Cannot call API for app … on behalf of user … » : elle signale
 * un jeton *utilisateur* là où l'API Graph attend un jeton de Page.
 */
function FacebookDiagnosticPanel() {
  const [diag, setDiag] = useState<FacebookDiagnostic | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/social/diagnostic', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setDiag(data)
      else setError(data.error || 'Erreur de diagnostic')
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>🩺 Connexion Facebook</span>
        <button onClick={run} disabled={loading} style={btnSecondary}>
          {loading ? 'Vérification…' : 'Vérifier la configuration'}
        </button>
      </div>

      {error && <div style={{ marginTop: 8, fontSize: 13, color: '#b91c1c' }}>{error}</div>}

      {diag && (
        <div style={{ marginTop: 10, fontSize: 13, color: '#334155' }}>
          <div style={{
            display: 'inline-block', fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '3px 10px',
            color: diag.ok ? '#065f46' : '#991b1b', background: diag.ok ? '#d1fae5' : '#fee2e2',
          }}>
            {diag.ok ? 'Configuration valide' : 'Publication impossible en l’état'}
          </div>

          <ul style={{ margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Page : {diag.page?.name ? `${diag.page.name} (${diag.page.id})` : diag.configured.pageId ? 'identifiant configuré, non joignable' : 'FACEBOOK_PAGE_ID manquant'}</li>
            <li>Jeton : {diag.tokenType ? `type ${diag.tokenType}` : 'type inconnu'}
              {diag.usedTokenSource === 'page' && ' — jeton de Page dérivé automatiquement ✓'}
              {diag.expiresAt && ` — expire le ${new Date(diag.expiresAt).toLocaleDateString('fr-FR')}`}
              {diag.expiresAt === null && diag.tokenType && ' — sans expiration'}
            </li>
            {diag.tokenAppName && <li>Application : {diag.tokenAppName} ({diag.tokenAppId})</li>}
            {diag.scopes?.length ? <li>Autorisations : {diag.scopes.join(', ')}</li> : null}
          </ul>

          {diag.problems.map((p, i) => (
            <div key={i} style={{ marginTop: 8, fontSize: 13, color: '#b91c1c' }}>⚠️ {p}</div>
          ))}
          {diag.hints.map((h, i) => (
            <div key={i} style={{ marginTop: 8, fontSize: 13, color: '#1e40af', background: '#eff6ff', padding: '8px 10px', borderRadius: 8 }}>
              💡 {h}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#334155', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{title}</h2>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#94a3b8', fontSize: 14, fontStyle: 'italic' }}>{children}</p>
}

type Action = { label: string; style: React.CSSProperties; onClick: () => void }

function PostCard({
  p, busy, readOnly, actions, editing, onStartEdit, onChangeCorps, onChangeDate, onSaveEdit, onCancelEdit,
}: {
  p: SocialPost
  busy: boolean
  readOnly?: boolean
  actions?: Action[]
  editing?: { corps: string; scheduled_for: string }
  onStartEdit?: () => void
  onChangeCorps?: (v: string) => void
  onChangeDate?: (v: string) => void
  onSaveEdit?: () => void
  onCancelEdit?: () => void
}) {
  const st = STATUT_LABEL[p.statut]
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{RUBRIQUE_LABEL[p.rubrique]}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 999 }}>{st.txt}</span>
      </div>

      {editing ? (
        <>
          <textarea
            value={editing.corps}
            onChange={(e) => onChangeCorps?.(e.target.value)}
            rows={Math.max(5, editing.corps.split('\n').length + 1)}
            style={{ width: '100%', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: '#64748b' }}>Publication :</label>
            <input type="datetime-local" value={editing.scheduled_for} onChange={(e) => onChangeDate?.(e.target.value)}
              style={{ fontSize: 13, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onSaveEdit} disabled={busy} style={btnApprove}>💾 Enregistrer</button>
            <button onClick={onCancelEdit} disabled={busy} style={btnGhost}>Annuler</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5, color: '#1e293b' }}>{p.corps}</div>
          {p.lien && <a href={p.lien} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6, fontSize: 13, color: '#2563eb', wordBreak: 'break-all' }}>{p.lien}</a>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {p.statut === 'publie' ? `Publié le ${fmtDate(p.published_at)}` : `Prévu le ${fmtDate(p.scheduled_for)}`}
            </span>
            {!readOnly && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={onStartEdit} disabled={busy} style={btnGhost}>✎ Modifier</button>
                {actions?.map((a) => (
                  <button key={a.label} onClick={a.onClick} disabled={busy} style={a.style}>{a.label}</button>
                ))}
              </div>
            )}
          </div>
          {p.error && <div style={{ marginTop: 8, fontSize: 12, color: '#b91c1c' }}>Erreur : {p.error}</div>}
        </>
      )}
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const btnBase: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
}
const btnPrimary: React.CSSProperties = { ...btnBase, background: '#2563eb', color: 'white' }
const btnSecondary: React.CSSProperties = { ...btnBase, background: '#e2e8f0', color: '#334155' }
const btnApprove: React.CSSProperties = { ...btnBase, background: '#059669', color: 'white' }
const btnPublish: React.CSSProperties = { ...btnBase, background: '#7c3aed', color: 'white' }
const btnGhost: React.CSSProperties = { ...btnBase, background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1' }
