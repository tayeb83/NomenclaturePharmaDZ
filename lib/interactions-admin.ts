/**
 * DwaDZ — administration des interactions (sql/40_interactions_admin.sql) : liste, saisie, suppression.
 * Les lignes importées du thésaurus ANSM (origine 'ansm') et celles saisies à la main (origine 'manuelle')
 * vivent dans la même table : les fiches et le comparateur les affichent ensemble.
 */
import { revalidateTag } from 'next/cache'
import { getPool, query, queryOne } from './db'
import { cle, type Niveau } from './interactions-core'
import { INTERACTIONS_TAG, viderCachesInteractions } from './interactions'
import { inverseDe, type InteractionInput } from './interactions-admin-core'

export * from './interactions-admin-core'

export type InteractionAdminRow = {
  id: number
  substance: string
  partenaire: string
  partenaire_est_classe: boolean
  niveau: Niveau
  risque_fr: string
  mecanisme_fr: string | null
  conduite_fr: string
  risque_ar: string | null
  mecanisme_ar: string | null
  conduite_ar: string | null
  partenaire_ar: string | null
  ar_statut: 'absent' | 'brouillon' | 'relu'
  origine: 'ansm' | 'manuelle'
  source_type: string | null
  source_titre: string | null
  source_url: string | null
  source_ref: string | null
  source_version: string
  page: number | null
  updated_at: string
}

const COLS = `id, substance, partenaire, partenaire_est_classe, niveau, risque_fr, mecanisme_fr, conduite_fr,
  risque_ar, mecanisme_ar, conduite_ar, partenaire_ar, ar_statut, origine, source_type, source_titre, source_url,
  source_ref, source_version, page, updated_at`

export type ListFilters = { q?: string; niveau?: string; origine?: string; limit?: number; offset?: number }

const likeEscape = (k: string) => k.replace(/[\\%_]/g, m => `\\${m}`)

export async function listInteractionsAdmin(f: ListFilters): Promise<{ rows: InteractionAdminRow[]; total: number }> {
  const where: string[] = []
  const params: unknown[] = []
  const k = cle(f.q ?? '')
  if (k) {
    params.push(`%${likeEscape(k)}%`)
    where.push(`(substance_key LIKE $${params.length} OR partenaire_key LIKE $${params.length})`)
  }
  if (f.niveau) { params.push(f.niveau); where.push(`niveau = $${params.length}`) }
  if (f.origine === 'ansm' || f.origine === 'manuelle') { params.push(f.origine); where.push(`origine = $${params.length}`) }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.max(1, Math.min(200, f.limit ?? 50))
  const offset = Math.max(0, f.offset ?? 0)
  const [rows, count] = await Promise.all([
    query<InteractionAdminRow>(
      `SELECT ${COLS} FROM interactions_ansm ${w}
       ORDER BY (origine = 'manuelle') DESC, updated_at DESC, substance, partenaire LIMIT ${limit} OFFSET ${offset}`, params),
    queryOne<{ n: string }>(`SELECT count(*) AS n FROM interactions_ansm ${w}`, params),
  ])
  return { rows, total: Number(count?.n ?? 0) }
}

export async function getInteractionAdmin(id: number): Promise<InteractionAdminRow | null> {
  return queryOne<InteractionAdminRow>(`SELECT ${COLS} FROM interactions_ansm WHERE id = $1`, [id])
}

export async function statsInteractionsAdmin(): Promise<{ total: number; ansm: number; manuelle: number; ar_absent: number }> {
  const r = await queryOne<{ total: string; ansm: string; manuelle: string; ar_absent: string }>(
    `SELECT count(*) AS total, count(*) FILTER (WHERE origine = 'ansm') AS ansm,
            count(*) FILTER (WHERE origine = 'manuelle') AS manuelle,
            count(*) FILTER (WHERE ar_statut = 'absent') AS ar_absent FROM interactions_ansm`)
  return { total: Number(r?.total ?? 0), ansm: Number(r?.ansm ?? 0), manuelle: Number(r?.manuelle ?? 0), ar_absent: Number(r?.ar_absent ?? 0) }
}

/** Substances et classes déjà connues dont le nom contient la saisie (aide à la saisie : évite les doublons d'écriture). */
export async function suggererSubstances(saisie: string): Promise<{ nom: string; classe: boolean }[]> {
  const k = cle(saisie)
  if (k.length < 2) return []
  return query<{ nom: string; classe: boolean }>(
    `SELECT nom, bool_or(classe) AS classe FROM (
       SELECT substance AS nom, substance_key AS k, FALSE AS classe FROM interactions_ansm
       UNION ALL SELECT partenaire, partenaire_key, partenaire_est_classe FROM interactions_ansm
       UNION ALL SELECT classe, classe_key, TRUE FROM interactions_ansm_classes
     ) t WHERE k LIKE '%' || $1 || '%' GROUP BY nom ORDER BY (min(k) LIKE $1 || '%') DESC, nom LIMIT 10`,
    [likeEscape(k)])
}

type Exec = (text: string, params: unknown[]) => Promise<any[]>

const VALUES = (v: InteractionInput) => [
  v.substance, cle(v.substance), v.partenaire, cle(v.partenaire), v.partenaire_est_classe, v.niveau,
  v.risque_fr, v.mecanisme_fr, v.conduite_fr, v.risque_ar, v.mecanisme_ar, v.conduite_ar, v.partenaire_ar, v.ar_statut,
  v.source_type, v.source_titre, v.source_url, v.source_ref,
  v.source_titre || v.source_url || 'Saisie manuelle',
]

/**
 * Crée ou met à jour une interaction. Création : si la paire (substance, partenaire) existe déjà elle est mise à jour
 * et passe en « manuelle » (l'import du thésaurus ne l'écrasera plus). Modification d'une ligne ANSM : le contenu
 * médical (niveau, risque, conduite) modifié la fait passer en « manuelle » ; l'arabe, le mécanisme et la source
 * s'ajoutent sans changer son origine.
 */
async function enregistrer(exec: Exec, v: InteractionInput): Promise<number> {
  const p = VALUES(v)
  if (v.id) {
    const rows = await exec(
      `UPDATE interactions_ansm AS t SET
         substance = $1, substance_key = $2, partenaire = $3, partenaire_key = $4, partenaire_est_classe = $5, niveau = $6,
         risque_fr = $7, mecanisme_fr = $8, conduite_fr = $9, risque_ar = $10, mecanisme_ar = $11, conduite_ar = $12,
         partenaire_ar = $13, ar_statut = $14, source_type = $15, source_titre = $16, source_url = $17, source_ref = $18,
         origine = CASE WHEN t.origine = 'manuelle' OR t.niveau <> $6 OR t.risque_fr <> $7 OR t.conduite_fr <> $9
                        THEN 'manuelle' ELSE t.origine END,
         source_version = CASE WHEN t.origine = 'ansm' AND t.niveau = $6 AND t.risque_fr = $7 AND t.conduite_fr = $9
                               THEN t.source_version ELSE $19 END,
         niveaux = CASE WHEN t.niveau = $6 THEN t.niveaux ELSE NULL END,
         updated_at = NOW()
       WHERE t.id = $20 RETURNING id`, [...p, v.id])
    if (!rows[0]) throw Object.assign(new Error('Interaction introuvable'), { code: 'NOT_FOUND' })
    return rows[0].id
  }
  const rows = await exec(
    `INSERT INTO interactions_ansm
       (substance, substance_key, partenaire, partenaire_key, partenaire_est_classe, niveau, risque_fr, mecanisme_fr, conduite_fr,
        risque_ar, mecanisme_ar, conduite_ar, partenaire_ar, ar_statut, source_type, source_titre, source_url, source_ref,
        source_version, origine, page)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'manuelle',NULL)
     ON CONFLICT (substance_key, partenaire_key) DO UPDATE SET
       substance = EXCLUDED.substance, partenaire = EXCLUDED.partenaire, partenaire_est_classe = EXCLUDED.partenaire_est_classe,
       niveau = EXCLUDED.niveau, niveaux = NULL, risque_fr = EXCLUDED.risque_fr, mecanisme_fr = EXCLUDED.mecanisme_fr,
       conduite_fr = EXCLUDED.conduite_fr, risque_ar = EXCLUDED.risque_ar, mecanisme_ar = EXCLUDED.mecanisme_ar,
       conduite_ar = EXCLUDED.conduite_ar, partenaire_ar = EXCLUDED.partenaire_ar, ar_statut = EXCLUDED.ar_statut,
       source_type = EXCLUDED.source_type, source_titre = EXCLUDED.source_titre, source_url = EXCLUDED.source_url,
       source_ref = EXCLUDED.source_ref, source_version = EXCLUDED.source_version, origine = 'manuelle', updated_at = NOW()
     RETURNING id`, p)
  return rows[0].id
}

export async function saveInteraction(v: InteractionInput): Promise<{ id: number; inverse_id: number | null }> {
  const client = await getPool().connect()
  const exec: Exec = async (text, params) => (await client.query(text, params as any[])).rows
  try {
    await client.query('BEGIN')
    const id = await enregistrer(exec, v)
    const inverse_id = v.inverse ? await enregistrer(exec, inverseDe(v)) : null
    await client.query('COMMIT')
    revalidateTag(INTERACTIONS_TAG)
    viderCachesInteractions()
    return { id, inverse_id }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function removeInteraction(id: number): Promise<void> {
  await query(`DELETE FROM interactions_ansm WHERE id = $1`, [id])
  revalidateTag(INTERACTIONS_TAG)
  viderCachesInteractions()
}
