/**
 * DwaDZ — Facettes de la recherche (voie, forme, dosage, origine). Sans dépendance serveur : testable seul.
 *
 * La recherche renvoie des lignes de la nomenclature telles qu'écrites (« COMP. PELL. », « 0,5G »). Chaque ligne est
 * ramenée à ses valeurs normalisées (lib/guide-core.ts) : deux écritures d'une même forme ne font qu'une facette.
 *
 * Règles (mêmes que la recherche guidée) :
 *  1. le compteur d'une facette tient compte de toutes les AUTRES facettes choisies, jamais de la sienne : on voit ce
 *     que donnerait un autre choix du même groupe ;
 *  2. un choix qui ne laisse plus aucune ligne avec ceux déjà gardés (la requête a changé) est retiré et signalé ;
 *     les groupes sont examinés dans l'ordre voie, forme, dosage, origine : le premier choix l'emporte ;
 *  3. les identifiants sont ceux de la recherche guidée : l'état tient dans l'URL.
 */

import { VOIES, aligneSurDci, normaliserDci, normaliserDosage, normaliserForme, voieParId } from './guide-core.ts'

export const FACETTES = ['voie', 'forme', 'dosage', 'origine'] as const
export type Facette = (typeof FACETTES)[number]
export type FacetteSel = Partial<Record<Facette, string>>

export type OptionFacette = { id: string; libelle: string; libelle_ar: string | null; n: number }
export type Facettes = Record<Facette, OptionFacette[]>

/** Les seuls champs lus : une SearchResult de lib/db-types en a bien plus. */
export type LigneRecherche = { dci?: string | null; forme?: string | null; dosage?: string | null; statut?: string | null }

type Axes = Record<Facette, { id: string; fr: string; ar: string | null }>

const ORIGINES: Record<string, { fr: string; ar: string }> = {
  f: { fr: 'Fabriqué en Algérie', ar: 'مصنع في الجزائر' },
  i: { fr: 'Importé', ar: 'مستورد' },
  'non-precise': { fr: 'Origine non précisée', ar: 'المنشأ غير محدد' },
}
const ORDRE_ORIGINES = ['f', 'i', 'non-precise']
const RANG_VOIE = new Map<string, number>(VOIES.map((v, i) => [v.id, i]))

// Les mêmes écritures reviennent sans cesse d'une recherche à l'autre : on garde le calcul.
const CACHE = new Map<string, Axes>()
const CACHE_MAX = 6000

export function axesDeLigne(l: LigneRecherche): Axes {
  const cle = `${l.forme ?? ''}\u0001${l.dosage ?? ''}\u0001${l.dci ?? ''}\u0001${(l.statut ?? '').slice(0, 1).toLowerCase()}`
  const connu = CACHE.get(cle)
  if (connu) return connu
  const forme = normaliserForme(l.forme)
  const dci = normaliserDci(l.dci)
  // « 125 mg + 1 g » et « 1 g + 125 mg » : même dosage quand l'ordre des substances de la DCI diffère
  const dosage = aligneSurDci(normaliserDosage(l.dosage, Math.max(1, dci.substances.length)), dci)
  const voie = voieParId(forme.voie)!
  const o = (l.statut ?? '').trim().toLowerCase().slice(0, 1)
  const origine = o === 'f' || o === 'i' ? o : 'non-precise'
  const axes: Axes = {
    voie: { id: voie.id, fr: voie.fr, ar: voie.ar },
    forme: { id: forme.id, fr: forme.fr, ar: forme.ar },
    dosage: { id: dosage.id, fr: dosage.libelle, ar: dosage.libelle_ar },
    origine: { id: origine, fr: ORIGINES[origine].fr, ar: ORIGINES[origine].ar },
  }
  if (CACHE.size >= CACHE_MAX) CACHE.clear()
  CACHE.set(cle, axes)
  return axes
}

export type ResultatFacettes<T> = {
  /** les lignes qui respectent tous les choix */
  rows: T[]
  facettes: Facettes
  /** choix réellement appliqués (ceux qui n'ont plus de sens ont été retirés) */
  selection: FacetteSel
  ignores: Facette[]
}

/** @param limiteParFacette nombre maximal d'options renvoyées par groupe (le choix en cours est toujours inclus) */
export function appliquerFacettes<T extends LigneRecherche>(rows: T[], demande: FacetteSel = {}, limiteParFacette = 40): ResultatFacettes<T> {
  const axes = rows.map(axesDeLigne)
  const selection: FacetteSel = {}
  const ignores: Facette[] = []

  const ok = (a: Axes, sel: FacetteSel, sauf?: Facette) => FACETTES.every(f => f === sauf || !sel[f] || a[f].id === sel[f])

  // règle 2, du premier groupe au dernier : un choix est gardé s'il laisse au moins une ligne avec ceux déjà gardés
  for (const f of FACETTES) {
    const v = demande[f]
    if (!v) continue
    const essai = { ...selection, [f]: v }
    if (axes.some(a => ok(a, essai))) selection[f] = v
    else ignores.push(f)
  }

  const facettes = {} as Facettes
  for (const f of FACETTES) {
    const n = new Map<string, number>()
    const variantes = new Map<string, Map<string, { n: number; fr: string; ar: string | null }>>()
    axes.forEach(a => {
      if (!ok(a, selection, f)) return
      const x = a[f]
      n.set(x.id, (n.get(x.id) ?? 0) + 1)
      let v = variantes.get(x.id)
      if (!v) variantes.set(x.id, (v = new Map()))
      const e = v.get(x.fr)
      if (e) e.n++
      else v.set(x.fr, { n: 1, fr: x.fr, ar: x.ar })
    })
    let opts: OptionFacette[] = [...n].map(([id, k]) => {
      // plusieurs écritures pour un même identifiant (« 0,5 g » et « 500 mg ») : la plus fréquente
      const best = [...variantes.get(id)!.values()].sort((a, b) => b.n - a.n || a.fr.localeCompare(b.fr, 'fr'))[0]
      return { id, libelle: best.fr, libelle_ar: best.ar, n: k }
    })
    if (f === 'voie') opts.sort((a, b) => (RANG_VOIE.get(a.id) ?? 99) - (RANG_VOIE.get(b.id) ?? 99))
    else if (f === 'origine') opts.sort((a, b) => ORDRE_ORIGINES.indexOf(a.id) - ORDRE_ORIGINES.indexOf(b.id))
    else opts.sort((a, b) => b.n - a.n || a.libelle.localeCompare(b.libelle, 'fr', { numeric: true }))
    if (opts.length > limiteParFacette) {
      const choisi = selection[f]
      const tete = opts.slice(0, limiteParFacette)
      if (choisi && !tete.some(o => o.id === choisi)) tete[tete.length - 1] = opts.find(o => o.id === choisi)!
      opts = tete
    }
    facettes[f] = opts
  }

  return { rows: rows.filter((_, i) => ok(axes[i], selection)), facettes, selection, ignores }
}

/** Lit les paramètres d'URL (?voie=…&forme=…&dosage=…&origine=f|i). Les valeurs invalides sont ignorées. */
export function facettesDepuisParams(get: (nom: string) => string | null | undefined): FacetteSel {
  const sel: FacetteSel = {}
  for (const f of FACETTES) {
    const v = get(f)?.trim().toLowerCase()
    if (v && /^[a-z0-9-]{1,160}$/.test(v)) sel[f] = v
  }
  return sel
}
