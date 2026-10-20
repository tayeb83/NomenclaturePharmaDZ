/**
 * NAQESS — signalements participatifs d'accès aux médicaments.
 *
 * Distinction centrale : un signalement est une DÉCLARATION d'un visiteur
 * (introuvable / prix inattendu / trouvé) ; une consultation est un clic de
 * recherche sur la fiche (search_click_events). Les deux ne sont jamais
 * additionnés, et un taux n'est affiché que si assez de déclarants
 * distincts l'étayent.
 */
import { query, queryOne } from './db'

export const SIGNAL_TYPES = ['introuvable', 'prix_inattendu', 'trouve'] as const
export type SignalType = (typeof SIGNAL_TYPES)[number]
export const PHARMACY_BUCKETS = ['1', '2-3', '4+'] as const
export type PharmacyBucket = (typeof PHARMACY_BUCKETS)[number]

/** Déclarants distincts minimum (médicament × wilaya × période) pour conclure */
export const MIN_REPORTERS = 3
export const MAX_SIGNALS_PER_HOUR = 20

export function isMissingTable(err: unknown): boolean {
  return (err as { code?: string })?.code === '42P01'
}

export type TrendRow = {
  periode: string            // YYYY-MM
  wilaya_code: string
  med_source: string
  med_id: number
  med_name: string
  dci: string | null
  introuvable: number
  prix_inattendu: number
  trouve: number
  total: number
  declarants: number         // IP distinctes (hash)
  consultations: number      // clics de recherche sur la fiche, national, même mois
  fiable: boolean            // declarants >= MIN_REPORTERS
}

export async function countRecentSignals(ipHash: string, minutes: number): Promise<number> {
  const row = await queryOne<{ n: string }>(`
    SELECT COUNT(*)::TEXT AS n FROM acces_signalements
    WHERE ip_hash = $1 AND created_at >= NOW() - ($2 || ' minutes')::INTERVAL
  `, [ipHash, String(minutes)])
  return parseInt(row?.n ?? '0', 10)
}

export async function isDuplicateSignal(
  ipHash: string, medSource: string, medId: number, wilaya: string, type: SignalType
): Promise<boolean> {
  const row = await queryOne<{ n: string }>(`
    SELECT COUNT(*)::TEXT AS n FROM acces_signalements
    WHERE ip_hash = $1 AND med_source = $2 AND med_id = $3 AND wilaya_code = $4
      AND signal_type = $5 AND created_at >= NOW() - INTERVAL '24 hours'
  `, [ipHash, medSource, medId, wilaya, type])
  return parseInt(row?.n ?? '0', 10) > 0
}

export async function insertSignal(s: {
  medSource: string; medId: number; medName: string; dci: string | null
  wilaya: string; type: SignalType; pharmacies: PharmacyBucket; ipHash: string
}): Promise<void> {
  await query(`
    INSERT INTO acces_signalements
      (med_source, med_id, med_name, dci, wilaya_code, signal_type, pharmacies, ip_hash)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [s.medSource, s.medId, s.medName, s.dci, s.wilaya, s.type, s.pharmacies, s.ipHash])
}

/**
 * Tendances mensuelles par wilaya × médicament. `months` = fenêtre en mois.
 * Les consultations viennent de search_click_events (table optionnelle).
 */
export async function getTrends(months: number): Promise<{ rows: TrendRow[]; tableMissing: boolean }> {
  const m = Math.min(Math.max(Math.trunc(months) || 1, 1), 24)
  let hasClicks = true
  try {
    await query('SELECT 1 FROM search_click_events LIMIT 1')
  } catch {
    hasClicks = false
  }
  try {
    const found = await query<any>(`
      WITH s AS (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS periode,
               wilaya_code, med_source, med_id,
               MAX(med_name) AS med_name, MAX(dci) AS dci,
               COUNT(*) FILTER (WHERE signal_type = 'introuvable')    AS introuvable,
               COUNT(*) FILTER (WHERE signal_type = 'prix_inattendu') AS prix_inattendu,
               COUNT(*) FILTER (WHERE signal_type = 'trouve')         AS trouve,
               COUNT(*)                                                AS total,
               COUNT(DISTINCT ip_hash)                                 AS declarants
        FROM acces_signalements
        WHERE status = 'valide'
          AND created_at >= date_trunc('month', NOW()) - ($1 || ' months')::INTERVAL
        GROUP BY 1, 2, 3, 4
      )
      ${hasClicks ? `
      , c AS (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS periode,
               result_source AS med_source, result_id AS med_id, COUNT(*) AS consultations
        FROM search_click_events GROUP BY 1, 2, 3
      )` : ''}
      SELECT s.*, ${hasClicks ? 'COALESCE(c.consultations, 0)' : '0'} AS consultations
      FROM s ${hasClicks ? 'LEFT JOIN c USING (periode, med_source, med_id)' : ''}
      ORDER BY s.periode DESC, s.introuvable DESC, s.total DESC
      LIMIT 2000
    `, [String(m - 1)])
    const rows: TrendRow[] = found.map((r: any) => ({
      periode: r.periode,
      wilaya_code: r.wilaya_code,
      med_source: r.med_source,
      med_id: Number(r.med_id),
      med_name: r.med_name,
      dci: r.dci,
      introuvable: Number(r.introuvable),
      prix_inattendu: Number(r.prix_inattendu),
      trouve: Number(r.trouve),
      total: Number(r.total),
      declarants: Number(r.declarants),
      consultations: Number(r.consultations),
      fiable: Number(r.declarants) >= MIN_REPORTERS,
    }))
    return { rows, tableMissing: false }
  } catch (err) {
    if (isMissingTable(err)) return { rows: [], tableMissing: true }
    throw err
  }
}
