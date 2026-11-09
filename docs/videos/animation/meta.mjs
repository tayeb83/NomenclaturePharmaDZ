#!/usr/bin/env node
// Métadonnées prêtes à saisir dans l'admin (Admin → Vidéos) pour les épisodes « par spécification » : node meta.mjs > ../metadonnees-episodes.md
import { readFileSync, readdirSync } from "node:fs"; import vm from "node:vm"; import path from "node:path"; import { fileURLToPath } from "node:url"
const here = path.dirname(fileURLToPath(import.meta.url)); const rows = []
for (const f of readdirSync(path.join(here, "episodes")).filter((x) => x.endsWith(".js"))) {
  const win = {}; vm.runInNewContext(readFileSync(path.join(here, "lib/spec.js"), "utf8"), { window: win })
  vm.runInNewContext(readFileSync(path.join(here, "episodes", f), "utf8"), { window: win, ...win })
  if (win.SPEC) rows.push({ ep: f.slice(0, -3), S: win.SPEC, T: win.specToEP(win.SPEC) })
}
rows.sort((a, b) => a.S.meta.n - b.S.meta.n)
const out = ["# Métadonnées des vidéos 4 à 18 pour l'admin (Admin → Vidéos → « + Nouvelle »)", "",
  "Généré par `node docs/videos/animation/meta.mjs` à partir de chaque épisode. Rappels : « Relu par » = nom d'une personne qui a **réellement** relu la vidéo ; laisser « sous-titres incrustés » coché ;",
  "image d'aperçu = `couverture-<épisode>-verticale.jpg` (le fichier `…-partage.jpg`, 1200×630, sert à la main sur Facebook). Le fichier vidéo est `<épisode>.clone.mp4`.", ""]
for (const { ep, S, T } of rows) {
  const m = S.meta
  out.push("---------------------------------------------------------------------------------------------------", "",
    `## ${m.n} — ${m.titreFr}  (fichier : ${ep}.clone.mp4 · couverture : couverture-${ep}-verticale.jpg · ${Math.round(T.duration)} s)`, "",
    `- **Identifiant** : \`${m.slug}\` · **N° d'épisode** : ${m.n}`, `- **Titre français** : ${m.titreFr}`, `- **العنوان بالعربية** : ${m.titreAr}`,
    "- **Description française** :", "  ```text", `  ${m.descFr}`, "  ```", "- **الوصف بالعربية** :", "  ```text", `  ${m.descAr}`, "  ```",
    `- **Étiquettes** : ${m.tags.join(", ")}`, ...(m.cta ? [`- **Lien cliquable (admin → « Lien cliquable »)** : ${m.cta.url} · bouton FR : « ${m.cta.fr} » · bouton AR : « ${m.cta.ar} »`] : []), "- **Sources** :", "  ```text", ...m.sources.map((x) => `  ${x}`), "  ```", `- **À vérifier avant publication** : ${m.verifier}`, "")
}
console.log(out.join("\n"))
