/*!
 * dwadz-icons : libellé de forme galénique -> icône de base + modificateurs + pastilles de voie.
 * Généré par rules_src.py (ne pas éditer à la main : modifier rules_src.py puis relancer `python3 rules_src.py`).
 *
 * Usage navigateur :
 *   DwaIcons.html("COMPRIME PELLICULE A LIBERATION PROLONGEE", { codes: ["20053000"], lang: "fr", size: 40 })
 *   DwaIcons.classify("SIROP")  ->  { base:"bottle_cup", mods:[], routes:["oral"], ... }
 * Le sprite icons.svg doit être inliné dans la page, ou référencé via { sprite: "/img/icons.svg" }.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DwaIcons = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var R = /*__RULES__*/null;
  var has = Object.prototype.hasOwnProperty;

  var pre = R.pre.map(function (p) { return [new RegExp(p[0], "g"), p[1]]; });
  var baseRules = R.base_rules.map(function (r) {
    return { icon: r.icon, re: new RegExp(r.re), not: r.not ? new RegExp(r.not) : null };
  });
  var modRules = R.modifiers.map(function (m) {
    return { id: m.id, re: new RegExp(m.re), bases: m.bases || null, notBases: m.not_bases || null };
  });
  var hints = R.route_hints.map(function (h) { return { route: h.route, re: new RegExp(h.re) }; });

  function normalize(raw) {
    var s = String(raw == null ? "" : raw).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    for (var i = 0; i < pre.length; i++) s = s.replace(pre[i][0], pre[i][1]);
    s = s.replace(/[^A-Z0-9/]+/g, " ").trim();
    if (!s) return "";
    return s.split(/\s+/).map(function (t) { return has.call(R.tokens, t) ? R.tokens[t] : t; }).join(" ");
  }

  function classify(raw, edqmCodes) {
    var s = normalize(raw), base = R.fallback_icon, i, j;
    for (i = 0; i < baseRules.length; i++) {
      var r = baseRules[i];
      if (r.re.test(s) && !(r.not && r.not.test(s))) { base = r.icon; break; }
    }
    var mods = [];
    for (i = 0; i < modRules.length; i++) {
      var m = modRules[i];
      if (m.bases && m.bases.indexOf(base) < 0) continue;
      if (m.notBases && m.notBases.indexOf(base) >= 0) continue;
      if (m.re.test(s)) mods.push(m.id);
    }
    if (has.call(R.implicit_mods, base)) mods = R.implicit_mods[base].concat(mods);

    var routes = [], source;
    if (edqmCodes && edqmCodes.length) {
      for (i = 0; i < edqmCodes.length; i++) routes.push(has.call(R.edqm_route, edqmCodes[i]) ? R.edqm_route[edqmCodes[i]] : "other");
      source = "edqm";
    } else {
      for (i = 0; i < hints.length; i++) if (hints[i].re.test(s)) routes.push(hints[i].route);
      if (!routes.length && has.call(R.default_route, base)) routes = [R.default_route[base]];
      source = "libelle";
    }
    var seen = [];
    for (j = 0; j < routes.length; j++) if (seen.indexOf(routes[j]) < 0) seen.push(routes[j]);

    var flags = [];
    if (/INJECTABLE/.test(s) && /BUVABLE/.test(s)) flags.push("multi-forme");
    if (base === R.fallback_icon) flags.push("non-illustre");
    return { norm: s, base: base, mods: mods, routes: seen, routeSource: source, flags: flags };
  }

  function label(kind, id, lang) {
    var t = R.labels[kind][id];
    return t ? t[lang === "ar" ? 1 : 0] : id;
  }

  function altText(info, lang) {
    var sep = lang === "ar" ? "، " : ", ";
    var parts = [label("base", info.base, lang)];
    info.routes.forEach(function (r) { parts.push(label("route", r, lang)); });
    info.mods.forEach(function (m) { parts.push(label("mod", m, lang)); });
    return parts.join(sep);
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

  /** Rend une icône composée (HTML). opts : { lang:"fr"|"ar", size:40, sprite:"", maxRoutes:2, maxMods:2 } */
  function render(info, opts) {
    opts = opts || {};
    var sprite = opts.sprite || "", size = opts.size || 40;
    var maxR = opts.maxRoutes == null ? 2 : opts.maxRoutes, maxM = opts.maxMods == null ? 2 : opts.maxMods;
    function use(id, cls) {
      return '<svg class="' + cls + '" viewBox="0 0 ' + (cls === "dz-base" ? 48 : 24) + " " + (cls === "dz-base" ? 48 : 24) +
        '" aria-hidden="true" focusable="false"><use href="' + sprite + "#" + id + '"/></svg>';
    }
    var alt = altText(info, opts.lang);
    var routes = info.routes.slice(0, maxR).map(function (r) { return use("r-" + r, "dz-route"); }).join("");
    // sous 28 px, les modificateurs sont illisibles : on ne garde que la forme et la voie
    if (size < 28) maxM = 0;
    var mods = info.mods.slice(0, maxM).map(function (m) { return use("m-" + m, "dz-mod"); }).join("");
    return '<span class="dz-ico" role="img" aria-label="' + esc(alt) + '" title="' + esc(alt) + '" style="--dz-size:' + size + 'px">' +
      use("f-" + info.base, "dz-base") +
      (mods ? '<span class="dz-mods">' + mods + "</span>" : "") +
      (routes ? '<span class="dz-routes">' + routes + "</span>" : "") + "</span>";
  }

  function html(forme, opts) { return render(classify(forme, opts && opts.codes), opts); }

  return { normalize: normalize, classify: classify, render: render, html: html, altText: altText, rules: R };
});
