/**
 * Toutes les requêtes DB centralisées ici
 * Les pages importent depuis ce fichier, pas depuis lib/db.ts directement
 */

import { query, queryOne } from './db'
import type { Enregistrement, Retrait, NonRenouvele, SearchResult, Stats, MedicamentDetail, AtcCode } from './db'

const schemaFeatureCache = new Map<string, boolean>()

async function hasTable(tableName: string): Promise<boolean> {
  const cacheKey = `table.${tableName}`
  if (schemaFeatureCache.has(cacheKey)) return schemaFeatureCache.get(cacheKey) ?? false

  const row = await queryOne<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
    ) AS "exists"
  `, [tableName])

  const exists = row?.exists ?? false
  schemaFeatureCache.set(cacheKey, exists)
  return exists
}

async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  const cacheKey = `${tableName}.${columnName}`
  if (schemaFeatureCache.has(cacheKey)) return schemaFeatureCache.get(cacheKey) ?? false

  const row = await queryOne<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) AS "exists"
  `, [tableName, columnName])

  const exists = row?.exists ?? false
  schemaFeatureCache.set(cacheKey, exists)
  return exists
}

export type SearchClickEventInput = {
  search_query: string
  scope: string
  result_source: SearchResult['source']
  result_id: number
  result_name: string
  result_dci: string
  result_labo?: string | null
}

export type SearchClickStat = {
  day: string
  total_clicks: number
  unique_queries: number
}

export type TopSearchClick = {
  search_query: string
  clicks: number
}

export type TopResultClick = {
  result_source: SearchResult['source']
  result_id: number
  result_name: string
  result_dci: string
  clicks: number
}

// ─── STATS ────────────────────────────────────────────────────
export async function getStats(): Promise<Stats> {
  // 1. Essayer la vue v_stats en premier (chemin rapide)
  let row: Stats | null = null
  try {
    row = await queryOne<Stats>(`SELECT * FROM v_stats`)
  } catch {
    // Bases legacy sans la vue ou avec un schéma incompatible
    row = null
  }

  if (row && row.total_enregistrements > 0) return row

  // 2. v_stats absente ou vide → requête de secours avec détection de schéma
  const [hasIsNewFlag, hasVersionsTable] = await Promise.all([
    hasColumn('enregistrements', 'is_new_vs_previous'),
    hasTable('nomenclature_versions'),
  ])
  const nouveautesCountExpr = hasIsNewFlag
    ? `(SELECT COUNT(*) FROM enregistrements WHERE is_new_vs_previous = TRUE)::INT`
    : `0::INT`
  const lastVersionExpr = hasVersionsTable
    ? `(
        SELECT version_label
        FROM nomenclature_versions
        ORDER BY reference_date DESC NULLS LAST, created_at DESC
        LIMIT 1
      )`
    : `NULL::TEXT`

  let fallback: Stats | null = null
  try {
    fallback = await queryOne<Stats>(`
      SELECT
        (SELECT COUNT(*) FROM enregistrements)::INT AS total_enregistrements,
        ${nouveautesCountExpr} AS total_nouveautes,
        (SELECT COUNT(*) FROM retraits)::INT AS total_retraits,
        (SELECT COUNT(*) FROM non_renouveles)::INT AS total_non_renouveles,
        (SELECT COUNT(*) FROM enregistrements WHERE statut = 'F')::INT AS fabriques_algerie,
        (SELECT COUNT(DISTINCT dci) FROM enregistrements)::INT AS dci_uniques,
        (SELECT COUNT(*) FROM newsletter_subscribers WHERE confirmed = TRUE)::INT AS abonnes_newsletter,
        ${lastVersionExpr} AS last_version
    `)
  } catch {
    fallback = null
  }

  if (fallback && fallback.total_enregistrements > 0) return fallback

  return row ?? fallback ?? {
    total_enregistrements: 0, total_nouveautes: 0,
    total_retraits: 0, total_non_renouveles: 0,
    fabriques_algerie: 0, dci_uniques: 0, abonnes_newsletter: 0,
    last_version: null,
  }
}

// ─── RECHERCHE FULLTEXT ───────────────────────────────────────
export async function searchMedicaments(
  q: string,
  scope: string = 'all',
  limit: number = 40,
  filters?: {
    labo?: string
    substance?: string
    activeOnly?: boolean
    advanced?: AdvancedSearchCondition[]
  }
): Promise<SearchResult[]> {
  const trimmedQuery = q.trim()
  const labo = filters?.labo?.trim() || ''
  const substance = filters?.substance?.trim() || ''
  const activeOnly = Boolean(filters?.activeOnly)
  const advanced = filters?.advanced ?? []

  if (!trimmedQuery && !labo && !substance && !advanced.some((condition) => condition.value?.trim())) return []

  // Construire la condition selon le scope
  const scopeConditions: Record<string, string> = {
    enregistrement: `WHERE source = 'enregistrement'`,
    retrait:        `WHERE source = 'retrait'`,
    non_renouvele:  `WHERE source = 'non_renouvele'`,
    all:            '',
  }
  const effectiveScope = activeOnly ? 'enregistrement' : scope
  const scopeFilter = scopeConditions[effectiveScope] ?? ''

  const searchPattern = `%${trimmedQuery}%`
  const laboPattern = `%${labo}%`
  const substancePattern = `%${substance}%`

  const advancedClause = buildAdvancedSearchClause(advanced, 8)
  const hasAtcMapping = await hasTable('dci_atc_mapping')
  const codeAtcEnr = hasAtcMapping ? 'atc_e.code_atc' : 'NULL::TEXT'
  const codeAtcRet = hasAtcMapping ? 'atc_r.code_atc' : 'NULL::TEXT'
  const codeAtcNon = hasAtcMapping ? 'atc_n.code_atc' : 'NULL::TEXT'
  const atcJoinEnr = hasAtcMapping ? 'LEFT JOIN dci_atc_mapping atc_e ON atc_e.dci = e.dci' : ''
  const atcJoinRet = hasAtcMapping ? 'LEFT JOIN dci_atc_mapping atc_r ON atc_r.dci = r.dci' : ''
  const atcJoinNon = hasAtcMapping ? 'LEFT JOIN dci_atc_mapping atc_n ON atc_n.dci = n.dci' : ''

  const results = await query<SearchResult>(`
    SELECT * FROM (
      SELECT
        'enregistrement' AS source,
        e.id, e.n_enreg, e.dci, e.nom_marque, e.forme, e.dosage, e.labo, e.pays,
        e.type_prod, e.statut, e.annee,
        NULL::DATE AS date_retrait,
        NULL::TEXT AS motif_retrait,
        e.date_final,
        ${codeAtcEnr} AS code_atc
      FROM enregistrements e
      ${atcJoinEnr}
      WHERE (
        $1 = ''
        OR CONCAT_WS(' ', e.n_enreg, e.dci, e.nom_marque, e.forme, e.dosage, e.labo, e.pays, e.type_prod, e.statut, e.annee::TEXT, ${codeAtcEnr}) ILIKE $2
      )
      AND ($3 = '' OR e.labo ILIKE $4)
      AND ($5 = '' OR e.dci ILIKE $6)

      UNION ALL

      SELECT
        'retrait' AS source,
        r.id, r.n_enreg, r.dci, r.nom_marque, r.forme, r.dosage, r.labo, r.pays,
        r.type_prod, r.statut, NULL::SMALLINT AS annee,
        r.date_retrait, r.motif_retrait,
        NULL::DATE AS date_final,
        ${codeAtcRet} AS code_atc
      FROM retraits r
      ${atcJoinRet}
      WHERE (
        $1 = ''
        OR CONCAT_WS(' ', r.n_enreg, r.dci, r.nom_marque, r.forme, r.dosage, r.labo, r.pays, r.type_prod, r.statut, r.motif_retrait, ${codeAtcRet}) ILIKE $2
      )
      AND ($3 = '' OR r.labo ILIKE $4)
      AND ($5 = '' OR r.dci ILIKE $6)

      UNION ALL

      SELECT
        'non_renouvele' AS source,
        n.id, n.n_enreg, n.dci, n.nom_marque, n.forme, n.dosage, n.labo, n.pays,
        n.type_prod, n.statut, NULL::SMALLINT AS annee,
        NULL::DATE AS date_retrait,
        NULL::TEXT AS motif_retrait,
        n.date_final,
        ${codeAtcNon} AS code_atc
      FROM non_renouveles n
      ${atcJoinNon}
      WHERE (
        $1 = ''
        OR CONCAT_WS(' ', n.n_enreg, n.dci, n.nom_marque, n.forme, n.dosage, n.labo, n.pays, n.type_prod, n.statut, n.date_final::TEXT, ${codeAtcNon}) ILIKE $2
      )
      AND ($3 = '' OR n.labo ILIKE $4)
      AND ($5 = '' OR n.dci ILIKE $6)
    ) AS combined
    ${scopeFilter ? `${scopeFilter} ${advancedClause.sql ? 'AND' : ''}` : `${advancedClause.sql ? 'WHERE' : ''}`}
    ${advancedClause.sql}
    ORDER BY
      CASE source WHEN 'enregistrement' THEN 1 WHEN 'retrait' THEN 2 ELSE 3 END,
      nom_marque
    LIMIT $7
  `, [trimmedQuery, searchPattern, labo, laboPattern, substance, substancePattern, limit, ...advancedClause.params])

  return results
}

// ─── ANALYTICS CLICS RECHERCHE ───────────────────────────────
export async function recordSearchClick(event: SearchClickEventInput) {
  if (!await hasTable('search_click_events')) return

  await query(`
    INSERT INTO search_click_events (
      search_query, scope, result_source, result_id, result_name, result_dci, result_labo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    event.search_query,
    event.scope,
    event.result_source,
    event.result_id,
    event.result_name,
    event.result_dci,
    event.result_labo ?? null,
  ])
}

export async function getSearchClickStats(days: number = 30): Promise<{
  daily: SearchClickStat[]
  topQueries: TopSearchClick[]
  topResults: TopResultClick[]
}> {
  if (!await hasTable('search_click_events')) {
    return { daily: [], topQueries: [], topResults: [] }
  }

  const clampedDays = Math.min(Math.max(days, 1), 365)
  const intervalExpr = `${clampedDays} days`

  const [daily, topQueries, topResults] = await Promise.all([
    query<SearchClickStat>(`
      SELECT
        DATE_TRUNC('day', created_at)::DATE::TEXT AS day,
        COUNT(*)::INT AS total_clicks,
        COUNT(DISTINCT search_query)::INT AS unique_queries
      FROM search_click_events
      WHERE created_at >= NOW() - $1::INTERVAL
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day DESC
    `, [intervalExpr]),
    query<TopSearchClick>(`
      SELECT search_query, COUNT(*)::INT AS clicks
      FROM search_click_events
      WHERE created_at >= NOW() - $1::INTERVAL
      GROUP BY search_query
      ORDER BY clicks DESC, search_query ASC
      LIMIT 20
    `, [intervalExpr]),
    query<TopResultClick>(`
      SELECT
        result_source,
        result_id,
        result_name,
        result_dci,
        COUNT(*)::INT AS clicks
      FROM search_click_events
      WHERE created_at >= NOW() - $1::INTERVAL
      GROUP BY result_source, result_id, result_name, result_dci
      ORDER BY clicks DESC, result_name ASC
      LIMIT 20
    `, [intervalExpr]),
  ])

  return { daily, topQueries, topResults }
}


export type PageVisitEventInput = {
  page_path: string
  page_title?: string | null
  referrer?: string | null
}

export type ApiExecEventInput = {
  api_path: string
  method: string
  status_code?: number | null
}

export type TopPageVisit = {
  page_path: string
  visits: number
}

export type TopApiExec = {
  api_path: string
  method: string
  calls: number
}

export async function recordPageVisit(event: PageVisitEventInput) {
  if (!await hasTable('page_visit_events')) return

  await query(`
    INSERT INTO page_visit_events (page_path, page_title, referrer)
    VALUES ($1, $2, $3)
  `, [
    event.page_path,
    event.page_title ?? null,
    event.referrer ?? null,
  ])
}

export async function recordApiExec(event: ApiExecEventInput) {
  if (!await hasTable('api_exec_events')) return

  await query(`
    INSERT INTO api_exec_events (api_path, method, status_code)
    VALUES ($1, $2, $3)
  `, [
    event.api_path,
    event.method.toUpperCase(),
    event.status_code ?? null,
  ])
}

export async function getAdminAnalyticsStats(days: number = 30): Promise<{
  topQueries: TopSearchClick[]
  topResults: TopResultClick[]
  topPages: TopPageVisit[]
  topApis: TopApiExec[]
}> {
  const clampedDays = Math.min(Math.max(days, 1), 365)
  const intervalExpr = `${clampedDays} days`

  const [searchStats, topPages, topApis] = await Promise.all([
    getSearchClickStats(clampedDays),
    hasTable('page_visit_events').then(exists => exists
      ? query<TopPageVisit>(`
          SELECT page_path, COUNT(*)::INT AS visits
          FROM page_visit_events
          WHERE created_at >= NOW() - $1::INTERVAL
          GROUP BY page_path
          ORDER BY visits DESC, page_path ASC
          LIMIT 20
        `, [intervalExpr])
      : Promise.resolve([] as TopPageVisit[])),
    hasTable('api_exec_events').then(exists => exists
      ? query<TopApiExec>(`
          SELECT api_path, method, COUNT(*)::INT AS calls
          FROM api_exec_events
          WHERE created_at >= NOW() - $1::INTERVAL
          GROUP BY api_path, method
          ORDER BY calls DESC, api_path ASC
          LIMIT 20
        `, [intervalExpr])
      : Promise.resolve([] as TopApiExec[])),
  ])

  return {
    topQueries: searchStats.topQueries,
    topResults: searchStats.topResults,
    topPages,
    topApis,
  }
}

type AdvancedSearchCondition = {
  field: string
  operator: string
  value: string
  bool?: 'AND' | 'OR'
}

const ADVANCED_STRING_FIELDS: Record<string, string> = {
  n_enreg: 'combined.n_enreg',
  dci: 'combined.dci',
  nom_marque: 'combined.nom_marque',
  forme: 'combined.forme',
  dosage: 'combined.dosage',
  labo: 'combined.labo',
  pays: 'combined.pays',
  type_prod: 'combined.type_prod',
  statut: 'combined.statut',
}

const ADVANCED_NUMBER_FIELDS: Record<string, string> = {
  annee: 'combined.annee::numeric',
  dosage_num: `NULLIF(REPLACE((regexp_match(COALESCE(combined.dosage, ''), '([0-9]+(?:[\\.,][0-9]+)?)'))[1], ',', '.'), '')::numeric`,
}

function buildAdvancedSearchClause(conditions: AdvancedSearchCondition[], startIndex: number) {
  const sqlParts: string[] = []
  const params: Array<string | number> = []
  let paramIndex = startIndex

  for (let i = 0; i < conditions.length; i += 1) {
    const condition = conditions[i]
    const value = condition.value?.trim()
    if (!value) continue

    const boolJoin = condition.bool === 'OR' ? 'OR' : 'AND'
    const prefix = sqlParts.length > 0 ? ` ${boolJoin} ` : ''

    if (condition.field in ADVANCED_STRING_FIELDS) {
      const fieldSql = ADVANCED_STRING_FIELDS[condition.field]
      if (condition.operator === 'equals') {
        sqlParts.push(`${prefix}COALESCE(${fieldSql}, '') ILIKE $${paramIndex}`)
        params.push(value)
        paramIndex += 1
      } else if (condition.operator === 'starts_with') {
        sqlParts.push(`${prefix}COALESCE(${fieldSql}, '') ILIKE $${paramIndex}`)
        params.push(`${value}%`)
        paramIndex += 1
      } else {
        sqlParts.push(`${prefix}COALESCE(${fieldSql}, '') ILIKE $${paramIndex}`)
        params.push(`%${value}%`)
        paramIndex += 1
      }
      continue
    }

    if (condition.field in ADVANCED_NUMBER_FIELDS) {
      const parsedValue = Number(value.replace(',', '.'))
      if (!Number.isFinite(parsedValue)) continue
      const fieldSql = ADVANCED_NUMBER_FIELDS[condition.field]

      const numericOperators: Record<string, string> = {
        equals: '=',
        gt: '>',
        gte: '>=',
        lt: '<',
        lte: '<=',
      }

      const operatorSql = numericOperators[condition.operator]
      if (!operatorSql) continue

      sqlParts.push(`${prefix}${fieldSql} ${operatorSql} $${paramIndex}`)
      params.push(parsedValue)
      paramIndex += 1
    }
  }

  if (!sqlParts.length) return { sql: '', params: [] as Array<string | number> }
  return { sql: `(${sqlParts.join('')})`, params }
}

// ─── ENREGISTREMENTS ──────────────────────────────────────────


export async function getLatestNouveautes(limit = 20): Promise<Enregistrement[]> {
  const hasIsNewFlag = await hasColumn('enregistrements', 'is_new_vs_previous')
  const hasSourceVersion = await hasColumn('enregistrements', 'source_version')

  if (!hasIsNewFlag || !hasSourceVersion) {
    return query<Enregistrement>(`
      SELECT * FROM enregistrements
      ORDER BY date_init DESC NULLS LAST, id DESC
      LIMIT $1
    `, [limit])
  }

  if (!await hasTable('nomenclature_versions')) {
    return query<Enregistrement>(`
      SELECT * FROM enregistrements
      ORDER BY date_init DESC NULLS LAST, id DESC
      LIMIT $1
    `, [limit])
  }

  const latestFromVersion = await query<Enregistrement>(`
    SELECT * FROM enregistrements
    WHERE is_new_vs_previous = TRUE
      AND source_version = (
        SELECT version_label
        FROM nomenclature_versions
        ORDER BY reference_date DESC NULLS LAST, created_at DESC
        LIMIT 1
      )
    ORDER BY date_init DESC NULLS LAST, id DESC
    LIMIT $1
  `, [limit])

  if (latestFromVersion.length > 0) return latestFromVersion

  // Fallback: certaines bases legacy contiennent des enregistrements sans source_version.
  return query<Enregistrement>(`
    SELECT * FROM enregistrements
    ORDER BY date_init DESC NULLS LAST, id DESC
    LIMIT $1
  `, [limit])
}

export async function getRecentEnregistrements(annee: number, limit = 6): Promise<Enregistrement[]> {
  return query<Enregistrement>(`
    SELECT * FROM enregistrements
    WHERE annee = $1
    ORDER BY date_init DESC NULLS LAST, id DESC
    LIMIT $2
  `, [annee, limit])
}

export async function getAllEnregistrements(annee: number, limit = 50): Promise<Enregistrement[]> {
  return query<Enregistrement>(`
    SELECT * FROM enregistrements
    WHERE annee = $1
    ORDER BY date_init DESC NULLS LAST
    LIMIT $2
  `, [annee, limit])
}

export async function getAvailableAnnees(limit = 6): Promise<number[]> {
  const years = await query<{ annee: number | null }>(`
    SELECT DISTINCT annee
    FROM enregistrements
    WHERE annee IS NOT NULL
    ORDER BY annee DESC
    LIMIT $1
  `, [limit])

  return years
    .map((row) => row.annee)
    .filter((annee): annee is number => typeof annee === 'number')
}

export async function getStatsByYear(annee: number) {
  const types = await query<{ type_prod: string; n: string }>(`
    SELECT type_prod, COUNT(*) as n
    FROM enregistrements WHERE annee = $1
    GROUP BY type_prod ORDER BY n DESC
  `, [annee])

  const statuts = await query<{ statut: string; n: string }>(`
    SELECT statut, COUNT(*) as n
    FROM enregistrements WHERE annee = $1
    GROUP BY statut ORDER BY n DESC
  `, [annee])

  const topPays = await query<{ pays: string; n: string }>(`
    SELECT pays, COUNT(*) as n
    FROM enregistrements WHERE annee = $1 AND pays IS NOT NULL
    GROUP BY pays ORDER BY n DESC LIMIT 5
  `, [annee])

  return {
    types:   Object.fromEntries(types.map(r => [r.type_prod, parseInt(r.n)])),
    statuts: Object.fromEntries(statuts.map(r => [r.statut, parseInt(r.n)])),
    topPays: topPays.map(r => [r.pays, parseInt(r.n)] as [string, number]),
  }
}

// ─── GÉNÉRIQUES (substitution) ────────────────────────────────
export async function getGeneriques() {
  const rows = await query<{
    dci: string; nom_marque: string; forme: string; dosage: string;
    labo: string; pays: string; type_prod: string; statut: string; annee: number; cnt: string
  }>(`
    SELECT dci, nom_marque, forme, dosage, labo, pays, type_prod, statut, annee,
           COUNT(*) OVER (PARTITION BY dci) AS cnt
    FROM enregistrements
    WHERE type_prod IN ('GE', 'Gé')
    ORDER BY dci, nom_marque
  `)

  // Grouper par DCI côté JS
  const grouped: Record<string, { dci: string; marques: typeof rows; count: number }> = {}
  for (const row of rows) {
    if (!grouped[row.dci]) grouped[row.dci] = { dci: row.dci, marques: [], count: parseInt(row.cnt) }
    grouped[row.dci].marques.push(row)
  }

  return Object.values(grouped)
    .filter(g => g.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 80)
}

// ─── RETRAITS ─────────────────────────────────────────────────
export async function getRetraits(limit = 100): Promise<Retrait[]> {
  return query<Retrait>(`
    SELECT * FROM retraits
    ORDER BY date_retrait DESC NULLS LAST, id DESC
    LIMIT $1
  `, [limit])
}

export async function getLastRetraits(limit = 3): Promise<Retrait[]> {
  return query<Retrait>(`
    SELECT * FROM retraits
    WHERE date_retrait IS NOT NULL
    ORDER BY date_retrait DESC
    LIMIT $1
  `, [limit])
}

export async function getMotifStats() {
  return query<{ motif: string; n: string }>(`
    SELECT
      COALESCE(motif_retrait, 'Non précisé') AS motif,
      COUNT(*) AS n
    FROM retraits
    GROUP BY motif_retrait
    ORDER BY n DESC
    LIMIT 8
  `)
}

// ─── NON RENOUVELÉS ───────────────────────────────────────────
export async function getNonRenouveles(limit = 50): Promise<NonRenouvele[]> {
  return query<NonRenouvele>(`
    SELECT * FROM non_renouveles
    ORDER BY date_final DESC NULLS LAST
    LIMIT $1
  `, [limit])
}

// ─── NEWSLETTER ───────────────────────────────────────────────
export async function getSubscriberByEmail(email: string): Promise<{ email: string; confirmed: boolean; confirm_token: string } | null> {
  return queryOne<{ email: string; confirmed: boolean; confirm_token: string }>(`
    SELECT email, confirmed, confirm_token FROM newsletter_subscribers WHERE email = $1
  `, [email])
}

export async function addSubscriber(email: string, nom: string | null, confirmToken: string, unsubToken: string) {
  return queryOne(`
    INSERT INTO newsletter_subscribers (email, nom, confirm_token, unsubscribe_token, confirmed)
    VALUES ($1, $2, $3, $4, false)
    ON CONFLICT (email) DO UPDATE SET
      nom = EXCLUDED.nom,
      confirm_token = EXCLUDED.confirm_token,
      unsubscribe_token = EXCLUDED.unsubscribe_token
    RETURNING *
  `, [email, nom, confirmToken, unsubToken])
}

export async function confirmSubscriber(token: string) {
  return queryOne(`
    UPDATE newsletter_subscribers SET confirmed = true
    WHERE confirm_token = $1
    RETURNING email
  `, [token])
}

export async function unsubscribeByToken(token: string) {
  return queryOne(`
    DELETE FROM newsletter_subscribers
    WHERE unsubscribe_token = $1
    RETURNING email
  `, [token])
}

export async function getConfirmedSubscribers() {
  return query<{ email: string; nom: string | null; unsubscribe_token: string }>(`
    SELECT email, nom, unsubscribe_token
    FROM newsletter_subscribers
    WHERE confirmed = true
  `)
}

// ─── FICHE DÉTAIL ──────────────────────────────────────────
export async function getMedicamentById(
  source: string,
  id: number
): Promise<MedicamentDetail | null> {
  if (!['enregistrement', 'retrait', 'non_renouvele'].includes(source)) return null

  if (source === 'enregistrement') {
    const row = await queryOne<any>(`SELECT * FROM enregistrements WHERE id = $1`, [id])
    if (!row) return null
    const atc = await getAtcByDci(row.dci)
    return {
      source: 'enregistrement',
      id: row.id, n_enreg: row.n_enreg, code: row.code ?? null,
      dci: row.dci, nom_marque: row.nom_marque,
      forme: row.forme ?? null, dosage: row.dosage ?? null,
      conditionnement: row.conditionnement ?? null,
      liste: row.liste ?? null, prescription: row.prescription ?? null,
      obs: row.obs ?? null, labo: row.labo ?? null, pays: row.pays ?? null,
      date_init: row.date_init ?? null, date_final: row.date_final ?? null,
      type_prod: row.type_prod ?? null, statut: row.statut ?? null,
      stabilite: row.stabilite ?? null, annee: row.annee ?? null,
      source_version: row.source_version ?? null,
      is_new_vs_previous: row.is_new_vs_previous ?? null,
      date_retrait: null, motif_retrait: null,
      code_atc: atc?.code_atc ?? null,
      atc_label_fr: atc?.atc_label_fr ?? null,
      atc_label_en: atc?.atc_label_en ?? null,
    }
  }

  if (source === 'retrait') {
    const row = await queryOne<any>(`SELECT * FROM retraits WHERE id = $1`, [id])
    if (!row) return null
    const atc = await getAtcByDci(row.dci)
    return {
      source: 'retrait',
      id: row.id, n_enreg: row.n_enreg ?? null, code: row.code ?? null,
      dci: row.dci, nom_marque: row.nom_marque,
      forme: row.forme ?? null, dosage: row.dosage ?? null,
      conditionnement: row.conditionnement ?? null,
      liste: row.liste ?? null, prescription: row.prescription ?? null,
      obs: null, labo: row.labo ?? null, pays: row.pays ?? null,
      date_init: row.date_init ?? null, date_final: null,
      type_prod: row.type_prod ?? null, statut: row.statut ?? null,
      stabilite: null, annee: null, source_version: null, is_new_vs_previous: null,
      date_retrait: row.date_retrait ?? null, motif_retrait: row.motif_retrait ?? null,
      code_atc: atc?.code_atc ?? null,
      atc_label_fr: atc?.atc_label_fr ?? null,
      atc_label_en: atc?.atc_label_en ?? null,
    }
  }

  // non_renouvele
  const row = await queryOne<any>(`SELECT * FROM non_renouveles WHERE id = $1`, [id])
  if (!row) return null
  const atc = await getAtcByDci(row.dci)
  return {
    source: 'non_renouvele',
    id: row.id, n_enreg: row.n_enreg ?? null, code: row.code ?? null,
    dci: row.dci, nom_marque: row.nom_marque,
    forme: row.forme ?? null, dosage: row.dosage ?? null,
    conditionnement: row.conditionnement ?? null,
    liste: row.liste ?? null, prescription: row.prescription ?? null,
    obs: row.obs ?? null, labo: row.labo ?? null, pays: row.pays ?? null,
    date_init: row.date_init ?? null, date_final: row.date_final ?? null,
    type_prod: row.type_prod ?? null, statut: row.statut ?? null,
    stabilite: null, annee: null, source_version: null, is_new_vs_previous: null,
    date_retrait: null, motif_retrait: null,
    code_atc: atc?.code_atc ?? null,
    atc_label_fr: atc?.atc_label_fr ?? null,
    atc_label_en: atc?.atc_label_en ?? null,
  }
}

// ─── DIFF ENTRE VERSIONS ──────────────────────────────────────
export type RemovedDrug = {
  id: number
  version_label: string
  n_enreg: string | null
  code: string | null
  dci: string | null
  nom_marque: string | null
  forme: string | null
  dosage: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  statut: string | null
}

export async function getDiffData(): Promise<{
  latestVersion: string | null
  previousVersion: string | null
  addedDrugs: Enregistrement[]
  removedDrugs: RemovedDrug[]
  addedCount: number
  removedCount: number
}> {
  const empty = { latestVersion: null, previousVersion: null, addedDrugs: [], removedDrugs: [], addedCount: 0, removedCount: 0 }

  try {
    if (!await hasTable('nomenclature_versions')) return empty

    const versions = await query<{ version_label: string; previous_label: string | null; total_nouveautes: number | null; removed_count: number | null }>(`
      SELECT version_label, previous_label, total_nouveautes, removed_count
      FROM nomenclature_versions
      ORDER BY reference_date DESC NULLS LAST, created_at DESC
      LIMIT 2
    `)
    if (!versions.length) return empty

    const latest = versions[0]
    const latestVersion = latest.version_label
    const previousVersion = latest.previous_label ?? (versions[1]?.version_label ?? null)

    // Médicaments ajoutés dans la version courante
    const hasIsNewFlag = await hasColumn('enregistrements', 'is_new_vs_previous')
    const hasSourceVersion = await hasColumn('enregistrements', 'source_version')

    let addedDrugs: Enregistrement[] = []
    if (hasIsNewFlag && hasSourceVersion) {
      addedDrugs = await query<Enregistrement>(`
        SELECT * FROM enregistrements
        WHERE is_new_vs_previous = TRUE
          AND source_version = $1
        ORDER BY nom_marque
      `, [latestVersion])
    } else if (hasIsNewFlag) {
      addedDrugs = await query<Enregistrement>(`
        SELECT * FROM enregistrements
        WHERE is_new_vs_previous = TRUE
        ORDER BY nom_marque
      `)
    }

    // Médicaments supprimés (table version_removed_drugs)
    let removedDrugs: RemovedDrug[] = []
    if (await hasTable('version_removed_drugs')) {
      removedDrugs = await query<RemovedDrug>(`
        SELECT * FROM version_removed_drugs
        WHERE version_label = $1
        ORDER BY nom_marque
      `, [latestVersion])
    }

    return {
      latestVersion,
      previousVersion,
      addedDrugs,
      removedDrugs,
      addedCount: addedDrugs.length,
      removedCount: removedDrugs.length,
    }
  } catch {
    return empty
  }
}

export async function getLastVersionDate(): Promise<string | null> {
  try {
    if (!await hasTable('nomenclature_versions')) return null
    const row = await queryOne<{ reference_date: string | null }>(`
      SELECT reference_date
      FROM nomenclature_versions
      ORDER BY reference_date DESC NULLS LAST, created_at DESC
      LIMIT 1
    `)
    return row?.reference_date ?? null
  } catch {
    return null
  }
}

// ─── SITEMAP ───────────────────────────────────────────────────
export async function getAllMedicamentIds(): Promise<Array<{ source: string; id: number; updated_at: string | null }>> {
  const [enregistrements, retraits, nonRenouveles] = await Promise.all([
    query<{ id: number; updated_at: string | null }>(`SELECT id, NULL::TEXT AS updated_at FROM enregistrements ORDER BY id`),
    query<{ id: number; updated_at: string | null }>(`SELECT id, NULL::TEXT AS updated_at FROM retraits ORDER BY id`),
    query<{ id: number; updated_at: string | null }>(`SELECT id, NULL::TEXT AS updated_at FROM non_renouveles ORDER BY id`),
  ])
  return [
    ...enregistrements.map(r => ({ source: 'enregistrement', id: r.id, updated_at: r.updated_at })),
    ...retraits.map(r => ({ source: 'retrait', id: r.id, updated_at: r.updated_at })),
    ...nonRenouveles.map(r => ({ source: 'non_renouvele', id: r.id, updated_at: r.updated_at })),
  ]
}

export async function getAlternatifsDCI(dci: string, limit = 8): Promise<Enregistrement[]> {
  return query<Enregistrement>(`
    SELECT * FROM enregistrements
    WHERE UPPER(dci) = UPPER($1)
    ORDER BY nom_marque
    LIMIT $2
  `, [dci, limit])
}

// ─── CODES ATC ────────────────────────────────────────────────

/**
 * Retourne le code ATC et ses ancêtres (hiérarchie complète) pour une DCI donnée.
 * Retourne un tableau vide si la table n'existe pas ou si la DCI n'est pas mappée.
 */
export async function getAtcHierarchyByDci(dci: string): Promise<AtcCode[]> {
  const hasMappingTable = await hasTable('dci_atc_mapping')
  const hasAtcTable = await hasTable('atc_codes')
  if (!hasMappingTable || !hasAtcTable) return []

  try {
    return query<AtcCode>(`
      WITH RECURSIVE atc_tree AS (
        -- Nœud de départ : le code ATC niveau 5 de la DCI
        SELECT a.code, a.parent_code, a.niveau, a.label_en, a.label_fr
        FROM dci_atc_mapping m
        JOIN atc_codes a ON a.code = m.code_atc
        WHERE m.dci = UPPER(TRIM($1))

        UNION ALL

        -- Remonter la hiérarchie jusqu'au niveau 1
        SELECT p.code, p.parent_code, p.niveau, p.label_en, p.label_fr
        FROM atc_codes p
        JOIN atc_tree c ON p.code = c.parent_code
      )
      SELECT * FROM atc_tree
      ORDER BY niveau ASC
    `, [dci])
  } catch {
    return []
  }
}

/**
 * Retourne uniquement le code ATC niveau 5 (et son libellé) pour une DCI.
 * Utilisé pour les listes/cartes où on n'a pas besoin de la hiérarchie complète.
 */
export async function getAtcByDci(dci: string): Promise<{ code_atc: string; atc_label_fr: string | null; atc_label_en: string | null } | null> {
  const hasMappingTable = await hasTable('dci_atc_mapping')
  const hasAtcTable = await hasTable('atc_codes')
  if (!hasMappingTable || !hasAtcTable) return null

  try {
    return queryOne<{ code_atc: string; atc_label_fr: string | null; atc_label_en: string | null }>(`
      SELECT m.code_atc, a.label_fr AS atc_label_fr, a.label_en AS atc_label_en
      FROM dci_atc_mapping m
      JOIN atc_codes a ON a.code = m.code_atc
      WHERE m.dci = UPPER(TRIM($1))
    `, [dci])
  } catch {
    return null
  }
}

// ─── LABORATOIRES ─────────────────────────────────────────────

export type LaboSummary = {
  labo: string
  slug: string
  total_enregistres: number
  total_retraits: number
  total_non_renouveles: number
  pays_origine: string | null
}

export type LaboStats = {
  labo: string
  slug: string
  total_enregistres: number
  total_actifs: number
  total_retraits: number
  total_non_renouveles: number
  pays_origine: string | null
}

export type LaboNouveauteParAnnee = {
  annee: number
  nb: number
}

export type LaboDciItem = {
  dci: string
  nb: number
}

export type LaboLocalImporte = {
  local: number
  importe: number
  inconnu: number
}

/** Convertit un nom de labo en slug URL-safe */
export function laboToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Expression SQL pour normaliser un nom de labo en slug */
const LABO_SLUG_EXPR = `LOWER(REGEXP_REPLACE(COALESCE(labo, ''), '[^a-zA-Z0-9]+', '-', 'g'))`

/**
 * Liste tous les laboratoires distincts avec leurs compteurs.
 * Triés par nombre de produits enregistrés décroissant.
 */
export async function getAllLaboratoires(): Promise<LaboSummary[]> {
  const rows = await query<{
    labo: string
    total_enregistres: string
    total_retraits: string
    total_non_renouveles: string
    pays_origine: string | null
  }>(`
    SELECT
      e.labo,
      COUNT(*)::INT AS total_enregistres,
      COALESCE(r.nb, 0)::INT AS total_retraits,
      COALESCE(n.nb, 0)::INT AS total_non_renouveles,
      (SELECT pays FROM enregistrements WHERE labo = e.labo AND pays IS NOT NULL LIMIT 1) AS pays_origine
    FROM enregistrements e
    LEFT JOIN (
      SELECT labo, COUNT(*) AS nb FROM retraits WHERE labo IS NOT NULL GROUP BY labo
    ) r ON r.labo = e.labo
    LEFT JOIN (
      SELECT labo, COUNT(*) AS nb FROM non_renouveles WHERE labo IS NOT NULL GROUP BY labo
    ) n ON n.labo = e.labo
    WHERE e.labo IS NOT NULL AND e.labo != ''
    GROUP BY e.labo, r.nb, n.nb
    ORDER BY COUNT(*) DESC
  `)

  return rows.map(r => ({
    labo: r.labo,
    slug: laboToSlug(r.labo),
    total_enregistres: parseInt(String(r.total_enregistres)),
    total_retraits: parseInt(String(r.total_retraits)),
    total_non_renouveles: parseInt(String(r.total_non_renouveles)),
    pays_origine: r.pays_origine,
  }))
}

/**
 * Trouve le nom exact du labo correspondant à un slug.
 */
export async function getLaboNameBySlug(slug: string): Promise<string | null> {
  const row = await queryOne<{ labo: string }>(`
    SELECT labo FROM enregistrements
    WHERE ${LABO_SLUG_EXPR} = $1 AND labo IS NOT NULL
    LIMIT 1
  `, [slug])
  return row?.labo ?? null
}

/**
 * Statistiques globales d'un laboratoire.
 */
export async function getLaboStats(laboName: string): Promise<LaboStats | null> {
  const slug = laboToSlug(laboName)
  const row = await queryOne<{
    labo: string
    total_enregistres: string
    total_actifs: string
    total_retraits: string
    total_non_renouveles: string
    pays_origine: string | null
  }>(`
    SELECT
      $1::TEXT AS labo,
      (SELECT COUNT(*) FROM enregistrements WHERE labo = $1)::INT AS total_enregistres,
      (SELECT COUNT(*) FROM enregistrements WHERE labo = $1 AND statut = 'A')::INT AS total_actifs,
      (SELECT COUNT(*) FROM retraits WHERE labo = $1)::INT AS total_retraits,
      (SELECT COUNT(*) FROM non_renouveles WHERE labo = $1)::INT AS total_non_renouveles,
      (SELECT pays FROM enregistrements WHERE labo = $1 AND pays IS NOT NULL LIMIT 1) AS pays_origine
  `, [laboName])

  if (!row) return null

  return {
    labo: row.labo,
    slug,
    total_enregistres: parseInt(String(row.total_enregistres)),
    total_actifs: parseInt(String(row.total_actifs)),
    total_retraits: parseInt(String(row.total_retraits)),
    total_non_renouveles: parseInt(String(row.total_non_renouveles)),
    pays_origine: row.pays_origine,
  }
}

/**
 * Répartition des nouveaux enregistrements par année pour un labo.
 */
export async function getLaboNouveautesByYear(laboName: string): Promise<LaboNouveauteParAnnee[]> {
  const rows = await query<{ annee: string; nb: string }>(`
    SELECT annee::TEXT, COUNT(*)::TEXT AS nb
    FROM enregistrements
    WHERE labo = $1 AND annee IS NOT NULL
    GROUP BY annee
    ORDER BY annee ASC
  `, [laboName])
  return rows.map(r => ({ annee: parseInt(r.annee), nb: parseInt(r.nb) }))
}

/**
 * Portefeuille par DCI (top substances actives du labo).
 */
export async function getLaboPortfolioDCI(laboName: string, limit = 30): Promise<LaboDciItem[]> {
  const rows = await query<{ dci: string; nb: string }>(`
    SELECT dci, COUNT(*)::TEXT AS nb
    FROM enregistrements
    WHERE labo = $1 AND dci IS NOT NULL AND dci != ''
    GROUP BY dci
    ORDER BY COUNT(*) DESC
    LIMIT $2
  `, [laboName, limit])
  return rows.map(r => ({ dci: r.dci, nb: parseInt(r.nb) }))
}

/**
 * Répartition local / importé pour un labo.
 * Local = pays contient 'algérie' ou 'algerie' (insensible casse/accents)
 */
export async function getLaboLocalImporte(laboName: string): Promise<LaboLocalImporte> {
  const row = await queryOne<{ local: string; importe: string; inconnu: string }>(`
    SELECT
      SUM(CASE WHEN LOWER(unaccent(COALESCE(pays,''))) LIKE '%algerie%' THEN 1 ELSE 0 END)::TEXT AS local,
      SUM(CASE WHEN pays IS NOT NULL AND LOWER(unaccent(pays)) NOT LIKE '%algerie%' THEN 1 ELSE 0 END)::TEXT AS importe,
      SUM(CASE WHEN pays IS NULL OR pays = '' THEN 1 ELSE 0 END)::TEXT AS inconnu
    FROM enregistrements
    WHERE labo = $1
  `, [laboName])

  return {
    local: parseInt(row?.local ?? '0'),
    importe: parseInt(row?.importe ?? '0'),
    inconnu: parseInt(row?.inconnu ?? '0'),
  }
}

/**
 * Liste des enregistrements d'un labo (paginés).
 */
export async function getLaboProducts(laboName: string, limit = 50, offset = 0) {
  return query<{
    id: number; source: string; n_enreg: string | null; dci: string; nom_marque: string;
    forme: string | null; dosage: string | null; statut: string | null; annee: number | null;
  }>(`
    SELECT * FROM (
      SELECT id, 'enregistrement' AS source, n_enreg, dci, nom_marque, forme, dosage, statut, annee
      FROM enregistrements
      WHERE labo = $1

      UNION ALL

      SELECT id, 'retrait' AS source, n_enreg, dci, nom_marque, forme, dosage, 'RET'::TEXT AS statut, NULL::INT AS annee
      FROM retraits
      WHERE labo = $1
    ) AS products
    ORDER BY nom_marque ASC
    LIMIT $2 OFFSET $3
  `, [laboName, limit, offset])
}

// ─── COMPARATEUR MARCHÉ ────────────────────────────────────────

export type MarketLocalImporte = {
  local: number
  importe: number
  inconnu: number
}

export type MarketTypeBreakdown = {
  type_prod: string
  nb: number
}

export type MarketTopLabo = {
  labo: string
  nb: number
  local: number
  importe: number
}

export type MarketTopDci = {
  dci: string
  nb_marques: number
  nb_enreg: number
}

export type MarketEvolutionAnnee = {
  annee: number
  nb: number
  local: number
  importe: number
}

export type MarketComparatorData = {
  localImporte: MarketLocalImporte
  typeBreakdown: MarketTypeBreakdown[]
  topLabos: MarketTopLabo[]
  topDciConcurrence: MarketTopDci[]
  evolutionAnnuelle: MarketEvolutionAnnee[]
}

export async function getMarketComparatorData(): Promise<MarketComparatorData> {
  const [localImporteRow, typeRows, laboRows, dciRows, evolutionRows] = await Promise.all([
    queryOne<{ local: string; importe: string; inconnu: string }>(`
      SELECT
        SUM(CASE WHEN statut = 'F' THEN 1 ELSE 0 END)::TEXT AS local,
        SUM(CASE WHEN statut IS NOT NULL AND statut != 'F' THEN 1 ELSE 0 END)::TEXT AS importe,
        SUM(CASE WHEN statut IS NULL OR statut = '' THEN 1 ELSE 0 END)::TEXT AS inconnu
      FROM enregistrements
    `),
    query<{ type_prod: string; nb: string }>(`
      SELECT type_prod, COUNT(*)::TEXT AS nb
      FROM enregistrements
      WHERE type_prod IS NOT NULL AND type_prod != ''
      GROUP BY type_prod
      ORDER BY COUNT(*) DESC
    `),
    query<{ labo: string; nb: string; local: string; importe: string }>(`
      SELECT
        labo,
        COUNT(*)::TEXT AS nb,
        SUM(CASE WHEN statut = 'F' THEN 1 ELSE 0 END)::TEXT AS local,
        SUM(CASE WHEN statut IS NOT NULL AND statut != 'F' THEN 1 ELSE 0 END)::TEXT AS importe
      FROM enregistrements
      WHERE labo IS NOT NULL AND labo != ''
      GROUP BY labo
      ORDER BY COUNT(*) DESC
      LIMIT 15
    `),
    query<{ dci: string; nb_marques: string; nb_enreg: string }>(`
      SELECT
        dci,
        COUNT(DISTINCT nom_marque)::TEXT AS nb_marques,
        COUNT(*)::TEXT AS nb_enreg
      FROM enregistrements
      WHERE dci IS NOT NULL AND dci != ''
      GROUP BY dci
      HAVING COUNT(DISTINCT nom_marque) > 1
      ORDER BY COUNT(DISTINCT nom_marque) DESC
      LIMIT 20
    `),
    query<{ annee: string; nb: string; local: string; importe: string }>(`
      SELECT
        annee::TEXT,
        COUNT(*)::TEXT AS nb,
        SUM(CASE WHEN statut = 'F' THEN 1 ELSE 0 END)::TEXT AS local,
        SUM(CASE WHEN statut IS NOT NULL AND statut != 'F' THEN 1 ELSE 0 END)::TEXT AS importe
      FROM enregistrements
      WHERE annee IS NOT NULL
      GROUP BY annee
      ORDER BY annee ASC
    `),
  ])

  return {
    localImporte: {
      local: parseInt(localImporteRow?.local ?? '0'),
      importe: parseInt(localImporteRow?.importe ?? '0'),
      inconnu: parseInt(localImporteRow?.inconnu ?? '0'),
    },
    typeBreakdown: typeRows.map(r => ({ type_prod: r.type_prod, nb: parseInt(r.nb) })),
    topLabos: laboRows.map(r => ({
      labo: r.labo,
      nb: parseInt(r.nb),
      local: parseInt(r.local),
      importe: parseInt(r.importe),
    })),
    topDciConcurrence: dciRows.map(r => ({
      dci: r.dci,
      nb_marques: parseInt(r.nb_marques),
      nb_enreg: parseInt(r.nb_enreg),
    })),
    evolutionAnnuelle: evolutionRows.map(r => ({
      annee: parseInt(r.annee),
      nb: parseInt(r.nb),
      local: parseInt(r.local),
      importe: parseInt(r.importe),
    })),
  }
}

/**
 * Slugs de tous les labos (pour sitemap et génération statique).
 */
export async function getAllLaboSlugs(): Promise<{ slug: string; labo: string }[]> {
  const rows = await query<{ labo: string }>(`
    SELECT DISTINCT labo FROM enregistrements
    WHERE labo IS NOT NULL AND labo != ''
    ORDER BY labo
  `)
  return rows.map(r => ({ labo: r.labo, slug: laboToSlug(r.labo) }))
}
