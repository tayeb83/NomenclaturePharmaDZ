/**
 * Historique de navigation INTERNE au site (onglet courant), pour que « Retour »
 * ne fasse jamais quitter DwaDZ.
 *
 * `history.back()` renvoie au site précédent quand le visiteur arrive d'un moteur
 * de recherche, de Facebook ou d'un lien partagé : il perd alors sa place. On
 * garde donc nous-mêmes la pile des pages vues sur le site (sessionStorage) :
 *  - pile à au moins deux entrées : retour réel (position de défilement conservée) ;
 *  - sinon : page « parente » logique (fiche → recherche, commune → wilaya…).
 *
 * Aucun appel serveur, aucune donnée personnelle : la pile ne quitte pas l'onglet.
 */

const KEY = 'dwa:nav'
const MAX = 40

function read(): string[] {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(stack: string[]) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-MAX)))
  } catch {
    // stockage indisponible (navigation privée) : on retombe sur la page parente
  }
}

/** À appeler à chaque changement d'URL : empile, ou dépile si c'est un retour. */
export function recordVisit(url: string) {
  const stack = read()
  const top = stack[stack.length - 1]
  if (top === url) return
  if (stack.length >= 2 && stack[stack.length - 2] === url) stack.pop() // retour en arrière
  else stack.push(url)
  write(stack)
}

/** Nombre de pages internes derrière la page courante. */
export function internalDepth(): number {
  return Math.max(read().length - 1, 0)
}

/** Page vers laquelle « Retour » ramènera : l'entrée précédente de la pile, sinon la page parente. */
export function backTarget(pathname: string, fallback?: string): string {
  const stack = read()
  return stack.length >= 2 ? stack[stack.length - 2] : fallback ?? parentOf(pathname)
}

const norm = (p: string) => (p.startsWith('/ar/') ? p.slice(3) : p === '/ar' ? '/' : p)

/** Page parente logique, quand l'historique ne suffit pas (arrivée directe sur la page). */
export function parentOf(pathname: string): string {
  const p = norm(pathname).replace(/\/+$/, '') || '/'
  if (p === '/') return '/'
  if (p.startsWith('/medicament/') || p.startsWith('/dci/') || p.startsWith('/marque/')) return '/recherche'
  if (p.startsWith('/laboratoire/')) return '/laboratoires'
  if (p.startsWith('/pharmacie/')) return '/pharmacies'
  if (p.startsWith('/training/')) return '/training'
  const parts = p.split('/').filter(Boolean)
  parts.pop()
  return parts.length ? `/${parts.join('/')}` : '/'
}

/** Remonte d'un cran : historique interne si possible, page parente sinon. */
export function goBack(router: { back: () => void; push: (href: string) => void }, pathname: string, fallback?: string) {
  if (internalDepth() > 0) router.back()
  else router.push(fallback ?? parentOf(pathname))
}
