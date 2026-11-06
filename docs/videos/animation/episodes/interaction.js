// « C'est quoi une interaction médicamenteuse ? » (≈ 57 s). Les 4 gravités reprennent celles du site (⊗ ▲ ◆ ○).
// Exemples réels du Thesaurus ANSM sept. 2023 : METFORMINE + produits de contraste iodés (CI, p. 164),
// PARACETAMOL + FLUCLOXACILLINE (déconseillée, p. 191), PARACETAMOL + ANTIVITAMINES K (précaution, p. 191),
// ACIDE ACETYLSALICYLIQUE + DEFERASIROX (à prendre en compte, p. 4).
// `say` = texte lu par la voix (plus complet que le sous-titre). Darija ALGÉRIEN. [A] relecture avant publication.
window.EP = (() => {
  const subs = [
    { start: 0,  end: 4,  ar: ["دوا مع دوا…", "ساعات الخلطة خطر!"], fr: ["Un médicament + un autre…", "le mélange peut être dangereux !"],
      say: "دوا مع دوا… الخلطة ساعات خطر!" },
    { start: 4,  end: 11, ar: ["كي تاخذ زوج أدوية مع بعض", "واحد يقدر يبدّل مفعول الآخر"], fr: ["Quand tu prends deux médicaments ensemble,", "l'un peut modifier l'effet de l'autre"],
      say: "كي تاخذ زوج أدوية مع بعض، واحد يبدّل مفعول الآخر. هذا هو التفاعل الدوائي." },
    { start: 11, end: 16, ar: ["الوكالة الفرنسية ANSM", "قسّمتهم لـ 4 مستويات"], fr: ["L'agence française ANSM", "les classe en 4 niveaux"],
      say: "الوكالة الفرنسية قسّمتهم لأربع مستويات." },
    { start: 16, end: 22, ar: ["1 — مضاد استطباب", "ممنوع الجمع"], fr: ["1 — Contre-indication :", "ne jamais associer"],
      say: "الأول: مضاد استطباب. ممنوع تجمعهم. مثلاً: الميتفورمين مع منتجات التباين." },
    { start: 22, end: 28, ar: ["2 — جمع غير موصى به", "الأحسن تتجنبو"], fr: ["2 — Association déconseillée :", "à éviter, sauf décision du médecin"],
      say: "التاني: جمع غير موصى به. الأحسن تتجنبو. مثلاً: الباراسيتامول مع مضاد حيوي." },
    { start: 28, end: 34, ar: ["3 — احتياطات الاستعمال", "ممكن، لكن بالمراقبة"], fr: ["3 — Précaution d'emploi :", "possible, avec surveillance"],
      say: "التالت: احتياطات. ممكن، لكن بالمراقبة. مثلاً: الباراسيتامول ومميّعات الدم." },
    { start: 34, end: 40, ar: ["4 — يؤخذ بعين الاعتبار", "الخطر موجود، خلّيه في بالك"], fr: ["4 — À prendre en compte :", "le risque existe, garde-le en tête"],
      say: "والرابع: يؤخذ بعين الاعتبار. الخطر موجود. مثلاً: الأسبرين مع الدفيراسيروكس." },
    { start: 40, end: 46, ar: ["ما توقفش دواك وحدك!", "سقسي الطبيب ولا الصيدلي"], fr: ["N'arrête pas ton traitement seul !", "demande au médecin ou au pharmacien"],
      say: "لكن انتبه: ما توقفش دواك وحدك. سقسي الطبيب ولا الصيدلي." },
    { start: 46, end: 52, ar: ["في DwaDZ كل فيش فيها", "تبويب التفاعلات"], fr: ["Sur DwaDZ, chaque fiche a", "son onglet Interactions"],
      say: "في دوا دي زاد، كل فيش فيها تبويب التفاعلات، مرتّبين من الأخطر للأخف." },
    { start: 52, end: 57, ar: ["معلومة عامة، ما تعوضش", "رأي الطبيب ولا الصيدلي"], fr: ["Information générale : elle ne remplace pas", "l'avis du médecin ou du pharmacien"],
      say: "هادي معلومة عامة، ما تعوضش رأي الطبيب ولا الصيدلي." },
  ];
  const G = {};
  const LV = [
    { t0: 16, c: "#e03131", icon: "⊗", ar: "مضاد استطباب", fr: "Contre-indication", ex: "METFORMINE + PRODUITS DE CONTRASTE IODÉS" },
    { t0: 22, c: "#f76707", icon: "▲", ar: "جمع غير موصى به", fr: "Association déconseillée", ex: "PARACETAMOL + FLUCLOXACILLINE" },
    { t0: 28, c: "#f2b705", icon: "◆", ar: "احتياطات الاستعمال", fr: "Précaution d'emploi", ex: "PARACETAMOL + ANTIVITAMINES K" },
    { t0: 34, c: "#1098ad", icon: "○", ar: "يؤخذ بعين الاعتبار", fr: "À prendre en compte", ex: "ASPIRINE + DEFERASIROX" },
  ];
  const CARD_Y = (i) => 470 + i * 215;

  function pill(h, parent, left, right) {
    const p = h.el("g", {}, parent);
    h.el("rect", { x: -120, y: -52, width: 240, height: 104, rx: 52, fill: left, stroke: "#fff", "stroke-width": 4 }, p);
    h.el("path", { d: "M0 -52 H68 A52 52 0 0 1 68 52 H0 Z", fill: right }, p);
    const pupils = [-44, 14].map((dx) => { h.el("ellipse", { cx: dx, cy: -6, rx: 16, ry: 19, fill: "#fff", stroke: "#bbb", "stroke-width": 3 }, p); return h.el("circle", { cx: dx + 2, cy: -2, r: 8, fill: "#222" }, p); });
    const mouth = h.el("path", { d: "M-38 22 Q-15 42 8 22", stroke: "#333", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, p);
    return { g: p, pupils, mouth };
  }

  function init(svg, h) {
    const defs = h.el("defs", {}, svg);
    const g = h.el("linearGradient", { id: "bg", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    h.el("stop", { offset: 0, "stop-color": "#0f4c5c" }, g);
    h.el("stop", { offset: 1, "stop-color": "#071f29" }, g);
    h.el("rect", { width: 1080, height: 1920, fill: "url(#bg)" }, svg);
    G.bubbles = [...Array(9)].map((_, i) => h.el("circle", { r: 20 + (i * 17) % 50, fill: "#fff", "fill-opacity": .06 }, svg));
    h.el("text", { x: 540, y: 120, "text-anchor": "middle", fill: "#ffd166", "font-size": 54 }, svg).textContent = "DwaDZ";

    // A/B : deux pilules
    G.pA = pill(h, svg, "#fff", "#ff9f1c");
    G.pB = pill(h, svg, "#fff", "#4dabf7");
    G.plus = h.el("text", { x: 0, y: 0, "text-anchor": "middle", fill: "#fff", "font-size": 150 }, svg); G.plus.textContent = "+";
    G.boom = h.el("text", { x: 0, y: 0, "text-anchor": "middle", "font-size": 230 }, svg); G.boom.textContent = "💥";
    G.q = h.el("text", { x: 0, y: 0, "text-anchor": "middle", fill: "#ff6b6b", "font-size": 280 }, svg); G.q.textContent = "?";
    G.title = h.el("g", {}, svg);
    h.el("text", { x: 0, y: 0, "text-anchor": "middle", direction: "rtl", fill: "#ffd166", "font-size": 110 }, G.title).textContent = "التفاعل الدوائي";
    h.el("text", { x: 0, y: 70, "text-anchor": "middle", fill: "#fff", "font-size": 46 }, G.title).textContent = "INTERACTION MÉDICAMENTEUSE";
    G.aura = h.el("circle", { r: 150, fill: "none", stroke: "#ff6b6b", "stroke-width": 12, "stroke-dasharray": "30 20" }, svg);
    G.eff = h.el("text", { x: 0, y: 0, "text-anchor": "middle", direction: "rtl", fill: "#ffe08a", "font-size": 66 }, svg); G.eff.textContent = "تبدّل المفعول ⚡";

    // C : 4 cartes
    G.cards = LV.map((l, i) => {
      const c = h.el("g", {}, svg);
      h.el("rect", { x: -470, y: -90, width: 940, height: 180, rx: 38, fill: "#102f3b", stroke: l.c, "stroke-width": 8 }, c);
      h.el("circle", { cx: -350, cy: 0, r: 70, fill: l.c }, c);
      h.el("text", { x: -350, y: 34, "text-anchor": "middle", fill: "#fff", "font-size": 96 }, c).textContent = l.icon;
      h.el("text", { x: 120, y: 12, "text-anchor": "middle", direction: "rtl", fill: "#fff", "font-size": 62 }, c).textContent = l.ar;
      h.el("text", { x: 120, y: 62, "text-anchor": "middle", fill: l.c === "#1098ad" ? "#66d9e8" : "#ffe08a", "font-size": 36 }, c).textContent = l.fr;
      return c;
    });
    G.ex = h.el("g", {}, svg);
    G.exBg = h.el("rect", { x: -470, y: -80, width: 940, height: 160, rx: 36, fill: "#fff" }, G.ex);
    G.exTitle = h.el("text", { x: 0, y: -22, "text-anchor": "middle", fill: "#666", "font-size": 34 }, G.ex); G.exTitle.textContent = "EXEMPLE · مثال (ANSM)";
    G.exTxt = h.el("text", { x: 0, y: 40, "text-anchor": "middle", fill: "#111", "font-size": 46 }, G.ex);

    // D : stop
    G.stop = h.el("g", {}, svg);
    h.el("circle", { r: 190, fill: "#e03131", stroke: "#fff", "stroke-width": 12 }, G.stop);
    h.el("text", { x: 0, y: 70, "text-anchor": "middle", "font-size": 230 }, G.stop).textContent = "✋";
    G.stopTxt = h.el("text", { x: 540, y: 1160, "text-anchor": "middle", direction: "rtl", fill: "#fff", "font-size": 82 }, svg); G.stopTxt.textContent = "ما توقفش دواك وحدك";
    G.doc = h.el("text", { x: 540, y: 1290, "text-anchor": "middle", "font-size": 130 }, svg); G.doc.textContent = "👩‍⚕️ 💊 👨‍⚕️";

    // E : fiche DwaDZ
    G.fiche = h.el("g", {}, svg);
    h.el("rect", { x: -440, y: -330, width: 880, height: 660, rx: 40, fill: "#fff" }, G.fiche);
    h.el("text", { x: -400, y: -250, fill: "#0f4c5c", "font-size": 54 }, G.fiche).textContent = "DOLIPRANE";
    h.el("rect", { x: -400, y: -205, width: 380, height: 70, rx: 35, fill: "#e9ecef" }, G.fiche);
    h.el("text", { x: -210, y: -155, "text-anchor": "middle", fill: "#555", "font-size": 36 }, G.fiche).textContent = "Fiche";
    h.el("rect", { x: -10, y: -205, width: 410, height: 70, rx: 35, fill: "#0f4c5c" }, G.fiche);
    h.el("text", { x: 195, y: -155, "text-anchor": "middle", fill: "#fff", "font-size": 36 }, G.fiche).textContent = "Interactions";
    G.rowsFiche = LV.map((l, i) => {
      const r = h.el("g", {}, G.fiche);
      h.el("rect", { x: -400, y: -100 + i * 105, width: 800, height: 88, rx: 24, fill: l.c, "fill-opacity": .16, stroke: l.c, "stroke-width": 4 }, r);
      h.el("text", { x: -350, y: -40 + i * 105, "text-anchor": "middle", fill: l.c, "font-size": 56 }, r).textContent = l.icon;
      h.el("text", { x: -290, y: -43 + i * 105, fill: "#222", "font-size": 40 }, r).textContent = l.fr;
      return r;
    });
    G.url = h.el("text", { x: 540, y: 1260, "text-anchor": "middle", fill: "#ffd166", "font-size": 52 }, svg); G.url.textContent = "dzair-pharma.net";
  }

  function update(t, h) {
    const { prog, outBack, outCubic, place, inOut } = h;
    G.bubbles.forEach((b, i) => { b.setAttribute("cx", 100 + (i * 131) % 900 + Math.sin(t * .6 + i) * 30); b.setAttribute("cy", 1900 - ((t * (30 + i * 9) + i * 210) % 2000)); });
    const sc = (a, b) => { const p = prog(t, a, b); return p <= 0 ? 0 : outBack(p); };
    const fade = (a, b) => outCubic(prog(t, a, b));
    const out = (a, b) => 1 - outCubic(prog(t, a, b));

    // Pilules : A (0-4) collision ; B (4-11) titre + effet ; puis disparaissent à 11
    let ax, bx, py, vis;
    if (t < 4) { const p = inOut(prog(t, .2, 2)); ax = -200 + p * 560; bx = 1280 - p * 560; py = 820; vis = 1; }
    else { const p = inOut(prog(t, 4, 5.2)); ax = 360 + p * 0; bx = 720; py = 900; vis = out(10.4, 11.2); ax = 340; }
    const pa = 1, pb = 1;
    place(G.pA.g, ax, py, 1.15 * pa, t < 2.2 ? 0 : Math.sin(t * 12) * 3, vis);
    place(G.pB.g, bx, py, 1.15 * pb, t < 2.2 ? 0 : -Math.sin(t * 12) * 3, vis);
    const bOn = t > 7 && t < 11;
    G.pB.mouth.setAttribute("d", bOn ? "M-30 36 Q-15 8 0 36" : "M-38 22 Q-15 42 8 22");
    G.pB.pupils.forEach((p) => p.setAttribute("r", bOn ? 11 : 8));
    place(G.plus, 540, py + 40, sc(0.6, 1.4) * (t < 4 ? out(2, 2.4) : (t < 7 ? 1 : 0)) , 0, t < 4 ? out(2, 2.4) : (t >= 5 && t < 7.4 ? out(10, 11) : 0));
    const boom = sc(2.1, 2.7) * out(3.4, 4);
    place(G.boom, 540, 790, Math.max(boom, .001), 0, boom ? 1 : 0);
    const q = sc(2.6, 3.4) * out(3.5, 4.1);
    place(G.q, 540, 1280, Math.max(q, .001), Math.sin(t * 4) * 5, q ? 1 : 0);
    const ti = sc(4.2, 5.4) * out(10.6, 11.4);
    place(G.title, 540, 420, Math.max(ti, .001), 0, ti ? 1 : 0);
    const auraOn = t > 7 && t < 11 ? out(10.4, 11) : 0;
    G.aura.setAttribute("opacity", auraOn); G.aura.setAttribute("cx", 720); G.aura.setAttribute("cy", 900); G.aura.setAttribute("r", 150 + Math.sin(t * 6) * 12);
    place(G.eff, 540, 1180, sc(7.4, 8.4) * (t < 11 ? 1 : 0), 0, t > 7.4 && t < 11 ? out(10.4, 11) : 0);

    // C : cartes
    const cardsOut = out(39.6, 40.4);
    G.cards.forEach((c, i) => {
      const l = LV[i], s = sc(11.6 + i * .5, 12.6 + i * .5);
      const active = t >= l.t0 && t < l.t0 + 6;
      const dim = t >= 16 && !active ? .45 : 1;
      place(c, 540, CARD_Y(i), s * (active ? 1 + .035 * Math.sin((t - l.t0) * 5) : 1), 0, s ? dim * cardsOut : 0);
    });
    const cur = LV.filter((l) => t >= l.t0).pop();
    if (cur) { G.exTxt.textContent = cur.ex; G.exTxt.setAttribute("font-size", cur.ex.length > 36 ? 36 : 44); G.exBg.setAttribute("stroke", cur.c); G.exBg.setAttribute("stroke-width", 12); }
    place(G.ex, 540, 1350, sc(16, 17), 0, t >= 16 ? cardsOut : 0);

    // D : stop
    const d = sc(40.4, 41.6) * out(45.4, 46.2);
    place(G.stop, 540, 760 + Math.sin(t * 5) * 8, Math.max(d, .001), Math.sin(t * 3) * 4, d ? 1 : 0);
    G.stopTxt.setAttribute("opacity", fade(41.4, 42.4) * out(45.4, 46.2));
    G.doc.setAttribute("opacity", fade(43, 44) * out(45.4, 46.2));

    // E : fiche
    const e = sc(46.4, 47.8);
    place(G.fiche, 540, 800, Math.max(e, .001), 0, e ? 1 : 0);
    G.rowsFiche.forEach((r, i) => r.setAttribute("opacity", fade(48 + i * .6, 48.8 + i * .6)));
    G.url.setAttribute("opacity", fade(50.5, 51.5));
  }
  return { duration: 57, subs, init, update };
})();
