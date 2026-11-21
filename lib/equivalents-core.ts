/**
 * Série d'articles « Quel est l'équivalent algérien de… ? » : partie pure (sans base de données).
 *
 * Les articles ne citent aucune marque algérienne en dur : la liste des présentations est lue
 * à l'affichage dans la nomenclature, par code ATC (bloc `equivalents`, voir lib/equivalents.ts
 * et components/articles/EquivalentsBlock.tsx). Une marque retirée disparaît donc de l'article
 * sans retouche, et une nouvelle y apparaît.
 *   npm run test:articles
 */

export type EquivalentLigne = {
  id: number
  nom_marque: string
  dci: string | null
  forme: string | null
  dosage: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  /** 'F' : fabriqué en Algérie ; toute autre valeur : importé */
  statut: string | null
  code_atc: string
}

export type EquivalentsResume = {
  presentations: number
  marques: number
  laboratoires: number
  fabriquees: number
  importees: number
  generiques: number
}

/** Code ATC de 5e niveau (substance) : une lettre, deux chiffres, deux lettres, deux chiffres. */
export const ATC_SUBSTANCE = /^[A-Z]\d{2}[A-Z]{2}\d{2}$/

export function estFabriqueeEnAlgerie(l: Pick<EquivalentLigne, 'statut'>): boolean {
  return (l.statut ?? '').trim().toUpperCase() === 'F'
}

export function estGenerique(l: Pick<EquivalentLigne, 'type_prod'>): boolean {
  return ['GE', 'GÉ'].includes((l.type_prod ?? '').trim().toUpperCase())
}

export function resumeEquivalents(lignes: EquivalentLigne[]): EquivalentsResume {
  const cle = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
  const marques = new Set(lignes.map(l => cle(l.nom_marque)).filter(Boolean))
  const labos = new Set(lignes.map(l => cle(l.labo)).filter(Boolean))
  const fabriquees = lignes.filter(estFabriqueeEnAlgerie).length
  return {
    presentations: lignes.length,
    marques: marques.size,
    laboratoires: labos.size,
    fabriquees,
    importees: lignes.length - fabriquees,
    generiques: lignes.filter(estGenerique).length,
  }
}

/** Recherche du site sur une substance (liste de toutes ses présentations). */
export function lienRechercheDci(dci: string): string {
  return `/recherche?q=${encodeURIComponent(dci)}&mode=dci`
}
