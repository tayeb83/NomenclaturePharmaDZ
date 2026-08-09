/**
 * Logos (armoiries) des wilayas affichés sur les visuels de garde publiés
 * sur Facebook.
 *
 * Stockés en base (sql/16_garde_wilaya_logos.sql) plutôt que sur le disque :
 * l'hébergement est en lecture seule et sans volume persistant, et l'admin
 * doit pouvoir ajouter un logo sans redéploiement.
 *
 * La table est optionnelle : tant que la migration n'est pas appliquée, les
 * visuels se rendent simplement sans logo de wilaya (jamais d'échec de
 * publication pour cette raison).
 */
import { query, queryOne } from '@/lib/db'

export const WILAYA_LOGO_TABLE = 'garde_wilaya_logos'

/** 400 Ko : largement assez pour une armoirie nette en 512 px. */
export const MAX_LOGO_BYTES = 400 * 1024

/** satori ne décode de façon fiable que le PNG et le JPEG. */
export const ALLOWED_LOGO_MIMES = ['image/png', 'image/jpeg'] as const

const globalForLogos = globalThis as unknown as {
  _gardeLogoTable?: Promise<boolean>
  _gardeLogoCache?: Map<string, { uri: string | null; at: number }>
}

const CACHE_TTL_MS = 5 * 60 * 1000

function logoTableAvailable(): Promise<boolean> {
  if (!globalForLogos._gardeLogoTable) {
    globalForLogos._gardeLogoTable = queryOne<{ t: string | null }>(
      `SELECT to_regclass($1) AS t`,
      [`public.${WILAYA_LOGO_TABLE}`]
    )
      .then((row) => Boolean(row?.t))
      .catch(() => false)
  }
  return globalForLogos._gardeLogoTable
}

function cache(): Map<string, { uri: string | null; at: number }> {
  if (!globalForLogos._gardeLogoCache) globalForLogos._gardeLogoCache = new Map()
  return globalForLogos._gardeLogoCache
}

export type WilayaLogoMeta = {
  wilaya_code: string
  mime: string
  file_name: string | null
  byte_size: number | null
  updated_at: string
}

/** Data URI du logo d'une wilaya, ou null s'il n'y en a pas. */
export async function getWilayaLogoDataUri(wilayaCode: string): Promise<string | null> {
  if (!wilayaCode) return null

  const hit = cache().get(wilayaCode)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.uri

  let uri: string | null = null
  if (await logoTableAvailable()) {
    try {
      const row = await queryOne<{ mime: string; data_base64: string }>(
        `SELECT mime, data_base64 FROM ${WILAYA_LOGO_TABLE} WHERE wilaya_code = $1`,
        [wilayaCode]
      )
      if (row) uri = `data:${row.mime};base64,${row.data_base64}`
    } catch (err: any) {
      console.error('[garde-wilaya-logo] Lecture impossible:', err?.message || err)
    }
  }

  cache().set(wilayaCode, { uri, at: Date.now() })
  return uri
}

export async function listWilayaLogos(): Promise<WilayaLogoMeta[]> {
  if (!(await logoTableAvailable())) return []
  return query<WilayaLogoMeta>(
    `SELECT wilaya_code, mime, file_name, byte_size, updated_at
     FROM ${WILAYA_LOGO_TABLE} ORDER BY wilaya_code`
  )
}

export async function saveWilayaLogo(
  wilayaCode: string,
  mime: string,
  data: Buffer,
  fileName?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await logoTableAvailable())) {
    return { ok: false, error: `Table ${WILAYA_LOGO_TABLE} absente — appliquez sql/16_garde_wilaya_logos.sql` }
  }
  if (!ALLOWED_LOGO_MIMES.includes(mime as any)) {
    return { ok: false, error: 'Format non supporté (PNG ou JPEG uniquement)' }
  }
  if (data.length > MAX_LOGO_BYTES) {
    return { ok: false, error: `Fichier trop volumineux (${Math.round(data.length / 1024)} Ko, maximum ${MAX_LOGO_BYTES / 1024} Ko)` }
  }

  await query(
    `INSERT INTO ${WILAYA_LOGO_TABLE} (wilaya_code, mime, data_base64, file_name, byte_size, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (wilaya_code) DO UPDATE SET
       mime = EXCLUDED.mime, data_base64 = EXCLUDED.data_base64,
       file_name = EXCLUDED.file_name, byte_size = EXCLUDED.byte_size, updated_at = NOW()`,
    [wilayaCode, mime, data.toString('base64'), fileName || null, data.length]
  )
  cache().delete(wilayaCode)
  return { ok: true }
}

export async function deleteWilayaLogo(wilayaCode: string): Promise<void> {
  if (!(await logoTableAvailable())) return
  await query(`DELETE FROM ${WILAYA_LOGO_TABLE} WHERE wilaya_code = $1`, [wilayaCode])
  cache().delete(wilayaCode)
}

/** Binaire brut d'un logo (aperçu dans l'admin). */
export async function getWilayaLogoBinary(
  wilayaCode: string
): Promise<{ mime: string; data: Buffer } | null> {
  if (!(await logoTableAvailable())) return null
  const row = await queryOne<{ mime: string; data_base64: string }>(
    `SELECT mime, data_base64 FROM ${WILAYA_LOGO_TABLE} WHERE wilaya_code = $1`,
    [wilayaCode]
  )
  if (!row) return null
  return { mime: row.mime, data: Buffer.from(row.data_base64, 'base64') }
}
