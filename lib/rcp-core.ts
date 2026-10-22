/**
 * DwaDZ — RCP publiés sur le portail de l'ANPP, rattachés aux fiches
 * (voir sql/26_rcp_anpp.sql). Sans dépendance serveur : testable seul.
 *
 * DwaDZ ne copie aucun RCP. On ne garde que l'adresse du PDF sur
 * rcp.anpp.dz, et on la vérifie avant de l'afficher.
 */

export const RCP_PORTAL_URL = 'https://rcp.anpp.dz/'
const RCP_HOST = 'rcp.anpp.dz'

export type RcpLink = {
  rcp_id: string
  nom_commercial: string
  pdf_url: string
  laboratoire_anpp: string | null
  version_texte: string | null
  statut: 'auto' | 'confirme'
  dosage: string | null
}

/** Seules les adresses https du portail officiel deviennent des liens. */
export function isOfficialRcpUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname === RCP_HOST
  } catch {
    return false
  }
}

/**
 * RCP à afficher pour une fiche : rattachements sûrs seulement (auto, ou validés à
 * la main), hors documents retirés. Les « probable » attendent une validation.
 * La clé est (n_enreg, code), comme medicament_ppa : elle survit aux ré-imports.
 */
export const RCP_FOR_FICHE_SQL = `
  SELECT d.rcp_id, d.nom_commercial, d.pdf_url, d.laboratoire_anpp, d.version_texte, f.statut, f.dosage
  FROM rcp_fiches f
  JOIN rcp_documents d USING (rcp_id)
  WHERE f.n_enreg = $1 AND f.code = $2
    AND f.statut IN ('auto', 'confirme')
    AND NOT d.retire
  ORDER BY (f.statut = 'confirme') DESC, d.nom_commercial, d.pdf_url
`

export type QueryFn = <T>(sql: string, params?: unknown[]) => Promise<T[]>

export async function fetchRcpForFiche(
  run: QueryFn,
  nEnreg: string | null,
  code: string | null,
): Promise<RcpLink[]> {
  if (!nEnreg) return []
  const rows = await run<RcpLink>(RCP_FOR_FICHE_SQL, [nEnreg, (code ?? '').trim()])
  return rows.filter(r => isOfficialRcpUrl(r.pdf_url))
}
