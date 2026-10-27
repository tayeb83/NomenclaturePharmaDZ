/** Mise en forme d'un PPA — module sans dépendance serveur, utilisable dans un composant client. */

export function formatPpa(ppa: number, lang: 'fr' | 'ar'): string {
  const n = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(ppa)
    .replace(/[  ]/g, ' ')
  return lang === 'ar' ? `${n} دج` : `${n} DA`
}
