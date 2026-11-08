// Moteur de scènes (dessin animé) piloté par window.SPEC. Chaque segment = une scène : hook, card, list, steps, search, warn, compare, logo.
(function () {
  const S = window.SPEC, T = window.specToEP(S);
  const G = { scenes: [], imgs: [] };
  const BG = ["#0f4c5c", "#071f29"];

  function init(svg, h) {
    const { el, outBack, outCubic, prog, place } = h;
    const defs = el("defs", {}, svg), g = el("linearGradient", { id: "bg", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: 0, "stop-color": BG[0] }, g); el("stop", { offset: 1, "stop-color": BG[1] }, g);
    el("rect", { width: 1080, height: 1920, fill: "url(#bg)" }, svg);
    G.bubbles = [...Array(9)].map((_, i) => el("circle", { r: 20 + (i * 17) % 50, fill: "#fff", "fill-opacity": .06 }, svg));
    el("text", { x: 540, y: 120, "text-anchor": "middle", fill: "#ffd166", "font-size": 54 }, svg).textContent = "DwaDZ";
    el("rect", { x: 160, y: 160, width: 760, height: 8, rx: 4, fill: "#fff", "fill-opacity": .15 }, svg);
    G.bar = el("rect", { x: 160, y: 160, width: 0, height: 8, rx: 4, fill: "#ffd166" }, svg);

    const txt = (p, s, a) => { const e = el("text", a, p); e.textContent = s; return e; };
    const emoji = (p, ch, fs, y = 0, x = 0) => txt(p, ch, { x, y: y + fs * 0.36, "text-anchor": "middle", "font-size": fs, fill: "#fff" });
    const FIT = G.fit = [];
    const reg = (e, w) => { if (w) FIT.push([e, w]); return e; };
    const ar = (p, s, fs, y, fill = "#fff", x = 0, w) => reg(txt(p, s, { x, y, "text-anchor": "middle", direction: "rtl", fill, "font-size": s.length > 22 ? Math.round(fs * 0.78) : fs }), w);
    const fr = (p, s, fs, y, fill = "#ffe08a", x = 0, w) => reg(txt(p, s, { x, y, "text-anchor": "middle", fill, "font-size": s.length > 40 ? Math.round(fs * 0.8) : fs }), w);

    // ── mascotte : une pilule à visage qui réagit (humeur du segment) ──
    G.mascot = el("g", {}, svg);
    el("rect", { x: -120, y: -52, width: 240, height: 104, rx: 52, fill: "#fff", stroke: "#fff", "stroke-width": 4 }, G.mascot);
    el("path", { d: "M0 -52 H68 A52 52 0 0 1 68 52 H0 Z", fill: "#ff9f1c" }, G.mascot);
    G.pup = [-44, 14].map((dx) => { el("ellipse", { cx: dx, cy: -6, rx: 16, ry: 19, fill: "#fff", stroke: "#bbb", "stroke-width": 3 }, G.mascot); return el("circle", { cx: dx + 2, cy: -2, r: 8, fill: "#222" }, G.mascot); });
    G.mouth = el("path", { d: "M-38 22 Q-15 42 8 22", stroke: "#333", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, G.mascot);

    S.segments.forEach((_, i) => {
      const seg = T.segs[i], v = seg.v || {}, c = v.c || "#4dabf7";
      const g0 = el("g", { opacity: 0 }, svg), sc = { g: g0, seg, tick: () => {} };
      const k = v.k || "card";
      if (k === "hook") {
        const e = el("g", {}, g0); emoji(e, v.icon || "💊", 330);
        const t1 = el("g", {}, g0); if (v.t) ar(t1, v.t, 96, 0, "#ffd166", 0, 960); if (v.f) fr(t1, v.f, 46, 70, "#fff", 0, 960);
        sc.tick = (u) => { const s = outBack(prog(u, 0.1, 0.9)); place(e, 540, 800 + Math.sin(u * 3) * 16, s, Math.sin(u * 2) * 5, s ? 1 : 0); place(t1, 540, 1130, 1, 0, outCubic(prog(u, 0.6, 1.2))); };
      } else if (k === "card") {
        const cd = el("g", {}, g0);
        el("rect", { x: -450, y: -290, width: 900, height: 580, rx: 64, fill: "#102f3b", stroke: c, "stroke-width": 12 }, cd);
        const ic = el("g", {}, cd); emoji(ic, v.icon || "💡", 230, -105);
        ar(cd, v.t || "", 80, 130, "#fff", 0, 830); if (v.f) fr(cd, v.f, 42, 205, "#ffe08a", 0, 840);
        sc.tick = (u) => { const s = outBack(prog(u, 0.1, 0.8)); place(cd, 540, 820, s, 0, s ? 1 : 0); place(ic, 0, 0, 1 + Math.sin(u * 4) * 0.03, Math.sin(u * 3) * 3, 1); };
      } else if (k === "list" || k === "steps") {
        const items = v.items || [], rows = items.map((it, j) => {
          const r = el("g", {}, g0);
          el("rect", { x: -470, y: -78, width: 940, height: 156, rx: 40, fill: "#102f3b", stroke: it.c || c, "stroke-width": 8 }, r);
          el("circle", { cx: -380, cy: 0, r: 56, fill: it.c || c }, r);
          if (k === "steps") txt(r, String(j + 1), { x: -380, y: 28, "text-anchor": "middle", fill: "#111", "font-size": 76 }); else emoji(r, it.i || "•", 76, 0, -380);
          ar(r, it.t, 54, it.f ? 6 : 20, "#fff", 80, 700); if (it.f) fr(r, it.f, 30, 52, "#ffe08a", 80, 700);
          return r;
        });
        sc.tick = (u, d) => { const st = Math.min(1.1, Math.max(0.35, (d - 1.4) / Math.max(items.length, 1)));
          rows.forEach((r, j) => { const s = outBack(prog(u, 0.2 + j * st, 0.8 + j * st)); place(r, 540, 560 + j * (items.length > 3 ? 175 : 200), s, 0, s ? 1 : 0); }); };
      } else if (k === "search") {
        const bar = el("g", {}, g0); el("rect", { x: -440, y: -65, width: 880, height: 130, rx: 65, fill: "#fff" }, bar);
        const ty = txt(bar, "", { x: -390, y: 24, fill: "#222", "font-size": (v.q || "").length > 18 ? 44 : 62 }); txt(bar, "🔍", { x: 370, y: 24, "text-anchor": "middle", "font-size": 62 });
        const rs = el("g", {}, g0); el("rect", { x: -440, y: -95, width: 880, height: 190, rx: 40, fill: "#2f9e44" }, rs);
        txt(rs, v.q || "", { x: 0, y: -15, "text-anchor": "middle", fill: "#fff", "font-size": (v.q || "").length > 18 ? 42 : 52 }); txt(rs, v.res || "", { x: 0, y: 52, "text-anchor": "middle", fill: "#fff", "font-size": (v.res || "").length > 24 ? 44 : 56 });
        sc.tick = (u, d) => { // déroulé proportionnel à la durée du segment : saisie, puis résultat visible au moins ~1 s
          const tB = Math.min(1.9, d * 0.42), tC = tB + 0.3;
          const s = outBack(prog(u, 0.1, 0.7)); place(bar, 540, 640, s, 0, s ? 1 : 0); const q = v.q || ""; ty.textContent = q.slice(0, Math.floor(prog(u, 0.6, tB) * (q.length + 0.99)));
          const r = outBack(prog(u, tC, tC + 0.7)); place(rs, 540, 900, r, 0, r ? 1 : 0); };
      } else if (k === "cmpform") { // simulation du formulaire de comparaison : deux saisies, bouton, carte de résultat
        const mkBar = (n, text) => { const b = el("g", {}, g0); el("rect", { x: -440, y: -55, width: 880, height: 110, rx: 55, fill: "#fff" }, b);
          el("circle", { cx: -385, cy: 0, r: 38, fill: "#4dabf7" }, b); txt(b, String(n), { x: -385, y: 20, "text-anchor": "middle", fill: "#fff", "font-size": 52 });
          return { b, t: txt(b, "", { x: -320, y: 22, fill: "#222", "font-size": text.length > 20 ? 46 : 56 }), text }; };
        const A = mkBar(1, v.a), B = mkBar(2, v.b);
        const btn = el("g", {}, g0); el("rect", { x: -190, y: -50, width: 380, height: 100, rx: 50, fill: "#4dabf7", stroke: "#fff", "stroke-width": 6 }, btn); ar(btn, "قارن", 56, 20, "#fff", 40, 220); txt(btn, "⚖️", { x: -110, y: 22, "text-anchor": "middle", "font-size": 52 });
        const R = v.res || {}, rc = el("g", {}, g0); el("rect", { x: -440, y: -150, width: 880, height: 300, rx: 54, fill: "#102f3b", stroke: R.c || "#f76707", "stroke-width": 12 }, rc);
        el("circle", { cx: -320, cy: 0, r: 90, fill: R.c || "#f76707" }, rc); emoji(rc, R.i || "▲", 110, 0, -320); ar(rc, R.t || "", 62, -5, "#fff", 90, 640); if (R.f) fr(rc, R.f, 34, 60, "#ffe08a", 90, 640);
        sc.tick = (u, d) => { const k2 = Math.min(1, (d - 1.2) / 4.6), tA = [0.4 * k2, 1.5 * k2], tB = [1.7 * k2, 2.8 * k2], tBtn = 3.0 * k2, tR = 3.7 * k2;
          const typed = (o, w) => { o.t.textContent = o.text.slice(0, Math.floor(prog(u, w[0], w[1]) * (o.text.length + 0.99))); };
          const sA = outBack(prog(u, 0.1, 0.6)); place(A.b, 540, 560, sA, 0, sA ? 1 : 0); typed(A, tA);
          const sB = outBack(prog(u, 0.3, 0.8)); place(B.b, 540, 720, sB, 0, sB ? 1 : 0); typed(B, tB);
          const sb = outBack(prog(u, tBtn, tBtn + 0.5)); place(btn, 540, 880, sb * (1 + (u > tBtn && u < tBtn + 0.9 ? Math.sin((u - tBtn) * 12) * 0.05 : 0)), 0, sb ? 1 : 0);
          const sr = outBack(prog(u, tR, tR + 0.7)); place(rc, 540, 1130, sr, 0, sr ? 1 : 0); };
      } else if (k === "shot") { // capture d'écran réelle dans un cadre arrondi : la caméra glisse de `from` vers `to`, le surlignage pulse
        const FW = 960, FH = v.fh || 900, CX = 540, CY = 790, id = "clip" + i;
        const cp = el("clipPath", { id }, g0); el("rect", { x: CX - FW / 2, y: CY - FH / 2, width: FW, height: FH, rx: 36 }, cp);
        el("rect", { x: CX - FW / 2, y: CY - FH / 2, width: FW, height: FH, rx: 36, fill: "#fff" }, g0);
        const holder = el("g", { "clip-path": `url(#${id})` }, g0), world = el("g", {}, holder);
        el("image", { href: v.img, x: 0, y: 0, width: v.iw, height: v.ih, preserveAspectRatio: "none" }, world);
        const hls = (v.hl || []).map((r) => el("rect", { x: r[0], y: r[1], width: r[2], height: r[3], rx: 14, fill: "none", stroke: "#ffd166", "stroke-width": 9, "vector-effect": "non-scaling-stroke" }, world));
        el("rect", { x: CX - FW / 2, y: CY - FH / 2, width: FW, height: FH, rx: 36, fill: "none", stroke: "#ffd166", "stroke-width": 6 }, g0);
        G.imgs.push(new Promise((ok) => { const im = new Image(); im.onload = ok; im.onerror = ok; im.src = v.img; }));
        const A = v.from || [0, 0, v.iw, v.ih], B = v.to, ctr = (R) => [R[0] + R[2] / 2, R[1] + R[3] / 2], fit = (R) => Math.min(FW / R[2], FH / R[3]);
        sc.tick = (u, d) => {
          const t = h.inOut(prog(u, 0.2, 1.5)), [ax, ay] = ctr(A), [bx, by] = ctr(B), sa = fit(A), sb = fit(B);
          const z = Math.exp(Math.log(sa) + (Math.log(sb) - Math.log(sa)) * t) * (1 + 0.025 * Math.max(0, u - 1.5) / Math.max(d - 1.5, 1)); // légère dérive après l'arrivée
          const cx = ax + (bx - ax) * t, cy = ay + (by - ay) * t;
          world.setAttribute("transform", `translate(${CX - cx * z} ${CY - cy * z}) scale(${z})`);
          hls.forEach((r, j) => r.setAttribute("stroke-opacity", outCubic(prog(u, 1.2 + j * 0.3, 1.7 + j * 0.3)) * (0.75 + 0.25 * Math.sin(u * 6))));
        };
      } else if (k === "warn") {
        const w = el("g", {}, g0); emoji(w, v.icon || "⚠️", 300);
        const b = el("g", {}, g0); el("rect", { x: -450, y: -80, width: 900, height: 200, rx: 50, fill: v.c || "#e03131" }, b); ar(b, v.t || "", 70, 20, "#fff", 0, 840); if (v.f) fr(b, v.f, 38, 82, "#fff", 0, 840);
        sc.tick = (u) => { const s = outBack(prog(u, 0.1, 0.8)); place(w, 540, 780, s * (1 + Math.sin(u * 7) * 0.05), Math.sin(u * 8) * 5, s ? 1 : 0); place(b, 540, 1130, outCubic(prog(u, 0.5, 1.1)), 0, 1); };
      } else if (k === "compare") {
        const mk = (o, x) => { const q = el("g", {}, g0); el("rect", { x: -215, y: -250, width: 430, height: 500, rx: 56, fill: "#102f3b", stroke: o.c || c, "stroke-width": 10 }, q); emoji(q, o.i, 170, -80); ar(q, o.t, 54, 120, "#fff", 0, 400); if (o.f) fr(q, o.f, 30, 180, "#ffe08a", 0, 400); return q; };
        const a = mk(v.a, -270), b = mk(v.b, 270), m = el("g", {}, g0); txt(m, v.mid || "=", { x: 0, y: 55, "text-anchor": "middle", fill: "#ffd166", "font-size": 130 });
        sc.tick = (u) => { const s1 = outBack(prog(u, 0.1, 0.8)), s2 = outBack(prog(u, 0.5, 1.2)), s3 = outBack(prog(u, 1.0, 1.6)); place(a, 285, 800, s1, 0, s1 ? 1 : 0); place(b, 795, 800, s2, 0, s2 ? 1 : 0); place(m, 540, 800, s3, Math.sin(u * 3) * 4, s3 ? 1 : 0); };
      } else if (k === "logo") {
        const l = el("g", {}, g0); txt(l, "DwaDZ", { x: 0, y: 0, "text-anchor": "middle", fill: "#ffd166", "font-size": 190 }); ar(l, "كل شيء عن دواء البلاد", 76, 120); fr(l, "Tout sur le médicament en Algérie", 42, 190, "#fff"); txt(l, "dzair-pharma.net", { x: 0, y: 290, "text-anchor": "middle", fill: "#ffd166", "font-size": 56 });
        const e = el("g", {}, g0); emoji(e, "💊", 190);
        sc.tick = (u) => { const s = outBack(prog(u, 0.1, 0.9)); place(l, 540, 900, s, 0, s ? 1 : 0); place(e, 540, 620 + Math.sin(u * 3) * 14, s, Math.sin(u * 2) * 6, s ? 1 : 0); };
      }
      sc.hideMascot = k === "logo";
      G.scenes.push(sc);
    });
  }

  function update(t, h) {
    const { prog, outCubic, place } = h;
    G.bubbles.forEach((b, i) => { b.setAttribute("cx", 100 + (i * 131) % 900 + Math.sin(t * .6 + i) * 30); b.setAttribute("cy", 1900 - ((t * (30 + i * 9) + i * 210) % 2000)); });
    G.bar.setAttribute("width", Math.max(0, Math.min(1, t / T.duration)) * 760);
    let mood = "happy", mascotOn = true;
    G.scenes.forEach((sc) => {
      const u = t - sc.seg.start, d = sc.seg.d, on = u >= 0 && u < d;
      const a = on ? outCubic(prog(u, 0, 0.35)) * (1 - outCubic(prog(u, d - 0.3, d))) : 0;
      sc.g.setAttribute("opacity", a); sc.g.setAttribute("display", on ? "" : "none");
      if (on) { sc.tick(u, d); mood = sc.seg.mood || "happy"; mascotOn = !sc.hideMascot; }
    });
    place(G.mascot, 170, 1380 + Math.sin(t * 3) * 8, 0.55, Math.sin(t * 2) * 4, mascotOn ? 1 : 0);
    const mp = { happy: "M-38 22 Q-15 42 8 22", worried: "M-34 38 Q-15 14 4 38", think: "M-36 28 L2 28", surprised: "M-24 22 Q-15 46 -6 22 Z" }[mood] || "M-38 22 Q-15 42 8 22";
    G.mouth.setAttribute("d", mp); G.pup.forEach((p) => p.setAttribute("r", mood === "surprised" ? 11 : 8));
  }
  // Une fois les polices chargées : réduit tout texte plus large que son cadre (appelé par engine.html).
  async function afterFonts() { (G.fit || []).forEach(([e, w]) => { const l = e.getComputedTextLength(); if (l > w) e.setAttribute("font-size", Math.floor(+e.getAttribute("font-size") * w / l)); });
    if (G.imgs.length) { await Promise.all(G.imgs); await new Promise((r) => setTimeout(r, 300)); } // captures chargées et décodées avant la première image
  }
  window.EP = { duration: T.duration, subs: T.subs, init, update, afterFonts };
})();
