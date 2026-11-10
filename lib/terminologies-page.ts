/**
 * DwaDZ — Page « Terminologies » : les listes EDQM et UCUM avec, pour chaque terme, le nombre de médicaments liés.
 *
 * Compteurs : lus dans medicament_terminologie quand la migration est appliquée et la table remplie
 * (sql/39_terminologies.sql, scripts/sync_terminologies.mts) ; sinon recalculés depuis la nomenclature par
 * lib/guide-core.ts, pour que la page fonctionne avant la migration. Traductions arabes : celles de la base
 * (edqm_termes, où une ligne relue prime), sinon celles du dépôt.
 */

import { unstable_cache } from 'next/cache'
import { query } from './db'
import { edqmListes } from './edqm'
import { EDQM_SOURCE } from './edqm-data'
import { getGuideIndex } from './guide'
import { NOMENCLATURE_TAG } from './medicament-cache'
import { UCUM_NOMS, UNITES_INFO } from './ucum'

export type ArStatut = 'absent' | 'brouillon' | 'relu'
export type LigneTermino = { code: string; fr: string | null; en: string; ar: string | null; ar_statut: ArStatut; n: number; symbole?: string }
export type ListesTerminologies = {
  formes: LigneTermino[]
  voies: LigneTermino[]
  methodes: LigneTermino[]
  ucum: LigneTermino[]
  /** d'où viennent les compteurs de médicaments */
  compteurs: 'base' | 'calcul'
  source_edqm: string
}

type Comptes = { formes: Map<string, number>; voies: Map<string, number>; methodes: Map<string, number>; ucum: Map<string, number> }

async function comptesDepuisLaBase(): Promise<Comptes | null> {
  const t = await query<{ n: number }>(`SELECT CASE WHEN to_regclass('public.medicament_terminologie') IS NULL THEN -1 ELSE (SELECT COUNT(*)::int FROM medicament_terminologie) END AS n`)
  if (!t[0] || t[0].n <= 0) return null
  const lire = async (sql: string) => new Map((await query<{ code: string; n: number }>(sql)).map(r => [r.code, r.n]))
  const [formes, voies, methodes, ucum] = await Promise.all([
    lire(`SELECT edqm_forme AS code, COUNT(*)::int AS n FROM medicament_terminologie WHERE edqm_forme IS NOT NULL GROUP BY 1`),
    lire(`SELECT v AS code, COUNT(*)::int AS n FROM medicament_terminologie, unnest(edqm_voies) v GROUP BY 1`),
    lire(`SELECT edqm_methode AS code, COUNT(*)::int AS n FROM medicament_terminologie WHERE edqm_methode IS NOT NULL GROUP BY 1`),
    lire(`SELECT u AS code, COUNT(*)::int AS n FROM medicament_terminologie, unnest(ucum_unites) u GROUP BY 1`),
  ])
  return { formes, voies, methodes, ucum }
}

async function comptesCalcules(): Promise<Comptes> {
  const c: Comptes = { formes: new Map(), voies: new Map(), methodes: new Map(), ucum: new Map() }
  const inc = (m: Map<string, number>, k: string | null | undefined) => { if (k) m.set(k, (m.get(k) ?? 0) + 1) }
  for (const p of (await getGuideIndex()).presentations) {
    inc(c.formes, p.norm.forme.edqm?.code)
    for (const v of p.norm.forme.voies_edqm) inc(c.voies, v)
    inc(c.methodes, p.norm.forme.methode_edqm)
    const d = p.norm.dosage
    for (const u of new Set([...d.quantites, ...(d.denominateur ? [d.denominateur] : [])].flatMap(q => (q.ucum ? [q.ucum] : [])))) inc(c.ucum, u)
  }
  return c
}

async function arabeDeLaBase(): Promise<Map<string, { ar: string | null; statut: ArStatut }>> {
  try {
    const ok = await query<{ ok: boolean }>(`SELECT to_regclass('public.edqm_termes') IS NOT NULL AS ok`)
    if (!ok[0]?.ok) return new Map()
    const r = await query<{ code: string; label_ar: string | null; ar_statut: ArStatut }>(`SELECT code, label_ar, ar_statut FROM edqm_termes`)
    return new Map(r.map(x => [x.code, { ar: x.label_ar, statut: x.ar_statut }]))
  } catch {
    return new Map() // base indisponible : traductions du dépôt
  }
}

async function construire(): Promise<ListesTerminologies> {
  let base: Comptes | null = null
  try { base = await comptesDepuisLaBase() } catch { base = null }
  const comptes = base ?? await comptesCalcules()
  const arBase = await arabeDeLaBase()
  const edqm = edqmListes()
  const ligne = (classe: 'forme' | 'voie' | 'methode', m: Map<string, number>): LigneTermino[] =>
    edqm[classe].map(t => {
      const b = arBase.get(t.code)
      const ar = b ? b.ar : t.ar
      const ar_statut: ArStatut = !ar ? 'absent' : b ? b.statut : t.ar_relu ? 'relu' : 'brouillon'
      return { code: t.code, fr: t.fr, en: t.en, ar, ar_statut, n: m.get(t.code) ?? 0 }
    })
  const vus = new Set<string>()
  const ucum: LigneTermino[] = []
  for (const u of Object.values(UNITES_INFO)) {
    if (!u.ucum || vus.has(u.ucum)) continue
    vus.add(u.ucum)
    ucum.push({ code: u.ucum, fr: UCUM_NOMS[u.ucum]?.fr ?? u.symbole, en: UCUM_NOMS[u.ucum]?.en ?? u.ucum, ar: u.ar, ar_statut: 'brouillon', n: comptes.ucum.get(u.ucum) ?? 0, symbole: u.symbole })
  }
  const trier = (l: LigneTermino[]) => l.sort((a, b) => b.n - a.n || a.code.localeCompare(b.code))
  return {
    formes: trier(ligne('forme', comptes.formes)), voies: trier(ligne('voie', comptes.voies)), methodes: trier(ligne('methode', comptes.methodes)),
    ucum: trier(ucum), compteurs: base ? 'base' : 'calcul', source_edqm: EDQM_SOURCE,
  }
}

export const getListesTerminologies = unstable_cache(construire, ['terminologies-listes-v1'], { revalidate: 86_400, tags: [NOMENCLATURE_TAG] })
