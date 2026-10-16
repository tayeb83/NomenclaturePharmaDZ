/**
 * DwaDZ — Monographies par DCI : contenu médical saisi et relu à la main
 * (voir sql/18_dci_monographies.sql). Rien n'est généré ni inventé ici : une
 * fiche sans monographie publiée n'affiche simplement pas le bloc.
 */

import { unstable_cache } from 'next/cache'
import { query, queryOne } from './db'
import type { Lang } from './i18n'
import {
  MONOGRAPHIE_SECTIONS,
  type Monographie,
  type MonographieSection,
  type MonographieListRow,
} from './monographie-types'

export * from './monographie-types'

export const MONOGRAPHIE_TAG = 'monographies'

/** Même clé que dci_atc_mapping : majuscules + espaces normalisés. */
export const dciKey = (dci: string) => dci.replace(/\s+/g, ' ').trim().toUpperCase()

let tableExists: boolean | undefined
async function hasMonographieTable(): Promise<boolean> {
  if (tableExists) return true
  const row = await queryOne<{ exists: boolean }>(
    `SELECT to_regclass('public.dci_monographies') IS NOT NULL AS "exists"`
  )
  tableExists = row?.exists ?? false
  return tableExists
}

/** Monographie publiée pour la DCI et la langue, ou null (table absente comprise). */
export function getPublishedMonographie(dci: string, lang: Lang): Promise<Monographie | null> {
  const key = dciKey(dci)
  if (!key) return Promise.resolve(null)
  return unstable_cache(
    async () => {
      if (!(await hasMonographieTable())) return null
      return queryOne<Monographie>(
        `SELECT * FROM dci_monographies WHERE dci = $1 AND lang = $2 AND status = 'publie'`,
        [key, lang]
      )
    },
    ['monographie', key, lang],
    { revalidate: 86_400, tags: [MONOGRAPHIE_TAG] }
  )()
}

export function hasContent(m: Monographie | null): m is Monographie {
  return !!m && MONOGRAPHIE_SECTIONS.some(s => (m[s] ?? '').trim())
}

// ─── Administration ───────────────────────────────────────────

/** Toutes les DCI actives (les plus présentes d'abord) avec l'état de leurs monographies. */
export async function listDciWithMonographieState(): Promise<{ rows: MonographieListRow[]; tableMissing: boolean }> {
  const tableMissing = !(await hasMonographieTable())
  const rows = await query<MonographieListRow>(
    tableMissing
      ? `SELECT UPPER(btrim(dci)) AS dci, COUNT(*)::INT AS nb_fiches, NULL AS fr, NULL AS ar
         FROM enregistrements WHERE dci IS NOT NULL AND btrim(dci) <> ''
         GROUP BY 1 ORDER BY nb_fiches DESC, dci`
      : `SELECT e.dci, e.nb_fiches,
                MAX(m.status) FILTER (WHERE m.lang = 'fr') AS fr,
                MAX(m.status) FILTER (WHERE m.lang = 'ar') AS ar
         FROM (
           SELECT UPPER(btrim(dci)) AS dci, COUNT(*)::INT AS nb_fiches
           FROM enregistrements WHERE dci IS NOT NULL AND btrim(dci) <> ''
           GROUP BY 1
         ) e
         LEFT JOIN dci_monographies m ON m.dci = e.dci
         GROUP BY e.dci, e.nb_fiches
         ORDER BY e.nb_fiches DESC, e.dci`
  )
  return { rows, tableMissing }
}

export async function getMonographieAdmin(dci: string, lang: Lang): Promise<Monographie | null> {
  if (!(await hasMonographieTable())) return null
  return queryOne<Monographie>(`SELECT * FROM dci_monographies WHERE dci = $1 AND lang = $2`, [dciKey(dci), lang])
}

export type MonographieInput = Partial<Record<MonographieSection | 'sources' | 'reviewed_by' | 'reviewed_at', string | null>> & {
  status: 'brouillon' | 'publie'
}

export async function upsertMonographie(dci: string, lang: Lang, input: MonographieInput): Promise<void> {
  const v = (k: keyof MonographieInput) => {
    const s = (input[k] as string | null | undefined)?.trim()
    return s ? s : null
  }
  await query(
    `INSERT INTO dci_monographies
       (dci, lang, status, mecanisme, indications, posologie, contre_indications,
        effets_indesirables, grossesse_allaitement, interactions, sources, reviewed_by, reviewed_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW())
     ON CONFLICT (dci, lang) DO UPDATE SET
       status = EXCLUDED.status, mecanisme = EXCLUDED.mecanisme, indications = EXCLUDED.indications,
       posologie = EXCLUDED.posologie, contre_indications = EXCLUDED.contre_indications,
       effets_indesirables = EXCLUDED.effets_indesirables, grossesse_allaitement = EXCLUDED.grossesse_allaitement,
       interactions = EXCLUDED.interactions, sources = EXCLUDED.sources, reviewed_by = EXCLUDED.reviewed_by,
       reviewed_at = EXCLUDED.reviewed_at, updated_at = NOW()`,
    [dciKey(dci), lang, input.status, v('mecanisme'), v('indications'), v('posologie'), v('contre_indications'),
     v('effets_indesirables'), v('grossesse_allaitement'), v('interactions'), v('sources'), v('reviewed_by'), v('reviewed_at')]
  )
}
