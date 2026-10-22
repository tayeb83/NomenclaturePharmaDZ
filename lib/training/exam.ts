/**
 * Dzair-Pharma Training — moteur d'examen (modes tuteur et examen) et correction.
 *
 * RÈGLE CENTRALE : en mode examen, aucune bonne réponse, aucune explication et
 * aucun `is_correct` ne sort de ce module tant que la tentative n'est pas
 * terminée. Les vues construites ici n'ont tout simplement pas ces champs :
 * `viewQuestion` n'inclut `review` que si `canReveal` l'autorise, et la
 * correction ne se lit que pour une question déjà corrigée dans une tentative
 * de l'utilisateur (tuteur : après validation ; examen : après la fin).
 *
 * Toutes les lectures sont filtrées par `user_id` : un utilisateur ne peut ni
 * lire ni modifier la tentative d'un autre. L'horloge de l'examen est celle du
 * serveur (`started_at + time_limit_s`) ; le navigateur ne fait qu'afficher.
 *
 * Dépendances injectées (comme service.ts) : testable sur PostgreSQL sans Next.
 */
import crypto from 'node:crypto'
import type { Query } from './service.ts'

export const SECONDS_PER_QUESTION = 72 // 100 questions = 2 h
export const MAX_QUESTIONS = 100
export const EXPIRY_GRACE_S = 5

export type AttemptMode = 'tuteur' | 'examen'
export const MOCK_EXAMS: Record<string, { name: string; count: number }> = {
  'blanc-1': { name: 'Examen blanc 1', count: 100 },
  'blanc-2': { name: 'Examen blanc 2', count: 100 },
}

export type Explanation = {
  contexte: string
  rationales: string[]
  points_cles: string[]
  references: { label: string; url?: string }[]
}

export type StartInput = { mode: AttemptMode; count: number; types?: string[]; examCode?: string }
export type StartResult = { ok: true; id: number } | { ok: false; error: 'invalid' | 'no_questions' }

export type SaveInput = {
  choice?: number | null
  struck?: number[]
  marked?: boolean
  timeSpentDelta?: number
  submit?: boolean
}

export type Review = { correct_index: number; is_correct: boolean; explanation: Explanation }

export type ExamDeps = { query: Query; now?: () => Date; random?: () => number }

const int = (v: unknown) => Number(v)

function seededRandom(seed: string): () => number {
  // mulberry32 amorcé par SHA-256(seed) : même graine ⇒ même mélange pour tout le monde.
  let a = parseInt(crypto.createHash('sha256').update(seed).digest('hex').slice(0, 8), 16)
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createExamService(deps: ExamDeps) {
  const { query } = deps
  const now = deps.now ?? (() => new Date())
  const rnd = deps.random ?? (() => crypto.randomInt(0, 2 ** 31) / 2 ** 31)

  async function logEvent(userId: number | string, type: string, payload: Record<string, unknown>) {
    await query('INSERT INTO events (user_id, type, payload) VALUES ($1, $2, $3::jsonb)', [userId, type, JSON.stringify(payload)])
  }

  // ─── Démarrage ─────────────────────────────────────────────────────────────

  async function publishedCount(): Promise<number> {
    const r = await query<{ n: string }>("SELECT COUNT(*)::TEXT AS n FROM training_questions WHERE status = 'published' AND NOT stale")
    return parseInt(r[0].n, 10)
  }

  async function startAttempt(userId: number | string, input: StartInput): Promise<StartResult> {
    const mock = input.examCode ? MOCK_EXAMS[input.examCode] : undefined
    if (input.examCode && !mock) return { ok: false, error: 'invalid' }
    const mode: AttemptMode = mock ? 'examen' : input.mode
    if (mode !== 'tuteur' && mode !== 'examen') return { ok: false, error: 'invalid' }
    const wanted = mock ? mock.count : Math.trunc(Number(input.count))
    if (!Number.isFinite(wanted) || wanted < 1 || wanted > MAX_QUESTIONS) return { ok: false, error: 'invalid' }

    const types = (input.types ?? []).filter(t => typeof t === 'string').slice(0, 10)
    const rows = await query<{ id: string }>(
      `SELECT id FROM training_questions
        WHERE status = 'published' AND NOT stale ${types.length ? 'AND type = ANY($1)' : ''}
        ORDER BY id`,
      types.length ? [types] : [],
    )
    if (rows.length === 0) return { ok: false, error: 'no_questions' }

    const ids = rows.map(r => int(r.id))
    // Examen blanc : mélange déterministe (même ordre pour tous tant que la banque est la même).
    const ordered = shuffle(ids, mock ? seededRandom(`mock:${input.examCode}`) : rnd).slice(0, Math.min(wanted, ids.length))
    const limit = mode === 'examen' ? ordered.length * SECONDS_PER_QUESTION : null

    const att = await query<{ id: string }>(
      `INSERT INTO attempts (user_id, mode, exam_code, question_ids, started_at, time_limit_s, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, mode, mock ? input.examCode : null, ordered, now().toISOString(), limit, ordered.length],
    )
    const attemptId = int(att[0].id)
    await query(
      `INSERT INTO answers (attempt_id, question_id, position)
       SELECT $1, q, ord FROM unnest($2::bigint[]) WITH ORDINALITY AS t(q, ord)`,
      [attemptId, ordered],
    )
    await logEvent(userId, 'attempt_started', { mode, total: ordered.length, exam_code: mock ? input.examCode : null })
    return { ok: true, id: attemptId }
  }

  // ─── Lecture de tentative ──────────────────────────────────────────────────

  type AttemptRow = {
    id: string; user_id: string; mode: AttemptMode; exam_code: string | null; started_at: string
    time_limit_s: number | null; finished_at: string | null; score: number | null; total: number
  }

  async function loadAttempt(userId: number | string, attemptId: number): Promise<AttemptRow | null> {
    if (!Number.isSafeInteger(attemptId) || attemptId <= 0) return null
    let a = (await query<AttemptRow>('SELECT * FROM attempts WHERE id = $1 AND user_id = $2', [attemptId, userId]))[0]
    if (!a) return null
    // Examen expiré : on le clôture côté serveur, même si le navigateur est fermé.
    if (!a.finished_at && remainingSeconds(a) !== null && remainingSeconds(a)! < -EXPIRY_GRACE_S) {
      await finalize(a)
      a = (await query<AttemptRow>('SELECT * FROM attempts WHERE id = $1', [attemptId]))[0]
    }
    return a
  }

  function remainingSeconds(a: Pick<AttemptRow, 'started_at' | 'time_limit_s' | 'finished_at'>): number | null {
    if (a.time_limit_s === null) return null
    const end = new Date(a.started_at).getTime() + a.time_limit_s * 1000
    return Math.ceil((end - now().getTime()) / 1000)
  }

  function attemptName(a: Pick<AttemptRow, 'exam_code' | 'mode'>): string {
    if (a.exam_code && MOCK_EXAMS[a.exam_code]) return MOCK_EXAMS[a.exam_code].name
    return a.mode === 'examen' ? 'Simulation d’examen' : 'Série en mode tuteur'
  }

  /**
   * Vue d'ensemble : états du navigateur de questions. Aucun contenu de
   * question, aucune correction. Le score n'apparaît qu'une fois terminée.
   */
  async function getOverview(userId: number | string, attemptId: number) {
    const a = await loadAttempt(userId, attemptId)
    if (!a) return null
    const items = await query<{ position: number; choice: number | null; marked: boolean; struck: number[] }>(
      'SELECT position, choice, marked, struck FROM answers WHERE attempt_id = $1 ORDER BY position',
      [attemptId],
    )
    const finished = !!a.finished_at
    const rem = remainingSeconds(a)
    return {
      attempt: {
        id: int(a.id), mode: a.mode, name: attemptName(a), total: a.total, finished,
        remaining_s: finished || rem === null ? null : Math.max(0, rem),
        time_limit_s: a.time_limit_s,
        score: finished ? a.score : null,
      },
      items: items.map(i => ({
        position: int(i.position), answered: i.choice !== null, marked: i.marked, struck: (i.struck ?? []).length > 0,
      })),
    }
  }

  async function viewQuestion(userId: number | string, attemptId: number, position: number) {
    const a = await loadAttempt(userId, attemptId)
    if (!a || !Number.isSafeInteger(position) || position < 1 || position > a.total) return null
    const row = (await query<any>(
      `SELECT a.choice, a.struck, a.marked, a.is_correct, q.id AS qid, q.type, q.stem, q.options, q.correct_index, q.explanation
         FROM answers a JOIN training_questions q ON q.id = a.question_id
        WHERE a.attempt_id = $1 AND a.position = $2`,
      [attemptId, position],
    ))[0]
    if (!row) return null

    const finished = !!a.finished_at
    const validated = a.mode === 'tuteur' && row.is_correct !== null
    const canReveal = finished || validated
    const rem = remainingSeconds(a)
    const view: {
      question: { id: number; type: string; stem: string; options: string[] }
      answer: { choice: number | null; struck: number[]; marked: boolean; locked: boolean }
      remaining_s: number | null
      finished: boolean
      review?: Review
    } = {
      question: { id: int(row.qid), type: row.type, stem: row.stem, options: row.options },
      answer: { choice: row.choice, struck: row.struck ?? [], marked: row.marked, locked: finished || validated },
      remaining_s: finished || rem === null ? null : Math.max(0, rem),
      finished,
    }
    if (canReveal) {
      view.review = { correct_index: row.correct_index, is_correct: !!row.is_correct, explanation: row.explanation }
    }
    return view
  }

  // ─── Enregistrement des réponses ───────────────────────────────────────────

  async function saveAnswer(
    userId: number | string,
    attemptId: number,
    position: number,
    input: SaveInput,
  ): Promise<{ ok: true; remaining_s: number | null; validated: boolean } | { ok: false; error: 'not_found' | 'finished' | 'expired' | 'locked' | 'invalid' }> {
    const a = await loadAttempt(userId, attemptId)
    if (!a || !Number.isSafeInteger(position) || position < 1 || position > a.total) return { ok: false, error: 'not_found' }
    if (a.finished_at) return { ok: false, error: a.time_limit_s !== null && (remainingSeconds(a) ?? 1) <= 0 ? 'expired' : 'finished' }
    const rem = remainingSeconds(a)
    if (rem !== null && rem <= 0) {
      await finalize(a)
      return { ok: false, error: 'expired' }
    }

    const cur = (await query<any>(
      `SELECT a.choice, a.struck, a.marked, a.is_correct, q.correct_index, q.type
         FROM answers a JOIN training_questions q ON q.id = a.question_id
        WHERE a.attempt_id = $1 AND a.position = $2`,
      [attemptId, position],
    ))[0]
    if (!cur) return { ok: false, error: 'not_found' }
    const locked = a.mode === 'tuteur' && cur.is_correct !== null

    let choice: number | null = cur.choice
    if (input.choice !== undefined) {
      if (input.choice !== null && !(Number.isInteger(input.choice) && input.choice >= 0 && input.choice <= 4)) return { ok: false, error: 'invalid' }
      if (locked) return { ok: false, error: 'locked' }
      choice = input.choice
    }
    let struck: number[] = cur.struck ?? []
    if (input.struck !== undefined) {
      if (!Array.isArray(input.struck) || input.struck.some(s => !Number.isInteger(s) || s < 0 || s > 4)) return { ok: false, error: 'invalid' }
      if (locked) return { ok: false, error: 'locked' }
      struck = Array.from(new Set(input.struck)).sort()
    }
    const marked = input.marked === undefined ? cur.marked : !!input.marked
    const delta = locked ? 0 : Math.min(Math.max(Math.trunc(Number(input.timeSpentDelta) || 0), 0), 3600)

    let isCorrect: boolean | null = cur.is_correct
    let validated = false
    if (input.submit) {
      if (a.mode !== 'tuteur') return { ok: false, error: 'invalid' }
      if (choice === null) return { ok: false, error: 'invalid' }
      if (locked) return { ok: false, error: 'locked' }
      isCorrect = choice === cur.correct_index
      validated = true
    }

    await query(
      `UPDATE answers SET choice = $3, struck = $4, marked = $5, is_correct = $6,
              time_spent_s = time_spent_s + $7,
              answered_at = CASE WHEN $3::smallint IS NULL THEN NULL ELSE COALESCE(answered_at, $8) END
        WHERE attempt_id = $1 AND position = $2`,
      [attemptId, position, choice, struck, marked, isCorrect, delta, now().toISOString()],
    )

    // Un événement par question répondue : en tuteur à la validation, en examen à la première réponse.
    // La charge utile ne révèle jamais la justesse en mode examen.
    if (validated) await logEvent(userId, 'question_answered', { mode: 'tuteur', question_type: cur.type, correct: isCorrect })
    else if (a.mode === 'examen' && cur.choice === null && choice !== null) {
      await logEvent(userId, 'question_answered', { mode: 'examen', question_type: cur.type })
    }
    return { ok: true, remaining_s: rem === null ? null : Math.max(0, rem), validated }
  }

  // ─── Fin et résultats ──────────────────────────────────────────────────────

  async function finalize(a: AttemptRow): Promise<void> {
    // Idempotent : seule la première clôture écrit.
    const done = await query<{ id: string }>(
      `UPDATE attempts SET finished_at = $2 WHERE id = $1 AND finished_at IS NULL RETURNING id`,
      [a.id, now().toISOString()],
    )
    if (done.length === 0) return
    await query(
      `UPDATE answers a SET is_correct = (a.choice IS NOT NULL AND a.choice = q.correct_index)
         FROM training_questions q WHERE q.id = a.question_id AND a.attempt_id = $1`,
      [a.id],
    )
    const s = (await query<{ n: string }>('SELECT COUNT(*) FILTER (WHERE is_correct)::TEXT AS n FROM answers WHERE attempt_id = $1', [a.id]))[0]
    await query('UPDATE attempts SET score = $2 WHERE id = $1', [a.id, parseInt(s.n, 10)])
    const seconds = Math.round((now().getTime() - new Date(a.started_at).getTime()) / 1000)
    await logEvent(a.user_id, 'attempt_finished', { mode: a.mode, score: parseInt(s.n, 10), total: a.total, duration_s: seconds })
  }

  /** « Terminer la section » : clôture (idempotente) et renvoie le score. */
  async function finishAttempt(userId: number | string, attemptId: number) {
    const a = await loadAttempt(userId, attemptId)
    if (!a) return null
    if (!a.finished_at) await finalize(a)
    const fresh = (await query<AttemptRow>('SELECT * FROM attempts WHERE id = $1', [attemptId]))[0]
    return { score: fresh.score ?? 0, total: fresh.total }
  }

  async function getResults(userId: number | string, attemptId: number) {
    const a = await loadAttempt(userId, attemptId)
    if (!a || !a.finished_at) return null
    const rows = await query<any>(
      `SELECT a.position, a.question_id, a.choice, a.is_correct, a.marked, a.time_spent_s, q.type, q.atc_code, q.stem, q.correct_index
         FROM answers a JOIN training_questions q ON q.id = a.question_id
        WHERE a.attempt_id = $1 ORDER BY a.position`,
      [attemptId],
    )
    return {
      attempt: { id: int(a.id), name: attemptName(a), mode: a.mode, total: a.total, score: a.score ?? 0, started_at: a.started_at, finished_at: a.finished_at },
      items: rows.map(r => ({
        position: int(r.position), question_id: int(r.question_id), type: r.type as string, atc_code: r.atc_code as string | null,
        stem: r.stem as string, choice: r.choice as number | null, correct_index: int(r.correct_index),
        is_correct: !!r.is_correct, marked: !!r.marked, time_spent_s: int(r.time_spent_s),
      })),
    }
  }

  async function listAttempts(userId: number | string, limit = 10) {
    const rows = await query<AttemptRow>(
      'SELECT * FROM attempts WHERE user_id = $1 ORDER BY started_at DESC, id DESC LIMIT $2',
      [userId, Math.min(Math.max(limit, 1), 50)],
    )
    const out = []
    for (const r of rows) {
      let a = r
      if (!a.finished_at && remainingSeconds(a) !== null && remainingSeconds(a)! < -EXPIRY_GRACE_S) {
        await finalize(a)
        a = (await query<AttemptRow>('SELECT * FROM attempts WHERE id = $1', [a.id]))[0]
      }
      out.push({
        id: int(a.id), name: attemptName(a), mode: a.mode, total: a.total, finished: !!a.finished_at,
        score: a.finished_at ? a.score : null, started_at: a.started_at,
      })
    }
    return out
  }

  // ─── Correction détaillée ──────────────────────────────────────────────────

  /**
   * La correction d'une question n'est lisible que si l'utilisateur l'a déjà
   * « passée » dans une de ses tentatives : validée en mode tuteur, ou
   * tentative terminée (tuteur ou examen). Sans cela : null, et rien ne fuit.
   */
  async function getCorrection(userId: number | string, questionId: number, attemptId?: number) {
    if (!Number.isSafeInteger(questionId) || questionId <= 0) return null
    const params: any[] = [userId, questionId]
    let scope = ''
    if (attemptId !== undefined) {
      if (!Number.isSafeInteger(attemptId)) return null
      params.push(attemptId)
      scope = 'AND t.id = $3'
    }
    const row = (await query<any>(
      `SELECT t.id AS attempt_id, t.mode, t.total, t.exam_code, t.started_at, t.time_limit_s, t.finished_at,
              a.position, a.choice, a.is_correct,
              q.id AS qid, q.type, q.stem, q.options, q.correct_index, q.explanation, q.atc_code
         FROM answers a
         JOIN attempts t ON t.id = a.attempt_id
         JOIN training_questions q ON q.id = a.question_id
        WHERE t.user_id = $1 AND a.question_id = $2 ${scope}
          AND (t.finished_at IS NOT NULL OR (t.mode = 'tuteur' AND a.is_correct IS NOT NULL))
        ORDER BY t.started_at DESC, t.id DESC LIMIT 1`,
      params,
    ))[0]
    if (!row) return null

    const prog = (await query<{ answered: string; correct: string }>(
      `SELECT COUNT(*) FILTER (WHERE is_correct IS NOT NULL)::TEXT AS answered,
              COUNT(*) FILTER (WHERE is_correct)::TEXT AS correct
         FROM answers WHERE attempt_id = $1`,
      [row.attempt_id],
    ))[0]
    const next = (await query<{ question_id: string }>(
      'SELECT question_id FROM answers WHERE attempt_id = $1 AND position = $2',
      [row.attempt_id, int(row.position) + 1],
    ))[0]
    const fc = (await query('SELECT 1 FROM training_flashcards WHERE user_id = $1 AND question_id = $2', [userId, questionId])).length > 0

    return {
      attempt: { id: int(row.attempt_id), mode: row.mode as AttemptMode, total: row.total, finished: !!row.finished_at, position: int(row.position) },
      question: { id: int(row.qid), type: row.type as string, stem: row.stem as string, options: row.options as string[], atc_code: row.atc_code as string | null },
      choice: row.choice as number | null,
      correct_index: int(row.correct_index),
      is_correct: !!row.is_correct,
      explanation: row.explanation as Explanation,
      progress: { answered: parseInt(prog.answered, 10), correct: parseInt(prog.correct, 10) },
      next_question_id: next ? int(next.question_id) : null,
      flashcard: fc,
    }
  }

  /** Ajoute / retire une question des flashcards (seulement si sa correction est lisible par l'utilisateur). */
  async function setFlashcard(userId: number | string, questionId: number, on: boolean): Promise<boolean> {
    if (on) {
      const ok = await getCorrection(userId, questionId)
      if (!ok) return false
      await query('INSERT INTO training_flashcards (user_id, question_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, questionId])
    } else {
      await query('DELETE FROM training_flashcards WHERE user_id = $1 AND question_id = $2', [userId, questionId])
    }
    return true
  }

  /**
   * Flashcards de l'utilisateur. Seules celles dont la correction lui est
   * lisible sont renvoyées (elles ne peuvent être ajoutées qu'à ce titre) :
   * la réponse n'est donc jamais une information nouvelle pour lui.
   */
  async function listFlashcards(userId: number | string) {
    const rows = await query<any>(
      `SELECT q.id, q.type, q.stem, q.options, q.correct_index, q.explanation
         FROM training_flashcards f JOIN training_questions q ON q.id = f.question_id
        WHERE f.user_id = $1
          AND EXISTS (SELECT 1 FROM answers a JOIN attempts t ON t.id = a.attempt_id
                       WHERE t.user_id = $1 AND a.question_id = q.id
                         AND (t.finished_at IS NOT NULL OR (t.mode = 'tuteur' AND a.is_correct IS NOT NULL)))
        ORDER BY f.created_at DESC, q.id DESC LIMIT 500`,
      [userId],
    )
    return rows.map(r => ({
      id: int(r.id), type: r.type as string, stem: r.stem as string, options: r.options as string[],
      correct_index: int(r.correct_index), explanation: r.explanation as Explanation,
    }))
  }

  return {
    listFlashcards, publishedCount, startAttempt, getOverview, viewQuestion, saveAnswer, finishAttempt,
    getResults, listAttempts, getCorrection, setFlashcard,
  }
}

export type ExamService = ReturnType<typeof createExamService>
