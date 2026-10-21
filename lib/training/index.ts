import { query } from '../db'
import { createTrainingService } from './service.ts'
import { sendMail } from './mail.ts'

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

const g = globalThis as unknown as { _trainingService?: ReturnType<typeof createTrainingService> }

export function getTraining() {
  if (!g._trainingService) {
    g._trainingService = createTrainingService({ query, sendMail, appUrl, adminEmails })
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
