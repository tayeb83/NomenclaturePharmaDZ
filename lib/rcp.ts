/**
 * DwaDZ — accès aux RCP rattachés à une fiche (voir lib/rcp-core.ts).
 * Table absente (sql/26 non appliqué) ou sans rattachement : la fiche
 * n'affiche simplement pas le bloc.
 */

import { unstable_cache } from 'next/cache'
import { query, queryOne } from './db'
import { fetchInteractionsVers, fetchRcpForFiche, loadMatchIndex, resolveDciLiens, type InteractionEntrante, type MatchIndex, type RcpLink } from './rcp-core'

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

// Index de rapprochement : une lecture des DCI et des classes ATC par instance et par heure.
let indexMemo: { at: number; index: MatchIndex } | undefined
async function getMatchIndex(): Promise<MatchIndex> {
  if (indexMemo && Date.now() - indexMemo.at < 3_600_000) return indexMemo.index
  const index = await loadMatchIndex(query)
  indexMemo = { at: Date.now(), index }
  return index
}

export function getRcpForFiche(nEnreg: string | null, code: string | null): Promise<RcpLink[]> {
  if (!nEnreg) return Promise.resolve([])
  const key = (code ?? '').trim()
  return unstable_cache(
    async () => {
      if (!(await hasRcpTables())) return []
      const rcps = await fetchRcpForFiche(query, nEnreg, key)
      // un échec du rapprochement ne doit pas faire disparaître le RCP : les interactions restent lisibles, sans lien
      return getMatchIndex().then(i => resolveDciLiens(rcps, i)).catch(() => rcps)
    },
    ['rcp', 'v4', nEnreg, key], // v4 : rapprochement amélioré des interactions (DCI et classes) ; évite de relire d'anciennes entrées de cache
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
      return fetchInteractionsVers(query, key, await getMatchIndex()).catch(() => [])
    },
    ['rcp-vers', 'v2', key],
    { revalidate: 86_400, tags: [RCP_TAG] }
  )()
}
