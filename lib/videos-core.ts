/**
 * DwaDZ — Vidéos pédagogiques : logique pure (sans base ni réseau), testable.
 * Voix et texte en arabe standard, sous-titres français (voir docs/videos/README.md).
 *   npm run test:videos
 */

export type VideoStatut = 'brouillon' | 'publie'

export type VideoInput = {
  id?: number
  slug: string
  episode: number | null
  titre_ar: string
  titre_fr: string
  description_ar: string
  description_fr: string
  video_url: string | null
  poster_url: string | null
  sous_titres_incrustes: boolean
  vtt_ar: string | null
  vtt_fr: string | null
  duree_sec: number | null
  tags: string[]
  sources: string
  statut: VideoStatut
  reviewed_by: string | null
  reviewed_at: string | null
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** « C'est quoi l'ATC ? » → « c-est-quoi-l-atc » ; à défaut de latin (titre arabe seul) : « video ». */
export function slugify(text: string): string {
  const s = text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
  return s || 'video'
}

export const isHttpsUrl = (v: unknown): v is string => {
  if (typeof v !== 'string') return false
  try { return new URL(v).protocol === 'https:' } catch { return false }
}

const TS = /(\d{1,2}:)?\d{2}:\d{2}[.,]\d{3}\s*-->\s*(\d{1,2}:)?\d{2}:\d{2}[.,]\d{3}/

/** Convertit du SRT en WebVTT (les navigateurs n'acceptent que le VTT dans <track>). Un VTT valide est renvoyé nettoyé. */
export function srtToVtt(raw: string): string {
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim()
  const body = text.replace(/^WEBVTT[^\n]*\n+/, '')
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  const out: string[] = []
  for (const block of blocks) {
    const lines = block.split('\n')
    const i = lines.findIndex((l) => TS.test(l))
    if (i < 0) continue // bloc sans minutage : ignoré
    const timing = lines[i].replace(/(\d{2}),(\d{3})/g, '$1.$2').replace(/^(\d{2}:\d{2}\.\d{3})/, '00:$1').replace(/-->\s*(\d{2}:\d{2}\.\d{3})/, '--> 00:$1')
    const cue = lines.slice(i + 1).join('\n').trim()
    if (cue) out.push(`${timing}\n${cue}`)
  }
  return out.length ? `WEBVTT\n\n${out.join('\n\n')}\n` : ''
}

export function countCues(vtt: string | null | undefined): number {
  return vtt ? vtt.split('\n').filter((l) => /-->/.test(l)).length : 0
}

/** Texte brut d'un VTT (pour afficher la transcription et l'indexer). */
export function vttToLines(vtt: string | null | undefined): string[] {
  if (!vtt) return []
  return vtt.split(/\n{2,}/).map((b) => b.split('\n').filter((l) => !/-->/.test(l) && !/^WEBVTT/.test(l)).join(' ').trim()).filter(Boolean)
}

export function formatDuree(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return ''
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}

export type Validation = { ok: true; value: VideoInput } | { ok: false; error: string }

/** Contrôle d'une saisie admin. La publication exige fichier, relecteur, sources, et sous-titres si non incrustés. */
export function validateVideo(input: any): Validation {
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const slug = s(input?.slug)
  if (!SLUG_RE.test(slug)) return { ok: false, error: 'Identifiant invalide (minuscules, chiffres et tirets).' }
  const titre_ar = s(input?.titre_ar), titre_fr = s(input?.titre_fr)
  if (!titre_ar || !titre_fr) return { ok: false, error: 'Les titres arabe et français sont obligatoires.' }
  const statut = input?.statut
  if (statut !== 'brouillon' && statut !== 'publie') return { ok: false, error: 'Statut invalide.' }
  const video_url = s(input?.video_url) || null
  const poster_url = s(input?.poster_url) || null
  if (video_url && !isHttpsUrl(video_url)) return { ok: false, error: "L'adresse de la vidéo doit commencer par https://" }
  if (poster_url && !isHttpsUrl(poster_url)) return { ok: false, error: "L'adresse de l'image doit commencer par https://" }
  const episode = input?.episode === null || input?.episode === '' || input?.episode === undefined ? null : Number(input.episode)
  if (episode !== null && (!Number.isInteger(episode) || episode < 1 || episode > 999)) return { ok: false, error: "Numéro d'épisode invalide." }
  const duree = input?.duree_sec === null || input?.duree_sec === '' || input?.duree_sec === undefined ? null : Number(input.duree_sec)
  if (duree !== null && (!Number.isFinite(duree) || duree <= 0)) return { ok: false, error: 'Durée invalide.' }
  const incrustes = input?.sous_titres_incrustes !== false
  const vtt_ar = s(input?.vtt_ar) ? srtToVtt(String(input.vtt_ar)) : null
  const vtt_fr = s(input?.vtt_fr) ? srtToVtt(String(input.vtt_fr)) : null
  if (s(input?.vtt_ar) && !vtt_ar) return { ok: false, error: 'Sous-titres arabes illisibles (SRT ou VTT attendu).' }
  if (s(input?.vtt_fr) && !vtt_fr) return { ok: false, error: 'Sous-titres français illisibles (SRT ou VTT attendu).' }
  const tags = (Array.isArray(input?.tags) ? input.tags : String(input?.tags ?? '').split(','))
    .map((t: unknown) => String(t).trim().replace(/^#/, '')).filter(Boolean).slice(0, 12)
  const value: VideoInput = {
    id: input?.id ? Number(input.id) : undefined, slug, episode, titre_ar, titre_fr,
    description_ar: s(input?.description_ar), description_fr: s(input?.description_fr),
    video_url, poster_url, sous_titres_incrustes: incrustes, vtt_ar, vtt_fr,
    duree_sec: duree === null ? null : Math.round(duree), tags, sources: s(input?.sources), statut,
    reviewed_by: s(input?.reviewed_by) || null, reviewed_at: s(input?.reviewed_at) || null,
  }
  if (statut === 'publie') {
    if (!video_url) return { ok: false, error: 'Publication impossible sans fichier vidéo.' }
    if (!value.reviewed_by) return { ok: false, error: 'Publication impossible sans relecteur.' }
    if (!value.sources) return { ok: false, error: 'Publication impossible sans sources.' }
    if (!incrustes && (!vtt_ar || !vtt_fr)) return { ok: false, error: 'Sous-titres arabe et français requis (ou cocher « sous-titres incrustés dans l’image »).' }
  }
  return { ok: true, value }
}

type Publie = Pick<VideoInput, 'slug' | 'titre_ar' | 'titre_fr' | 'description_ar' | 'description_fr' | 'video_url' | 'poster_url' | 'duree_sec'> & { published_at?: string | null }

/** Données structurées schema.org pour Google. */
export function videoJsonLd(v: Publie, appUrl: string, lang: 'fr' | 'ar') {
  const pageUrl = `${appUrl}/videos/${v.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: lang === 'ar' ? v.titre_ar : v.titre_fr,
    description: (lang === 'ar' ? v.description_ar : v.description_fr) || v.titre_fr,
    inLanguage: 'ar',
    ...(v.video_url ? { contentUrl: v.video_url } : {}),
    ...(v.poster_url ? { thumbnailUrl: v.poster_url } : {}),
    ...(v.published_at ? { uploadDate: String(v.published_at).slice(0, 10) } : {}),
    ...(v.duree_sec ? { duration: `PT${Math.floor(v.duree_sec / 60) ? `${Math.floor(v.duree_sec / 60)}M` : ''}${v.duree_sec % 60}S` } : {}),
    url: pageUrl,
    publisher: { '@type': 'Organization', name: 'DwaDZ' },
  }
}

/** Légende Facebook : titre, résumé, lien, hashtags (arabe, avec le français en dessous). */
export function facebookCaption(v: Publie & { tags?: string[] }, appUrl: string): string {
  const tags = ['DwaDZ', 'صيدلة', 'الجزائر', ...(v.tags ?? [])].filter((t, i, a) => a.indexOf(t) === i).slice(0, 6).map((t) => `#${t.replace(/\s+/g, '')}`)
  return [
    v.titre_ar, v.description_ar, '',
    v.titre_fr, v.description_fr, '',
    `🔗 ${appUrl}/videos/${v.slug}`, tags.join(' '),
  ].filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i > 0)).join('\n').trim()
}
