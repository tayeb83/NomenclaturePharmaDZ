#!/usr/bin/env node
// Couvertures de vidéo : node cover.mjs [--out out]  → out/couverture-dci-verticale.jpg (site) et out/couverture-dci-partage.jpg (Facebook)
import { createRequire } from "node:module"; import { mkdirSync } from "node:fs"; import path from "node:path"; import { fileURLToPath, pathToFileURL } from "node:url"
const { chromium } = createRequire(import.meta.url)("playwright")
const here = path.dirname(fileURLToPath(import.meta.url)); const i = process.argv.indexOf("--out")
const out = path.resolve(here, i > 0 ? process.argv[i + 1] : "out"); mkdirSync(out, { recursive: true })
const b = await chromium.launch()
for (const [fmt, w, h, name] of [["v", 1080, 1920, "couverture-dci-verticale"], ["h", 1200, 630, "couverture-dci-partage"]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto(pathToFileURL(path.join(here, "cover.html")).href + `?fmt=${fmt}`); await p.waitForFunction("window.READY === true")
  await p.screenshot({ path: path.join(out, `${name}.jpg`), type: "jpeg", quality: 92 }); console.log(path.join(out, `${name}.jpg`))
}
await b.close()
