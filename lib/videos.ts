/**
 * DwaDZ — Vidéos pédagogiques : accès base (voir sql/37_videos.sql).
 * Public : seules les vidéos publiées. Une table absente donne simplement « aucune vidéo ».
 */
import { unstable_cache } from 'next/cache'
import { query, queryOne } from './db'
import type { VideoInput } from './videos-core'

export * from './videos-core'

export const VIDEOS_TAG = 'videos'

export type VideoPublic = {
  id: number; slug: string; episode: number | null
  titre_ar: string; titre_fr: string; description_ar: string; description_fr: string
  video_url: string; poster_url: string | null; sous_titres_incrustes: boolean
  has_vtt_ar: boolean; has_vtt_fr: boolean
  duree_sec: number | null; tags: string[]; sources: string
  reviewed_by: string | null; reviewed_at: string | null; published_at: string | null
}

export type VideoAdminRow = VideoPublic & {
  statut: 'brouillon' | 'publie'; video_url: string | null
  fb_post_id: string | null; fb_published_at: string | null; updated_at: string
}

const PUBLIC_COLS = `id, slug, episode, titre_ar, titre_fr, description_ar, description_fr, video_url, poster_url,
  sous_titres_incrustes, (vtt_ar IS NOT NULL) AS has_vtt_ar, (vtt_fr IS NOT NULL) AS has_vtt_fr,
  duree_sec, tags, sources, reviewed_by, reviewed_at, published_at`

const isMissingTable = (err: any) => err?.code === '42P01'

export const listPublishedVideos = unstable_cache(
  async (): Promise<VideoPublic[]> => {
    try {
      return await query<VideoPublic>(`SELECT ${PUBLIC_COLS} FROM videos WHERE statut = 'publie' ORDER BY episode NULLS LAST, published_at DESC`)
    } catch (err) {
      if (isMissingTable(err)) return []
      throw err
    }
  },
  ['videos-published'],
  { tags: [VIDEOS_TAG], revalidate: 3600 }
)

export function getPublishedVideo(slug: string): Promise<VideoPublic | null> {
  return unstable_cache(
    async () => {
      try {
        return await queryOne<VideoPublic>(`SELECT ${PUBLIC_COLS} FROM videos WHERE slug = $1 AND statut = 'publie'`, [slug])
      } catch (err) {
        if (isMissingTable(err)) return null
        throw err
      }
    },
    ['video', slug],
    { tags: [VIDEOS_TAG], revalidate: 3600 }
  )()
}

/** Sous-titres WebVTT d'une vidéo publiée (texte brut), ou null. */
export async function getPublishedCaption(slug: string, lang: 'ar' | 'fr'): Promise<string | null> {
  const col = lang === 'ar' ? 'vtt_ar' : 'vtt_fr'
  try {
    const row = await queryOne<{ vtt: string | null }>(`SELECT ${col} AS vtt FROM videos WHERE slug = $1 AND statut = 'publie'`, [slug])
    return row?.vtt ?? null
  } catch (err) {
    if (isMissingTable(err)) return null
    throw err
  }
}

/** Transcription (texte des sous-titres) d'une vidéo publiée, pour l'affichage et l'indexation. */
export async function getPublishedVtts(slug: string): Promise<{ ar: string | null; fr: string | null }> {
  try {
    const row = await queryOne<{ vtt_ar: string | null; vtt_fr: string | null }>(`SELECT vtt_ar, vtt_fr FROM videos WHERE slug = $1 AND statut = 'publie'`, [slug])
    return { ar: row?.vtt_ar ?? null, fr: row?.vtt_fr ?? null }
  } catch (err) {
    if (isMissingTable(err)) return { ar: null, fr: null }
    throw err
  }
}

// ── Admin ─────────────────────────────────────────────────────

export async function listVideosAdmin(): Promise<VideoAdminRow[]> {
  return query<VideoAdminRow>(
    `SELECT ${PUBLIC_COLS}, statut, fb_post_id, fb_published_at, updated_at FROM videos ORDER BY episode NULLS LAST, id`
  )
}

export async function getVideoAdmin(id: number): Promise<(VideoAdminRow & { vtt_ar: string | null; vtt_fr: string | null }) | null> {
  return queryOne(`SELECT ${PUBLIC_COLS}, vtt_ar, vtt_fr, statut, fb_post_id, fb_published_at, updated_at FROM videos WHERE id = $1`, [id])
}

/** Crée ou met à jour (par id, sinon par slug). published_at est fixé à la première publication. */
export async function saveVideo(v: VideoInput): Promise<number> {
  const params = [
    v.slug, v.episode, v.titre_ar, v.titre_fr, v.description_ar, v.description_fr, v.video_url, v.poster_url,
    v.sous_titres_incrustes, v.vtt_ar, v.vtt_fr, v.duree_sec, v.tags, v.sources, v.statut, v.reviewed_by, v.reviewed_at,
  ]
  const cols = `slug, episode, titre_ar, titre_fr, description_ar, description_fr, video_url, poster_url,
    sous_titres_incrustes, vtt_ar, vtt_fr, duree_sec, tags, sources, statut, reviewed_by, reviewed_at`
  const set = `slug = $1, episode = $2, titre_ar = $3, titre_fr = $4, description_ar = $5, description_fr = $6, video_url = $7,
    poster_url = $8, sous_titres_incrustes = $9, vtt_ar = $10, vtt_fr = $11, duree_sec = $12, tags = $13, sources = $14,
    statut = $15::varchar, reviewed_by = $16, reviewed_at = $17, updated_at = NOW(),
    published_at = CASE WHEN $15::varchar = 'publie' THEN COALESCE(videos.published_at, NOW()) ELSE videos.published_at END`
  if (v.id) {
    const row = await queryOne<{ id: number }>(`UPDATE videos SET ${set} WHERE id = $18 RETURNING id`, [...params, v.id])
    if (!row) throw Object.assign(new Error('Vidéo introuvable'), { code: 'NOT_FOUND' })
    return row.id
  }
  const row = await queryOne<{ id: number }>(
    `INSERT INTO videos (${cols}, published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::varchar,$16,$17, CASE WHEN $15::varchar = 'publie' THEN NOW() END)
     ON CONFLICT (slug) DO UPDATE SET ${set} RETURNING id`,
    params
  )
  return row!.id
}

export async function deleteVideo(id: number): Promise<void> {
  await query(`DELETE FROM videos WHERE id = $1`, [id])
}

export async function markFacebookPublished(id: number, postId: string): Promise<void> {
  await query(`UPDATE videos SET fb_post_id = $2, fb_published_at = NOW(), updated_at = NOW() WHERE id = $1`, [id, postId])
}

export async function getPublishedSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  try {
    return await query(`SELECT slug, updated_at FROM videos WHERE statut = 'publie' ORDER BY episode NULLS LAST`)
  } catch (err) {
    if (isMissingTable(err)) return []
    throw err
  }
}
