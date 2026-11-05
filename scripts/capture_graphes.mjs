#!/usr/bin/env node
/**
 * DwaDZ — captures d'écran des graphes pour les articles (public/articles/graphes/*.png).
 *
 * Usage :
 *   BASE_URL=https://www.dzair-pharma.net node scripts/capture_graphes.mjs
 *   BASE_URL=http://localhost:3000 node scripts/capture_graphes.mjs interactions-simvastatine   (une seule démo)
 *
 * Prérequis : playwright et son navigateur (npx playwright install chromium).
 * Chaque image est le dessin d'une démo (id du catalogue lib/graphe/demos.ts), badge « DÉMO » compris.
 * ⚠️  Sur une base de test, les noms de laboratoires et de marques sont fictifs : relancer ce script contre le site
 *     réel avant de publier, ou garder la mention « données fictives » dans la légende de l'article.
 */
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

// require plutôt qu'import : trouve aussi un playwright installé globalement (NODE_PATH)
const { chromium } = createRequire(import.meta.url)('playwright')

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const OUT = new URL('../public/articles/graphes/', import.meta.url).pathname
const DEMOS = ['interactions-simvastatine', 'importation-statines', 'concentration-ains', 'medicaments-metformine']
const demandees = process.argv.slice(2)

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1.5 })
for (const id of demandees.length ? demandees : DEMOS) {
  await page.goto(`${BASE}/graphe/demo/${id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  const dessin = page.locator('svg[role="group"]').first().locator('xpath=..')
  if (!(await dessin.count())) { console.error(`✗ ${id} : pas de graphe (démo sans données ?)`); continue }
  await page.mouse.move(0, 0) // aucun nœud survolé : aucun nœud sélectionné, aucun lien atténué
  const box = await dessin.boundingBox()
  await dessin.screenshot({ path: `${OUT}${id}.png` })
  console.log(`✓ ${id}.png  ${Math.round(box.width * 1.5)}×${Math.round(box.height * 1.5)}`)
}
await browser.close()
