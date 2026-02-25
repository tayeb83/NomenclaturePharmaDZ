/**
 * Toutes les requêtes DB centralisées ici
 * Les pages importent depuis ce fichier, pas depuis lib/db.ts directement
 */

import { query, queryOne } from './db'
import type { Enregistrement, Retrait, NonRenouvele, SearchResult, Stats } from './db'

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

// ─── STATS ────────────────────────────────────────────────────
export async function getStats(): Promise<Stats> {
  const hasIsNewFlag = await hasColumn('enregistrements', 'is_new_vs_previous')
  const hasVersionsTable = await hasTable('nomenclature_versions')
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

  let row: Stats | null = null
  try {
    row = await queryOne<Stats>(`SELECT * FROM v_stats`)
  } catch {
    // Certaines bases legacy n'ont pas encore la vue (ou la vue référence un ancien schéma)
    row = null
  }

  const fallback = await queryOne<Stats>(`
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

  if (row && row.total_enregistrements > 0) return row
  if (fallback && fallback.total_enregistrements > 0) {
    return {
      ...(row ?? fallback),
      ...fallback,
      // Préserver le label de version déjà exposé par v_stats s'il existe
      last_version: row?.last_version ?? fallback.last_version,
    }
  }

  return row ?? {
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
  limit: number = 40
): Promise<SearchResult[]> {
  if (!q.trim()) return []

  // Construire la condition selon le scope
  const scopeConditions: Record<string, string> = {
    enregistrement: `AND source = 'enregistrement'`,
    retrait:        `AND source = 'retrait'`,
    non_renouvele:  `AND source = 'non_renouvele'`,
    all:            '',
  }
  const scopeFilter = scopeConditions[scope] ?? ''

  const results = await query<SearchResult>(`
    SELECT * FROM (
      SELECT
        'enregistrement' AS source,
        id, n_enreg, dci, nom_marque, forme, dosage, labo, pays,
        type_prod, statut, annee,
        NULL::DATE AS date_retrait,
        NULL::TEXT AS motif_retrait,
        date_final
      FROM enregistrements
      WHERE dci ILIKE $1 OR nom_marque ILIKE $1

      UNION ALL

      SELECT
        'retrait' AS source,
        id, n_enreg, dci, nom_marque, forme, dosage, labo, pays,
        type_prod, statut, NULL::SMALLINT AS annee,
        date_retrait, motif_retrait,
        NULL::DATE AS date_final
      FROM retraits
      WHERE dci ILIKE $1 OR nom_marque ILIKE $1

      UNION ALL

      SELECT
        'non_renouvele' AS source,
        id, n_enreg, dci, nom_marque, forme, dosage, labo, pays,
        type_prod, statut, NULL::SMALLINT AS annee,
        NULL::DATE AS date_retrait,
        NULL::TEXT AS motif_retrait,
        date_final
      FROM non_renouveles
      WHERE dci ILIKE $1 OR nom_marque ILIKE $1
    ) AS combined
    ${scopeFilter}
    ORDER BY
      CASE source WHEN 'enregistrement' THEN 1 WHEN 'retrait' THEN 2 ELSE 3 END,
      nom_marque
    LIMIT $2
  `, [`%${q}%`, limit])

  return results
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
