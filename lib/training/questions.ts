/**
 * Dzair-Pharma Training — relecture et publication des questions (admin).
 *
 * Une question naît `draft` (script de génération). Elle ne devient visible
 * des étudiants qu'en `published`, ce que seul un relecteur peut faire, en
 * s'identifiant (`relu_par`). Toute modification manuelle pose
 * `manually_edited` : la régénération ne l'écrasera plus jamais.
 */
import type { Query } from './service.ts'

export const QUESTION_STATUSES = ['draft', 'reviewed', 'published'] as const
export type QuestionStatus = (typeof QUESTION_STATUSES)[number]
export const QUESTION_ACTIONS = { review: 'reviewed', publish: 'published', draft: 'draft' } as const
export type QuestionAction = keyof typeof QUESTION_ACTIONS

export type QuestionEdit = {
  stem?: string
  options?: string[]
  correct_index?: number
  explanation?: { contexte?: string; rationales?: string[]; points_cles?: string[] }
  a_valider?: boolean
}

const compact = (s: string) => s.normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase()
const MAX = { stem: 1000, option: 400, ctx: 3000, rationale: 1500, point: 600 }

/** Valide une modification manuelle ; renvoie la liste des anomalies (vide = OK). */
export function validateEdit(e: QuestionEdit): string[] {
  const errs: string[] = []
  if (e.stem !== undefined && (typeof e.stem !== 'string' || !e.stem.trim() || e.stem.length > MAX.stem)) errs.push('énoncé invalide')
  if (e.options !== undefined) {
    const o = e.options
    if (!Array.isArray(o) || o.length !== 5) errs.push('5 propositions exactement')
    else {
      if (o.some(x => typeof x !== 'string' || !x.trim() || x.length > MAX.option)) errs.push('proposition vide ou trop longue')
      else if (new Set(o.map(compact)).size !== 5) errs.push('deux propositions identiques')
    }
  }
  if (e.correct_index !== undefined && !(Number.isInteger(e.correct_index) && e.correct_index >= 0 && e.correct_index <= 4)) errs.push('bonne réponse invalide')
  const x = e.explanation
  if (x !== undefined) {
    if (x.contexte !== undefined && (typeof x.contexte !== 'string' || x.contexte.length > MAX.ctx)) errs.push('contexte invalide')
    if (x.rationales !== undefined && (!Array.isArray(x.rationales) || x.rationales.length !== 5 || x.rationales.some(r => typeof r !== 'string' || !r.trim() || r.length > MAX.rationale))) {
      errs.push('une justification non vide par proposition est requise')
    }
    if (x.points_cles !== undefined && (!Array.isArray(x.points_cles) || x.points_cles.length > 10 || x.points_cles.some(p => typeof p !== 'string' || !p.trim() || p.length > MAX.point))) {
      errs.push('points clés invalides')
    }
  }
  return errs
}

export type QuestionFilters = { status?: QuestionStatus | 'all'; type?: string; stale?: boolean; q?: string; limit?: number; offset?: number }

export function createQuestionsAdmin(deps: { query: Query; now?: () => Date }) {
  const { query } = deps

  function where(f: QuestionFilters) {
    const w: string[] = []
    const p: any[] = []
    if (f.status && f.status !== 'all') { p.push(f.status); w.push(`status = $${p.length}`) }
    if (f.type) { p.push(f.type); w.push(`type = $${p.length}`) }
    if (f.stale) w.push('stale')
    const q = f.q?.trim().slice(0, 100)
    if (q) { p.push(`%${q.replace(/[\\%_]/g, m => `\\${m}`)}%`); w.push(`(stem ILIKE $${p.length} OR source_ref ILIKE $${p.length})`) }
    return { clause: w.length ? `WHERE ${w.join(' AND ')}` : '', p }
  }

  async function list(f: QuestionFilters = {}) {
    const { clause, p } = where(f)
    const limit = Math.min(Math.max(f.limit ?? 50, 1), 200)
    const offset = Math.max(f.offset ?? 0, 0)
    const rows = await query<any>(
      `SELECT id, type, stem, status, a_valider, relu_par, stale, stale_reason, manually_edited, difficulty, atc_code, db_version
         FROM training_questions ${clause} ORDER BY id LIMIT ${limit} OFFSET ${offset}`,
      p,
    )
    const total = (await query<{ n: string }>(`SELECT COUNT(*)::TEXT AS n FROM training_questions ${clause}`, p))[0].n
    return { rows: rows.map(r => ({ ...r, id: Number(r.id) })), total: parseInt(total, 10) }
  }

  async function counts() {
    const rows = await query<{ status: QuestionStatus; n: string }>('SELECT status, COUNT(*)::TEXT AS n FROM training_questions GROUP BY status')
    const out = { draft: 0, reviewed: 0, published: 0, stale: 0 }
    for (const r of rows) out[r.status] = parseInt(r.n, 10)
    out.stale = parseInt((await query<{ n: string }>('SELECT COUNT(*)::TEXT AS n FROM training_questions WHERE stale'))[0].n, 10)
    return out
  }

  async function get(id: number) {
    const r = (await query<any>('SELECT * FROM training_questions WHERE id = $1', [id]))[0]
    return r ? { ...r, id: Number(r.id) } : null
  }

  /** Modification manuelle (relecteur) : pose `manually_edited`, ne touche pas `content_hash` (hachage de la génération). */
  async function edit(id: number, e: QuestionEdit): Promise<{ ok: true } | { ok: false; errors: string[] }> {
    const errors = validateEdit(e)
    if (errors.length) return { ok: false, errors }
    const cur = (await query<any>('SELECT explanation FROM training_questions WHERE id = $1', [id]))[0]
    if (!cur) return { ok: false, errors: ['question introuvable'] }
    const expl = { ...cur.explanation }
    if (e.explanation?.contexte !== undefined) expl.contexte = e.explanation.contexte
    if (e.explanation?.rationales !== undefined) expl.rationales = e.explanation.rationales
    if (e.explanation?.points_cles !== undefined) expl.points_cles = e.explanation.points_cles
    await query(
      `UPDATE training_questions SET
         stem = COALESCE($2, stem),
         options = COALESCE($3::jsonb, options),
         correct_index = COALESCE($4, correct_index),
         explanation = $5::jsonb,
         a_valider = COALESCE($6, a_valider),
         manually_edited = TRUE, updated_at = NOW()
       WHERE id = $1`,
      [id, e.stem?.trim() ?? null, e.options ? JSON.stringify(e.options.map(o => o.trim())) : null, e.correct_index ?? null,
       JSON.stringify(expl), e.a_valider ?? null],
    )
    return { ok: true }
  }

  /**
   * Relire / publier / remettre en brouillon une ou plusieurs questions.
   * `reviewer` est obligatoire pour review/publish (contrainte SQL aussi).
   * Publier lève `a_valider` : c'est l'acte de validation.
   */
  async function setStatus(ids: number[], action: QuestionAction, reviewer: string): Promise<{ updated: number } | { error: string }> {
    const status = QUESTION_ACTIONS[action]
    if (!status) return { error: 'action invalide' }
    const clean = [...new Set(ids.filter(i => Number.isSafeInteger(i) && i > 0))].slice(0, 500)
    if (clean.length === 0) return { error: 'aucune question' }
    const name = reviewer.replace(/\s+/g, ' ').trim().slice(0, 80)
    if (status !== 'draft' && !name) return { error: 'nom du relecteur requis' }
    const rows = status === 'draft'
      ? await query<{ id: string }>(
          `UPDATE training_questions SET status = 'draft', relu_par = NULL, relu_at = NULL, a_valider = TRUE, updated_at = NOW()
            WHERE id = ANY($1) RETURNING id`, [clean])
      : await query<{ id: string }>(
          `UPDATE training_questions SET status = $2, relu_par = $3, relu_at = NOW(),
                  a_valider = CASE WHEN $2 = 'published' THEN FALSE ELSE a_valider END,
                  stale = FALSE, stale_reason = NULL, updated_at = NOW()
            WHERE id = ANY($1) RETURNING id`, [clean, status, name])
    return { updated: rows.length }
  }

  return { list, counts, get, edit, setStatus }
}

export type QuestionsAdmin = ReturnType<typeof createQuestionsAdmin>
