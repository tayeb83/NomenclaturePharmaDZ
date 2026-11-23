/**
 * Classements de la nomenclature pour les articles de données (accès base).
 * Voir lib/nomenclature-stats-core.ts pour les types et la partie pure.
 */
import { query, queryOne } from './db'
import { laboToSlug } from './queries'
import type { ClassementGeneriques, ModeGeneriques, TopLabos } from './nomenclature-stats-core'

/** Code de type « générique » tel qu'il figure dans la nomenclature (GE, Gé), sans dépendre de la locale de UPPER. */
const EST_GENERIQUE = `TRIM(COALESCE(e.type_prod, '')) IN ('GE', 'Gé', 'GÉ', 'ge', 'gé')`
const EST_BIOLOGIQUE = `UPPER(TRIM(COALESCE(e.type_prod, ''))) = 'BIO'`

export async function getTopLabos(limit: number): Promise<TopLabos | null> {
  try {
    const [rows, totaux] = await Promise.all([
      query<{ labo: string; presentations: number; substances: number; fabriquees: number; pays: string[] | null }>(`
        SELECT
          e.labo,
          COUNT(*)::INT AS presentations,
          COUNT(DISTINCT UPPER(TRIM(e.dci)))::INT AS substances,
          COUNT(*) FILTER (WHERE UPPER(TRIM(COALESCE(e.statut, ''))) = 'F')::INT AS fabriquees,
          ARRAY(
            SELECT p.pays FROM enregistrements p
            WHERE p.labo = e.labo AND p.pays IS NOT NULL AND TRIM(p.pays) <> ''
            GROUP BY p.pays ORDER BY COUNT(*) DESC, p.pays LIMIT 3
          ) AS pays
        FROM enregistrements e
        WHERE e.labo IS NOT NULL AND TRIM(e.labo) <> ''
        GROUP BY e.labo
        ORDER BY COUNT(*) DESC, e.labo
        LIMIT $1
      `, [limit]),
      queryOne<{ presentations: number; labos: number }>(`
        SELECT COUNT(*)::INT AS presentations,
               COUNT(DISTINCT labo) FILTER (WHERE labo IS NOT NULL AND TRIM(labo) <> '')::INT AS labos
        FROM enregistrements
      `),
    ])
    return {
      labos: rows.map(r => ({ ...r, slug: laboToSlug(r.labo), pays: r.pays ?? [] })),
      totalPresentations: totaux?.presentations ?? 0,
      totalLabos: totaux?.labos ?? 0,
    }
  } catch (err) {
    console.error('getTopLabos', err)
    return null
  }
}

/**
 * Substances classées par nombre de génériques ('plus') ou sans aucun générique ('aucun').
 * Une substance = un code ATC de 5e niveau quand la DCI y est rattachée (les sels et graphies
 * d'une même DCI sont alors réunis), sinon la DCI telle qu'écrite.
 */
export async function getClassementGeneriques(mode: ModeGeneriques, limit: number): Promise<ClassementGeneriques | null> {
  const filtre = mode === 'plus' ? 'generiques > 0' : 'generiques = 0'
  const ordre = mode === 'plus'
    ? 'generiques DESC, laboratoires_generiques DESC, libelle_fr'
    : 'presentations DESC, libelle_fr'
  const corps = (avecAtc: boolean) => `
    WITH base AS (
      SELECT
        ${avecAtc ? 'm.code_atc' : 'NULL::TEXT AS code_atc'},
        UPPER(TRIM(e.dci)) AS dci,
        e.labo,
        ${EST_GENERIQUE} AS generique,
        ${EST_BIOLOGIQUE} AS biologique
      FROM enregistrements e
      ${avecAtc ? 'LEFT JOIN dci_atc_mapping m ON m.dci = UPPER(TRIM(e.dci))' : ''}
      WHERE e.dci IS NOT NULL AND TRIM(e.dci) <> ''
    ), groupes AS (
      SELECT
        b.code_atc,
        ${avecAtc ? 'COALESCE(MAX(a.label_fr), MIN(b.dci))' : 'MIN(b.dci)'} AS libelle_fr,
        ${avecAtc ? 'MAX(a.label_ar)' : 'NULL::TEXT'} AS libelle_ar,
        MIN(b.dci) AS dci,
        COUNT(*)::INT AS presentations,
        COUNT(*) FILTER (WHERE b.generique)::INT AS generiques,
        COUNT(DISTINCT b.labo) FILTER (WHERE b.generique)::INT AS laboratoires_generiques,
        COUNT(*) FILTER (WHERE b.biologique)::INT AS biologiques
      FROM base b
      ${avecAtc ? 'LEFT JOIN atc_codes a ON a.code = b.code_atc' : ''}
      GROUP BY b.code_atc, CASE WHEN b.code_atc IS NULL THEN b.dci END
    )
    SELECT *, COUNT(*) OVER ()::INT AS total
    FROM groupes
    WHERE ${filtre}
    ORDER BY ${ordre}
    LIMIT $1
  `
  type Ligne = {
    code_atc: string | null; libelle_fr: string; libelle_ar: string | null; dci: string
    presentations: number; generiques: number; laboratoires_generiques: number; biologiques: number; total: number
  }
  const convertir = (rows: Ligne[]): ClassementGeneriques => ({
    total: rows[0]?.total ?? 0,
    substances: rows.map(r => ({
      codeAtc: r.code_atc,
      libelleFr: r.libelle_fr,
      libelleAr: r.libelle_ar,
      dci: r.dci,
      presentations: r.presentations,
      generiques: r.generiques,
      laboratoiresGeneriques: r.laboratoires_generiques,
      biologiques: r.biologiques,
    })),
  })
  try {
    // Libellé arabe : seulement si la colonne existe (sql/31_atc_label_ar.sql).
    const ar = await queryOne<{ ok: boolean }>(`
      SELECT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'atc_codes' AND column_name = 'label_ar') AS ok`)
    const sql = corps(true).replace('MAX(a.label_ar)', ar?.ok ? 'MAX(a.label_ar)' : 'NULL::TEXT')
    return convertir(await query<Ligne>(sql, [limit]))
  } catch {
    // Tables ATC absentes : regroupement sur la DCI écrite.
    try {
      return convertir(await query<Ligne>(corps(false), [limit]))
    } catch (err) {
      console.error('getClassementGeneriques', err)
      return null
    }
  }
}
