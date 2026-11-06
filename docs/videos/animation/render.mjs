#!/usr/bin/env node
// Rend un épisode animé en MP4 (image par image, déterministe) + sous-titres .srt arabe et français.
// Usage : node render.mjs dci [--scale 0.667] [--fps 25] [--no-burn] [--stills 3,15,24] [--out out]
// Prérequis : playwright (déjà dans l'environnement) et ffmpeg.
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const ep = argv.find((a) => !a.startsWith("--"));
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : argv[i + 1]; };
if (!ep) { console.error("Usage : node render.mjs <episode> [--scale 0.667] [--fps 25] [--no-burn] [--stills 3,15] [--out out]"); process.exit(1); }
const scale = +opt("scale", 0.667), fps = +opt("fps", 25), outDir = path.resolve(here, opt("out", "out"));
const burn = !argv.includes("--no-burn");
const stills = opt("stills", "").split(",").filter(Boolean).map(Number);

// Sous-titres : lus dans le fichier d'épisode, sans navigateur
const win = {}; vm.runInNewContext(readFileSync(path.join(here, "episodes", ep + ".js"), "utf8"), { window: win });
const { duration, subs } = win.EP;
const ts = (s) => { const ms = Math.round(s * 1000), p = (n, l = 2) => String(n).padStart(l, "0"); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
const srt = (k) => subs.map((s, i) => `${i + 1}\n${ts(s.start)} --> ${ts(s.end)}\n${s[k].join("\n")}\n`).join("\n");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, `${ep}.ar.srt`), srt("ar"), "utf8");
writeFileSync(path.join(outDir, `${ep}.fr.srt`), srt("fr"), "utf8");

const even = (n) => Math.round(n / 2) * 2; // H.264 exige des dimensions paires
const W = even(1080 * scale), Hh = even(1920 * scale);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: Hh } });
await page.goto(pathToFileURL(path.join(here, "engine.html")).href + `?ep=${ep}&subs=${burn ? 1 : 0}`);
await page.waitForFunction("window.EP_READY === true");
const shot = (t, file) => page.evaluate((t) => window.renderAt(t), t).then(() => page.screenshot({ path: file, type: "jpeg", quality: 92 }));

if (stills.length) {
  for (const t of stills) await shot(t, path.join(outDir, `${ep}_t${t}.jpg`));
} else {
  const tmp = path.join(outDir, "frames"); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  const n = Math.round(duration * fps);
  for (let i = 0; i < n; i++) await shot(i / fps, path.join(tmp, `f${String(i).padStart(5, "0")}.jpg`));
  const mp4 = path.join(outDir, `${ep}${burn ? "" : ".nosub"}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(tmp, "f%05d.jpg"),
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", mp4]);
  rmSync(tmp, { recursive: true, force: true });
  console.log("MP4 :", mp4);
}
await browser.close();
console.log("SRT :", path.join(outDir, `${ep}.ar.srt`), path.join(outDir, `${ep}.fr.srt`));
