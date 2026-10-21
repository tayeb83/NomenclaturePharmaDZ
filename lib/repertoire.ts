/**
 * DwaDZ — Répertoire alphabétique des médicaments (/medicaments/lettre/…).
 *
 * Constantes partagées entre la page, le sitemap et la requête SQL. Aucune
 * dépendance serveur : importable depuis n'importe où.
 */

/** Slugs des index : a…z, plus « 0-9 » pour tout nom ne commençant pas par une lettre. */
export const LETTRE_SLUGS = [
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  '0-9',
] as const

/** Fiches listées par page d'index. Assez pour couvrir une lettre en quelques pages. */
export const REPERTOIRE_PAGE_SIZE = 150

export function isLettreSlug(value: string): boolean {
  return (LETTRE_SLUGS as readonly string[]).includes(value)
}

export function lettreLabel(slug: string): string {
  return slug === '0-9' ? '0-9' : slug.toUpperCase()
}

/** Chemin canonique d'une page d'index ; la page 1 n'a pas de suffixe. */
export function lettrePath(slug: string, page = 1): string {
  const base = `/medicaments/lettre/${slug}`
  return page > 1 ? `${base}/${page}` : base
}

/**
 * Slug de la lettre d'index d'un nom commercial — même règle que la requête SQL
 * (initiale sans accent ; hors A–Z → « 0-9 »). Null si le nom est vide.
 */
export function lettreForNom(nom: string | null | undefined): string | null {
  const first = (nom ?? '').trim().charAt(0)
  if (!first) return null
  const base = first.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return /^[a-z]$/.test(base) ? base : '0-9'
}
