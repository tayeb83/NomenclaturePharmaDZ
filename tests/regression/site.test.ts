/**
 * Non-régression du site existant (recherche, alertes, fiches…).
 *
 * Le module Training ne doit rien changer au reste du site. Ce test compare,
 * URL par URL, les réponses d'un serveur AVEC le module (SITE_URL) à celles
 * d'un serveur de référence SANS lui (BASELINE_URL : la branche `main`
 * lancée sur la même base). Sans BASELINE_URL, il vérifie seulement des
 * invariants (statut 200, résultats de recherche non vides).
 *
 *   # terminal 1 : référence (checkout de main)      PORT=3001 npm run dev
 *   # terminal 2 : branche Training                   PORT=3000 npm run dev
 *   SITE_URL=http://localhost:3000 BASELINE_URL=http://localhost:3001 \
 *     REGRESSION_QUERY=PARACETAMOL npm run test:regression
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const SITE = process.env.SITE_URL
const BASE = process.env.BASELINE_URL
const Q = process.env.REGRESSION_QUERY || 'PARACETAMOL'
const skip = SITE ? false : 'SITE_URL non défini'
const UA = { 'User-Agent': 'Mozilla/5.0 regression-test' }

const PATHS = [
  `/api/search?q=${encodeURIComponent(Q)}`,
  `/api/search?q=${encodeURIComponent(Q.slice(0, 5))}&scope=all&limit=10`,
  `/api/search?q=${encodeURIComponent(Q)}&activeOnly=1`,
  '/api/search?q=',
  '/recherche',
  `/recherche?q=${encodeURIComponent(Q)}`,
  '/alertes',
  '/retraits',
  '/medicaments',
  '/substitution',
  '/classes-therapeutiques',
  '/outils',
  '/a-propos',
  '/contact',
  '/privacy.json-not-a-page', // 404 attendu des deux côtés
]

/** Retire ce qui varie d'un build / d'un rendu à l'autre sans rapport avec le contenu. */
function normalize(body: string): string {
  return body
    .split(SITE!).join('ORIGIN')
    .split(BASE ?? '\u0000').join('ORIGIN')
    .replace(/\/_next\/static\/[^"')\s]+/g, '/_next/static/X')
    .replace(/"buildId":"[^"]*"/g, '"buildId":"X"')
    .replace(/nonce="[^"]*"/g, 'nonce=""')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')   // données de hydratation Next (identifiants de build)
    .replace(/<link[^>]*rel="(?:preload|prefetch|stylesheet)"[^>]*>/g, '')
    .replace(/<nav[\s\S]*?<\/nav>/g, '')                // le menu change (lien Training) : comparé séparément
    .replace(/\s+/g, ' ')
}

async function get(base: string, path: string) {
  const res = await fetch(base + path, { headers: UA, redirect: 'manual' })
  return { status: res.status, type: res.headers.get('content-type') ?? '', body: await res.text() }
}

test('invariants : la recherche renvoie des résultats et les pages principales répondent', { skip }, async () => {
  const s = await get(SITE!, `/api/search?q=${encodeURIComponent(Q)}`)
  assert.equal(s.status, 200)
  assert.ok(JSON.parse(s.body).count > 0, `aucun résultat pour « ${Q} » : base vide ?`)
  for (const p of ['/recherche', '/alertes', '/retraits', '/']) {
    const st = (await get(SITE!, p)).status
    assert.ok(st === 200 || (st >= 300 && st < 400), `${p} → ${st}`)
  }
})

for (const path of PATHS) {
  test(`identique à la référence : ${path}`, { skip: !SITE || !BASE ? 'SITE_URL et BASELINE_URL requis' : false }, async () => {
    const [a, b] = [await get(SITE!, path), await get(BASE!, path)]
    assert.equal(a.status, b.status, `statut ${a.status} ≠ ${b.status}`)
    if (a.type.includes('json')) assert.deepEqual(JSON.parse(a.body), JSON.parse(b.body))
    else assert.equal(normalize(a.body), normalize(b.body), 'le contenu HTML diffère de la référence')
  })
}

test('le menu ne gagne que le lien Training', { skip: !SITE || !BASE ? 'SITE_URL et BASELINE_URL requis' : false }, async () => {
  const hrefs = (h: string) => [...(h.match(/<nav[\s\S]*?<\/nav>/)?.[0] ?? '').matchAll(/href="([^"]+)"/g)].map(m => m[1])
  const [a, b] = [hrefs((await get(SITE!, '/')).body), hrefs((await get(BASE!, '/')).body)]
  assert.ok(a.includes('/training'), 'lien Training absent')
  assert.deepEqual(a.filter(h => h !== '/training'), b, 'le menu a changé autrement que par le lien Training')
})
