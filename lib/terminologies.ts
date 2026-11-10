/**
 * DwaDZ — Référentiel terminologique en base (sql/39_terminologies.sql).
 *
 * synchroniserTerminologies() :
 *   1. charge les listes EDQM (formes, voies, méthodes) et les unités UCUM dans leurs tables ;
 *   2. calcule, pour chaque écriture de forme de la nomenclature, son terme EDQM (forme_edqm_mapping) —
 *      une ligne passée en source = 'manual' n'est jamais écrasée, et c'est elle qui s'applique ;
 *   3. reconstruit medicament_terminologie : une ligne par fiche, avec forme, voies et méthode EDQM
 *      et unités UCUM du dosage.
 * Tout se fait dans une transaction ; `apply: false` l'annule (simulation).
 * Une traduction arabe marquée « relu » en base n'est jamais remplacée par le brouillon du dépôt.
 */

import type { PoolClient } from 'pg'
import { getPool } from './db'
import { EDQM_SOURCE, edqmListes } from './edqm'
import { normaliserDci, normaliserDosage, normaliserForme } from './guide-core'
import { UNITES_INFO } from './ucum'

export type SyncBilan = {
  termes_edqm: number
  unites_ucum: number
  formes: number
  formes_manuelles: number
  fiches: number
  fiches_forme_edqm: number
  fiches_voie_edqm: number
  fiches_ucum: number
}

type Mapping = { forme: string; forme_norm: string | null; code_forme: string | null; relation: string | null; codes_voie: string[]; code_methode: string | null }

export async function terminologiesInstallees(client: PoolClient): Promise<boolean> {
  const r = await client.query(`SELECT to_regclass('public.medicament_terminologie') IS NOT NULL AS ok`)
  return r.rows[0].ok
}

/** @returns le bilan, ou null si la migration sql/39_terminologies.sql n'est pas appliquée */
export async function synchroniserTerminologies({ apply = true }: { apply?: boolean } = {}): Promise<SyncBilan | null> {
  const client = await getPool().connect()
  try {
    if (!(await terminologiesInstallees(client))) return null
    await client.query('BEGIN')

    // 1. Listes EDQM et UCUM
    const listes = edqmListes()
    const termes = (['forme', 'voie', 'methode'] as const).flatMap(classe =>
      listes[classe].map(t => ({ code: t.code, classe, label_en: t.en, label_fr: t.fr, label_ar: t.ar, ar_statut: t.ar ? (t.ar_relu ? 'relu' : 'brouillon') : 'absent' })))
    await client.query(
      `INSERT INTO edqm_termes (code, classe, label_en, label_fr, label_ar, ar_statut, source, updated_at)
       SELECT code, classe, label_en, label_fr, label_ar, ar_statut, $2, NOW()
       FROM jsonb_to_recordset($1::jsonb) AS x(code text, classe text, label_en text, label_fr text, label_ar text, ar_statut text)
       ON CONFLICT (code) DO UPDATE SET
         classe = EXCLUDED.classe, label_en = EXCLUDED.label_en, label_fr = EXCLUDED.label_fr, source = EXCLUDED.source, updated_at = NOW(),
         label_ar = CASE WHEN edqm_termes.ar_statut = 'relu' THEN edqm_termes.label_ar ELSE EXCLUDED.label_ar END,
         ar_statut = CASE WHEN edqm_termes.ar_statut = 'relu' THEN 'relu' ELSE EXCLUDED.ar_statut END`,
      [JSON.stringify(termes), EDQM_SOURCE]
    )
    const unites = new Map<string, { code: string; symbole: string; label_ar: string }>()
    for (const u of Object.values(UNITES_INFO)) if (u.ucum && !unites.has(u.ucum)) unites.set(u.ucum, { code: u.ucum, symbole: u.symbole, label_ar: u.ar })
    await client.query(
      `INSERT INTO ucum_unites (code, symbole, label_ar, updated_at)
       SELECT code, symbole, label_ar, NOW() FROM jsonb_to_recordset($1::jsonb) AS x(code text, symbole text, label_ar text)
       ON CONFLICT (code) DO UPDATE SET symbole = EXCLUDED.symbole, label_ar = EXCLUDED.label_ar, updated_at = NOW()`,
      [JSON.stringify([...unites.values()])]
    )

    // 2. Formes de la nomenclature → EDQM
    const manuels = new Map<string, Mapping>(
      (await client.query<Mapping>(`SELECT forme, forme_norm, code_forme, relation, codes_voie, code_methode FROM forme_edqm_mapping WHERE source = 'manual'`)).rows.map(m => [m.forme, m])
    )
    const lignes = (await client.query<{ id: number; n_enreg: string | null; dci: string | null; forme: string | null; dosage: string | null }>(
      `SELECT id, n_enreg, dci, forme, dosage FROM enregistrements`
    )).rows
    const cleForme = (f: string | null) => (f ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
    const autos = new Map<string, Mapping>()
    const fiches = lignes.map(l => {
      const k = cleForme(l.forme)
      const f = normaliserForme(l.forme)
      const auto: Mapping = { forme: k, forme_norm: f.fr, code_forme: f.edqm?.code ?? null, relation: f.edqm?.relation ?? null, codes_voie: f.voies_edqm, code_methode: f.methode_edqm }
      if (k && !manuels.has(k)) autos.set(k, auto)
      const m = manuels.get(k) ?? auto
      const d = normaliserDosage(l.dosage, Math.max(1, normaliserDci(l.dci).substances.length))
      const ucum = [...new Set([...d.quantites, ...(d.denominateur ? [d.denominateur] : [])].flatMap(q => (q.ucum ? [q.ucum] : [])))]
      return {
        enregistrement_id: l.id, n_enreg: l.n_enreg, forme_norm: m.forme_norm, edqm_forme: m.code_forme, edqm_forme_relation: m.relation,
        edqm_voies: m.codes_voie, edqm_methode: m.code_methode, dosage_norm: d.reconnu ? d.libelle : null,
        dosage_quantites: d.quantites.length ? { quantites: d.quantites, denominateur: d.denominateur } : null, ucum_unites: ucum,
      }
    })
    await client.query(`DELETE FROM forme_edqm_mapping WHERE source = 'auto'`)
    await client.query(
      `INSERT INTO forme_edqm_mapping (forme, forme_norm, code_forme, relation, codes_voie, code_methode, source, updated_at)
       SELECT forme, forme_norm, code_forme, relation, COALESCE(codes_voie, '{}'), code_methode, 'auto', NOW()
       FROM jsonb_to_recordset($1::jsonb) AS x(forme text, forme_norm text, code_forme text, relation text, codes_voie text[], code_methode text)`,
      [JSON.stringify([...autos.values()])]
    )

    // 3. Une ligne par fiche
    await client.query(`DELETE FROM medicament_terminologie`)
    await client.query(
      `INSERT INTO medicament_terminologie
         (enregistrement_id, n_enreg, forme_norm, edqm_forme, edqm_forme_relation, edqm_voies, edqm_methode, dosage_norm, dosage_quantites, ucum_unites, updated_at)
       SELECT enregistrement_id, n_enreg, forme_norm, edqm_forme, edqm_forme_relation, COALESCE(edqm_voies, '{}'), edqm_methode, dosage_norm, dosage_quantites,
              COALESCE(ucum_unites, '{}'), NOW()
       FROM jsonb_to_recordset($1::jsonb) AS x(enregistrement_id int, n_enreg text, forme_norm text, edqm_forme text, edqm_forme_relation text,
              edqm_voies text[], edqm_methode text, dosage_norm text, dosage_quantites jsonb, ucum_unites text[])`,
      [JSON.stringify(fiches)]
    )
    await client.query(apply ? 'COMMIT' : 'ROLLBACK')
    return {
      termes_edqm: termes.length, unites_ucum: unites.size, formes: autos.size + manuels.size, formes_manuelles: manuels.size,
      fiches: fiches.length, fiches_forme_edqm: fiches.filter(f => f.edqm_forme).length,
      fiches_voie_edqm: fiches.filter(f => f.edqm_voies.length).length, fiches_ucum: fiches.filter(f => f.ucum_unites.length).length,
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}
