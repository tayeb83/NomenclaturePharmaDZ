/**
 * DwaDZ — relecture des interactions candidates (sql/42_interactions_veille.sql) : liste, détail, décision.
 * Rien n'est publié sans décision d'un relecteur : « accepter » une paire absente de l'ANSM crée une
 * interaction « manuelle » sourcée (RCP de l'ANPP) dans interactions_ansm, dans les deux sens.
 * Une divergence de niveau acceptée est seulement enregistrée : le texte ANSM n'est jamais réécrit d'ici.
 */
import { getPool, query, queryOne } from './db'
import { cle } from './interactions-core'
import { saveInteraction } from './interactions-admin'
import {
  interactionDepuisCandidat, type Decision, type EcartCandidat, type PreuveRcp, type Statut,
} from './interactions-veille-core'
import type { Gravite } from './interactions-gap-core'

export * from './interactions-veille-core'

export class VeilleError extends Error {
  constructor(message: string, readonly status = 400) { super(message) }
}

export type CandidatRow = {
  id: number
  paire_key: string
  substance_a: string
  substance_b: string
  ecart: EcartCandidat
  gravite_source: Gravite
  niveau_ansm: string | null
  sens: 'source_plus_grave' | 'source_moins_grave' | null
  via: string[] | null
  a_hors_thesaurus: boolean
  b_hors_thesaurus: boolean
  n_sources: number
  score: number
  statut: Statut
  motif: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  promoted_id: number | null
  last_seen: string
}

export type PreuveRow = PreuveRcp & {
  id: number
  ref: string
  gravite: Gravite | null
  /** phrase d'origine du RCP : réservée à l'admin, jamais affichée au public */
  contexte: string | null
}

export type LigneAnsmRow = { id: number; substance: string; partenaire: string; niveau: string; risque_fr: string; conduite_fr: string; origine: string; page: number | null }

const COLS = `id, paire_key, substance_a, substance_b, ecart, gravite_source, niveau_ansm, sens, via, a_hors_thesaurus, b_hors_thesaurus,
  n_sources, score, statut, motif, reviewed_by, reviewed_at, promoted_id, last_seen`

export type ListFiltres = { statut?: string; ecart?: string; q?: string; limit?: number; offset?: number }

const likeEscape = (k: string) => k.replace(/[\\%_]/g, m => `\\${m}`)
const A_RELIRE: Statut[] = ['nouveau', 'en_revue']

export async function listCandidats(f: ListFiltres): Promise<{ rows: CandidatRow[]; total: number }> {
  const where: string[] = []
  const params: unknown[] = []
  if (f.statut === 'a_relire' || !f.statut) { params.push(A_RELIRE); where.push(`statut = ANY($${params.length})`) }
  else if (f.statut !== 'tous') { params.push(f.statut); where.push(`statut = $${params.length}`) }
  if (f.ecart === 'absente' || f.ecart === 'divergence_niveau') { params.push(f.ecart); where.push(`ecart = $${params.length}`) }
  const k = cle(f.q ?? '')
  if (k) { params.push(`%${likeEscape(k)}%`); where.push(`paire_key LIKE $${params.length}`) }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.max(1, Math.min(200, f.limit ?? 50))
  const offset = Math.max(0, f.offset ?? 0)
  const [rows, count] = await Promise.all([
    query<CandidatRow>(`SELECT ${COLS} FROM interactions_candidates ${w} ORDER BY score DESC, id LIMIT ${limit} OFFSET ${offset}`, params),
    queryOne<{ n: string }>(`SELECT count(*) AS n FROM interactions_candidates ${w}`, params),
  ])
  return { rows, total: Number(count?.n ?? 0) }
}

export async function statsCandidats(): Promise<Record<Statut, number> & { absente: number; divergence_niveau: number }> {
  const r = await query<{ statut: Statut; ecart: EcartCandidat; n: string }>(
    `SELECT statut, ecart, count(*) AS n FROM interactions_candidates GROUP BY 1, 2`)
  const out = { nouveau: 0, en_revue: 0, differe: 0, accepte: 0, rejete: 0, absente: 0, divergence_niveau: 0 }
  for (const x of r) {
    out[x.statut] += Number(x.n)
    if (A_RELIRE.includes(x.statut)) out[x.ecart] += Number(x.n)
  }
  return out
}

/** Les preuves du candidat, avec le RCP de l'ANPP dont elles viennent. */
async function preuvesDe(candidatId: number): Promise<PreuveRow[]> {
  return query<PreuveRow>(
    `SELECT e.id, e.ref, e.section, e.page, e.version, e.gravite, e.contexte,
            d.nom_commercial, d.laboratoire_anpp AS laboratoire, d.pdf_url
       FROM interactions_evidence e
       LEFT JOIN rcp_documents d ON d.rcp_id::text = e.ref
      WHERE e.candidate_id = $1 ORDER BY e.id`, [candidatId])
}

/** Ce que l'ANSM dit déjà de la paire elle-même (dans un sens ou dans l'autre), pour comparer. */
async function lignesAnsmDe(c: CandidatRow): Promise<LigneAnsmRow[]> {
  const a = cle(c.substance_a)
  const b = cle(c.substance_b)
  return query<LigneAnsmRow>(
    `SELECT id, substance, partenaire, niveau, risque_fr, conduite_fr, origine, page FROM interactions_ansm
      WHERE (substance_key = $1 AND partenaire_key = $2) OR (substance_key = $2 AND partenaire_key = $1)
      ORDER BY id`, [a, b])
}

export async function getCandidat(id: number): Promise<{ candidat: CandidatRow; preuves: PreuveRow[]; ansm: LigneAnsmRow[] } | null> {
  const candidat = await queryOne<CandidatRow>(`SELECT ${COLS} FROM interactions_candidates WHERE id = $1`, [id])
  if (!candidat) return null
  const [preuves, ansm] = await Promise.all([preuvesDe(id), lignesAnsmDe(candidat)])
  return { candidat, preuves, ansm }
}

const STATUT_DE: Record<Exclude<Decision['action'], 'accepte'>, Statut> = {
  en_revue: 'en_revue', differe: 'differe', rejete: 'rejete', rouvrir: 'nouveau',
}

/**
 * Applique la décision d'un relecteur. `reviewer` vient de la session admin, pas du formulaire.
 * Accepter une paire absente de l'ANSM crée l'interaction (deux sens) ; elle est refusée si la paire existe déjà
 * dans interactions_ansm, pour ne jamais écraser une ligne du thésaurus ni une saisie précédente.
 */
export async function decider(d: Decision, reviewer: string): Promise<{ statut: Statut; promoted_id: number | null }> {
  const data = await getCandidat(d.id)
  if (!data) throw new VeilleError('Candidat introuvable.', 404)
  const { candidat, preuves, ansm } = data
  const nom = reviewer.trim() || 'Relecteur'

  let promoted: number | null = null
  let statut: Statut
  if (d.action === 'accepte') {
    statut = 'accepte'
    if (candidat.ecart === 'absente') {
      if (ansm.length > 0) throw new VeilleError('Cette paire existe déjà dans les interactions : modifiez la ligne existante.', 409)
      const preuve = preuves.find(p => p.id === d.preuve_id) ?? preuves[0]
      if (!preuve) throw new VeilleError('Aucune preuve rattachée à ce candidat : impossible de le sourcer.', 409)
      promoted = (await saveInteraction(interactionDepuisCandidat(candidat, d, preuve))).id
    }
  } else {
    statut = STATUT_DE[d.action]
  }

  const r = await getPool().query(
    `UPDATE interactions_candidates SET statut = $2, motif = $3, reviewed_by = $4, reviewed_at = NOW(),
            promoted_id = COALESCE($5, promoted_id), updated_at = NOW()
      WHERE id = $1`,
    [d.id, statut, d.motif, statut === 'nouveau' ? null : nom, promoted])
  if (r.rowCount === 0) throw new VeilleError('Candidat introuvable.', 404)
  return { statut, promoted_id: promoted }
}
