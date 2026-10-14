/**
 * Regroupe les présentations d'une DCI par nom commercial.
 *
 * Les internautes cherchent « trifed » ou « neocalm », pas une référence
 * d'enregistrement : la page DCI doit donc présenter chaque marque comme un
 * bloc (titre, présentations, laboratoire), plutôt qu'une liste plate de
 * fiches quasi identiques.
 */

import { slugify } from './slug'

type Presentation = {
  id: number
  nom_marque: string
  forme?: string | null
  dosage?: string | null
  labo?: string | null
  pays?: string | null
  type_prod?: string | null
  statut?: string | null
}

export type MarqueGroup<T extends Presentation> = {
  /** Identifiant d'ancre stable (#marque-…). */
  anchor: string
  nom: string
  presentations: T[]
  /** Laboratoires distincts, dans l'ordre d'apparition. */
  labos: string[]
}

export function groupByMarque<T extends Presentation>(meds: T[]): MarqueGroup<T>[] {
  const groups = new Map<string, MarqueGroup<T>>()
  for (const m of meds) {
    const nom = m.nom_marque.replace(/\s+/g, ' ').trim()
    const key = nom.toLowerCase()
    let g = groups.get(key)
    if (!g) {
      g = { anchor: `marque-${slugify(nom) || groups.size + 1}`, nom, presentations: [], labos: [] }
      groups.set(key, g)
    }
    g.presentations.push(m)
    if (m.labo && !g.labos.includes(m.labo)) g.labos.push(m.labo)
  }
  const out = Array.from(groups.values())
  // Deux marques différentes peuvent produire le même slug : on désambiguïse.
  const seen = new Set<string>()
  for (const g of out) {
    let a = g.anchor
    for (let i = 2; seen.has(a); i++) a = `${g.anchor}-${i}`
    seen.add(a)
    g.anchor = a
  }
  return out.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}
