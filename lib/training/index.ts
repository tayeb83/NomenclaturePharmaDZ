import { query } from '../db'
import { createTrainingService } from './service.ts'
import { createExamService } from './exam.ts'
import { createQuestionsAdmin } from './questions.ts'
import { createStatsService } from './stats.ts'
import { sendMail } from './mail.ts'
import { getOwnerEmail } from '../admin-auth'

export const APP_URL_FALLBACK = 'https://www.dzair-pharma.net'

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || APP_URL_FALLBACK).replace(/\/+$/, '')
}

/** Destinataires des notifications de demande d'accès : ADMIN_EMAILS (séparés par des virgules). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.includes('@'))
}

/** Équipe : propriétaire, ADMIN_EMAILS ou compte administrateur actif. */
export async function isTrustedEmail(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase()
  if (!e) return false
  if (e === getOwnerEmail() || adminEmails().includes(e)) return true
  const rows = await query<{ id: number }>(
    "SELECT id FROM admin_accounts WHERE lower(email) = $1 AND status = 'active' LIMIT 1",
    [e],
  ).catch(() => [] as { id: number }[]) // table absente (sql/33 non appliqué) : pas d'accès d'office
  return rows.length > 0
}

const g = globalThis as unknown as {
  _trainingService?: ReturnType<typeof createTrainingService>
  _trainingExam?: ReturnType<typeof createExamService>
  _trainingQuestions?: ReturnType<typeof createQuestionsAdmin>
  _trainingStats?: ReturnType<typeof createStatsService>
}

export function getTraining() {
  if (!g._trainingService) {
    g._trainingService = createTrainingService({ query, sendMail, appUrl, adminEmails, isTrustedEmail })
  }
  return g._trainingService
}

/**
 * Secret de signature des cookies courts (état OAuth, profil Facebook en
 * attente). Dédié si TRAINING_SESSION_SECRET existe, sinon celui de l'admin.
 */
export function trainingSecret(): string | null {
  return process.env.TRAINING_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.API_SECRET_KEY || null
}

export function getExam() {
  if (!g._trainingExam) g._trainingExam = createExamService({ query })
  return g._trainingExam
}

export function getQuestionsAdmin() {
  if (!g._trainingQuestions) g._trainingQuestions = createQuestionsAdmin({ query })
  return g._trainingQuestions
}

export function getStats() {
  if (!g._trainingStats) g._trainingStats = createStatsService({ query })
  return g._trainingStats
}
