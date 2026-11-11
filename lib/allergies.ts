/**
 * DwaDZ — allergies HDO : accès aux données pour les pages (fiche, page d'une allergie).
 * Le rapprochement lui-même est dans lib/allergies-core.ts (pur, testé) ; ici seulement la lecture de la
 * nomenclature pour la page d'une allergie. Sans la table dci_atc_mapping, les classes ne sont pas rattachées
 * (les allergies de substance le sont toujours, elles se jugent sur le nom).
 */

import { unstable_cache } from 'next/cache'
import { query, queryOne } from './db'
import { dcisConcernees, type AllergieHdo } from './allergies-core.ts'

export * from './allergies-core.ts'

export const ALLERGIES_TAG = 'allergies-hdo'

type LigneDci = { dci: string; code_atc: string | null; n: number }

async function lignesDci(): Promise<LigneDci[]> {
  const t = await queryOne<{ ok: boolean }>(`SELECT to_regclass('public.dci_atc_mapping') IS NOT NULL AS ok`).catch(() => null)
  const rows = await query<{ dci: string; code_atc: string | null; n: number | string }>(
    t?.ok
      ? `SELECT e.dci, m.code_atc, COUNT(*)::INT AS n
           FROM enregistrements e LEFT JOIN dci_atc_mapping m ON m.dci = UPPER(TRIM(e.dci))
          WHERE e.dci IS NOT NULL AND e.dci <> ''
          GROUP BY e.dci, m.code_atc`
      : `SELECT dci, NULL::TEXT AS code_atc, COUNT(*)::INT AS n FROM enregistrements WHERE dci IS NOT NULL AND dci <> '' GROUP BY dci`
  )
  return rows.map(r => ({ dci: r.dci, code_atc: r.code_atc, n: Number(r.n) }))
}

/** DCI de la nomenclature concernées par une allergie (substance ou classe déclarée), avec le nombre de présentations. */
export function getDcisAllergie(a: AllergieHdo): Promise<{ dci: string; n: number; via: string }[]> {
  if (a.perimetre !== 'fiche') return Promise.resolve([])
  return unstable_cache(
    async () => dcisConcernees(a, await lignesDci()),
    ['allergies-hdo-dcis', 'v1', a.code],
    { revalidate: 86_400, tags: [ALLERGIES_TAG] }
  )()
}
