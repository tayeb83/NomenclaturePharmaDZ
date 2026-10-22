/**
 * Dzair-Pharma Training — suivi d'usage (admin) et exports CSV.
 * Mesure de l'usage uniquement : agrégats, jamais de contenu de réponse
 * individuel. Les exports contiennent des données personnelles (e-mail) :
 * ils sont réservés à l'admin et soumis à la même politique de conservation.
 */
import { toCsv } from './security.ts'
import type { Query } from './service.ts'

export const MIN_ANSWERS = 5 // échantillon minimal pour classer une question « la plus manquée »

type Missed = { n: number; wrong: number; rate: number }

const num = (v: unknown) => Number(v ?? 0)
const rate = (wrong: number, n: number) => (n > 0 ? Math.round((wrong / n) * 1000) / 10 : 0)

export function createStatsService(deps: { query: Query }) {
  const { query } = deps

  async function overview(days = 7) {
    const d = Math.min(Math.max(Math.trunc(days) || 7, 1), 365)
    const active = (await query<{ n: string }>(
      `SELECT COUNT(DISTINCT user_id)::TEXT AS n FROM events
        WHERE user_id IS NOT NULL AND created_at >= NOW() - make_interval(days => $1)
          AND type IN ('login', 'attempt_started', 'question_answered', 'attempt_finished')`,
      [d],
    ))[0].n
    const users = await query<{ status: string; n: string }>('SELECT status, COUNT(*)::TEXT AS n FROM training_users GROUP BY status')
    const att = (await query<any>(
      `SELECT COUNT(*)::TEXT AS total,
              COUNT(*) FILTER (WHERE finished_at IS NOT NULL)::TEXT AS finished,
              COUNT(*) FILTER (WHERE started_at >= NOW() - make_interval(days => $1))::TEXT AS recent,
              AVG(score::float / total) FILTER (WHERE finished_at IS NOT NULL) AS avg_ratio
         FROM attempts`,
      [d],
    ))[0]
    const byMode = await query<any>(
      `SELECT mode, COUNT(*)::TEXT AS n, COUNT(*) FILTER (WHERE finished_at IS NOT NULL)::TEXT AS finished,
              AVG(score::float / total) FILTER (WHERE finished_at IS NOT NULL) AS avg_ratio
         FROM attempts GROUP BY mode ORDER BY mode`,
    )
    const roles = await query<{ role: string; n: string }>("SELECT role, COUNT(*)::TEXT AS n FROM training_users WHERE status = 'approved' GROUP BY role ORDER BY role")
    const questions = await query<{ status: string; n: string }>('SELECT status, COUNT(*)::TEXT AS n FROM training_questions GROUP BY status')
    return {
      days: d,
      activeUsers: num(active),
      users: Object.fromEntries(users.map(u => [u.status, num(u.n)])) as Record<string, number>,
      approvedByRole: Object.fromEntries(roles.map(r => [r.role, num(r.n)])) as Record<string, number>,
      questions: Object.fromEntries(questions.map(q => [q.status, num(q.n)])) as Record<string, number>,
      attempts: {
        total: num(att.total), finished: num(att.finished), recent: num(att.recent),
        avgScorePct: att.avg_ratio === null ? null : Math.round(Number(att.avg_ratio) * 1000) / 10,
      },
      byMode: byMode.map(m => ({
        mode: m.mode as string, attempts: num(m.n), finished: num(m.finished),
        avgScorePct: m.avg_ratio === null ? null : Math.round(Number(m.avg_ratio) * 1000) / 10,
      })),
    }
  }

  /** Questions, types et classes ATC (niveau 3) les plus manquées. Ne compte que les réponses données ET corrigées. */
  async function mostMissed(limit = 20) {
    const base = `
      FROM answers a
      JOIN training_questions q ON q.id = a.question_id
     WHERE a.choice IS NOT NULL AND a.is_correct IS NOT NULL`
    const lim = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100)

    const questions = await query<any>(
      `SELECT q.id, q.type, q.stem, q.atc_code, COUNT(*)::TEXT AS n, COUNT(*) FILTER (WHERE NOT a.is_correct)::TEXT AS wrong
         ${base}
        GROUP BY q.id, q.type, q.stem, q.atc_code
       HAVING COUNT(*) >= $1
        ORDER BY COUNT(*) FILTER (WHERE NOT a.is_correct)::float / COUNT(*) DESC, COUNT(*) DESC
        LIMIT ${lim}`,
      [MIN_ANSWERS],
    )
    const byType = await query<any>(
      `SELECT q.type, COUNT(*)::TEXT AS n, COUNT(*) FILTER (WHERE NOT a.is_correct)::TEXT AS wrong
         ${base} GROUP BY q.type ORDER BY COUNT(*) FILTER (WHERE NOT a.is_correct)::float / COUNT(*) DESC`,
    )
    const atcSql = (withLabels: boolean) => `
      SELECT COALESCE(LEFT(q.atc_code, 4), '—') AS atc, ${withLabels ? 'MAX(c.label_fr)' : 'NULL'} AS label,
             COUNT(*)::TEXT AS n, COUNT(*) FILTER (WHERE NOT a.is_correct)::TEXT AS wrong
        ${base.replace('JOIN training_questions q ON q.id = a.question_id', `JOIN training_questions q ON q.id = a.question_id ${withLabels ? 'LEFT JOIN atc_codes c ON c.code = LEFT(q.atc_code, 4)' : ''}`)}
       GROUP BY COALESCE(LEFT(q.atc_code, 4), '—')
      HAVING COUNT(*) >= $1
       ORDER BY COUNT(*) FILTER (WHERE NOT a.is_correct)::float / COUNT(*) DESC, COUNT(*) DESC
       LIMIT ${lim}`
    let byAtc: any[]
    try {
      byAtc = await query<any>(atcSql(true), [MIN_ANSWERS])
    } catch (err) {
      if ((err as { code?: string })?.code !== '42P01') throw err
      byAtc = await query<any>(atcSql(false), [MIN_ANSWERS]) // table ATC absente : codes seuls
    }
    const shape = (r: any): Missed => ({ n: num(r.n), wrong: num(r.wrong), rate: rate(num(r.wrong), num(r.n)) })
    return {
      minAnswers: MIN_ANSWERS,
      questions: questions.map(r => ({ id: num(r.id), type: r.type as string, stem: r.stem as string, atc: r.atc_code as string | null, ...shape(r) })),
      byType: byType.map(r => ({ type: r.type as string, ...shape(r) })),
      byAtc: byAtc.map(r => ({ atc: r.atc as string, label: r.label as string | null, ...shape(r) })),
    }
  }

  async function exportUsersCsv(): Promise<string> {
    const rows = await query<any>(
      `SELECT u.id, u.email, u.source, u.role, u.faculte, u.status, u.created_at, u.approved_at, u.last_login_at,
              COUNT(t.id)::TEXT AS attempts,
              COUNT(t.id) FILTER (WHERE t.finished_at IS NOT NULL)::TEXT AS finished,
              ROUND((AVG(t.score::numeric / t.total) FILTER (WHERE t.finished_at IS NOT NULL)) * 100, 1)::TEXT AS avg_pct
         FROM training_users u LEFT JOIN attempts t ON t.user_id = u.id
        GROUP BY u.id ORDER BY u.created_at DESC, u.id DESC LIMIT 20000`,
    )
    return toCsv(
      ['id', 'email', 'source', 'profil', 'faculte', 'statut', 'date_demande', 'date_validation', 'derniere_connexion', 'tentatives', 'terminees', 'score_moyen_pct'],
      rows.map(r => [r.id, r.email, r.source, r.role, r.faculte, r.status, r.created_at, r.approved_at, r.last_login_at, r.attempts, r.finished, r.avg_pct]),
    )
  }

  async function exportAttemptsCsv(): Promise<string> {
    const rows = await query<any>(
      `SELECT t.id, t.user_id, u.email, t.mode, t.exam_code, t.started_at, t.finished_at, t.total, t.score,
              CASE WHEN t.finished_at IS NOT NULL THEN EXTRACT(EPOCH FROM (t.finished_at - t.started_at))::INT END AS duration_s,
              CASE WHEN t.finished_at IS NOT NULL THEN ROUND(t.score::numeric / t.total * 100, 1) END AS pct
         FROM attempts t JOIN training_users u ON u.id = t.user_id
        ORDER BY t.started_at DESC, t.id DESC LIMIT 50000`,
    )
    return toCsv(
      ['tentative', 'utilisateur', 'email', 'mode', 'examen_blanc', 'debut', 'fin', 'duree_s', 'questions', 'score', 'score_pct'],
      rows.map(r => [r.id, r.user_id, r.email, r.mode, r.exam_code, r.started_at, r.finished_at, r.duration_s, r.total, r.score, r.pct]),
    )
  }

  return { overview, mostMissed, exportUsersCsv, exportAttemptsCsv }
}

export type StatsService = ReturnType<typeof createStatsService>
