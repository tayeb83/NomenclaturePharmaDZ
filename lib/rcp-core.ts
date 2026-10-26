/**
 * DwaDZ — RCP publiés sur le portail de l'ANPP, rattachés aux fiches
 * (voir sql/26_rcp_anpp.sql et sql/27_rcp_faits.sql). Sans dépendance
 * serveur : testable seul.
 *
 * DwaDZ ne copie aucun RCP. On garde l'adresse du PDF sur rcp.anpp.dz (vérifiée
 * avant affichage) et, une fois relus, des faits courts avec leur rubrique et
 * leur page.
 */

export const RCP_PORTAL_URL = 'https://rcp.anpp.dz/'
const RCP_HOST = 'rcp.anpp.dz'

export type Gravite = 'contre_indiquee' | 'deconseillee' | 'precaution' | 'a_prendre_en_compte' | 'non_precisee'
export type Population = 'adulte' | 'enfant' | 'personne_agee' | 'non_precisee'

export type RcpFait = {
  id: number
  type: 'dose' | 'interaction'
  section: string
  page: number
  libelle: string
  gravite: Gravite | null
  cible_type: 'dci' | 'classe' | null
  cible: string | null
  population: Population | null
}

export type RcpLink = {
  rcp_id: string
  nom_commercial: string
  pdf_url: string
  laboratoire_anpp: string | null
  version_texte: string | null
  statut: 'auto' | 'confirme'
  dosage: string | null
  /** Faits relus et publiés ; vide si l'interrupteur « faits » est coupé ou le document masqué. */
  faits: RcpFait[]
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

/** Lien vers une page précise du PDF (les lecteurs PDF des navigateurs comprennent #page=). */
export function pdfPageUrl(pdfUrl: string, page: number): string {
  return Number.isInteger(page) && page > 0 ? `${pdfUrl}#page=${page}` : pdfUrl
}

const GRAVITE_RANK: Record<Gravite, number> = {
  contre_indiquee: 0, deconseillee: 1, precaution: 2, a_prendre_en_compte: 3, non_precisee: 4,
}
const POPULATION_RANK: Record<Population, number> = { adulte: 0, enfant: 1, personne_agee: 2, non_precisee: 3 }

export function sortFaits(faits: RcpFait[]): RcpFait[] {
  return [...faits].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dose' ? -1 : 1
    if (a.type === 'dose') {
      const pa = POPULATION_RANK[a.population ?? 'non_precisee'], pb = POPULATION_RANK[b.population ?? 'non_precisee']
      return pa - pb || a.libelle.localeCompare(b.libelle, 'fr', { numeric: true })
    }
    const ga = GRAVITE_RANK[a.gravite ?? 'non_precisee'], gb = GRAVITE_RANK[b.gravite ?? 'non_precisee']
    return ga - gb || a.libelle.localeCompare(b.libelle, 'fr')
  })
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

/** Même requête avec le masquage des faits par document (sql/27). */
export const RCP_FOR_FICHE_SQL_V2 = RCP_FOR_FICHE_SQL.replace(
  'd.version_texte, f.statut, f.dosage',
  'd.version_texte, f.statut, f.dosage, d.faits_masques',
)

export const RCP_FAITS_SQL = `
  SELECT id, rcp_id, type, section, page, libelle, gravite, cible_type, cible, population
  FROM rcp_faits
  WHERE rcp_id = ANY($1::uuid[]) AND status = 'publie'
`

export type QueryFn = <T>(sql: string, params?: unknown[]) => Promise<T[]>

export type Reglages = { liens: boolean; faits: boolean }

/** Interrupteurs d'urgence (sql/27). Table absente : liens actifs comme avant, faits éteints. */
export async function fetchReglages(run: QueryFn): Promise<Reglages & { tablesFaits: boolean }> {
  const [t] = await run<{ ok: boolean }>(
    `SELECT to_regclass('public.rcp_reglages') IS NOT NULL AND to_regclass('public.rcp_faits') IS NOT NULL AS ok`
  )
  if (!t?.ok) return { liens: true, faits: false, tablesFaits: false }
  const rows = await run<{ cle: string; actif: boolean }>(`SELECT cle, actif FROM rcp_reglages`)
  const get = (k: string) => rows.find(r => r.cle === k)?.actif ?? true
  return { liens: get('liens'), faits: get('faits'), tablesFaits: true }
}

export async function fetchRcpForFiche(
  run: QueryFn,
  nEnreg: string | null,
  code: string | null,
): Promise<RcpLink[]> {
  if (!nEnreg) return []
  const reglages = await fetchReglages(run)
  if (!reglages.liens) return []

  const rows = await run<Omit<RcpLink, 'faits'> & { faits_masques?: boolean }>(
    reglages.tablesFaits ? RCP_FOR_FICHE_SQL_V2 : RCP_FOR_FICHE_SQL,
    [nEnreg, (code ?? '').trim()],
  )
  const docs = rows.filter(r => isOfficialRcpUrl(r.pdf_url))

  const byRcp = new Map<string, RcpFait[]>()
  const showFaits = reglages.faits ? docs.filter(d => !d.faits_masques).map(d => d.rcp_id) : []
  if (showFaits.length) {
    const faits = await run<RcpFait & { rcp_id: string }>(RCP_FAITS_SQL, [showFaits])
    for (const f of faits) {
      const list = byRcp.get(f.rcp_id) ?? []
      list.push({ ...f, page: Number(f.page) })
      byRcp.set(f.rcp_id, list)
    }
  }
  return docs.map(({ faits_masques: _m, ...d }) => ({ ...d, faits: sortFaits(byRcp.get(d.rcp_id) ?? []) }))
}
