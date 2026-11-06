// Pilote — « C'est quoi une DCI ? » (≈ 42 s). Voix à enregistrer sur ces timings (ajustables).
// [A] Vérifier que les trois marques existent dans la nomenclature DZ avant publication.
window.EP = (() => {
  const subs = [
    { start: 0,  end: 4,  ar: ["علاش نفس الدوا", "عندو بزاف سميات؟"], fr: ["Pourquoi un même médicament", "a-t-il plusieurs noms ?"], say: "لماذا يملك الدواء الواحد عدة أسماء؟" },
    { start: 4,  end: 8,  ar: ["هادو أسماء تجارية،", "كل مخبر يسمّي على كيفو"], fr: ["Ce sont des noms de marque :", "chaque laboratoire choisit le sien"], say: "هذه أسماء تجارية، ولكل مخبر اسمه." },
    { start: 8,  end: 12, ar: ["دوليبران، إيفيرالقان، دافالقان..."], fr: ["Doliprane, Efferalgan, Dafalgan…"], say: "دوليبران، إيفيرالغان، دافالغان" },
    { start: 12, end: 17, ar: ["لكن داخلهم كاين", "نفس المادة الفعالة"], fr: ["Mais à l'intérieur, il y a", "la même substance active"], say: "لكن في داخلها جميعًا المادة الفعالة نفسها." },
    { start: 17, end: 22, ar: ["هادي هي الـ DCI:", "باراسيتامول"], fr: ["C'est la DCI :", "le paracétamol"], say: "هذه هي DCI، أي المادة الفعالة: الباراسيتامول." },
    { start: 22, end: 26, ar: ["إذا تاخذ زوج منهم", "في نفس الوقت…"], fr: ["Si tu prends deux de ces produits", "en même temps…"], say: "إذا تناولت اثنين منها في الوقت نفسه،" },
    { start: 26, end: 30, ar: ["تاخذ نفس المادة زوج مرات", "والكبد يتعب"], fr: ["tu prends deux fois la même", "substance : le foie souffre"], say: "فتأخذ المادة نفسها مرتين، ويتأثر الكبد." },
    { start: 30, end: 34, ar: ["قبل ما تشري: اقرا الـ DCI", "وسقسي الصيدلي"], fr: ["Avant d'acheter : lis la DCI", "et demande au pharmacien"], say: "قبل الشراء، اقرأ الـ DCI واسأل الصيدلي." },
    { start: 34, end: 38, ar: ["اكتب الاسم في DwaDZ", "وشوف الـ DCI"], fr: ["Tape le nom sur DwaDZ", "et regarde la DCI"], say: "اكتب الاسم في DwaDZ وشاهد الـ DCI." },
    { start: 38, end: 42, ar: ["معلومة عامة، ما تعوضش", "رأي الطبيب ولا الصيدلي"], fr: ["Information générale : elle ne remplace", "pas l'avis du médecin ou du pharmacien"], say: "معلومة عامة لا تغني عن الطبيب أو الصيدلي." },
  ];
  const G = {};
  const BR = [
    { name: "DOLIPRANE", c: "#ff6b6b", x: 230 },
    { name: "EFFERALGAN", c: "#4dabf7", x: 540 },
    { name: "DAFALGAN", c: "#51cf66", x: 850 },
  ];
  const CAP = { x: 540, y: 1130 };

  function init(svg, h) {
    const defs = h.el("defs", {}, svg);
    const g = h.el("linearGradient", { id: "bg", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    h.el("stop", { offset: 0, "stop-color": "#0f4c5c" }, g);
    h.el("stop", { offset: 1, "stop-color": "#071f29" }, g);
    h.el("rect", { width: 1080, height: 1920, fill: "url(#bg)" }, svg);
    G.bubbles = [...Array(9)].map((_, i) => h.el("circle", { r: 20 + (i * 17) % 50, fill: "#fff", "fill-opacity": .06 }, svg));
    G.logo = h.el("text", { x: 540, y: 120, "text-anchor": "middle", fill: "#ffd166", "font-size": 54 }, svg);
    G.logo.textContent = "DwaDZ";

    G.title = h.el("g", {}, svg);
    const t1 = h.el("text", { x: 0, y: 0, "text-anchor": "middle", direction: "rtl", fill: "#fff", "font-size": 104 }, G.title); t1.textContent = "نفس الدوا";
    const t2 = h.el("text", { x: 0, y: 130, "text-anchor": "middle", direction: "rtl", fill: "#ffd166", "font-size": 104 }, G.title); t2.textContent = "بزاف سميات؟";
    G.q = h.el("text", { x: 0, y: 0, "text-anchor": "middle", fill: "#ff6b6b", "font-size": 340 }, svg); G.q.textContent = "?";

    // Boîtes de marque (personnages)
    G.boxes = BR.map((b) => {
      const gr = h.el("g", {}, svg);
      h.el("rect", { x: -150, y: -110, width: 300, height: 220, rx: 50, fill: b.c, stroke: "#fff", "stroke-width": 8 }, gr);
      const nm = h.el("text", { x: 0, y: -48, "text-anchor": "middle", fill: "#fff", "font-size": 40 }, gr); nm.textContent = b.name;
      G.eyes = G.eyes || [];
      const eyes = [-45, 45].map((dx) => {
        h.el("ellipse", { cx: dx, cy: 10, rx: 24, ry: 28, fill: "#fff" }, gr);
        return h.el("circle", { cx: dx, cy: 14, r: 12, fill: "#222" }, gr);
      });
      const lids = [-45, 45].map((dx) => h.el("rect", { x: dx - 26, y: -20, width: 52, height: 0, fill: b.c }, gr));
      const mouth = h.el("path", { d: "M-40 62 Q0 100 40 62", stroke: "#fff", "stroke-width": 9, fill: "none", "stroke-linecap": "round" }, gr);
      return { gr, eyes, lids, mouth };
    });
    G.tag = h.el("g", {}, svg);
    h.el("rect", { x: -250, y: -48, width: 500, height: 96, rx: 48, fill: "#ffd166" }, G.tag);
    const tg = h.el("text", { x: 0, y: 24, "text-anchor": "middle", direction: "rtl", fill: "#222", "font-size": 54 }, G.tag); tg.textContent = "أسماء تجارية";

    // Flèches vers la capsule
    G.arrows = BR.map((b) => h.el("path", { d: `M${b.x} 760 Q${(b.x + CAP.x) / 2} 900 ${CAP.x} 1010`, stroke: "#fff", "stroke-width": 10, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "700", "stroke-dashoffset": "700", opacity: .85 }, svg));
    // Capsule DCI
    G.cap = h.el("g", {}, svg);
    h.el("rect", { x: -230, y: -80, width: 460, height: 160, rx: 80, fill: "#fff" }, G.cap);
    h.el("path", { d: "M0 -80 H150 A80 80 0 0 1 150 80 H0 Z", fill: "#ff9f1c" }, G.cap);
    const ct = h.el("text", { x: 0, y: 14, "text-anchor": "middle", fill: "#111", "font-size": 52 }, G.cap); ct.textContent = "PARACETAMOL";
    G.dci = h.el("g", {}, svg);
    h.el("rect", { x: -170, y: -50, width: 340, height: 100, rx: 50, fill: "#e03131" }, G.dci);
    const dt = h.el("text", { x: 0, y: 24, "text-anchor": "middle", fill: "#fff", "font-size": 62 }, G.dci); dt.textContent = "DCI";
    G.dciAr = h.el("text", { x: 540, y: 1330, "text-anchor": "middle", direction: "rtl", fill: "#fff", "font-size": 66 }, svg); G.dciAr.textContent = "المادة الفعالة";

    // Foie
    G.liver = h.el("g", {}, svg);
    G.livBody = h.el("path", { d: "M-190 -40 Q-190 -130 -60 -120 Q120 -110 200 -40 Q215 20 120 80 Q10 130 -110 80 Q-195 45 -190 -40 Z", fill: "#a8503c", stroke: "#fff", "stroke-width": 8 }, G.liver);
    G.livFace = h.el("g", {}, G.liver);
    [-50, 40].forEach((dx) => { h.el("circle", { cx: dx, cy: -10, r: 16, fill: "#fff" }, G.livFace); h.el("circle", { cx: dx, cy: -8, r: 7, fill: "#222" }, G.livFace); });
    G.livMouth = h.el("path", { d: "M-40 45 Q0 15 40 45", stroke: "#fff", "stroke-width": 8, fill: "none", "stroke-linecap": "round" }, G.livFace);
    G.livLabel = h.el("text", { x: 0, y: 200, "text-anchor": "middle", direction: "rtl", fill: "#fff", "font-size": 66 }, G.liver); G.livLabel.textContent = "الكبد";
    G.pills = [0, 1].map(() => { const p = h.el("g", {}, svg); h.el("rect", { x: -60, y: -26, width: 120, height: 52, rx: 26, fill: "#fff" }, p); h.el("path", { d: "M0 -26 H34 A26 26 0 0 1 34 26 H0 Z", fill: "#ff9f1c" }, p); return p; });
    G.warn = h.el("text", { x: 0, y: 0, "text-anchor": "middle", "font-size": 190 }, svg); G.warn.textContent = "⚠️";
    G.sweat = h.el("text", { x: 0, y: 0, "text-anchor": "middle", "font-size": 90 }, svg); G.sweat.textContent = "💦";
    G.x2 = h.el("text", { x: 540, y: 440, "text-anchor": "middle", fill: "#ff6b6b", "font-size": 84, direction: "rtl" }, svg); G.x2.textContent = "نفس الـ DCI = جرعة ×2";

    // Barre de recherche DwaDZ
    G.search = h.el("g", {}, svg);
    h.el("rect", { x: -400, y: -64, width: 800, height: 128, rx: 64, fill: "#fff" }, G.search);
    G.typed = h.el("text", { x: -350, y: 22, fill: "#222", "font-size": 62 }, G.search);
    h.el("text", { x: 330, y: 24, "text-anchor": "middle", "font-size": 64 }, G.search).textContent = "🔍";
    G.result = h.el("g", {}, svg);
    h.el("rect", { x: -400, y: -80, width: 800, height: 160, rx: 36, fill: "#2f9e44" }, G.result);
    const r1 = h.el("text", { x: 0, y: -8, "text-anchor": "middle", fill: "#fff", "font-size": 50 }, G.result); r1.textContent = "DOLIPRANE";
    const r2 = h.el("text", { x: 0, y: 52, "text-anchor": "middle", fill: "#fff", "font-size": 54 }, G.result); r2.textContent = "DCI : PARACETAMOL";
    G.url = h.el("text", { x: 540, y: 1330, "text-anchor": "middle", fill: "#ffd166", "font-size": 58 }, svg); G.url.textContent = "dzair-pharma.net";
  }

  function update(t, h) {
    const { prog, outBack, outCubic, place, inOut } = h;
    // bulles
    G.bubbles.forEach((b, i) => { b.setAttribute("cx", 100 + (i * 131) % 900 + Math.sin(t * .6 + i) * 30); b.setAttribute("cy", 1900 - ((t * (30 + i * 9) + i * 210) % 2000)); });
    const sc = (a, b) => { const p = prog(t, a, b); return p <= 0 ? 0 : outBack(p); };
    const fade = (a, b) => outCubic(prog(t, a, b));
    const out = (a, b) => 1 - outCubic(prog(t, a, b));

    // A : question
    const a = sc(0, 1.2) * out(3.4, 4.2);
    place(G.title, 540, 640, Math.max(a, 0.001), 0, a ? 1 : 0);
    place(G.q, 540, 1250 + Math.sin(t * 5) * 18, Math.max(a, .001), Math.sin(t * 3) * 6, a ? 1 : 0);

    // B : boîtes
    const boxOut = out(30, 31);
    G.boxes.forEach((b, i) => {
      const bs = sc(4 + i * 1.2, 5.2 + i * 1.2);
      const moveUp = inOut(prog(t, 12, 13.2)); // remontent un peu
      const bob = Math.sin(t * 3 + i) * 10;
      const y = 700 - moveUp * 80 + bob + (t > 22 && t < 30 ? 0 : 0);
      place(b.gr, BR[i].x, y, bs * (1 - moveUp * .12), Math.sin(t * 2 + i) * 3, bs ? boxOut : 0);
      // clignement
      const blink = (t * 1.3 + i * .7) % 3 < .12 ? 1 : 0;
      b.lids.forEach((l) => l.setAttribute("height", blink ? 56 : 0));
      b.mouth.setAttribute("d", t > 22 && t < 30 ? "M-40 90 Q0 55 40 90" : "M-40 62 Q0 100 40 62");
    });
    place(G.tag, 540, 940, sc(5, 6) * out(11.5, 12.3), 0, sc(5, 6) ? 1 : 0);

    // C : flèches + capsule + DCI
    G.arrows.forEach((ar, i) => {
      const p = outCubic(prog(t, 12.5 + i * .5, 14.5 + i * .5));
      ar.setAttribute("stroke-dashoffset", 700 * (1 - p));
      ar.setAttribute("opacity", .85 * out(31, 32));
    });
    const capIn = sc(14.5, 16);
    place(G.cap, CAP.x, CAP.y + Math.sin(t * 4) * 8, capIn * (1 - prog(t, 22, 23) * .35), Math.sin(t * 2) * 4, capIn ? out(22.5, 23.5) * 1 + (t > 30 ? 0 : 0) : 0);
    place(G.dci, 540, 1000 + (t < 22 ? 0 : 0), sc(17, 18.4) , 0, sc(17, 18.4) ? out(22, 23) : 0);
    G.dciAr.setAttribute("opacity", fade(18.4, 19.6) * out(22, 23));

    // D : surdosage
    const dIn = fade(22, 23) * out(29.4, 30.2);
    place(G.liver, 540, 1150 + Math.sin(t * 8) * (t > 26 ? 8 : 0), sc(22.5, 24) * (t < 30 ? 1 : 0), t > 26 ? Math.sin(t * 9) * 4 : 0, dIn);
    const red = prog(t, 26, 28);
    G.livBody.setAttribute("fill", `rgb(${168 + red * 70},${80 - red * 40},${60 - red * 30})`);
    G.livMouth.setAttribute("d", red > .3 ? "M-40 55 Q0 15 40 55" : "M-40 45 Q0 15 40 45");
    G.pills.forEach((p, i) => {
      const p0 = 24 + i * .6, pr = prog(t, p0, p0 + 1.2);
      place(p, BR[i].x + (540 - BR[i].x) * pr * (1 - 0) , 800 + (1100 - 800) * outCubic(pr), 1, pr * 540, pr > 0 && pr < 1 ? dIn || 1 : 0);
    });
    place(G.warn, 790, 1020, sc(26, 27) * (t < 30 ? 1 : 0), Math.sin(t * 10) * 8, t > 26 && t < 30 ? 1 : 0);
    place(G.sweat, 300, 1020, sc(27, 28) * (t < 30 ? 1 : 0), 0, t > 27 && t < 30 ? 1 : 0);
    G.x2.setAttribute("opacity", fade(25, 26) * out(29.4, 30.2));

    // E : appel
    const search = sc(30.5, 31.8) ;
    place(G.search, 540, 900, search, 0, search ? 1 : 0);
    const word = "DOLIPRANE";
    G.typed.textContent = word.slice(0, Math.floor(prog(t, 33, 35) * (word.length + .99)));
    place(G.result, 540, 1130, sc(35.5, 36.8), 0, sc(35.5, 36.8) ? 1 : 0);
    G.url.setAttribute("opacity", fade(37, 38));
  }
  return { duration: 42, subs, init, update };
})();
