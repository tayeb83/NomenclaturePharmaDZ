// Épisode « par spécification » : window.SPEC = { meta, cover, segments:[ seg(ar, fr, scène, humeur) ] } (voir episodes/*.js).
// Les durées se déduisent du texte arabe (≈ 11 caractères par seconde, vitesse d'une voix posée) : la voix tient dans son créneau.
// Partagé par le navigateur (rendu) et par Node (sous-titres, sans navigateur).
window.COL = { ci: "#e03131", de: "#f76707", pr: "#f2b705", ac: "#1098ad", ok: "#51cf66", info: "#4dabf7", gold: "#ffd166", bad: "#ff6b6b" };
window.seg = (ar, fr, v, mood, say) => ({ ar, fr, v, mood, say });
window.V = {
  hook: (icon, t, f) => ({ k: "hook", icon, t, f }),
  card: (icon, t, f, c) => ({ k: "card", icon, t, f, c }),
  warn: (icon, t, f, c) => ({ k: "warn", icon, t, f, c }),
  list: (items, c) => ({ k: "list", items, c }),
  steps: (items, c) => ({ k: "steps", items, c }),
  it: (i, t, f, c) => ({ i, t, f, c }),
  cmp: (a, b, mid) => ({ k: "compare", a, b, mid }),
  search: (q, res) => ({ k: "search", q, res }),
  cform: (a, b, res) => ({ k: "cmpform", a, b, res }),   // formulaire « deux médicaments » puis carte de résultat {c, i, t, f}
  logo: () => ({ k: "logo" }),
};
window.specToEP = function (S) {
  let t = 0; const subs = [], segs = [];
  for (const g of S.segments) {
    const ar = g.ar.split("|"), fr = g.fr.split("|");
    const d = g.d || Math.max(3.5, Math.ceil((ar.join(" ").length / 11 + 0.7) * 2) / 2);
    // say : texte lu si différent du texte affiché (noms latins, prononciation)
    subs.push(g.say ? { start: t, end: t + d, ar, fr, say: g.say } : { start: t, end: t + d, ar, fr }); segs.push({ ...g, ar, fr, start: t, end: t + d, d }); t += d;
  }
  return { duration: t, subs, segs };
};
