/**
 * Toutes les requêtes DB centralisées ici
 * Les pages importent depuis ce fichier, pas depuis lib/db.ts directement
 */

import { query, queryOne } from './db'
import type { Enregistrement, Retrait, NonRenouvele, SearchResult, Stats, MedicamentDetail, AtcCode, CriticalMedicament } from './db'
import { buildQueryKeys } from './search-normalize'

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

let criticalMappingIndexEnsured = false

/** critical_mapping (sql/07_critical_mapping.sql) n'a pas d'index sur la clé de jointure
 *  utilisée par la recherche (source_base, n_enregistrement) — seuls dci_critique,
 *  classe_therapeutique, statut_match, source_base et n_critique sont indexés. On crée
 *  cet index une fois par process (idempotent, no-op si déjà présent). */
async function ensureCriticalMappingIndex(): Promise<void> {
  if (criticalMappingIndexEnsured) return
  criticalMappingIndexEnsured = true
  try {
    await query(`
      CREATE INDEX IF NOT EXISTS idx_critical_mapping_lookup
      ON critical_mapping (source_base, n_enregistrement)
    `)
  } catch {
    // Pas bloquant : au pire la jointure reste un scan sur une petite table.
  }
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

function normalizedSql(columnExpr: string): string {
  return `UPPER(REGEXP_REPLACE(UNACCENT(COALESCE(${columnExpr}, '')), '[^A-Z0-9]+', '', 'g'))`
}

/** DCI normalization with French↔INN pharmaceutical name variant substitutions */
function normalizedDciSql(columnExpr: string): string {
  const base = `UPPER(UNACCENT(COALESCE(${columnExpr}, '')))`
  // Known French pharmaceutical spellings → INN standard form
  const variants: [string, string][] = [
    ['\\mBARYUM\\M',   'BARIUM'],    // Baryum (French) = Barium (INN)
    ['\\mKALIUM\\M',   'POTASSIUM'], // Kalium = Potassium
    ['\\mNATRIUM\\M',  'SODIUM'],    // Natrium = Sodium
    ['\\mFERREUX\\M',  'FER'],       // Ferreux = Fer
    ['\\mFERRIQUE\\M', 'FER'],       // Ferrique = Fer
  ]
  let sql = base
  for (const [pattern, replacement] of variants) {
    sql = `REGEXP_REPLACE(${sql}, '${pattern}', '${replacement}', 'g')`
  }
  return `REGEXP_REPLACE(${sql}, '[^A-Z0-9]+', '', 'g')`
}

function normalizedFormeSql(columnExpr: string): string {
  const base = `UPPER(UNACCENT(COALESCE(${columnExpr}, '')))`
  // Each entry: [pattern, replacement] — applied as whole-word substitutions before stripping non-alphanum.
  // Long pharmaceutical form names → canonical short codes, so both "SOLUTION INJECTABLE" and "SOL.INJ." normalize identically.
  const replacements: [string, string][] = [
    ['\\mSOLUTIONS?\\M',        'SOL'],
    ['\\mBUVABLE\\M',           'BUV'],
    ['\\mCOMPRIMES?\\M',        'COMP'],
    ['\\mGELULES?\\M',          'GLES'],
    ['\\mCAPSULES?\\M',         'CAPS'],
    ['\\mINJECTABLE\\M',        'INJ'],
    ['\\mINJECTION\\M',         'INJ'],
    ['\\mSUSPENSION\\M',        'SUSP'],
    ['\\mSIROPS?\\M',           'SIR'],
    ['\\mSACHETS?\\M',          'SACH'],
    ['\\mAMPOULES?\\M',         'AMP'],
    ['\\mSUPPOSITOIRES?\\M',    'SUPP'],
    ['\\mPOMMADES?\\M',         'POMM'],
    ['\\mCOLLYRES?\\M',         'COLL'],
    ['\\mLYOPHILISATS?\\M',     'LYOPH'],
    ['\\mPOUDRES?\\M',          'POUDR'],
    ['\\mPERFUSION\\M',         'PERF'],
    ['\\mAEROSOLS?\\M',         'AERO'],
    ['\\mGRANULES?\\M',         'GRAN'],
    ['\\mOVULES?\\M',           'OVUL'],
    ['\\mCREMES?\\M',           'CRM'],
    ['\\mEMULSION\\M',          'EMUL'],
    ['\\mSUBLINGUAL\\M',        'SUBL'],
    ['\\mGOUTTES?\\M',          'GOUTT'],
    ['\\mPATCH(ES)?\\M',        'PATCH'],
    ['\\mTRANSDERMIQUE\\M',     'TRANSD'],
    ['\\mINTRAVEINEU[XSE]?\\M', 'IV'],
    ['\\mINTRAMUSCULAIRE\\M',   'IM'],
    // Remove French coordinating words used in dual-route form names (e.g. "BUV. OU RECT." → "BUV.RECT.")
    ['\\mOU\\M',                 ''],
    ['\\mET\\M',                 ''],
  ]
  // Build nested REGEXP_REPLACE chain from innermost to outermost
  let sql = base
  for (const [pattern, replacement] of replacements) {
    sql = `REGEXP_REPLACE(${sql}, '${pattern}', '${replacement}', 'g')`
  }
  // Final pass: strip all non-alphanumeric characters
  return `REGEXP_REPLACE(${sql}, '[^A-Z0-9]+', '', 'g')`
}

function dciMatchCondition(criticalDciExpr: string, medDciExpr: string): string {
  const criticalNorm = normalizedDciSql(criticalDciExpr)
  const medNorm = normalizedDciSql(medDciExpr)
  return `(
    ${medNorm} = ${criticalNorm}
    OR (LENGTH(${medNorm}) >= 4 AND POSITION(${medNorm} IN ${criticalNorm}) > 0)
    OR (LENGTH(${criticalNorm}) >= 4 AND POSITION(${criticalNorm} IN ${medNorm}) > 0)
  )`
}

function formeMatchCondition(criticalFormeExpr: string, medFormeExpr: string): string {
  const criticalFormeNorm = normalizedFormeSql(criticalFormeExpr)
  const medFormeNorm = normalizedFormeSql(medFormeExpr)
  return `(
    ${medFormeNorm} = ${criticalFormeNorm}
    OR (
      LEAST(LENGTH(${medFormeNorm}), LENGTH(${criticalFormeNorm})) >= 3
      AND (
        POSITION(${medFormeNorm} IN ${criticalFormeNorm}) > 0
        OR POSITION(${criticalFormeNorm} IN ${medFormeNorm}) > 0
      )
    )
  )`
}

function normalizedDosageSql(columnExpr: string): string {
  const base = `UPPER(UNACCENT(COALESCE(${columnExpr}, '')))`
  return `REGEXP_REPLACE(
    REGEXP_REPLACE(
      ${base},
      ',',
      '.',
      'g'
    ),
    '[^A-Z0-9./]+',
    '',
    'g'
  )`
}

function dosageCoreSql(columnExpr: string): string {
  const dosageNorm = normalizedDosageSql(columnExpr)
  return `REGEXP_REPLACE(
    REGEXP_REPLACE(
      ${dosageNorm},
      '/[0-9.]+(ML|L)$',
      '',
      'g'
    ),
    '/[0-9.]+(ML|L)(/|$)',
    '/',
    'g'
  )`
}

function dosageMatchCondition(criticalDosageExpr: string, medDosageExpr: string): string {
  const criticalNorm = normalizedDosageSql(criticalDosageExpr)
  const medNorm = normalizedDosageSql(medDosageExpr)
  const criticalCore = dosageCoreSql(criticalDosageExpr)
  const medCore = dosageCoreSql(medDosageExpr)

  return `(
    ${medNorm} = ${criticalNorm}
    OR (
      LEAST(LENGTH(${medNorm}), LENGTH(${criticalNorm})) >= 4
      AND (
        POSITION(${medNorm} IN ${criticalNorm}) > 0
        OR POSITION(${criticalNorm} IN ${medNorm}) > 0
      )
    )
    OR (
      ${medCore} <> ''
      AND ${criticalCore} <> ''
      AND (
        ${medCore} = ${criticalCore}
        OR POSITION(${medCore} IN ${criticalCore}) > 0
        OR POSITION(${criticalCore} IN ${medCore}) > 0
      )
    )
  )`
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
  // critical_mapping est pré-calculée hors ligne et indexable (jointure d'égalité sur
  // n_enregistrement). On l'utilise en priorité pour éviter le LATERAL JOIN regex/UNACCENT
  // contre critical_medicaments, dont le coût O(lignes × critiques) provoque le
  // "canceling statement due to statement timeout" observé sur /api/search. On ne retombe
  // sur le calcul à la volée (lent) que si critical_mapping n'existe pas encore.
  const hasCriticalMapping = await hasTable('critical_mapping')
  const hasCriticalTable = !hasCriticalMapping && await hasTable('critical_medicaments')
  if (hasCriticalMapping) await ensureCriticalMappingIndex()
  const hasCriticalEnrichment = hasCriticalMapping || hasCriticalTable
  const codeAtcEnr = hasAtcMapping ? 'atc_e.code_atc' : 'NULL::TEXT'
  const codeAtcRet = hasAtcMapping ? 'atc_r.code_atc' : 'NULL::TEXT'
  const codeAtcNon = hasAtcMapping ? 'atc_n.code_atc' : 'NULL::TEXT'
  const criticalClassEnr = hasCriticalEnrichment ? 'crit_e.classe_therapeutique' : 'NULL::TEXT'
  const criticalClassRet = hasCriticalEnrichment ? 'crit_r.classe_therapeutique' : 'NULL::TEXT'
  const criticalClassNon = hasCriticalEnrichment ? 'crit_n.classe_therapeutique' : 'NULL::TEXT'
  const atcJoinEnr = hasAtcMapping ? 'LEFT JOIN dci_atc_mapping atc_e ON atc_e.dci = e.dci' : ''
  const atcJoinRet = hasAtcMapping ? 'LEFT JOIN dci_atc_mapping atc_r ON atc_r.dci = r.dci' : ''
  const atcJoinNon = hasAtcMapping ? 'LEFT JOIN dci_atc_mapping atc_n ON atc_n.dci = n.dci' : ''

  const criticalMappingJoin = (sourceBase: 'ACTIVE' | 'RETRAIT' | 'NON_RENOUVELE', alias: string, nEnregExpr: string) => `
      LEFT JOIN LATERAL (
        SELECT cm.classe_therapeutique
        FROM critical_mapping cm
        WHERE cm.source_base = '${sourceBase}' AND cm.n_enregistrement = ${nEnregExpr}
        ORDER BY (cm.statut_match = 'OUI') DESC, cm.score_global DESC NULLS LAST
        LIMIT 1
      ) ${alias} ON TRUE`

  const criticalJoinEnr = hasCriticalMapping
    ? criticalMappingJoin('ACTIVE', 'crit_e', 'e.n_enreg')
    : hasCriticalTable
    ? `LEFT JOIN LATERAL (
        SELECT c.classe_therapeutique
        FROM critical_medicaments c
        WHERE ${dciMatchCondition('c.dci', 'e.dci')}
          AND ${formeMatchCondition('c.forme', 'e.forme')}
          AND ${dosageMatchCondition('c.dosage', 'e.dosage')}
        LIMIT 1
      ) crit_e ON TRUE`
    : ''
  const criticalJoinRet = hasCriticalMapping
    ? criticalMappingJoin('RETRAIT', 'crit_r', 'r.n_enreg')
    : hasCriticalTable
    ? `LEFT JOIN LATERAL (
        SELECT c.classe_therapeutique
        FROM critical_medicaments c
        WHERE ${dciMatchCondition('c.dci', 'r.dci')}
          AND ${formeMatchCondition('c.forme', 'r.forme')}
          AND ${dosageMatchCondition('c.dosage', 'r.dosage')}
        LIMIT 1
      ) crit_r ON TRUE`
    : ''
  const criticalJoinNon = hasCriticalMapping
    ? criticalMappingJoin('NON_RENOUVELE', 'crit_n', 'n.n_enreg')
    : hasCriticalTable
    ? `LEFT JOIN LATERAL (
        SELECT c.classe_therapeutique
        FROM critical_medicaments c
        WHERE ${dciMatchCondition('c.dci', 'n.dci')}
          AND ${formeMatchCondition('c.forme', 'n.forme')}
          AND ${dosageMatchCondition('c.dosage', 'n.dosage')}
        LIMIT 1
      ) crit_n ON TRUE`
    : ''

  const fullSearchSql = `
    SELECT * FROM (
      SELECT
        'enregistrement' AS source,
        e.id, e.n_enreg, e.dci, e.nom_marque, e.forme, e.dosage, e.labo, e.pays,
        e.type_prod, e.statut, e.annee,
        NULL::DATE AS date_retrait,
        NULL::TEXT AS motif_retrait,
        e.date_final,
        ${codeAtcEnr} AS code_atc,
        (${criticalClassEnr} IS NOT NULL) AS is_critical,
        ${criticalClassEnr} AS critical_class_therapeutique
      FROM enregistrements e
      ${atcJoinEnr}
      ${criticalJoinEnr}
      WHERE (
        $1 = ''
        OR UNACCENT(CONCAT_WS(' ', e.n_enreg, e.dci, e.nom_marque, e.forme, e.dosage, e.labo, e.pays, e.type_prod, e.statut, e.annee::TEXT, ${codeAtcEnr})) ILIKE UNACCENT($2)
      )
      AND ($3 = '' OR UNACCENT(COALESCE(e.labo, '')) ILIKE UNACCENT($4))
      AND ($5 = '' OR UNACCENT(COALESCE(e.dci, '')) ILIKE UNACCENT($6))

      UNION ALL

      SELECT
        'retrait' AS source,
        r.id, r.n_enreg, r.dci, r.nom_marque, r.forme, r.dosage, r.labo, r.pays,
        r.type_prod, r.statut, NULL::SMALLINT AS annee,
        r.date_retrait, r.motif_retrait,
        NULL::DATE AS date_final,
        ${codeAtcRet} AS code_atc,
        (${criticalClassRet} IS NOT NULL) AS is_critical,
        ${criticalClassRet} AS critical_class_therapeutique
      FROM retraits r
      ${atcJoinRet}
      ${criticalJoinRet}
      WHERE (
        $1 = ''
        OR UNACCENT(CONCAT_WS(' ', r.n_enreg, r.dci, r.nom_marque, r.forme, r.dosage, r.labo, r.pays, r.type_prod, r.statut, r.motif_retrait, ${codeAtcRet})) ILIKE UNACCENT($2)
      )
      AND ($3 = '' OR UNACCENT(COALESCE(r.labo, '')) ILIKE UNACCENT($4))
      AND ($5 = '' OR UNACCENT(COALESCE(r.dci, '')) ILIKE UNACCENT($6))

      UNION ALL

      SELECT
        'non_renouvele' AS source,
        n.id, n.n_enreg, n.dci, n.nom_marque, n.forme, n.dosage, n.labo, n.pays,
        n.type_prod, n.statut, NULL::SMALLINT AS annee,
        NULL::DATE AS date_retrait,
        NULL::TEXT AS motif_retrait,
        n.date_final,
        ${codeAtcNon} AS code_atc,
        (${criticalClassNon} IS NOT NULL) AS is_critical,
        ${criticalClassNon} AS critical_class_therapeutique
      FROM non_renouveles n
      ${atcJoinNon}
      ${criticalJoinNon}
      WHERE (
        $1 = ''
        OR UNACCENT(CONCAT_WS(' ', n.n_enreg, n.dci, n.nom_marque, n.forme, n.dosage, n.labo, n.pays, n.type_prod, n.statut, n.date_final::TEXT, ${codeAtcNon})) ILIKE UNACCENT($2)
      )
      AND ($3 = '' OR UNACCENT(COALESCE(n.labo, '')) ILIKE UNACCENT($4))
      AND ($5 = '' OR UNACCENT(COALESCE(n.dci, '')) ILIKE UNACCENT($6))
    ) AS combined
    ${scopeFilter ? `${scopeFilter} ${advancedClause.sql ? 'AND' : ''}` : `${advancedClause.sql ? 'WHERE' : ''}`}
    ${advancedClause.sql}
    ORDER BY
      CASE source WHEN 'enregistrement' THEN 1 WHEN 'retrait' THEN 2 ELSE 3 END,
      nom_marque
    LIMIT $7
  `

  const fallbackSearchSql = `
    SELECT * FROM (
      SELECT
        'enregistrement' AS source,
        e.id, e.n_enreg, e.dci, e.nom_marque, e.forme, e.dosage, e.labo, e.pays,
        e.type_prod, e.statut, e.annee,
        NULL::DATE AS date_retrait,
        NULL::TEXT AS motif_retrait,
        e.date_final,
        NULL::TEXT AS code_atc,
        FALSE AS is_critical,
        NULL::TEXT AS critical_class_therapeutique
      FROM enregistrements e
      WHERE (
        $1 = ''
        OR UNACCENT(CONCAT_WS(' ', e.n_enreg, e.dci, e.nom_marque, e.forme, e.dosage, e.labo, e.pays, e.type_prod, e.statut, e.annee::TEXT)) ILIKE UNACCENT($2)
      )
      AND ($3 = '' OR UNACCENT(COALESCE(e.labo, '')) ILIKE UNACCENT($4))
      AND ($5 = '' OR UNACCENT(COALESCE(e.dci, '')) ILIKE UNACCENT($6))

      UNION ALL

      SELECT
        'retrait' AS source,
        r.id, r.n_enreg, r.dci, r.nom_marque, r.forme, r.dosage, r.labo, r.pays,
        r.type_prod, r.statut, NULL::SMALLINT AS annee,
        r.date_retrait, r.motif_retrait,
        NULL::DATE AS date_final,
        NULL::TEXT AS code_atc,
        FALSE AS is_critical,
        NULL::TEXT AS critical_class_therapeutique
      FROM retraits r
      WHERE (
        $1 = ''
        OR UNACCENT(CONCAT_WS(' ', r.n_enreg, r.dci, r.nom_marque, r.forme, r.dosage, r.labo, r.pays, r.type_prod, r.statut, r.motif_retrait)) ILIKE UNACCENT($2)
      )
      AND ($3 = '' OR UNACCENT(COALESCE(r.labo, '')) ILIKE UNACCENT($4))
      AND ($5 = '' OR UNACCENT(COALESCE(r.dci, '')) ILIKE UNACCENT($6))

      UNION ALL

      SELECT
        'non_renouvele' AS source,
        n.id, n.n_enreg, n.dci, n.nom_marque, n.forme, n.dosage, n.labo, n.pays,
        n.type_prod, n.statut, NULL::SMALLINT AS annee,
        NULL::DATE AS date_retrait,
        NULL::TEXT AS motif_retrait,
        n.date_final,
        NULL::TEXT AS code_atc,
        FALSE AS is_critical,
        NULL::TEXT AS critical_class_therapeutique
      FROM non_renouveles n
      WHERE (
        $1 = ''
        OR UNACCENT(CONCAT_WS(' ', n.n_enreg, n.dci, n.nom_marque, n.forme, n.dosage, n.labo, n.pays, n.type_prod, n.statut, n.date_final::TEXT)) ILIKE UNACCENT($2)
      )
      AND ($3 = '' OR UNACCENT(COALESCE(n.labo, '')) ILIKE UNACCENT($4))
      AND ($5 = '' OR UNACCENT(COALESCE(n.dci, '')) ILIKE UNACCENT($6))
    ) AS combined
    ${scopeFilter ? `${scopeFilter} ${advancedClause.sql ? 'AND' : ''}` : `${advancedClause.sql ? 'WHERE' : ''}`}
    ${advancedClause.sql}
    ORDER BY
      CASE source WHEN 'enregistrement' THEN 1 WHEN 'retrait' THEN 2 ELSE 3 END,
      nom_marque
    LIMIT $7
  `

  try {
    return await query<SearchResult>(fullSearchSql, [trimmedQuery, searchPattern, labo, laboPattern, substance, substancePattern, limit, ...advancedClause.params])
  } catch (error) {
    if ((error as { code?: string }).code !== '57014') throw error
    return await query<SearchResult>(fallbackSearchSql, [trimmedQuery, searchPattern, labo, laboPattern, substance, substancePattern, limit, ...advancedClause.params])
  }
}

// ─── RECHERCHE TOLÉRANTE (fautes de frappe, arabe, synonymes) ─

/** Forme latine normalisée côté SQL : minuscules, sans accents ni séparateurs.
 *  Équivalent de normalizeLatin() dans lib/search-normalize.ts. */
function latinNormSql(columnExpr: string): string {
  return `LOWER(REGEXP_REPLACE(UNACCENT(COALESCE(${columnExpr}, '')), '[^a-zA-Z0-9]+', '', 'g'))`
}

/** Clé phonétique côté SQL — DOIT rester équivalente à foldPhonetic()
 *  dans lib/search-normalize.ts (mêmes substitutions, même ordre). */
function phoneticFoldSql(columnExpr: string): string {
  const steps: [string, string][] = [
    ['ph', 'f'],
    ['sh', 'ch'],
    ['ou', 'u'],
    ['w', 'u'],
    ['y', 'i'],
    ['q', 'k'],
    ['c(?=[ei])', 's'],
    ['c', 'k'],
    ['x', 'ks'],
    ['p', 'b'],
    ['(.)\\1+', '\\1'],
    ['e$', ''],
  ]
  let sql = latinNormSql(columnExpr)
  for (const [pattern, replacement] of steps) {
    sql = `REGEXP_REPLACE(${sql}, '${pattern}', '${replacement}', 'g')`
  }
  return sql
}

export type TolerantSearchInfo = {
  /** true si les résultats proviennent du repli flou (et non de la recherche stricte) */
  fuzzy: boolean
  /** Terme officiel utilisé après expansion de synonyme (ex: PARACETAMOL) */
  matchedTerm: string | null
  /** Synonyme reconnu dans la requête (ex: doliprane, دوليبران) */
  synonymTerm: string | null
}

export type TolerantSearchResponse = TolerantSearchInfo & { results: SearchResult[] }

/** Cherche un synonyme (nom commercial, appellation populaire, graphie arabe)
 *  correspondant à la requête. Retourne le terme officiel à rechercher. */
async function findSynonymTarget(raw: string, normalized: string): Promise<{ term: string; target: string } | null> {
  if (!await hasTable('search_synonyms')) return null
  try {
    return await queryOne<{ term: string; target: string }>(`
      SELECT term, target
      FROM search_synonyms
      WHERE LOWER(term) = LOWER($1)
         OR ($2 <> '' AND term_norm = $2)
         OR similarity(LOWER(term), LOWER($1)) > 0.45
         OR ($2 <> '' AND term_norm <> '' AND similarity(term_norm, $2) > 0.45)
      ORDER BY GREATEST(
        similarity(LOWER(term), LOWER($1)),
        CASE WHEN $2 = '' OR term_norm = '' THEN 0 ELSE similarity(term_norm, $2) END
      ) DESC
      LIMIT 1
    `, [raw, normalized])
  } catch {
    return null
  }
}

/** Recherche floue par trigram sur DCI + nom de marque, avec repli phonétique
 *  (dolipran → DOLIPRANE, amoxiciline → AMOXICILLINE, دوليبران → doliprane…). */
async function searchFuzzyByName(
  normalized: string,
  phonetic: string,
  scope: string,
  limit: number
): Promise<SearchResult[]> {
  const scopeConditions: Record<string, string> = {
    enregistrement: `AND source = 'enregistrement'`,
    retrait:        `AND source = 'retrait'`,
    non_renouvele:  `AND source = 'non_renouvele'`,
    all:            '',
  }
  const scopeFilter = scopeConditions[scope] ?? ''

  const simExpr = (dciCol: string, marqueCol: string) => `GREATEST(
    similarity(${latinNormSql(marqueCol)}, $1),
    similarity(${latinNormSql(dciCol)}, $1),
    similarity(${phoneticFoldSql(marqueCol)}, $2),
    similarity(${phoneticFoldSql(dciCol)}, $2)
  )`

  try {
    return await query<SearchResult>(`
      SELECT * FROM (
        SELECT
          'enregistrement' AS source,
          e.id, e.n_enreg, e.dci, e.nom_marque, e.forme, e.dosage, e.labo, e.pays,
          e.type_prod, e.statut, e.annee,
          NULL::DATE AS date_retrait,
          NULL::TEXT AS motif_retrait,
          e.date_final,
          NULL::TEXT AS code_atc,
          FALSE AS is_critical,
          NULL::TEXT AS critical_class_therapeutique,
          ${simExpr('e.dci', 'e.nom_marque')} AS sim
        FROM enregistrements e

        UNION ALL

        SELECT
          'retrait' AS source,
          r.id, r.n_enreg, r.dci, r.nom_marque, r.forme, r.dosage, r.labo, r.pays,
          r.type_prod, r.statut, NULL::SMALLINT AS annee,
          r.date_retrait, r.motif_retrait,
          NULL::DATE AS date_final,
          NULL::TEXT AS code_atc,
          FALSE AS is_critical,
          NULL::TEXT AS critical_class_therapeutique,
          ${simExpr('r.dci', 'r.nom_marque')} AS sim
        FROM retraits r

        UNION ALL

        SELECT
          'non_renouvele' AS source,
          n.id, n.n_enreg, n.dci, n.nom_marque, n.forme, n.dosage, n.labo, n.pays,
          n.type_prod, n.statut, NULL::SMALLINT AS annee,
          NULL::DATE AS date_retrait,
          NULL::TEXT AS motif_retrait,
          n.date_final,
          NULL::TEXT AS code_atc,
          FALSE AS is_critical,
          NULL::TEXT AS critical_class_therapeutique,
          ${simExpr('n.dci', 'n.nom_marque')} AS sim
        FROM non_renouveles n
      ) AS combined
      WHERE sim >= 0.34 ${scopeFilter}
      ORDER BY
        sim DESC,
        CASE source WHEN 'enregistrement' THEN 1 WHEN 'retrait' THEN 2 ELSE 3 END,
        nom_marque
      LIMIT $3
    `, [normalized, phonetic, limit])
  } catch {
    // pg_trgm absente ou timeout : la recherche stricte reste le comportement de référence
    return []
  }
}

/**
 * Recherche tolérante : recherche stricte d'abord, puis si aucun résultat
 * (requête texte simple), expansion de synonymes (doliprane/دوليبران →
 * PARACETAMOL) puis recherche floue trigram + phonétique.
 */
export async function searchMedicamentsTolerant(
  q: string,
  scope: string = 'all',
  limit: number = 40,
  filters?: {
    labo?: string
    substance?: string
    activeOnly?: boolean
    advanced?: AdvancedSearchCondition[]
  }
): Promise<TolerantSearchResponse> {
  const strict = await searchMedicaments(q, scope, limit, filters)
  const info: TolerantSearchInfo = { fuzzy: false, matchedTerm: null, synonymTerm: null }
  if (strict.length > 0) return { ...info, results: strict }

  // Le repli flou ne s'applique qu'aux recherches texte simples :
  // les filtres labo/substance/avancés gardent une sémantique stricte.
  const trimmedQuery = q.trim()
  const hasOtherFilters = Boolean(
    filters?.labo?.trim() ||
    filters?.substance?.trim() ||
    filters?.advanced?.some((condition) => condition.value?.trim())
  )
  if (!trimmedQuery || trimmedQuery.length < 3 || hasOtherFilters) {
    return { ...info, results: strict }
  }

  const keys = buildQueryKeys(trimmedQuery)
  const effectiveScope = filters?.activeOnly ? 'enregistrement' : scope

  // 1. Synonymie : nom commercial étranger / appellation populaire / arabe → DCI
  const synonym = await findSynonymTarget(keys.raw, keys.normalized)
  if (synonym) {
    const viaSynonym = await searchMedicaments(synonym.target, scope, limit, { activeOnly: filters?.activeOnly })
    if (viaSynonym.length > 0) {
      return { fuzzy: true, matchedTerm: synonym.target, synonymTerm: synonym.term, results: viaSynonym }
    }
  }

  // 2. Trigram + phonétique sur DCI / nom de marque
  if (keys.normalized.length >= 3) {
    const fuzzy = await searchFuzzyByName(keys.normalized, keys.phonetic, effectiveScope, limit)
    if (fuzzy.length > 0) {
      return { fuzzy: true, matchedTerm: null, synonymTerm: null, results: fuzzy }
    }
  }

  return { ...info, results: strict }
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

const NO_VALUE_OPERATORS = new Set(['is_empty', 'is_not_empty'])

function buildAdvancedSearchClause(conditions: AdvancedSearchCondition[], startIndex: number) {
  const sqlParts: string[] = []
  const params: Array<string | number> = []
  let paramIndex = startIndex

  for (let i = 0; i < conditions.length; i += 1) {
    const condition = conditions[i]
    const value = condition.value?.trim()
    if (!value && !NO_VALUE_OPERATORS.has(condition.operator)) continue

    const boolJoin = condition.bool === 'OR' ? 'OR' : 'AND'
    const prefix = sqlParts.length > 0 ? ` ${boolJoin} ` : ''

    if (condition.field in ADVANCED_STRING_FIELDS) {
      const fieldSql = ADVANCED_STRING_FIELDS[condition.field]
      if (condition.operator === 'equals') {
        sqlParts.push(`${prefix}UNACCENT(COALESCE(${fieldSql}, '')) ILIKE UNACCENT($${paramIndex})`)
        params.push(value!)
        paramIndex += 1
      } else if (condition.operator === 'starts_with') {
        sqlParts.push(`${prefix}UNACCENT(COALESCE(${fieldSql}, '')) ILIKE UNACCENT($${paramIndex})`)
        params.push(`${value!}%`)
        paramIndex += 1
      } else if (condition.operator === 'ends_with') {
        sqlParts.push(`${prefix}UNACCENT(COALESCE(${fieldSql}, '')) ILIKE UNACCENT($${paramIndex})`)
        params.push(`%${value!}`)
        paramIndex += 1
      } else if (condition.operator === 'not_contains') {
        sqlParts.push(`${prefix}UNACCENT(COALESCE(${fieldSql}, '')) NOT ILIKE UNACCENT($${paramIndex})`)
        params.push(`%${value!}%`)
        paramIndex += 1
      } else if (condition.operator === 'is_empty') {
        sqlParts.push(`${prefix}(${fieldSql} IS NULL OR ${fieldSql} = '')`)
      } else if (condition.operator === 'is_not_empty') {
        sqlParts.push(`${prefix}(${fieldSql} IS NOT NULL AND ${fieldSql} <> '')`)
      } else {
        // contains (default)
        sqlParts.push(`${prefix}UNACCENT(COALESCE(${fieldSql}, '')) ILIKE UNACCENT($${paramIndex})`)
        params.push(`%${value!}%`)
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

/** Retraits paginés, avec filtre optionnel sur l'année de retrait */
export async function getRetraitsPaged(annee: number | null, limit: number, offset: number): Promise<Retrait[]> {
  if (annee) {
    return query<Retrait>(`
      SELECT * FROM retraits
      WHERE EXTRACT(YEAR FROM date_retrait) = $1
      ORDER BY date_retrait DESC NULLS LAST, id DESC
      LIMIT $2 OFFSET $3
    `, [annee, limit, offset])
  }
  return query<Retrait>(`
    SELECT * FROM retraits
    ORDER BY date_retrait DESC NULLS LAST, id DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset])
}

export async function getRetraitsCount(annee: number | null): Promise<number> {
  const row = annee
    ? await queryOne<{ n: string }>(`
        SELECT COUNT(*)::TEXT AS n FROM retraits
        WHERE EXTRACT(YEAR FROM date_retrait) = $1
      `, [annee])
    : await queryOne<{ n: string }>(`SELECT COUNT(*)::TEXT AS n FROM retraits`)
  return row ? parseInt(row.n) : 0
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
  const hasCriticalTable = await hasTable('critical_medicaments')

  const getCriticalInfo = async (
    dci: string | null,
    forme: string | null,
    dosage: string | null
  ): Promise<{ isCritical: boolean; classe: string | null }> => {
    if (!hasCriticalTable || !dci || !forme || !dosage) return { isCritical: false, classe: null }
    const row = await queryOne<{ classe_therapeutique: string | null }>(`
      SELECT classe_therapeutique
      FROM critical_medicaments
      WHERE ${dciMatchCondition('dci', '$1')}
        AND dosage_norm = ${normalizedSql('$3')}
        AND ${formeMatchCondition('forme', '$2')}
      LIMIT 1
    `, [dci, forme, dosage])
    return { isCritical: Boolean(row), classe: row?.classe_therapeutique ?? null }
  }

  if (source === 'enregistrement') {
    const row = await queryOne<any>(`SELECT * FROM enregistrements WHERE id = $1`, [id])
    if (!row) return null
    const atc = await getAtcByDci(row.dci)
    const critical = await getCriticalInfo(row.dci ?? null, row.forme ?? null, row.dosage ?? null)
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
      is_critical: critical.isCritical,
      critical_class_therapeutique: critical.classe,
    }
  }

  if (source === 'retrait') {
    const row = await queryOne<any>(`SELECT * FROM retraits WHERE id = $1`, [id])
    if (!row) return null
    const atc = await getAtcByDci(row.dci)
    const critical = await getCriticalInfo(row.dci ?? null, row.forme ?? null, row.dosage ?? null)
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
      is_critical: critical.isCritical,
      critical_class_therapeutique: critical.classe,
    }
  }

  // non_renouvele
  const row = await queryOne<any>(`SELECT * FROM non_renouveles WHERE id = $1`, [id])
  if (!row) return null
  const atc = await getAtcByDci(row.dci)
  const critical = await getCriticalInfo(row.dci ?? null, row.forme ?? null, row.dosage ?? null)
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
    is_critical: critical.isCritical,
    critical_class_therapeutique: critical.classe,
  }
}

export async function getCriticalMedicaments(
  search: string = '',
  limit: number = 500
): Promise<CriticalMedicament[]> {
  if (!await hasTable('critical_medicaments')) return []
  const q = search.trim()
  return query<CriticalMedicament>(`
    SELECT id, dci, forme, dosage, classe_therapeutique, source_label, created_at
    FROM critical_medicaments
    WHERE (
      $1 = ''
      OR CONCAT_WS(' ', dci, forme, dosage, classe_therapeutique) ILIKE $2
    )
    ORDER BY dci ASC, forme ASC, dosage ASC
    LIMIT $3
  `, [q, `%${q}%`, limit])
}

// ─── MÉDICAMENTS CRITIQUES AVEC CORRESPONDANCES ───────────────

export type CriticalWithMed = {
  critical_id: number
  dci: string
  forme: string
  dosage: string
  classe_therapeutique: string | null
  med_id: number | null
  med_source: 'enregistrement' | 'retrait' | null
  nom_marque: string | null
  n_enreg: string | null
  labo: string | null
  pays: string | null
  statut: string | null
  source_version: string | null
  date_retrait: string | null
  motif_retrait: string | null
  med_forme: string | null
  med_dosage: string | null
  forme_approx: boolean
  /** 'full' = DCI + forme + dosage matched; 'dci_partial' = DCI + (forme OR dosage) matched; 'dci_only' = DCI only; null = no match */
  match_quality: 'full' | 'dci_partial' | 'dci_only' | null
}

export async function getCriticalWithMeds(search: string = ''): Promise<CriticalWithMed[]> {
  if (!await hasTable('critical_medicaments')) return []
  const q = search.trim()

  // LATERAL subquery: match on DCI first (broad), then classify as 'full' or 'dci_only'.
  // This surfaces DCI-only matches so the UI can flag "same DCI, different form/dosage".
  return query<CriticalWithMed>(`
    SELECT
      cm.id                     AS critical_id,
      cm.dci,
      cm.forme,
      cm.dosage,
      cm.classe_therapeutique,
      med.id                    AS med_id,
      med.source                AS med_source,
      med.nom_marque,
      med.n_enreg,
      med.labo,
      med.pays,
      med.statut,
      med.source_version,
      med.date_retrait,
      med.motif_retrait,
      med.forme                 AS med_forme,
      med.dosage                AS med_dosage,
      med.match_quality,
      CASE
        WHEN med.id IS NULL                      THEN false
        WHEN med.match_quality = 'dci_only'      THEN false
        WHEN med.match_quality = 'dci_partial'   THEN false
        WHEN ${normalizedFormeSql('med.forme')} = ${normalizedFormeSql('cm.forme')} THEN false
        ELSE true
      END                       AS forme_approx
    FROM critical_medicaments cm
    LEFT JOIN LATERAL (
      SELECT
        m.id,
        m.source,
        m.dci,
        m.forme,
        m.dosage,
        m.nom_marque,
        m.n_enreg,
        m.labo,
        m.pays,
        m.statut,
        m.source_version,
        m.date_retrait,
        m.motif_retrait,
        CASE
          WHEN ${formeMatchCondition('cm.forme', 'm.forme')}
            AND ${dosageMatchCondition('cm.dosage', 'm.dosage')}
          THEN 'full'::TEXT
          WHEN ${formeMatchCondition('cm.forme', 'm.forme')}
            OR ${dosageMatchCondition('cm.dosage', 'm.dosage')}
          THEN 'dci_partial'::TEXT
          ELSE 'dci_only'::TEXT
        END AS match_quality
      FROM (
        SELECT
          e.id,
          'enregistrement'::TEXT AS source,
          e.dci, e.forme, e.dosage,
          e.nom_marque, e.n_enreg, e.labo, e.pays,
          e.statut, e.source_version,
          NULL::DATE AS date_retrait,
          NULL::TEXT AS motif_retrait
        FROM enregistrements e
        UNION ALL
        SELECT
          r.id,
          'retrait'::TEXT AS source,
          r.dci, r.forme, r.dosage,
          r.nom_marque, r.n_enreg, r.labo, r.pays,
          r.statut, NULL::TEXT AS source_version,
          r.date_retrait, r.motif_retrait
        FROM retraits r
      ) m
      WHERE ${dciMatchCondition('cm.dci', 'm.dci')}
      ORDER BY
        CASE
          WHEN ${formeMatchCondition('cm.forme', 'm.forme')} AND ${dosageMatchCondition('cm.dosage', 'm.dosage')} THEN 1
          WHEN ${formeMatchCondition('cm.forme', 'm.forme')} OR ${dosageMatchCondition('cm.dosage', 'm.dosage')} THEN 2
          ELSE 3
        END,
        m.nom_marque ASC
      LIMIT 30
    ) med ON TRUE
    WHERE (
      $1 = ''
      OR CONCAT_WS(' ', cm.dci, cm.forme, cm.dosage, cm.classe_therapeutique) ILIKE $2
    )
    ORDER BY
      cm.dci ASC,
      cm.forme ASC,
      cm.dosage ASC,
      CASE med.match_quality WHEN 'full' THEN 1 WHEN 'dci_partial' THEN 2 WHEN 'dci_only' THEN 3 ELSE 4 END,
      med.source ASC,
      med.nom_marque ASC
  `, [q, `%${q}%`])
}

// ─── MAPPING PRÉ-CALCULÉ (critical_mapping) ──────────────────

export type CriticalMappingRow = {
  id: number
  n_critique: number | null
  classe_therapeutique: string | null
  dci_critique: string
  forme_critique: string | null
  dosage_critique: string | null
  statut_match: 'OUI' | 'A_REVOIR' | null
  score_global: number | null
  score_dci: number | null
  score_forme: number | null
  score_dosage: number | null
  source_base: 'ACTIVE' | 'RETRAIT' | 'NON_RENOUVELE' | null
  n_base: number | null
  code_base: string | null
  n_enregistrement: string | null
  dci_base: string | null
  marque: string | null
  forme_base: string | null
  dosage_base: string | null
  conditionnement: string | null
}

export async function getCriticalMapping(search = ''): Promise<CriticalMappingRow[]> {
  if (!await hasTable('critical_mapping')) return []
  const q = search.trim()
  return query<CriticalMappingRow>(`
    SELECT *
    FROM critical_mapping
    WHERE (
      $1 = ''
      OR CONCAT_WS(' ', dci_critique, forme_critique, dosage_critique,
                        classe_therapeutique, marque, dci_base) ILIKE $2
    )
    ORDER BY
      classe_therapeutique ASC NULLS LAST,
      n_critique ASC NULLS LAST,
      dci_critique ASC,
      score_global DESC NULLS LAST
  `, [q, `%${q}%`])
}

/** Petit échantillon de la liste critique (aperçu espace Outils) */
export async function getCriticalSample(limit = 4): Promise<CriticalMappingRow[]> {
  if (!await hasTable('critical_mapping')) return []
  return query<CriticalMappingRow>(`
    SELECT * FROM critical_mapping
    WHERE dci_critique IS NOT NULL
    ORDER BY classe_therapeutique ASC NULLS LAST, n_critique ASC NULLS LAST, score_global DESC NULLS LAST
    LIMIT $1
  `, [limit])
}

export async function getCriticalCount(): Promise<number> {
  if (!await hasTable('critical_mapping')) return 0
  const row = await queryOne<{ n: string }>(`
    SELECT COUNT(DISTINCT COALESCE(n_critique::TEXT, dci_critique || COALESCE(forme_critique, '') || COALESCE(dosage_critique, '')))::TEXT AS n
    FROM critical_mapping
  `)
  return row ? parseInt(row.n) : 0
}

// ─── SEO : PAGES CIBLÉES ──────────────────────────────────────

export type DciSlug = { dci: string; count: number }
export type FormeSlug = { forme: string; count: number }

/** Tous les médicaments actifs pour une DCI donnée */
export async function getMedicamentsByDci(dci: string, limit = 200): Promise<Enregistrement[]> {
  return query<Enregistrement>(`
    SELECT * FROM enregistrements
    WHERE LOWER(dci) = LOWER($1)
    ORDER BY nom_marque ASC
    LIMIT $2
  `, [dci, limit])
}

/** Toutes les DCI uniques avec leur nombre de médicaments (pour sitemap + pages index) */
export async function getAllDciList(limit = 2000): Promise<DciSlug[]> {
  const rows = await query<{ dci: string; count: string }>(`
    SELECT dci, COUNT(*)::INT AS count
    FROM enregistrements
    WHERE dci IS NOT NULL AND dci <> ''
    GROUP BY dci
    ORDER BY count DESC, dci ASC
    LIMIT $1
  `, [limit])
  return rows.map(r => ({ dci: r.dci, count: parseInt(r.count as unknown as string) }))
}

/** Tous les médicaments actifs pour une forme pharmaceutique */
export async function getMedicamentsByForme(forme: string, limit = 200): Promise<Enregistrement[]> {
  return query<Enregistrement>(`
    SELECT * FROM enregistrements
    WHERE LOWER(forme) = LOWER($1)
    ORDER BY dci ASC, nom_marque ASC
    LIMIT $2
  `, [forme, limit])
}

/** Toutes les formes uniques avec leur nombre de médicaments */
export async function getAllFormeList(limit = 500): Promise<FormeSlug[]> {
  const rows = await query<{ forme: string; count: string }>(`
    SELECT forme, COUNT(*)::INT AS count
    FROM enregistrements
    WHERE forme IS NOT NULL AND forme <> ''
    GROUP BY forme
    ORDER BY count DESC, forme ASC
    LIMIT $1
  `, [limit])
  return rows.map(r => ({ forme: r.forme, count: parseInt(r.count as unknown as string) }))
}

/** Retraits pour une année donnée */
export async function getRetraitsByAnnee(annee: number): Promise<Retrait[]> {
  return query<Retrait>(`
    SELECT * FROM retraits
    WHERE EXTRACT(YEAR FROM date_retrait) = $1
    ORDER BY date_retrait DESC NULLS LAST, id DESC
  `, [annee])
}

/** Toutes les années disponibles dans la table retraits */
export async function getAllRetraitAnnees(): Promise<number[]> {
  const rows = await query<{ annee: number }>(`
    SELECT DISTINCT EXTRACT(YEAR FROM date_retrait)::INT AS annee
    FROM retraits
    WHERE date_retrait IS NOT NULL
    ORDER BY annee DESC
  `)
  return rows.map(r => r.annee)
}

/** Nouveautés pour un mois/année donné (is_new_vs_previous ou date_init) */
export async function getNouveautesByAnneeMois(annee: number, mois: number, limit = 300): Promise<Enregistrement[]> {
  const hasIsNew = await hasColumn('enregistrements', 'is_new_vs_previous')
  if (hasIsNew) {
    return query<Enregistrement>(`
      SELECT * FROM enregistrements
      WHERE is_new_vs_previous = TRUE
        AND EXTRACT(YEAR FROM date_init) = $1
        AND EXTRACT(MONTH FROM date_init) = $2
      ORDER BY nom_marque ASC
      LIMIT $3
    `, [annee, mois, limit])
  }
  return query<Enregistrement>(`
    SELECT * FROM enregistrements
    WHERE EXTRACT(YEAR FROM date_init) = $1
      AND EXTRACT(MONTH FROM date_init) = $2
    ORDER BY nom_marque ASC
    LIMIT $3
  `, [annee, mois, limit])
}

/** Toutes les paires année/mois avec des nouveautés */
export async function getAllNouveauteAnneeMois(): Promise<{ annee: number; mois: number; count: number }[]> {
  const hasIsNew = await hasColumn('enregistrements', 'is_new_vs_previous')
  const whereExtra = hasIsNew ? 'AND is_new_vs_previous = TRUE' : ''
  const rows = await query<{ annee: string; mois: string; count: string }>(`
    SELECT
      EXTRACT(YEAR FROM date_init)::INT AS annee,
      EXTRACT(MONTH FROM date_init)::INT AS mois,
      COUNT(*)::INT AS count
    FROM enregistrements
    WHERE date_init IS NOT NULL ${whereExtra}
    GROUP BY annee, mois
    HAVING COUNT(*) >= 3
    ORDER BY annee DESC, mois DESC
    LIMIT 60
  `)
  return rows.map(r => ({
    annee: parseInt(r.annee as unknown as string),
    mois: parseInt(r.mois as unknown as string),
    count: parseInt(r.count as unknown as string),
  }))
}

/** Substitution : médicaments (actifs + génériques) pour une DCI */
export async function getMedicamentsDciSubstitution(dci: string): Promise<{
  reference: Enregistrement[]
  generiques: Enregistrement[]
}> {
  const all = await query<Enregistrement>(`
    SELECT * FROM enregistrements
    WHERE LOWER(dci) = LOWER($1)
    ORDER BY type_prod ASC, nom_marque ASC
  `, [dci])
  const reference = all.filter(m => !['GE', 'Gé'].includes(m.type_prod ?? ''))
  const generiques = all.filter(m => ['GE', 'Gé'].includes(m.type_prod ?? ''))
  return { reference, generiques }
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

// ─── NAVIGATION PAR CLASSE THÉRAPEUTIQUE (ATC) ───────────────

export type AtcNavNode = {
  code: string
  parent_code: string | null
  niveau: number
  label_fr: string | null
  label_en: string | null
  /** Nombre de DCI de la nomenclature mappées sous ce code (descendants inclus) */
  dci_count: number
}

export type AtcDciEntry = {
  dci: string
  code_atc: string
  atc_label_fr: string | null
  atc_label_en: string | null
  nb_produits: number
}

async function hasAtcTables(): Promise<boolean> {
  const [codes, mapping] = await Promise.all([hasTable('atc_codes'), hasTable('dci_atc_mapping')])
  return codes && mapping
}

/** Les 14 groupes anatomiques (niveau 1), avec le nombre de DCI mappées */
export async function getAtcRootsWithCounts(): Promise<AtcNavNode[]> {
  if (!await hasAtcTables()) return []
  try {
    return await query<AtcNavNode>(`
      SELECT
        a.code, a.parent_code, a.niveau, a.label_fr, a.label_en,
        (SELECT COUNT(DISTINCT m.dci) FROM dci_atc_mapping m WHERE m.code_atc LIKE a.code || '%')::INT AS dci_count
      FROM atc_codes a
      WHERE a.niveau = 1
      ORDER BY a.code
    `)
  } catch {
    return []
  }
}

export async function getAtcNode(code: string): Promise<AtcCode | null> {
  if (!await hasAtcTables()) return null
  try {
    return await queryOne<AtcCode>(`
      SELECT code, parent_code, niveau, label_fr, label_en
      FROM atc_codes
      WHERE code = UPPER(TRIM($1))
    `, [code])
  } catch {
    return null
  }
}

/** Sous-classes directes d'un code ATC, avec le nombre de DCI mappées sous chacune */
export async function getAtcChildrenWithCounts(code: string): Promise<AtcNavNode[]> {
  if (!await hasAtcTables()) return []
  try {
    return await query<AtcNavNode>(`
      SELECT
        a.code, a.parent_code, a.niveau, a.label_fr, a.label_en,
        (SELECT COUNT(DISTINCT m.dci) FROM dci_atc_mapping m WHERE m.code_atc LIKE a.code || '%')::INT AS dci_count
      FROM atc_codes a
      WHERE a.parent_code = UPPER(TRIM($1))
      ORDER BY a.code
    `, [code])
  } catch {
    return []
  }
}

/** Ancêtres d'un code ATC (niveau 1 → parent direct), pour le fil d'Ariane */
export async function getAtcAncestors(code: string): Promise<AtcCode[]> {
  if (!await hasAtcTables()) return []
  try {
    const rows = await query<AtcCode>(`
      WITH RECURSIVE atc_up AS (
        SELECT p.code, p.parent_code, p.niveau, p.label_en, p.label_fr
        FROM atc_codes c
        JOIN atc_codes p ON p.code = c.parent_code
        WHERE c.code = UPPER(TRIM($1))

        UNION ALL

        SELECT p.code, p.parent_code, p.niveau, p.label_en, p.label_fr
        FROM atc_codes p
        JOIN atc_up c ON p.code = c.parent_code
      )
      SELECT * FROM atc_up
      ORDER BY niveau ASC
    `, [code])
    return rows
  } catch {
    return []
  }
}

/** DCI de la nomenclature mappées sous un préfixe ATC, avec le nombre de spécialités enregistrées */
export async function getDcisByAtcPrefix(code: string, limit = 300): Promise<AtcDciEntry[]> {
  if (!await hasAtcTables()) return []
  try {
    return await query<AtcDciEntry>(`
      SELECT
        m.dci,
        m.code_atc,
        a.label_fr AS atc_label_fr,
        a.label_en AS atc_label_en,
        COALESCE(e.nb, 0)::INT AS nb_produits
      FROM dci_atc_mapping m
      JOIN atc_codes a ON a.code = m.code_atc
      LEFT JOIN (
        SELECT UPPER(TRIM(dci)) AS dci_norm, COUNT(*) AS nb
        FROM enregistrements
        GROUP BY UPPER(TRIM(dci))
      ) e ON e.dci_norm = m.dci
      WHERE m.code_atc LIKE UPPER(TRIM($1)) || '%'
      ORDER BY m.code_atc, m.dci
      LIMIT $2
    `, [code, limit])
  } catch {
    return []
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
export async function getLaboProducts(laboName: string, limit = 200, offset = 0) {
  return query<{
    id: number; source: string; n_enreg: string | null; dci: string; nom_marque: string;
    forme: string | null; dosage: string | null; statut: string | null; annee: number | null;
  }>(`
    SELECT
      id,
      'enregistrement' AS source,
      n_enreg,
      dci,
      nom_marque,
      forme,
      dosage,
      statut,
      annee
    FROM enregistrements
    WHERE labo = $1
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
  algerie: number
  etranger: number
  inconnu: number
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
    query<{ labo: string; nb: string; algerie: string; etranger: string; inconnu: string }>(`
      SELECT
        labo,
        COUNT(*)::TEXT AS nb,
        SUM(
          CASE
            WHEN pays IS NOT NULL
             AND (
               LOWER(pays) LIKE '%alg%'
               OR LOWER(pays) LIKE '%dz%'
               OR pays LIKE '%الجزائر%'
             )
            THEN 1
            ELSE 0
          END
        )::TEXT AS algerie,
        SUM(
          CASE
            WHEN pays IS NOT NULL
             AND pays != ''
             AND NOT (
               LOWER(pays) LIKE '%alg%'
               OR LOWER(pays) LIKE '%dz%'
               OR pays LIKE '%الجزائر%'
             )
            THEN 1
            ELSE 0
          END
        )::TEXT AS etranger,
        SUM(CASE WHEN pays IS NULL OR pays = '' THEN 1 ELSE 0 END)::TEXT AS inconnu
      FROM enregistrements
      WHERE labo IS NOT NULL AND labo != ''
      GROUP BY labo
      ORDER BY COUNT(*) DESC
      LIMIT 200
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
      algerie: parseInt(r.algerie),
      etranger: parseInt(r.etranger),
      inconnu: parseInt(r.inconnu),
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
