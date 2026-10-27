/**
 * DwaDZ — accès aux RCP rattachés à une fiche (voir lib/rcp-core.ts).
 * Table absente (sql/26 non appliqué) ou sans rattachement : la fiche
 * n'affiche simplement pas le bloc.
 */

import { unstable_cache } from 'next/cache'
import { query, queryOne } from './db'
import { fetchInteractionsVers, fetchRcpForFiche, resolveDciLiens, type InteractionEntrante, type RcpLink } from './rcp-core'

export * from './rcp-core'

export const RCP_TAG = 'rcp'

let tableExists: boolean | undefined
async function hasRcpTables(): Promise<boolean> {
  if (tableExists) return true
  const row = await queryOne<{ exists: boolean }>(
    `SELECT to_regclass('public.rcp_documents') IS NOT NULL AND to_regclass('public.rcp_fiches') IS NOT NULL AS "exists"`
  )
  tableExists = row?.exists ?? false
  return tableExists
}

export function getRcpForFiche(nEnreg: string | null, code: string | null): Promise<RcpLink[]> {
  if (!nEnreg) return Promise.resolve([])
  const key = (code ?? '').trim()
  return unstable_cache(
    async () => {
      if (!(await hasRcpTables())) return []
      return resolveDciLiens(query, await fetchRcpForFiche(query, nEnreg, key))
    },
    ['rcp', 'v3', nEnreg, key], // v3 : liens vers les DCI des interactions ; évite de relire d'anciennes entrées de cache
    { revalidate: 86_400, tags: [RCP_TAG] }
  )()
}

/** Interactions citées par les RCP d'autres substances, pour la page d'une DCI ou d'une fiche. */
export function getInteractionsVers(dci: string | null): Promise<InteractionEntrante[]> {
  const key = (dci ?? '').trim().toUpperCase()
  if (!key) return Promise.resolve([])
  return unstable_cache(
    async () => {
      if (!(await hasRcpTables())) return []
      return fetchInteractionsVers(query, key).catch(() => [])
    },
    ['rcp-vers', 'v1', key],
    { revalidate: 86_400, tags: [RCP_TAG] }
  )()
}
