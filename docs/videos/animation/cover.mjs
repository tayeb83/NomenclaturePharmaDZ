#!/usr/bin/env node
// Couvertures : node cover.mjs [dci|atc|interaction ...] [--out out]
// → out/couverture-<ep>-verticale.jpg (image d'aperçu du site, zone utile centrale) et out/couverture-<ep>-partage.jpg (1200×630, Facebook)
import { createRequire } from "node:module"; import { mkdirSync } from "node:fs"; import path from "node:path"; import { fileURLToPath, pathToFileURL } from "node:url"
const { chromium } = createRequire(import.meta.url)("playwright")
const here = path.dirname(fileURLToPath(import.meta.url)); const args = process.argv.slice(2); const i = args.indexOf("--out")
const out = path.resolve(here, i >= 0 ? args[i + 1] : "out"); mkdirSync(out, { recursive: true })
const eps = args.filter((a, k) => !a.startsWith("--") && k !== i + 1); const list = eps.length ? eps : ["dci", "atc", "interaction"]
const b = await chromium.launch()
for (const ep of list) for (const [fmt, w, h, name] of [["v", 1080, 1920, "verticale"], ["h", 1200, 630, "partage"]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto(pathToFileURL(path.join(here, "cover.html")).href + `?ep=${ep}&fmt=${fmt}`); await p.waitForFunction("window.READY === true")
  const f = path.join(out, `couverture-${ep}-${name}.jpg`); await p.screenshot({ path: f, type: "jpeg", quality: 92 }); console.log(f); await p.close()
}
await b.close()
