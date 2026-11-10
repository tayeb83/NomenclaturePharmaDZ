/**
 * DwaDZ — Terminologies d'une fiche, avec les corrections faites en base (sql/39_terminologies.sql).
 *
 * Même principe que lib/medicament-cache.ts : une fiche ne change qu'à l'import d'une nomenclature, donc on garde le
 * résultat 24 h (ou jusqu'à `revalidateTag(NOMENCLATURE_TAG)`). Sans la migration, ou si la base répond mal, la fiche
 * affiche le calcul du dépôt : cette lecture ne doit jamais faire échouer une fiche.
 */

import { unstable_cache } from 'next/cache'
import { query } from './db'
import { NOMENCLATURE_TAG } from './medicament-cache'
import { terminologieDeFiche, type Surcharge, type TerminologieFiche } from './terminologie-fiche'
import { normaliserForme } from './guide-core'
import type { EdqmRelation } from './edqm'

const cleForme = (f: string | null | undefined) => (f ?? '').replace(/\s+/g, ' ').trim().toUpperCase()

async function surchargeDeLaBase(forme: string | null | undefined): Promise<Surcharge> {
  try {
    const ok = await query<{ ok: boolean }>(`SELECT to_regclass('public.forme_edqm_mapping') IS NOT NULL AS ok`)
    if (!ok[0]?.ok) return {}
    const surcharge: Surcharge = {}
    const k = cleForme(forme)
    if (k) {
      const m = await query<{ code_forme: string | null; relation: string | null; codes_voie: string[]; code_methode: string | null }>(
        `SELECT code_forme, relation, codes_voie, code_methode FROM forme_edqm_mapping WHERE forme = $1 AND source = 'manual'`, [k])
      if (m[0]) {
        surcharge.forme = m[0].code_forme ? { code: m[0].code_forme, relation: (m[0].relation as EdqmRelation | null) } : null
        surcharge.voies = m[0].codes_voie
        surcharge.methode = m[0].code_methode
      }
    }
    // traductions arabes relues : on regarde les codes qui seront affichés
    const calcule = terminologieDeFiche(forme, null, null, surcharge)
    const codes = [calcule.forme?.code, calcule.methode?.code, ...calcule.voies.map(v => v.code)].filter((c): c is string => Boolean(c))
    if (codes.length) {
      const r = await query<{ code: string; label_ar: string | null }>(
        `SELECT code, label_ar FROM edqm_termes WHERE code = ANY($1) AND ar_statut = 'relu' AND label_ar IS NOT NULL`, [codes])
      if (r.length) surcharge.arRelus = Object.fromEntries(r.map(x => [x.code, x.label_ar!]))
    }
    return surcharge
  } catch {
    return {}
  }
}

export function getCachedTerminologieFiche(
  forme: string | null | undefined,
  dosage: string | null | undefined,
  dci: string | null | undefined,
): Promise<TerminologieFiche> {
  // La clé suit la forme normalisée : des dizaines d'écritures différentes d'une même forme partagent une entrée.
  const cle = cleForme(forme)
  return unstable_cache(
    async () => terminologieDeFiche(forme, dosage, dci, await surchargeDeLaBase(forme)),
    ['terminologie-fiche-v1', cle, (dosage ?? '').trim(), (dci ?? '').trim().toUpperCase(), normaliserForme(forme).id],
    { revalidate: 86_400, tags: [NOMENCLATURE_TAG] },
  )()
}
