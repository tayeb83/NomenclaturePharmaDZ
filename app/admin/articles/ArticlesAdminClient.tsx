'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { extraireMeta, htmlToMarkdown, nettoyerTexte, readingMinutes, slugify } from '@/lib/articles-core'

type Row = {
  id: number; slug: string; lang: 'fr' | 'ar'; title: string; statut: 'brouillon' | 'publie'
  fb_post_id: string | null; source_nom: string | null; updated_at: string
}
type Form = {
  id?: number; slug: string; lang: 'fr' | 'ar'; audience: 'professionnel' | 'etudiant'
  title: string; subtitle: string; description: string; seo_title: string; tags: string
  image_url: string; body: string; traduction_slug: string; source_nom: string; source_url: string
  statut: 'brouillon' | 'publie'; fb_post_id?: string | null
}

const EMPTY: Form = {
  slug: '', lang: 'fr', audience: 'professionnel', title: '', subtitle: '', description: '', seo_title: '', tags: '',
  image_url: '', body: '', traduction_slug: '', source_nom: '', source_url: '', statut: 'brouillon',
}
const mono: React.CSSProperties = { fontFamily: 'DM Mono, monospace', fontSize: 12 }

const AIDE = `## Intertitre
Un paragraphe. Le premier paragraphe est le chapô.

### Sous-titre
- liste à puces avec du **gras**
- deuxième élément

> Encadré d’information
> [!warning] Encadré d’alerte
| Colonne 1 | Colonne 2 |
|---|---|
| a | b |

![Texte alternatif](https://…/image.jpg "Légende")`

/**
 * Articles du site (français / arabe) : rédaction, import depuis une autre source (fichier .md/.html/.txt ou adresse
 * d'une page), publication sur le site et sur Facebook. Le partage Facebook figure aussi sous chaque article publié.
 */
export function ArticlesAdminClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [tableMissing, setTableMissing] = useState(false)
  const [fbOk, setFbOk] = useState(false)
  const [uploadOk, setUploadOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const say = (ok: boolean, text: string) => setMsg({ ok, text })
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/articles')
    const data = await res.json().catch(() => ({}))
    if (data?.tableMissing) { setTableMissing(true); return }
    if (!res.ok) { say(false, data?.error || 'Chargement impossible'); return }
    setRows(data.articles); setFbOk(!!data.facebookConfigured); setUploadOk(!!data.uploadConfigured)
  }, [])
  useEffect(() => { load() }, [load])

  async function open(id: number) {
    const res = await fetch(`/api/admin/articles?id=${id}`)
    const { article: a } = await res.json()
    if (!a) return
    setMsg(null)
    setForm({
      id: a.id, slug: a.slug, lang: a.lang, audience: a.audience, title: a.title, subtitle: a.subtitle, description: a.description,
      seo_title: a.seo_title ?? '', tags: (a.tags || []).join(', '), image_url: a.image_url ?? '', body: a.body,
      traduction_slug: a.traduction_slug ?? '', source_nom: a.source_nom ?? '', source_url: a.source_url ?? '',
      statut: a.statut, fb_post_id: a.fb_post_id,
    })
  }

  async function save(statut: Form['statut']) {
    if (!form) return
    setBusy(true); setMsg(null)
    const payload = { ...form, statut, slug: form.slug || slugify(form.title) }
    const res = await fetch('/api/admin/articles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { say(false, data?.error || 'Enregistrement refusé'); return }
    say(true, statut === 'publie' ? 'Enregistré et publié sur le site.' : 'Brouillon enregistré.')
    await load(); await open(data.id)
  }
  async function remove() {
    if (!form?.id || !confirm('Supprimer définitivement cet article ?')) return
    setBusy(true)
    await fetch(`/api/admin/articles?id=${form.id}`, { method: 'DELETE' })
    setBusy(false); setForm(null); setMsg(null); load()
  }
  async function publishFacebook(force = false) {
    if (!form?.id) return
    if (!force && !confirm('Publier cet article sur la Page Facebook maintenant ?')) return
    setBusy(true)
    const res = await fetch('/api/admin/articles/facebook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: form.id, force }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.status === 409 && confirm('Déjà publié sur Facebook. Le publier une seconde fois ?')) return publishFacebook(true)
    say(res.ok, res.ok ? `Publié sur Facebook (identifiant ${data.postId}).` : data?.error || 'Facebook a refusé')
    if (res.ok) { await load(); await open(form.id) }
  }

  /** Remplit le formulaire depuis une source externe sans écraser ce qui est déjà saisi. */
  function fill(p: Partial<Form>) {
    setForm((f) => {
      const base = f ?? { ...EMPTY }
      return {
        ...base,
        title: base.title || p.title || '', description: base.description || p.description || '',
        image_url: base.image_url || p.image_url || '', lang: p.lang ?? base.lang,
        body: p.body ?? base.body, source_nom: p.source_nom ?? base.source_nom, source_url: p.source_url ?? base.source_url,
        slug: base.slug || (p.title ? slugify(p.title) : ''),
      }
    })
  }

  async function importFromUrl() {
    if (!importUrl.trim()) return
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/articles/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: importUrl.trim() }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { say(false, data?.error || 'Import impossible'); return }
    fill({ title: data.title, description: data.description, image_url: data.image_url ?? '', lang: data.lang ?? undefined, body: data.body, source_nom: data.source_nom, source_url: data.source_url })
    setImportUrl('')
    say(true, `Page importée (${data.minutes} min de lecture). Relisez, reformulez si besoin, puis enregistrez : la source d’origine sera affichée sous l’article.`)
  }

  async function importFromFile(file?: File) {
    if (!file) return
    const brut = await file.text()
    if (/\.html?$/i.test(file.name) || /^\s*<(!doctype|html)/i.test(brut)) {
      const m = extraireMeta(brut)
      fill({ title: m.title, description: m.description, image_url: m.image ?? '', lang: m.lang ?? undefined, body: htmlToMarkdown(brut) })
    } else {
      const md = nettoyerTexte(brut)
      const titre = /^#\s+(.+)$/m.exec(md)?.[1]?.trim() ?? file.name.replace(/\.\w+$/, '')
      fill({ title: titre, body: md.replace(/^#\s+.+\n+/, '') })
    }
    say(true, `Fichier « ${file.name} » chargé. Complétez le résumé, la langue et la source, puis enregistrez.`)
  }

  async function onCover(file?: File) {
    if (!file) return
    setBusy(true)
    const fd = new FormData()
    fd.append('file', file); fd.append('name', form?.slug || slugify(form?.title || 'couverture'))
    const res = await fetch('/api/admin/articles/upload', { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { say(false, data?.error || 'Envoi impossible'); return }
    set('image_url', data.url); say(true, 'Image envoyée. Pensez à enregistrer.')
  }

  if (tableMissing) {
    return <div className="adm-page"><div className="adm-card"><h3>Articles</h3><p>La table n’existe pas encore. Appliquez la migration :</p><pre style={mono}>psql &quot;$DATABASE_URL&quot; -f sql/41_articles_admin.sql</pre></div></div>
  }

  const L = (label: string, child: React.ReactNode) => <label className="adm-field">{label}{child}</label>
  const input = (k: keyof Form, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input className="adm-input" value={String(form![k] ?? '')} onChange={(e) => set(k, e.target.value as any)} {...props} />
  )
  const rtl = form?.lang === 'ar'
  const dir = rtl ? ('rtl' as const) : undefined

  return (
    <div className="adm-page">
      <div className="adm-head">
        <div>
          <h1>Articles</h1>
          <p>Rédigez et publiez des articles en français ou en arabe, ou importez-en depuis une autre source. Chaque article publié porte un bloc de partage Facebook, et peut être publié sur la Page d’ici.</p>
        </div>
      </div>
      {msg && <div className="adm-msg" style={{ color: msg.ok ? 'var(--adm-ok)' : 'var(--adm-bad)' }}>{msg.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: 16, alignItems: 'start' }}>
        <div className="adm-card">
          <h3>Liste <button className="adm-btn p" onClick={() => { setForm({ ...EMPTY }); setMsg(null) }}>+ Nouvel article</button></h3>
          {rows.length === 0 && <p style={{ fontSize: 13, color: 'var(--adm-muted)' }}>Aucun article en base pour l’instant (les articles historiques restent dans le code).</p>}
          {rows.map((r) => (
            <div key={r.id} onClick={() => open(r.id)} style={{ cursor: 'pointer', padding: '8px 4px', borderBottom: '1px solid var(--adm-line)', background: form?.id === r.id ? 'var(--adm-surface2)' : undefined }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, direction: r.lang === 'ar' ? 'rtl' : 'ltr' }}>{r.title}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span className="adm-pill">{r.lang === 'ar' ? 'AR' : 'FR'}</span>
                <span className={`adm-pill ${r.statut === 'publie' ? 'ok' : 'wa'}`}>{r.statut === 'publie' ? 'Publié' : 'Brouillon'}</span>
                {r.fb_post_id && <span className="adm-pill ok">Facebook</span>}
                {r.source_nom && <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>via {r.source_nom}</span>}
              </div>
            </div>
          ))}
        </div>

        {form ? (
          <div className="adm-card" style={{ display: 'grid', gap: 14 }}>
            <h3>{form.id ? 'Modifier l’article' : 'Nouvel article'}
              {form.id && <Link href={`/articles/${form.slug}`} target="_blank">{form.statut === 'publie' ? 'Voir sur le site ↗' : 'Aperçu (brouillon) ↗'}</Link>}
            </h3>

            <div style={{ border: '1px dashed var(--adm-line)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
              <strong style={{ fontSize: 13 }}>Importer depuis une autre source</strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input className="adm-input" style={{ flex: '1 1 280px', ...mono }} placeholder="https://… adresse d’un article" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} />
                <button className="adm-btn" disabled={busy || !importUrl.trim()} onClick={importFromUrl}>Importer la page</button>
              </div>
              <label style={{ fontSize: 13 }}>ou un fichier : <input type="file" accept=".md,.markdown,.txt,.html,.htm" onChange={(e) => { importFromFile(e.target.files?.[0]); e.target.value = '' }} /></label>
              <small style={{ color: 'var(--adm-muted)' }}>Le texte est converti, vous le relisez avant d’enregistrer. Un article repris d’un autre site : respectez ses droits (autorisation, citation) ; sa source est mentionnée sous l’article.</small>
            </div>

            <div className="adm-fields">
              {L('Langue', (
                <select className="adm-input" value={form.lang} onChange={(e) => set('lang', e.target.value as Form['lang'])}>
                  <option value="fr">Français</option><option value="ar">العربية</option>
                </select>
              ))}
              {L('Public', (
                <select className="adm-input" value={form.audience} onChange={(e) => set('audience', e.target.value as Form['audience'])}>
                  <option value="professionnel">Professionnel</option><option value="etudiant">Étudiant</option>
                </select>
              ))}
              {L('Identifiant (adresse /articles/…)', input('slug', { style: mono, placeholder: slugify(form.title || 'mon-article') }))}
              {L('Version dans l’autre langue (identifiant, facultatif)', input('traduction_slug', { style: mono }))}
            </div>
            <div className="adm-fields">
              {L('Titre', input('title', { dir, onBlur: () => !form.slug && form.title && set('slug', slugify(form.title)) }))}
              {L('Sous-titre', input('subtitle', { dir }))}
            </div>
            {L(`Résumé (moteurs de recherche et Facebook) — ${form.description.length}/400`, <textarea className="adm-input" rows={2} dir={dir} maxLength={400} value={form.description} onChange={(e) => set('description', e.target.value)} />)}
            <div className="adm-fields">
              {L('Étiquettes (virgules) — servent aussi de hashtags Facebook', input('tags', { dir }))}
              {L('Titre SEO (facultatif)', input('seo_title', { dir }))}
            </div>

            <div style={{ border: '1px dashed var(--adm-line)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
              <strong style={{ fontSize: 13 }}>Image de couverture (facultative)</strong>
              <div className="adm-fields">
                {uploadOk && L('Envoyer une image (PNG, JPEG, WebP — 4 Mo)', <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => onCover(e.target.files?.[0])} />)}
                {L('Adresse de l’image (https)', input('image_url', { style: mono, placeholder: 'https://…' }))}
              </div>
              {form.image_url && /^https:/.test(form.image_url) && /* eslint-disable-next-line @next/next/no-img-element */ <img src={form.image_url} alt="" style={{ maxWidth: 260, borderRadius: 8 }} />}
              <small style={{ color: 'var(--adm-muted)' }}>Elle figure dans le visuel de partage Facebook (1200×630) généré pour l’article.</small>
            </div>

            <label className="adm-field">
              Texte de l’article (Markdown simple) — {readingMinutes(form.body)} min de lecture
              <textarea className="adm-input" rows={18} dir={dir} style={{ ...mono, fontSize: 13, lineHeight: 1.6 }} value={form.body} onChange={(e) => set('body', e.target.value)} />
            </label>
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Aide à la mise en forme</summary>
              <pre style={{ ...mono, background: 'var(--adm-surface2)', padding: 10, borderRadius: 8, whiteSpace: 'pre-wrap' }}>{AIDE}</pre>
            </details>

            <div style={{ border: '1px dashed var(--adm-line)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
              <strong style={{ fontSize: 13 }}>Source d’origine (si l’article est écrit ailleurs)</strong>
              <div className="adm-fields">
                {L('Nom (site, auteur, revue)', input('source_nom'))}
                {L('Adresse de l’article d’origine', input('source_url', { style: mono, placeholder: 'https://…' }))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="adm-btn p" disabled={busy} onClick={() => save('publie')}>{form.statut === 'publie' ? 'Enregistrer (publié)' : 'Publier sur le site'}</button>
              <button className="adm-btn" disabled={busy} onClick={() => save('brouillon')}>{form.statut === 'publie' ? 'Repasser en brouillon' : 'Enregistrer le brouillon'}</button>
              {form.id && form.statut === 'publie' && (
                <button className="adm-btn" disabled={busy || !fbOk} title={fbOk ? '' : 'Facebook non configuré (FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN)'} onClick={() => publishFacebook()}>
                  {form.fb_post_id ? 'Republier sur Facebook' : 'Publier sur Facebook'}
                </button>
              )}
              {form.id && <button className="adm-btn d" disabled={busy} onClick={remove}>Supprimer</button>}
            </div>
          </div>
        ) : (
          <div className="adm-card"><p style={{ margin: 0, color: 'var(--adm-muted)' }}>Choisissez un article dans la liste, ou créez-en un.</p></div>
        )}
      </div>
    </div>
  )
}
