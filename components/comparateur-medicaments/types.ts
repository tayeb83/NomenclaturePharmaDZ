export type Source = 'enregistrement' | 'retrait' | 'non_renouvele'

/** Ce qu'un côté du comparateur peut être : une marque de la nomenclature ou une substance. */
export type Selection =
  | { type: 'marque'; source: Source; id: number; nom_marque: string; dci: string; forme: string | null; dosage: string | null; labo: string | null }
  | { type: 'substance'; dci: string; /** nombre de médicaments de la nomenclature ; null si on ne l'a pas compté */ n: number | null; classe: boolean }

/** Référence envoyée aux API : « enregistrement:12 » ou « dci:AMIODARONE ». */
export const refDe = (s: Selection): string => (s.type === 'marque' ? `${s.source}:${s.id}` : `dci:${s.dci}`)

export const memeSelection = (a: Selection, b: Selection): boolean => refDe(a) === refDe(b)

/** Résultat de /api/search : une marque de la nomenclature. */
export type ResultatMarque = {
  source: Source
  id: number
  nom_marque: string
  dci: string
  forme: string | null
  dosage: string | null
  labo: string | null
}

export const depuisMarque = (r: ResultatMarque): Selection => ({
  type: 'marque', source: r.source, id: r.id, nom_marque: r.nom_marque, dci: r.dci, forme: r.forme, dosage: r.dosage, labo: r.labo,
})
