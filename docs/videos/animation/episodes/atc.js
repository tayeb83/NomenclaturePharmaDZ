// « C'est quoi l'ATC ? » (≈ 56 s). Exemple : paracétamol = N02BE01.
// Hiérarchie vérifiée dans data/atc/ATC_2026_fr_en_ar.xlsx : N > N02 > N02B > N02BE > N02BE01.
// Darija ALGÉRIEN (زوج, تاع, وين, لازم…). [A] Relire avec un locuteur avant publication.
window.EP = (() => {
  const subs = [
    { start: 0,  end: 4,  ar: ["كل دوا عندو", "بطاقة هوية: الـ ATC"], fr: ["Chaque médicament a une carte d'identité :", "le code ATC"], say: "لكل دواء بطاقة هوية: رمز ATC." },
    { start: 4,  end: 9,  ar: ["ATC هو تصنيف عالمي", "تاع منظمة الصحة العالمية"], fr: ["L'ATC est une classification mondiale", "de l'Organisation mondiale de la santé"], say: "ATC تصنيف عالمي تضعه منظمة الصحة العالمية." },
    { start: 9,  end: 13, ar: ["الرمز يتكوّن من 7 خانات", "وكل خانة تقولك حاجة"], fr: ["Le code compte 7 caractères,", "chacun apporte une information"], say: "الرمز من سبع خانات، ولكل خانة معنى." },
    { start: 13, end: 18, ar: ["الحرف الأول: الجهاز", "N = الجهاز العصبي"], fr: ["La 1re lettre : le système", "N = système nerveux"], say: "الحرف الأول يدل على الجهاز: N هو الجهاز العصبي." },
    { start: 18, end: 23, ar: ["نوع العلاج: N02", "مسكّنات الوجع"], fr: ["N02 : le type de traitement", "les analgésiques"], say: "N02: نوع العلاج، المسكّنات." },
    { start: 23, end: 28, ar: ["عائلة أدق: N02B", "مسكّنات وخافضات الحمى"], fr: ["N02B : un sous-groupe plus précis", "autres analgésiques et antipyrétiques"], say: "N02B: مسكّنات وخافضات حرارة أخرى." },
    { start: 28, end: 33, ar: ["العائلة الكيميائية: N02BE", "الأنيليدات"], fr: ["N02BE : le groupe chimique", "les anilides"], say: "N02BE: المجموعة الكيميائية، الأنيليدات." },
    { start: 33, end: 37, ar: ["وفي الأخير: N02BE01", "باراسيتامول"], fr: ["Et enfin N02BE01 :", "le paracétamol"], say: "وأخيرًا: باراسيتامول." },
    { start: 37, end: 42, ar: ["هادي هي المادة الفعالة", "تاع الدوليبران"], fr: ["C'est la substance active", "du Doliprane"], say: "هذه هي المادة الفعالة في الدوليبران." },
    { start: 42, end: 47, ar: ["الأدوية اللي يبداو بنفس الرمز", "من نفس العائلة"], fr: ["Les médicaments dont le code commence", "pareil sont de la même famille"], say: "الأدوية ذات الرمز المتشابه تنتمي إلى العائلة نفسها." },
    { start: 47, end: 52, ar: ["في DwaDZ كل فيش فيها الـ ATC", "وتقدر تتصفح الأدوية بالعائلة"], fr: ["Sur DwaDZ, chaque fiche a son ATC", "et tu peux parcourir par famille"], say: "في DwaDZ تجد ATC في كل بطاقة دواء." },
    { start: 52, end: 56, ar: ["معلومة عامة، ما تعوضش", "رأي الطبيب ولا الصيدلي"], fr: ["Information générale : elle ne remplace pas", "l'avis du médecin ou du pharmacien"], say: "معلومة عامة لا تغني عن الطبيب أو الصيدلي." },
  ];
  const G = {};
  const CODE = ["N", "0", "2", "B", "E", "0", "1"];
  const LV = [ // niveau : tuiles concernées, début, couleur, préfixe, libellé ar/fr
    { tiles: [0], t0: 13, c: "#ff6b6b", code: "N", ar: "الجهاز العصبي", fr: "Système nerveux" },
    { tiles: [1, 2], t0: 18, c: "#ffa94d", code: "N02", ar: "مسكّنات الوجع", fr: "Analgésiques" },
    { tiles: [3], t0: 23, c: "#ffd43b", code: "N02B", ar: "مسكّنات وخافضات الحمى", fr: "Autres analgésiques et antipyrétiques" },
    { tiles: [4], t0: 28, c: "#69db7c", code: "N02BE", ar: "الأنيليدات", fr: "Anilides" },
    { tiles: [5, 6], t0: 33, c: "#4dabf7", code: "N02BE01", ar: "باراسيتامول", fr: "Paracétamol" },
  ];
  const TW = 120, GAP = 12, X0 = 540 - (7 * TW + 6 * GAP) / 2 + TW / 2;

  function pill(h, parent, scale) {
    const p = h.el("g", {}, parent);
    h.el("rect", { x: -130, y: -58, width: 260, height: 116, rx: 58, fill: "#fff", stroke: "#fff", "stroke-width": 4 }, p);
    h.el("path", { d: "M0 -58 H72 A58 58 0 0 1 72 58 H0 Z", fill: "#ff9f1c" }, p);
    [-48, 12].forEach((dx) => { h.el("ellipse", { cx: dx, cy: -6, rx: 17, ry: 20, fill: "#fff", stroke: "#bbb", "stroke-width": 3 }, p); h.el("circle", { cx: dx + 2, cy: -2, r: 8, fill: "#222" }, p); });
    h.el("path", { d: "M-40 24 Q-18 44 4 24", stroke: "#444", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, p);
    return p;
  }

  function init(svg, h) {
    const defs = h.el("defs", {}, svg);
    const g = h.el("linearGradient", { id: "bg", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    h.el("stop", { offset: 0, "stop-color": "#0f4c5c" }, g);
    h.el("stop", { offset: 1, "stop-color": "#071f29" }, g);
    h.el("rect", { width: 1080, height: 1920, fill: "url(#bg)" }, svg);
    G.bubbles = [...Array(9)].map((_, i) => h.el("circle", { r: 20 + (i * 17) % 50, fill: "#fff", "fill-opacity": .06 }, svg));
    h.el("text", { x: 540, y: 120, "text-anchor": "middle", fill: "#ffd166", "font-size": 54 }, svg).textContent = "DwaDZ";

    // A : carte d'identité
    G.card = h.el("g", {}, svg);
    h.el("rect", { x: -300, y: -190, width: 600, height: 380, rx: 44, fill: "#fff" }, G.card);
    h.el("rect", { x: -300, y: -190, width: 600, height: 80, rx: 44, fill: "#0f4c5c" }, G.card);
    h.el("text", { x: 0, y: -132, "text-anchor": "middle", fill: "#fff", "font-size": 40 }, G.card).textContent = "CARTE D'IDENTITÉ · بطاقة هوية";
    const cp = pill(h, G.card); cp.setAttribute("transform", "translate(-130 20) scale(.8)");
    h.el("text", { x: 150, y: 0, "text-anchor": "middle", fill: "#0f4c5c", "font-size": 120 }, G.card).textContent = "ATC";
    h.el("text", { x: 150, y: 88, "text-anchor": "middle", fill: "#e8590c", "font-size": 52 }, G.card).textContent = "N02BE01";

    // B : OMS
    G.globe = h.el("g", {}, svg);
    h.el("circle", { r: 170, fill: "#1c7ed6", stroke: "#fff", "stroke-width": 10 }, G.globe);
    [[170, 70], [170, 0], [60, 170]].forEach(([rx, ry]) => h.el("ellipse", { rx, ry, fill: "none", stroke: "#fff", "stroke-width": 6, opacity: .7 }, G.globe));
    h.el("line", { x1: -170, y1: 0, x2: 170, y2: 0, stroke: "#fff", "stroke-width": 6, opacity: .7 }, G.globe);
    h.el("text", { x: 0, y: 260, "text-anchor": "middle", fill: "#fff", "font-size": 64 }, G.globe).textContent = "WHO · OMS";
    G.globeAr = h.el("text", { x: 0, y: 340, "text-anchor": "middle", direction: "rtl", fill: "#ffd166", "font-size": 58 }, G.globe); G.globeAr.textContent = "منظمة الصحة العالمية";

    // C : tuiles + lignes de niveaux
    G.tiles = CODE.map((ch, i) => {
      const t = h.el("g", {}, svg);
      const r = h.el("rect", { x: -TW / 2, y: -80, width: TW, height: 160, rx: 26, fill: "#adb5bd" }, t);
      h.el("text", { x: 0, y: 36, "text-anchor": "middle", fill: "#111", "font-size": 100 }, t).textContent = ch;
      return { t, r };
    });
    G.rows = LV.map((l) => {
      const r = h.el("g", {}, svg);
      h.el("rect", { x: -480, y: -62, width: 960, height: 124, rx: 30, fill: "#fff", "fill-opacity": .1, stroke: l.c, "stroke-width": 5 }, r);
      h.el("rect", { x: -470, y: -52, width: 290, height: 104, rx: 22, fill: l.c }, r);
      h.el("text", { x: -325, y: 22, "text-anchor": "middle", fill: "#111", "font-size": 64 }, r).textContent = l.code;
      h.el("text", { x: 150, y: 14, "text-anchor": "middle", direction: "rtl", fill: "#fff", "font-size": l.ar.length > 14 ? 46 : 58 }, r).textContent = l.ar;
      h.el("text", { x: 150, y: 50, "text-anchor": "middle", fill: "#ffe08a", "font-size": 28 }, r).textContent = l.fr;
      return r;
    });

    // D : pilule Doliprane
    G.big = h.el("g", {}, svg);
    const bp = pill(h, G.big); bp.setAttribute("transform", "scale(1.7)");
    G.dolBox = h.el("g", {}, svg);
    h.el("rect", { x: -190, y: -50, width: 380, height: 100, rx: 28, fill: "#ff6b6b", stroke: "#fff", "stroke-width": 6 }, G.dolBox);
    h.el("text", { x: 0, y: 22, "text-anchor": "middle", fill: "#fff", "font-size": 54 }, G.dolBox).textContent = "DOLIPRANE";
    G.eq = h.el("g", {}, svg);
    h.el("rect", { x: -380, y: -60, width: 760, height: 120, rx: 60, fill: "#4dabf7" }, G.eq);
    h.el("text", { x: 0, y: 22, "text-anchor": "middle", fill: "#fff", "font-size": 58 }, G.eq).textContent = "N02BE01 = PARACETAMOL";

    // E : même famille
    G.fam = h.el("g", {}, svg);
    [-320, 0, 320].forEach((dx, i) => {
      const p = pill(h, G.fam); p.setAttribute("transform", `translate(${dx} ${i === 1 ? 20 : 0}) scale(.62)`);
      h.el("text", { x: dx, y: 92, "text-anchor": "middle", fill: "#4dabf7", "font-size": 50 }, G.fam).textContent = "N02…";
    });
    h.el("path", { d: "M-480 150 Q-480 200 -430 200 H430 Q480 200 480 150", stroke: "#4dabf7", "stroke-width": 10, fill: "none", "stroke-linecap": "round" }, G.fam);
    h.el("text", { x: 0, y: 290, "text-anchor": "middle", direction: "rtl", fill: "#fff", "font-size": 76 }, G.fam).textContent = "نفس العائلة";

    // F : appel
    G.cta = h.el("g", {}, svg);
    h.el("rect", { x: -420, y: -130, width: 840, height: 260, rx: 50, fill: "#2f9e44" }, G.cta);
    h.el("text", { x: 0, y: -22, "text-anchor": "middle", direction: "rtl", fill: "#fff", "font-size": 78 }, G.cta).textContent = "الأدوية بالعائلة";
    h.el("text", { x: 0, y: 52, "text-anchor": "middle", fill: "#d3f9d8", "font-size": 46 }, G.cta).textContent = "Classes thérapeutiques";
    G.url = h.el("text", { x: 540, y: 1120, "text-anchor": "middle", fill: "#ffd166", "font-size": 52 }, svg); G.url.textContent = "dzair-pharma.net/classes-therapeutiques";
  }

  function update(t, h) {
    const { prog, outBack, outCubic, place } = h;
    G.bubbles.forEach((b, i) => { b.setAttribute("cx", 100 + (i * 131) % 900 + Math.sin(t * .6 + i) * 30); b.setAttribute("cy", 1900 - ((t * (30 + i * 9) + i * 210) % 2000)); });
    const sc = (a, b) => { const p = prog(t, a, b); return p <= 0 ? 0 : outBack(p); };
    const fade = (a, b) => outCubic(prog(t, a, b));
    const out = (a, b) => 1 - outCubic(prog(t, a, b));

    // A
    const a = sc(0, 1.2) * out(3.6, 4.4);
    place(G.card, 540, 780 + Math.sin(t * 3) * 10, Math.max(a, .001), Math.sin(t * 2) * 3, a ? 1 : 0);
    // B
    const b = sc(4.4, 5.6) * out(8.6, 9.4);
    place(G.globe, 540, 760, Math.max(b, .001), 0, b ? 1 : 0);
    G.globe.querySelectorAll("ellipse").forEach((e, i) => e.setAttribute("rx", i === 2 ? 40 + 130 * Math.abs(Math.cos(t * 1.2)) : e.getAttribute("rx")));

    // C : tuiles
    const tilesOut = out(36.4, 37.2);
    G.tiles.forEach((tl, i) => {
      const s = sc(9.2 + i * .35, 10.2 + i * .35);
      const lv = LV.find((l) => l.tiles.includes(i));
      const active = t >= lv.t0 && t < lv.t0 + 5;
      const pulse = active ? 1 + .14 * Math.sin((t - lv.t0) * 6) : 1;
      tl.r.setAttribute("fill", t >= lv.t0 ? lv.c : "#adb5bd");
      place(tl.t, X0 + i * (TW + GAP), 520, s * pulse, 0, s ? tilesOut : 0);
    });
    // lignes
    G.rows.forEach((r, i) => {
      const p = LV[i].t0, s = outCubic(prog(t, p, p + .9));
      place(r, 540 + (1 - s) * 400, 740 + i * 150, 1, 0, s * tilesOut);
    });

    // D
    const dOut = out(41.4, 42.2);
    place(G.big, 540, 800 + Math.sin(t * 4) * 12, sc(37.6, 39) * (t < 42 ? 1 : 0), Math.sin(t * 2) * 4, t >= 37.6 ? dOut : 0);
    place(G.dolBox, 540, 520, sc(38.4, 39.6) * (t < 42 ? 1 : 0), 0, t >= 38.4 ? dOut : 0);
    place(G.eq, 540, 1130, sc(39.6, 40.8) * (t < 42 ? 1 : 0), 0, t >= 39.6 ? dOut : 0);

    // E
    const e = sc(42.4, 43.8) * out(46.4, 47.2);
    place(G.fam, 540, 780, Math.max(e, .001), 0, e ? 1 : 0);

    // F
    const f = sc(47.4, 48.8);
    place(G.cta, 540, 880, Math.max(f, .001), Math.sin(t * 3) * 1.2, f ? 1 : 0);
    G.url.setAttribute("opacity", fade(49.5, 50.5));
  }
  return { duration: 56, subs, init, update };
})();
