/**
 * DwaDZ — administration des RCP : interrupteurs d'urgence, masquage par
 * document ou par laboratoire, relecture des faits (sql/26, sql/27).
 */

import { query, queryOne } from './db.ts'

export type AdminReglages = { liens: boolean; faits: boolean }

export type AdminDocument = {
  rcp_id: string
  nom_commercial: string
  laboratoire_anpp: string | null
  pdf_url: string
  version_texte: string | null
  retire: boolean
  faits_masques: boolean
  nb_brouillon: number
  nb_publie: number
  nb_rejete: number
  nb_fiches: number
}

export type AdminFait = {
  id: number
  type: 'dose' | 'interaction'
  section: string
  page: number
  libelle: string
  gravite: string | null
  population: string | null
  cible_type: string | null
  cible: string | null
  contexte: string | null
  status: 'brouillon' | 'publie' | 'rejete'
  reviewed_by: string | null
  reviewed_at: string | null
}

export const FAIT_STATUSES = ['brouillon', 'publie', 'rejete'] as const
export type FaitStatus = (typeof FAIT_STATUSES)[number]

export async function tablesState(): Promise<{ liens: boolean; faits: boolean }> {
  const row = await queryOne<{ liens: boolean; faits: boolean }>(
    `SELECT to_regclass('public.rcp_documents') IS NOT NULL AS liens,
            to_regclass('public.rcp_faits') IS NOT NULL AND to_regclass('public.rcp_reglages') IS NOT NULL AS faits`
  )
  return row ?? { liens: false, faits: false }
}

export async function getReglagesAdmin(): Promise<AdminReglages> {
  const rows = await query<{ cle: string; actif: boolean }>(`SELECT cle, actif FROM rcp_reglages`)
  const get = (k: string) => rows.find(r => r.cle === k)?.actif ?? true
  return { liens: get('liens'), faits: get('faits') }
}

export async function setReglage(cle: 'liens' | 'faits', actif: boolean): Promise<void> {
  await query(
    `INSERT INTO rcp_reglages (cle, actif) VALUES ($1, $2)
     ON CONFLICT (cle) DO UPDATE SET actif = EXCLUDED.actif, updated_at = NOW()`,
    [cle, actif]
  )
}

export function listDocuments(withFaits: boolean): Promise<AdminDocument[]> {
  if (!withFaits) {
    return query<AdminDocument>(
      `SELECT d.rcp_id, d.nom_commercial, d.laboratoire_anpp, d.pdf_url, d.version_texte, d.retire, FALSE AS faits_masques,
              0 AS nb_brouillon, 0 AS nb_publie, 0 AS nb_rejete,
              (SELECT COUNT(*)::INT FROM rcp_fiches x WHERE x.rcp_id = d.rcp_id) AS nb_fiches
       FROM rcp_documents d ORDER BY d.laboratoire_anpp NULLS LAST, d.nom_commercial`
    )
  }
  return query<AdminDocument>(
    `SELECT d.rcp_id, d.nom_commercial, d.laboratoire_anpp, d.pdf_url, d.version_texte, d.retire, d.faits_masques,
            COUNT(f.id) FILTER (WHERE f.status = 'brouillon')::INT AS nb_brouillon,
            COUNT(f.id) FILTER (WHERE f.status = 'publie')::INT AS nb_publie,
            COUNT(f.id) FILTER (WHERE f.status = 'rejete')::INT AS nb_rejete,
            (SELECT COUNT(*)::INT FROM rcp_fiches x WHERE x.rcp_id = d.rcp_id) AS nb_fiches
     FROM rcp_documents d
     LEFT JOIN rcp_faits f ON f.rcp_id = d.rcp_id
     GROUP BY d.rcp_id
     ORDER BY d.laboratoire_anpp NULLS LAST, d.nom_commercial`
  )
}

export function listFaits(rcpId: string): Promise<AdminFait[]> {
  return query<AdminFait>(
    `SELECT id, type, section, page, libelle, gravite, population, cible_type, cible, contexte, status, reviewed_by, reviewed_at
     FROM rcp_faits WHERE rcp_id = $1
     ORDER BY type DESC, section, page, id`,
    [rcpId]
  )
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

export function cleanLibelle(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return s.length >= 1 && s.length <= 140 ? s : null
}

export class AdminError extends Error {}

/** Corrige le libellé et/ou change le statut d'un fait. Publier exige un relecteur. */
export async function updateFait(
  id: number,
  patch: { libelle?: unknown; status?: unknown; reviewed_by?: unknown },
): Promise<void> {
  const sets: string[] = []
  const params: unknown[] = []
  const add = (sql: string, v: unknown) => { params.push(v); sets.push(sql.replace('?', `$${params.length}`)) }

  if (patch.libelle !== undefined) {
    const lib = cleanLibelle(patch.libelle)
    if (!lib) throw new AdminError('Libellé invalide (1 à 140 caractères).')
    add('libelle = ?', lib)
  }
  if (patch.status !== undefined) {
    if (!FAIT_STATUSES.includes(patch.status as FaitStatus)) throw new AdminError('Statut invalide.')
    const reviewer = typeof patch.reviewed_by === 'string' ? patch.reviewed_by.trim() : ''
    if (patch.status === 'publie' && !reviewer) throw new AdminError('Publication impossible sans relecteur.')
    add('status = ?', patch.status)
    if (patch.status === 'brouillon') {
      sets.push('reviewed_by = NULL', 'reviewed_at = NULL')
    } else {
      add('reviewed_by = ?', reviewer || null)
      sets.push('reviewed_at = NOW()')
    }
  }
  if (!sets.length) throw new AdminError('Rien à modifier.')
  params.push(id)
  const res = await query(`UPDATE rcp_faits SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING id`, params)
  if (!res.length) throw new AdminError('Fait introuvable.')
}

/** Publie d'un coup tous les brouillons d'un RCP, après relecture. Renvoie le nombre de faits publiés. */
export async function publishDrafts(rcpId: string, reviewer: unknown): Promise<number> {
  const name = typeof reviewer === 'string' ? reviewer.trim() : ''
  if (!name) throw new AdminError('Publication impossible sans relecteur.')
  const rows = await query(
    `UPDATE rcp_faits SET status = 'publie', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
     WHERE rcp_id = $1 AND status = 'brouillon' RETURNING id`,
    [rcpId, name]
  )
  return rows.length
}

export type DocFlags = { retire?: boolean; faits_masques?: boolean }

function flagSets(flags: DocFlags): { sql: string; params: boolean[] } {
  const parts: string[] = []
  const params: boolean[] = []
  for (const k of ['retire', 'faits_masques'] as const) {
    if (typeof flags[k] === 'boolean') { params.push(flags[k]!); parts.push(`${k} = $${params.length + 1}`) }
  }
  if (!parts.length) throw new AdminError('Rien à modifier.')
  return { sql: parts.join(', '), params }
}

export async function setDocumentFlags(rcpId: string, flags: DocFlags): Promise<number> {
  const { sql, params } = flagSets(flags)
  const rows = await query(`UPDATE rcp_documents SET ${sql}, updated_at = NOW() WHERE rcp_id = $1 RETURNING rcp_id`, [rcpId, ...params])
  return rows.length
}

/** Retrait demandé par un laboratoire : tous ses documents d'un coup. */
export async function setLaboratoireFlags(labo: string, flags: DocFlags): Promise<number> {
  if (!labo.trim()) throw new AdminError('Laboratoire manquant.')
  const { sql, params } = flagSets(flags)
  const rows = await query(
    `UPDATE rcp_documents SET ${sql}, updated_at = NOW() WHERE laboratoire_anpp = $1 RETURNING rcp_id`,
    [labo, ...params]
  )
  return rows.length
}
