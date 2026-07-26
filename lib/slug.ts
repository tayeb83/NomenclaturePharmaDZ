/**
 * Slugify sans dépendance serveur (pg, etc.) — safe à importer depuis des
 * composants client (contrairement à lib/garde.ts qui touche la DB).
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
