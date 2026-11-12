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
  var R = {"pre": [["\\s*/\\s*", "/"], ["\\bP\\.?/", "POUR "], ["\\bS[./]C\\b", "SC"], ["\\bI[./]V\\b", "IV"], ["\\bI[./]M\\b", "IM"], ["\\bI[./]P\\b", "IP"], ["\\bLYOPH\\w*", "LYOPHILISAT"], ["\\bLYPH\\w*", "LYOPHILISAT"], ["\\bLYOP\\w*", "LYOPHILISAT"], ["\\bPOUDREC", "POUDRE "], ["\\bCOM?P?R?[IM]+[A-Z0-9]*(ME|PE)S?\\b", "COMPRIME"], ["\\bCOMPRIM2\\b", "COMPRIME"], ["\\bCOMPRIMES\\b", "COMPRIME"], ["\\b0 DILUER", "A DILUER"]], "tokens": {"COMRIME": "COMPRIME", "COMRPIME": "COMPRIME", "COPRIME": "COMPRIME", "COMPRIMPE": "COMPRIME", "COMP": "COMPRIME", "DRG": "DRAGEE", "PDRE": "POUDRE", "PDRES": "POUDRE", "SOL": "SOLUTION", "SOLUT": "SOLUTION", "SO": "SOLUTION", "SIOLUTION": "SOLUTION", "SOLOTION": "SOLUTION", "SUSP": "SUSPENSION", "SUS": "SUSPENSION", "SUSPENSSION": "SUSPENSION", "INJ": "INJECTABLE", "PERF": "PERFUSION", "PER": "PERFUSION", "PERFEUSION": "PERFUSION", "PERFUSIN": "PERFUSION", "BUV": "BUVABLE", "BUVALE": "BUVABLE", "BUVABE": "BUVABLE", "LIB": "LIBERATION", "PRO": "PROLONGEE", "LP": "LIBERATION PROLONGEE", "PROLONGE": "PROLONGEE", "AMP": "AMPOULE", "GTTES": "GOUTTES", "GOUTES": "GOUTTES", "GOUTTESL": "GOUTTES", "GLES": "GELULES", "GELLULE": "GELULE", "GELLULES": "GELULES", "MICRGLES": "MICROGRANULES", "GASTO": "GASTRO", "NAS": "NASALE", "PUL": "PULVERISATION", "PULV": "PULVERISATION", "AURIC": "AURICULAIRE", "AURC": "AURICULAIRE", "OPHT": "OPHTALMIQUE", "DERM": "DERMIQUE", "INHAL": "INHALATION", "INHA": "INHALATION", "NEB": "NEBULISEUR", "AERO": "AEROSOL", "SERING": "SERINGUE", "PREREMPL": "PREREMPLIE", "PREREMPLI": "PREREMPLIE", "PREREMLIE": "PREREMPLIE", "SOLV": "SOLVANT", "SOLVT": "SOLVANT", "CONC": "CONCENTRE", "COLLY": "COLLYRE", "P": "POUR", "PR": "POUR", "POR": "POUR", "POU": "POUR", "POIUR": "POUR", "OR": "ORALE", "REC": "RECTALE", "RECT": "RECTALE", "SPYAY": "SPRAY", "APPL": "APPLICATION", "APPLIC": "APPLICATION", "APPLI": "APPLICATION", "APP": "APPLICATION", "DIL": "DILUER", "DILIER": "DILUER", "DISPERS": "DISPERSIBLE", "ENRO": "ENROBE", "INST": "INSTILLATION", "FL": "FLACON", "SEC": "SECABLE"}, "base_rules": [{"icon": "tin", "re": "^(LAIT|POUDRE (A RECONSTITUER )?POUR (ENFANTS?|NOURRISSONS?))"}, {"icon": "canister", "re": "\\bDIALYSE\\b|HEMODIALYSE|HEMOFILTRATION"}, {"icon": "implant", "re": "^(IMPLANT|SYSTEME)"}, {"icon": "patch", "re": "^PATCH|EMPLATRE"}, {"icon": "gas", "re": "^GAZ"}, {"icon": "sachet", "re": "\\bSACHETS?\\b|\\bSTICK\\b"}, {"icon": "tube", "re": "^(CREME|POMMADE|GEL|BAUME|EMULSION GEL)\\b"}, {"icon": "vial_powder", "re": "(POUDRE|LYOPHILISAT).*(INJECTABLE|PERFUSION|PARENT|SOLVANT|PREPARATION)|^POUDRE LYOPHILISAT|^LYOPHILISAT$", "not": "BUVABLE|ORALE|INHALATION"}, {"icon": "vial", "re": "^SOLVANT"}, {"icon": "pen", "re": "\\bSTYLO\\b|CARTOUCHES?\\b"}, {"icon": "prefilled_syringe", "re": "SERINGUE"}, {"icon": "iv_bag", "re": "PERFUSION"}, {"icon": "syringe", "re": "INJECTABLE|INJECTION|PARENT"}, {"icon": "ampoule", "re": "AMPOULE"}, {"icon": "bottle_cup", "re": "BAIN (DE )?BOUCHE|COLLUTOIRE|GINGIVAL"}, {"icon": "dropper", "re": "COLLYRE|GOUTTES|AURICULAIRE|OCULAIRE|OPHTALMIQUE|INSTILLATION", "not": "TRACHE"}, {"icon": "nebulizer", "re": "NEBULISEUR|VAPEUR"}, {"icon": "inhaler", "re": "INHALATION|INHALATEUR"}, {"icon": "spray", "re": "PULVERISATION|SPRAY|AEROSOL|\\bNASALE?\\b"}, {"icon": "suppository", "re": "SUPPOSITOIRE"}, {"icon": "ovule", "re": "\\bOVULE"}, {"icon": "softcap", "re": "CAPSULES? MOLLES?"}, {"icon": "bottle_powder", "re": "^(POUDRE|GRANULES?)\\b", "not": "GELULE|INHALATION|INJECTABLE|PERFUSION"}, {"icon": "capsule", "re": "GELULES?|CAPSULES?|MICRO ?GRANULES?|MINI COMPRIME"}, {"icon": "tablet_melt", "re": "ORODISPERSIBLE|A SUCER|A CROQUER|LYOPHILISAT ORALE?"}, {"icon": "tablet_dissolve", "re": "\\bEFFERVESCENTS?\\b|\\bDISPERSIBLE\\b"}, {"icon": "tablet", "re": "COMPRIME|DRAGEE"}, {"icon": "bottle_cup", "re": "SIROP|BUVABLE|ORALE"}, {"icon": "lotion", "re": "APPLICATION|DERMIQUE|CUTANEE|USAGE EXTERNE|LOTION|SHAMPOING|VERNIS|MOUSSE|HYDROALCOOLIQUE|ANTISEPTIQUE"}], "fallback_icon": "generic", "modifiers": [{"id": "lp", "re": "LIBERATION (PROLONG|MODIFIEE|RETARDEE)\\w*|DIFFUSION LENTE|DOUBLE LIBERATION"}, {"id": "gr", "re": "GAST\\w*\\s?RESIST"}, {"id": "score", "re": "SECABLE|BARRE DE CASSURE", "bases": ["tablet", "tablet_dissolve", "tablet_melt"]}, {"id": "dilute", "re": "A DILUER|CONCENTRE", "bases": ["iv_bag", "vial_powder", "syringe"]}, {"id": "child", "re": "\\bENFANTS?\\b|NOURRISSONS?", "not_bases": ["tin"]}], "implicit_mods": {"vial_powder": ["reconst"], "bottle_powder": ["reconst"]}, "route_hints": [{"route": "iv", "re": "\\bIV\\b|INTRAVEIN|INTRAVASC|PERFUSION"}, {"route": "im", "re": "\\bIM\\b|INTRAMUSC"}, {"route": "sc", "re": "\\bSC\\b|SOUS CUTAN"}, {"route": "eye", "re": "OPHTALMIQUE|OCULAIRE|COLLYRE"}, {"route": "ear", "re": "AURICULAIRE"}, {"route": "nasal", "re": "NASAL"}, {"route": "inhaled", "re": "INHALATION|AEROSOL|NEBULISEUR"}, {"route": "rectal", "re": "RECTAL|SUPPOSITOIRE"}, {"route": "vaginal", "re": "VAGINAL|\\bOVULE"}, {"route": "buccal", "re": "BUCCAL|GINGIVAL|BAIN (DE )?BOUCHE"}, {"route": "dialysis", "re": "\\bDIALYSE\\b|HEMODIALYSE|HEMOFILTRATION"}, {"route": "transdermal", "re": "^PATCH"}, {"route": "cutaneous", "re": "CUTANEE|DERMIQUE|APPLICATION LOCALE"}, {"route": "oral", "re": "BUVABLE|ORALE"}], "default_route": {"tablet": "oral", "tablet_dissolve": "oral", "tablet_melt": "oral", "capsule": "oral", "softcap": "oral", "sachet": "oral", "bottle_powder": "oral", "bottle_cup": "oral", "ampoule": "oral", "tube": "cutaneous", "lotion": "cutaneous", "patch": "transdermal", "suppository": "rectal", "ovule": "vaginal", "inhaler": "inhaled", "nebulizer": "inhaled", "gas": "inhaled", "iv_bag": "iv", "canister": "dialysis"}, "edqm_route": {"20053000": "oral", "20045000": "iv", "20003000": "cutaneous", "20051000": "eye", "20035000": "im", "20066000": "sc", "20020000": "inhaled", "20061000": "rectal", "20049000": "nasal", "20072000": "vaginal", "20054000": "buccal", "20015000": "dialysis", "20001000": "ear", "20009000": "other", "20038000": "other", "20047000": "other", "20046000": "other", "20067000": "buccal", "20070000": "transdermal", "20044000": "other", "20032000": "other", "20042000": "other"}, "labels": {"base": {"tablet": ["Comprimé", "قرص"], "tablet_dissolve": ["Comprimé à dissoudre dans l'eau", "قرص يذاب في الماء"], "tablet_melt": ["Comprimé à croquer, sucer ou orodispersible", "قرص للمضغ أو المص أو سريع الذوبان"], "capsule": ["Gélule", "كبسولة"], "softcap": ["Capsule molle", "كبسولة هلامية لينة"], "sachet": ["Sachet ou stick", "كيس أو ظرف"], "bottle_powder": ["Poudre à reconstituer (flacon)", "مسحوق يُحضَّر قبل الاستعمال"], "bottle_cup": ["Liquide buvable (flacon)", "سائل للشرب (قارورة)"], "ampoule": ["Ampoule buvable", "أمبولة للشرب"], "dropper": ["Flacon compte-gouttes", "قارورة قطرات"], "spray": ["Spray / pulvérisation", "بخاخ"], "inhaler": ["Inhalateur", "جهاز استنشاق"], "nebulizer": ["Nébuliseur / vapeur", "جهاز رذاذ / بخار"], "gas": ["Gaz (bouteille)", "غاز (أسطوانة)"], "syringe": ["Solution injectable", "محلول للحقن"], "prefilled_syringe": ["Seringue préremplie", "حقنة جاهزة"], "pen": ["Stylo / cartouche injectable", "قلم / خرطوشة للحقن"], "vial_powder": ["Poudre ou lyophilisat à reconstituer", "مسحوق أو مجفف بالتجميد يُحضَّر قبل الحقن"], "vial": ["Solvant / flacon injectable", "مذيب / قارورة للحقن"], "iv_bag": ["Perfusion", "تسريب"], "tube": ["Crème, pommade ou gel", "كريم أو مرهم أو جل"], "lotion": ["Solution / lotion à appliquer", "محلول / غسول للاستعمال الموضعي"], "patch": ["Patch", "لصقة"], "suppository": ["Suppositoire", "تحميلة"], "ovule": ["Ovule", "بويضة مهبلية"], "canister": ["Solution de dialyse", "محلول غسيل الكلى"], "implant": ["Implant / système", "غرسة / جهاز"], "tin": ["Lait / poudre nutritionnelle", "حليب / مسحوق غذائي"], "generic": ["Forme non illustrée", "شكل غير مصوّر"]}, "route": {"oral": ["Voie orale", "عن طريق الفم"], "iv": ["Voie intraveineuse", "عن طريق الوريد"], "im": ["Voie intramusculaire", "عن طريق العضل"], "sc": ["Voie sous-cutanée", "تحت الجلد"], "cutaneous": ["Voie cutanée", "على الجلد"], "transdermal": ["Voie transdermique", "عبر الجلد"], "eye": ["Voie ophtalmique", "في العين"], "ear": ["Voie auriculaire", "في الأذن"], "nasal": ["Voie nasale", "في الأنف"], "inhaled": ["Voie inhalée", "استنشاق"], "rectal": ["Voie rectale", "عن طريق الشرج"], "vaginal": ["Voie vaginale", "عن طريق المهبل"], "buccal": ["Voie buccale ou sublinguale", "في الفم (شدقي أو تحت اللسان)"], "dialysis": ["Hémodialyse", "غسيل الكلى"], "other": ["Autre voie (voir la fiche)", "طريق آخر (انظر النشرة)"]}, "mod": {"lp": ["Libération prolongée ou modifiée", "تحرير ممتد أو معدّل"], "gr": ["Gastro-résistant", "مقاوم للحموضة المعدية"], "score": ["Sécable", "قابل للقسمة"], "reconst": ["À reconstituer", "يُحضَّر قبل الاستعمال"], "dilute": ["À diluer / concentré", "يُخفَّف / مركّز"], "child": ["Enfant / nourrisson", "للأطفال / الرضّع"]}}};
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
