/**
 * PharmaVeille DZ — Service Worker
 * Stratégie : Network First avec fallback cache pour les pages, Cache First pour les assets statiques.
 */

const CACHE_NAME = 'pharmaveille-v1'
const STATIC_ASSETS = [
  '/',
  '/recherche',
  '/medicaments',
  '/alertes',
  '/substitution',
  '/a-propos',
  '/contact',
  '/manifest.json',
]

// Installation : mise en cache des pages principales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignorer les erreurs individuelles lors de l'installation
      })
    })
  )
  self.skipWaiting()
})

// Activation : suppression des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch : Network First pour les pages/API, Cache First pour les assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET et externes
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // Assets statiques (JS, CSS, images, fonts) → Cache First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.match(/\.(png|jpg|ico|svg|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // API → Network Only (données dynamiques, pas de cache)
  if (url.pathname.startsWith('/api/')) return

  // Pages HTML → Network First avec fallback cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // Fallback vers la page d'accueil si disponible
          return caches.match('/')
        })
      })
  )
})
