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
export type FaitType = 'dose' | 'interaction' | 'contre_indication' | 'grossesse'
export type Population = 'adulte' | 'enfant' | 'personne_agee' | 'non_precisee'

export type RcpFait = {
  id: number
  type: FaitType
  section: string
  page: number
  libelle: string
  gravite: Gravite | null
  cible_type: 'dci' | 'classe' | null
  cible: string | null
  population: Population | null
  /** Interactions : DCI de la nomenclature correspondant à la cible, si elle existe (lien vers sa page). */
  dci_lien?: string | null
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

const TYPE_RANK: Record<FaitType, number> = { dose: 0, contre_indication: 1, grossesse: 2, interaction: 3 }

export function sortFaits(faits: RcpFait[]): RcpFait[] {
  return [...faits].sort((a, b) => {
    if (a.type !== b.type) return TYPE_RANK[a.type] - TYPE_RANK[b.type]
    if (a.type === 'dose') {
      const pa = POPULATION_RANK[a.population ?? 'non_precisee'], pb = POPULATION_RANK[b.population ?? 'non_precisee']
      return pa - pb || a.libelle.localeCompare(b.libelle, 'fr', { numeric: true })
    }
    if (a.type === 'contre_indication') return a.id - b.id // ordre du RCP
    if (a.type === 'grossesse') return a.libelle === b.libelle ? 0 : a.libelle === 'Grossesse' ? -1 : 1
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


/**
 * Pour chaque interaction citée, retrouve la DCI de la nomenclature qui porte ce nom
 * (comparaison en majuscules). Une cible « classe » garde son lien ATC. La DCI est
 * rendue telle qu'écrite dans la base : c'est elle qui fait l'adresse /dci/….
 */
export async function resolveDciLiens(run: QueryFn, rcps: RcpLink[]): Promise<RcpLink[]> {
  const cand = (f: RcpFait) => (f.cible_type === 'classe' ? '' : (f.cible || f.libelle).trim().toUpperCase())
  const noms = new Set<string>()
  for (const r of rcps) for (const f of r.faits ?? []) if (f.type === 'interaction') { const c = cand(f); if (c) noms.add(c) }
  if (!noms.size) return rcps
  // Un échec de ce rattachement ne doit pas faire disparaître le RCP : sans lien, les interactions restent lisibles.
  const rows = await run<{ dci: string }>(
    `SELECT DISTINCT dci FROM enregistrements WHERE UPPER(btrim(dci)) = ANY($1::text[])`,
    [[...noms]],
  ).catch(() => [] as { dci: string }[])
  const parNom = new Map(rows.map(r => [r.dci.trim().toUpperCase(), r.dci.trim()]))
  return rcps.map(r => ({
    ...r,
    faits: (r.faits ?? []).map(f => (f.type === 'interaction' ? { ...f, dci_lien: parNom.get(cand(f)) ?? null } : f)),
  }))
}

export type InteractionEntrante = {
  id: number
  rcp_id: string
  section: string
  page: number
  gravite: Gravite | null
  /** Médicament dont le RCP cite la substance. */
  nom_commercial: string
  laboratoire_anpp: string | null
  pdf_url: string
  /** Substance de ce médicament (DCI de la nomenclature, majuscules). */
  source_dci: string
}

/**
 * Interactions publiées dans les RCP d'AUTRES substances qui citent celle-ci, même si
 * elle n'a elle-même aucun RCP : l'association se lit des deux côtés.
 */
export const RCP_INTERACTIONS_VERS_SQL = `
  SELECT f.id, f.rcp_id, f.section, f.page, f.gravite, d.nom_commercial, d.laboratoire_anpp, d.pdf_url, rd.dci AS source_dci
  FROM rcp_faits f
  JOIN rcp_documents d USING (rcp_id)
  JOIN rcp_dci rd USING (rcp_id)
  WHERE f.type = 'interaction' AND f.status = 'publie'
    AND NOT d.retire AND NOT d.faits_masques
    AND rd.dci <> $1
    AND ((f.cible_type = 'dci' AND UPPER(btrim(f.cible)) = $1) OR (f.cible_type IS NULL AND UPPER(btrim(f.libelle)) = $1))
  ORDER BY rd.dci, d.nom_commercial, f.page
  LIMIT 200
`

export async function fetchInteractionsVers(run: QueryFn, dci: string): Promise<InteractionEntrante[]> {
  const reglages = await fetchReglages(run)
  if (!reglages.liens || !reglages.faits || !reglages.tablesFaits) return []
  const rows = await run<InteractionEntrante>(RCP_INTERACTIONS_VERS_SQL, [dci.trim().toUpperCase()])
  return rows.filter(r => isOfficialRcpUrl(r.pdf_url)).map(r => ({ ...r, page: Number(r.page) }))
}
