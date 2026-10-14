/**
 * DwaDZ — « familles de marque » : toutes les présentations dont le nom
 * commercial commence par le même mot (TRIFED, TRIFED PLUS…).
 *
 * C'est le niveau auquel les internautes cherchent (« trifed », « neocalm »).
 * La clé de famille est calculée de la même façon en SQL (queries.ts) et ici :
 * minuscules, premier mot, tout ce qui n'est pas [a-z0-9] remplacé par « - ».
 * Ne pas y ajouter de retrait des accents sans modifier aussi la requête SQL.
 */

export function marqueSlug(nomMarque: string): string {
  const first = nomMarque.trim().split(/\s+/)[0] ?? ''
  return first.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** Nombre minimal de présentations pour qu'une famille mérite sa propre page indexée. */
export const MIN_FAMILY_SIZE = 2
