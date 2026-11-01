/**
 * Chiffres du tableau de bord admin. Chaque requête est isolée : une table
 * absente (migration non appliquée) donne `null` au lieu de casser la page.
 */
import { query } from './db'

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

const count = async (sql: string) => Number((await query<{ n: string }>(sql))[0]?.n ?? 0)

export type SidebarCounts = { trainingPending: number; gardeReports: number }

export async function getSidebarCounts(): Promise<SidebarCounts> {
  const [trainingPending, gardeReports] = await Promise.all([
    safe(() => count(`SELECT COUNT(*) AS n FROM training_users WHERE status = 'pending'`)),
    safe(() => count(`SELECT COUNT(*) AS n FROM garde_reports WHERE status = 'nouveau'`)),
  ])
  return { trainingPending: trainingPending ?? 0, gardeReports: gardeReports ?? 0 }
}

export type DashboardData = {
  visitsByDay: { day: string; n: number }[] | null
  visitsPrev: number | null
  medicaments: number | null
  version: { label: string; date: string | null; nouveautes: number } | null
  gardeTotal: number | null
  gardeNoGps: number | null
  trainingApproved: number | null
  trainingNew7d: number | null
  todo: { trainingPending: number | null; gardeReports: number | null; socialDrafts: number | null; questionsDraft: number | null }
}

export async function getDashboardData(): Promise<DashboardData> {
  const [visitsByDay, visitsPrev, medicaments, version, gardeTotal, gardeNoGps, trainingApproved, trainingNew7d, trainingPending, gardeReports, socialDrafts, questionsDraft] =
    await Promise.all([
      safe(() =>
        query<{ day: string; n: number }>(
          `SELECT to_char(d::date, 'YYYY-MM-DD') AS day, COALESCE(v.n, 0)::int AS n
             FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, interval '1 day') d
             LEFT JOIN (SELECT created_at::date AS day, COUNT(*) AS n FROM page_visit_events
                         WHERE created_at >= CURRENT_DATE - 29 GROUP BY 1) v ON v.day = d::date
            ORDER BY d`,
        ),
      ),
      safe(() => count(`SELECT COUNT(*) AS n FROM page_visit_events WHERE created_at >= CURRENT_DATE - 59 AND created_at < CURRENT_DATE - 29`)),
      safe(() => count(`SELECT COUNT(*) AS n FROM enregistrements`)),
      safe(async () => {
        const r = (await query<{ version_label: string; reference_date: string | null; total_nouveautes: number }>(
          `SELECT version_label, reference_date, total_nouveautes FROM nomenclature_versions ORDER BY created_at DESC LIMIT 1`,
        ))[0]
        return r ? { label: r.version_label, date: r.reference_date, nouveautes: r.total_nouveautes } : null
      }),
      safe(() => count(`SELECT COUNT(*) AS n FROM garde_pharmacies`)),
      safe(() => count(`SELECT COUNT(*) AS n FROM garde_pharmacies WHERE lat IS NULL OR lng IS NULL`)),
      safe(() => count(`SELECT COUNT(*) AS n FROM training_users WHERE status = 'approved'`)),
      safe(() => count(`SELECT COUNT(*) AS n FROM training_users WHERE created_at >= NOW() - interval '7 days'`)),
      safe(() => count(`SELECT COUNT(*) AS n FROM training_users WHERE status = 'pending'`)),
      safe(() => count(`SELECT COUNT(*) AS n FROM garde_reports WHERE status = 'nouveau'`)),
      safe(() => count(`SELECT COUNT(*) AS n FROM social_content_queue WHERE statut = 'draft'`)),
      safe(() => count(`SELECT COUNT(*) AS n FROM training_questions WHERE status = 'draft'`)),
    ])
  return {
    visitsByDay, visitsPrev, medicaments, version, gardeTotal, gardeNoGps, trainingApproved, trainingNew7d,
    todo: { trainingPending, gardeReports, socialDrafts, questionsDraft },
  }
}
