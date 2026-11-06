'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import { countCues, formatDuree, slugify, srtToVtt } from '@/lib/videos-core'

type Row = {
  id: number; slug: string; episode: number | null; titre_fr: string; titre_ar: string
  statut: 'brouillon' | 'publie'; duree_sec: number | null; fb_post_id: string | null; video_url: string | null
}
type Form = {
  id?: number; slug: string; episode: string; titre_ar: string; titre_fr: string
  description_ar: string; description_fr: string; video_url: string; poster_url: string
  sous_titres_incrustes: boolean; vtt_ar: string; vtt_fr: string; duree_sec: string
  tags: string; sources: string; statut: 'brouillon' | 'publie'; reviewed_by: string; reviewed_at: string
}

const EMPTY: Form = {
  slug: '', episode: '', titre_ar: '', titre_fr: '', description_ar: '', description_fr: '', video_url: '', poster_url: '',
  sous_titres_incrustes: true, vtt_ar: '', vtt_fr: '', duree_sec: '', tags: 'DwaDZ', sources: '', statut: 'brouillon', reviewed_by: '', reviewed_at: '',
}
const mono: React.CSSProperties = { fontFamily: 'DM Mono, monospace', fontSize: 12 }

/** Durée d'un fichier vidéo local, lue par le navigateur. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(Number.isFinite(v.duration) ? Math.round(v.duration) : null) }
    v.onerror = () => resolve(null)
    v.src = URL.createObjectURL(file)
  })
}

/**
 * Gestion des vidéos pédagogiques : dépôt du MP4 (envoi direct vers Vercel Blob) ou adresse https,
 * sous-titres arabe/français (SRT ou VTT), relecture, publication sur le site puis sur Facebook.
 * Une vidéo publiée exige fichier, relecteur et sources (contrôlé aussi côté API et base).
 */
export function VideosClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [uploadOk, setUploadOk] = useState(false)
  const [fbOk, setFbOk] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  // Envoi en cours : pas de barre de progression (voir sendFile), mais le temps écoulé et un bouton Annuler.
  const [sending, setSending] = useState<{ name: string; size: number; seconds: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const say = (ok: boolean, text: string) => setMsg({ ok, text })
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/videos')
    const data = await res.json().catch(() => ({}))
    if (data?.tableMissing) { setTableMissing(true); return }
    if (!res.ok) { say(false, data?.error || 'Chargement impossible'); return }
    setRows(data.videos); setUploadOk(!!data.uploadConfigured); setFbOk(!!data.facebookConfigured)
  }, [])
  useEffect(() => { load() }, [load])

  async function open(id: number) {
    const res = await fetch(`/api/admin/videos?id=${id}`)
    const { video: v } = await res.json()
    if (!v) return
    setMsg(null)
    setForm({
      id: v.id, slug: v.slug, episode: v.episode?.toString() ?? '', titre_ar: v.titre_ar, titre_fr: v.titre_fr,
      description_ar: v.description_ar, description_fr: v.description_fr, video_url: v.video_url ?? '', poster_url: v.poster_url ?? '',
      sous_titres_incrustes: v.sous_titres_incrustes, vtt_ar: v.vtt_ar ?? '', vtt_fr: v.vtt_fr ?? '', duree_sec: v.duree_sec?.toString() ?? '',
      tags: (v.tags || []).join(', '), sources: v.sources, statut: v.statut, reviewed_by: v.reviewed_by ?? '', reviewed_at: (v.reviewed_at ?? '').slice(0, 10),
    })
  }

  /**
   * Envoi direct vers Vercel Blob. Volontairement SANS `onUploadProgress` : avec un suivi de progression, la bibliothèque envoie
   * le fichier en flux continu (fetch « duplex »), mode qui peut rester bloqué à ~98 % sur certains réseaux. Sans suivi, c'est un
   * envoi classique, plus fiable. On affiche à la place le temps écoulé, avec un délai maximal de 10 minutes et un bouton Annuler.
   */
  async function sendFile(file: File, folder: 'videos' | 'videos/posters') {
    if (!form) return null
    const base = form.slug || slugify(form.titre_fr)
    if (!base) { say(false, 'Renseignez d’abord l’identifiant ou le titre français.'); return null }
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const started = Date.now()
    setSending({ name: file.name, size: file.size, seconds: 0 })
    const tick = setInterval(() => setSending((x) => (x ? { ...x, seconds: Math.round((Date.now() - started) / 1000) } : x)), 1000)
    const limit = setTimeout(() => ctrl.abort(), 10 * 60 * 1000)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || (folder === 'videos' ? 'mp4' : 'png')
      const blob = await upload(`${folder}/${base}.${ext}`, file, {
        access: 'public', handleUploadUrl: '/api/admin/videos/upload', multipart: file.size > 20 * 1024 * 1024, abortSignal: ctrl.signal,
      })
      return blob.url
    } catch (e: any) {
      const annule = ctrl.signal.aborted
      say(false, annule
        ? 'Envoi interrompu. Vérifiez dans Vercel → Storage → Blob si le fichier est arrivé : si oui, copiez son adresse https dans le champ « Adresse du fichier ».'
        : `Envoi impossible : ${e?.message || e}`)
      return null
    } finally {
      clearInterval(tick); clearTimeout(limit); abortRef.current = null; setSending(null)
    }
  }

  async function onVideoFile(file?: File) {
    if (!file || !form) return
    const dur = await readDuration(file)
    const url = await sendFile(file, 'videos')
    if (url) { setForm((f) => (f ? { ...f, video_url: url, duree_sec: dur ? String(dur) : f.duree_sec } : f)); say(true, 'Vidéo envoyée. Pensez à enregistrer.') }
  }
  async function onPosterFile(file?: File) {
    if (!file) return
    const url = await sendFile(file, 'videos/posters')
    if (url) { set('poster_url', url); say(true, 'Image envoyée. Pensez à enregistrer.') }
  }
  async function onCaptions(lang: 'ar' | 'fr', file?: File) {
    if (!file) return
    const vtt = srtToVtt(await file.text())
    if (!vtt) { say(false, 'Fichier de sous-titres illisible (SRT ou VTT attendu).'); return }
    set(lang === 'ar' ? 'vtt_ar' : 'vtt_fr', vtt); say(true, `Sous-titres ${lang === 'ar' ? 'arabes' : 'français'} chargés (${countCues(vtt)} lignes).`)
  }

  async function save() {
    if (!form) return
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { say(false, data?.error || 'Enregistrement refusé'); return }
    say(true, form.statut === 'publie' ? 'Enregistré et publié sur le site.' : 'Brouillon enregistré.')
    await load(); await open(data.id)
  }
  async function remove() {
    if (!form?.id || !confirm('Supprimer définitivement cette vidéo (le fichier reste dans le stockage) ?')) return
    setBusy(true)
    await fetch(`/api/admin/videos?id=${form.id}`, { method: 'DELETE' })
    setBusy(false); setForm(null); setMsg(null); load()
  }
  async function publishFacebook(force = false) {
    if (!form?.id) return
    if (!confirm('Publier cette vidéo sur la Page Facebook maintenant ?')) return
    setBusy(true)
    const res = await fetch('/api/admin/videos/facebook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: form.id, force }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.status === 409 && confirm('Déjà publiée sur Facebook. La publier une seconde fois ?')) return publishFacebook(true)
    say(res.ok, res.ok ? `Envoyée à Facebook (traitement en cours chez eux), identifiant ${data.postId}.` : data?.error || 'Facebook a refusé')
    if (res.ok) { await load(); await open(form.id) }
  }

  if (tableMissing) {
    return <div className="adm-page"><div className="adm-card"><h3>Vidéos</h3><p>La table n’existe pas encore. Appliquez la migration :</p><pre style={mono}>psql &quot;$DATABASE_URL&quot; -f sql/37_videos.sql</pre></div></div>
  }

  const L = (label: string, child: React.ReactNode) => <label className="adm-field">{label}{child}</label>
  const input = (k: keyof Form, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input className="adm-input" value={String(form![k] ?? '')} onChange={(e) => set(k, e.target.value as any)} {...props} />
  )

  return (
    <div className="adm-page">
      <div className="adm-head"><h1>Vidéos pédagogiques</h1></div>
      {msg && <div className="adm-msg" style={{ color: msg.ok ? 'var(--adm-ok)' : 'var(--adm-bad)', marginBottom: 12 }}>{msg.text}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: 16, alignItems: 'start' }}>
        <div className="adm-card">
          <h3>Liste <button className="adm-btn p" onClick={() => { setForm({ ...EMPTY }); setMsg(null) }}>+ Nouvelle</button></h3>
          {rows.length === 0 && <p style={{ fontSize: 13, color: 'var(--adm-muted)' }}>Aucune vidéo pour l’instant.</p>}
          {rows.map((r) => (
            <div key={r.id} onClick={() => open(r.id)} style={{ cursor: 'pointer', padding: '8px 4px', borderBottom: '1px solid var(--adm-line)', background: form?.id === r.id ? 'var(--adm-surface2)' : undefined }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.episode ? `${r.episode}. ` : ''}{r.titre_fr}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span className={`adm-pill ${r.statut === 'publie' ? 'ok' : 'wa'}`}>{r.statut === 'publie' ? 'Publiée' : 'Brouillon'}</span>
                {!r.video_url && <span className="adm-pill bad">sans fichier</span>}
                {r.fb_post_id && <span className="adm-pill ok">Facebook</span>}
                {r.duree_sec ? <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>{formatDuree(r.duree_sec)}</span> : null}
              </div>
            </div>
          ))}
        </div>

        {form ? (
          <div className="adm-card" style={{ display: 'grid', gap: 14 }}>
            <h3>{form.id ? 'Modifier la vidéo' : 'Nouvelle vidéo'}{form.id && form.statut === 'publie' && <Link href={`/videos/${form.slug}`} target="_blank">Voir sur le site ↗</Link>}</h3>
            <div className="adm-fields">
              {L('Titre français', input('titre_fr', { onBlur: () => !form.slug && set('slug', slugify(form.titre_fr)) }))}
              {L('العنوان بالعربية', input('titre_ar', { dir: 'rtl' }))}
              {L('Identifiant (adresse /videos/…)', input('slug', { style: mono }))}
              {L('N° d’épisode', input('episode', { type: 'number', min: 1 }))}
            </div>
            <div className="adm-fields">
              {L('Description française', <textarea className="adm-input" rows={3} value={form.description_fr} onChange={(e) => set('description_fr', e.target.value)} />)}
              {L('الوصف بالعربية', <textarea className="adm-input" rows={3} dir="rtl" value={form.description_ar} onChange={(e) => set('description_ar', e.target.value)} />)}
            </div>

            <div style={{ border: '1px dashed var(--adm-line)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
              <strong style={{ fontSize: 13 }}>Fichier vidéo (MP4)</strong>
              {uploadOk
                ? <input type="file" accept="video/mp4" disabled={busy || sending !== null} onChange={(e) => onVideoFile(e.target.files?.[0])} />
                : <small style={{ color: 'var(--adm-warn)' }}>Envoi de fichiers non configuré (variable BLOB_READ_WRITE_TOKEN) : collez l’adresse https d’un MP4 déjà hébergé.</small>}
              {sending && (
                <div style={{ fontSize: 12.5 }}>
                  Envoi de {sending.name} ({(sending.size / 1048576).toFixed(1)} Mo)… {sending.seconds} s — ne fermez pas la page.{' '}
                  <button type="button" className="adm-btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => abortRef.current?.abort()}>Annuler</button>
                  {sending.seconds >= 90 && (
                    <div style={{ color: 'var(--adm-warn)', marginTop: 4 }}>
                      Cela dure plus que prévu. Le fichier est peut-être déjà arrivé : ouvrez Vercel → Storage → Blob. Si vous l’y voyez,
                      annulez ici et collez son adresse https dans le champ ci-dessous.
                    </div>
                  )}
                </div>
              )}
              <div className="adm-fields">
                {L('Adresse du fichier (https)', input('video_url', { style: mono, placeholder: 'https://…/video.mp4' }))}
                {L('Durée (secondes)', input('duree_sec', { type: 'number', min: 1 }))}
              </div>
              {form.video_url && <video src={form.video_url} controls preload="metadata" style={{ maxWidth: 260, borderRadius: 8 }} />}
              <div className="adm-fields">
                {uploadOk && L('Image d’aperçu (facultative)', <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onPosterFile(e.target.files?.[0])} />)}
                {L('Adresse de l’image', input('poster_url', { style: mono }))}
              </div>
            </div>

            <div style={{ border: '1px dashed var(--adm-line)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
              <strong style={{ fontSize: 13 }}>Sous-titres</strong>
              <label style={{ fontSize: 13 }}><input type="checkbox" checked={form.sous_titres_incrustes} onChange={(e) => set('sous_titres_incrustes', e.target.checked)} /> Les sous-titres sont déjà incrustés dans l’image (cas des vidéos DwaDZ)</label>
              <div className="adm-fields">
                {L(`Arabe (SRT ou VTT) — ${countCues(form.vtt_ar)} lignes`, <input type="file" accept=".srt,.vtt" onChange={(e) => onCaptions('ar', e.target.files?.[0])} />)}
                {L(`Français (SRT ou VTT) — ${countCues(form.vtt_fr)} lignes`, <input type="file" accept=".srt,.vtt" onChange={(e) => onCaptions('fr', e.target.files?.[0])} />)}
              </div>
              <small style={{ color: 'var(--adm-muted)' }}>Fournis, ils servent aussi de transcription lisible et indexable sous la vidéo.</small>
            </div>

            <div className="adm-fields">
              {L('Étiquettes (virgules)', input('tags'))}
              {L('Relu par (pharmacien / médecin)', input('reviewed_by'))}
              {L('Date de relecture', input('reviewed_at', { type: 'date' }))}
              {L('Statut', <select className="adm-input" value={form.statut} onChange={(e) => set('statut', e.target.value as Form['statut'])}><option value="brouillon">Brouillon (invisible)</option><option value="publie">Publiée sur le site</option></select>)}
            </div>
            {L('Sources (une par ligne : ANSM, RCP, OMS…) — obligatoires pour publier', <textarea className="adm-input" rows={3} value={form.sources} onChange={(e) => set('sources', e.target.value)} />)}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="adm-btn p" disabled={busy} onClick={save}>{form.statut === 'publie' ? 'Enregistrer et publier' : 'Enregistrer le brouillon'}</button>
              {form.id && form.statut === 'publie' && (
                <button className="adm-btn" disabled={busy || !fbOk} title={fbOk ? '' : 'Facebook non configuré (FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN)'} onClick={() => publishFacebook()}>Publier sur Facebook</button>
              )}
              {form.id && <button className="adm-btn d" disabled={busy} onClick={remove}>Supprimer</button>}
            </div>
          </div>
        ) : (
          <div className="adm-card"><p style={{ margin: 0, color: 'var(--adm-muted)' }}>Choisissez une vidéo dans la liste ou créez-en une.</p></div>
        )}
      </div>
    </div>
  )
}
