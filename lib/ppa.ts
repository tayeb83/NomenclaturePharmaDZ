/**
 * DwaDZ — PPA (Prix Public Algérien), saisi à la main depuis l'admin
 * (voir sql/20_medicament_ppa.sql). Sans valeur, la fiche affiche
 * « Prix non disponible » : aucun prix n'est jamais déduit ni estimé.
 */

import { unstable_cache } from 'next/cache'
import { query, queryOne } from './db'

export const PPA_TAG = 'ppa'

export type PpaAdminRow = {
  id: number
  n_enreg: string
  code: string
  nom_marque: string
  dci: string
  forme: string | null
  dosage: string | null
  conditionnement: string | null
  labo: string | null
  ppa_dzd: string | null
}

const codeKey = (code: string | null | undefined) => (code ?? '').trim()

let tableExists: boolean | undefined
async function hasPpaTable(): Promise<boolean> {
  if (tableExists) return true
  const row = await queryOne<{ exists: boolean }>(
    `SELECT to_regclass('public.medicament_ppa') IS NOT NULL AS "exists"`
  )
  tableExists = row?.exists ?? false
  return tableExists
}

/** PPA en DA, ou null si non renseigné (table absente comprise). */
export function getPpa(nEnreg: string | null, code: string | null): Promise<number | null> {
  if (!nEnreg) return Promise.resolve(null)
  const key = codeKey(code)
  return unstable_cache(
    async () => {
      if (!(await hasPpaTable())) return null
      const row = await queryOne<{ ppa_dzd: string }>(
        `SELECT ppa_dzd FROM medicament_ppa WHERE n_enreg = $1 AND code = $2`,
        [nEnreg, key]
      )
      return row ? Number(row.ppa_dzd) : null
    },
    ['ppa', nEnreg, key],
    { revalidate: 86_400, tags: [PPA_TAG] }
  )()
}

export function formatPpa(ppa: number, lang: 'fr' | 'ar'): string {
  const n = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(ppa)
    .replace(/[  ]/g, ' ')
  return lang === 'ar' ? `${n} دج` : `${n} DA`
}

// ─── Administration ───────────────────────────────────────────

export async function listPpaAdmin(
  q: string,
  onlyMissing: boolean
): Promise<{ rows: PpaAdminRow[]; tableMissing: boolean }> {
  const tableMissing = !(await hasPpaTable())
  const term = q.trim()
  const params: any[] = []
  const where: string[] = []
  if (term) {
    params.push(`%${term}%`)
    where.push(`(e.nom_marque ILIKE $1 OR e.dci ILIKE $1 OR e.n_enreg ILIKE $1 OR e.labo ILIKE $1)`)
  }
  if (onlyMissing && !tableMissing) where.push('p.ppa_dzd IS NULL')
  const rows = await query<PpaAdminRow>(
    `SELECT e.id, e.n_enreg, COALESCE(e.code, '') AS code, e.nom_marque, e.dci, e.forme, e.dosage,
            e.conditionnement, e.labo, ${tableMissing ? 'NULL' : 'p.ppa_dzd'} AS ppa_dzd
       FROM enregistrements e
       ${tableMissing ? '' : `LEFT JOIN medicament_ppa p ON p.n_enreg = e.n_enreg AND p.code = COALESCE(e.code, '')`}
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY e.nom_marque, e.dosage
      LIMIT 100`,
    params
  )
  return { rows, tableMissing }
}

/** ppa = null → supprime le prix (la fiche repasse à « non disponible »). */
export async function setPpa(nEnreg: string, code: string, ppa: number | null): Promise<void> {
  const key = codeKey(code)
  if (ppa === null) {
    await query(`DELETE FROM medicament_ppa WHERE n_enreg = $1 AND code = $2`, [nEnreg, key])
    return
  }
  await query(
    `INSERT INTO medicament_ppa (n_enreg, code, ppa_dzd, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (n_enreg, code) DO UPDATE SET ppa_dzd = EXCLUDED.ppa_dzd, updated_at = NOW()`,
    [nEnreg, key, ppa]
  )
}
