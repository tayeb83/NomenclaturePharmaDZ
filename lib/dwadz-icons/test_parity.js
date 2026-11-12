// Compare le classement JS au classement Python (../../data/icones/formes_mapping.csv) sur les 681 libellés + quelques codes EDQM
const fs = require("fs");
const D = require("./dwadz-icons.js");
const CSV = "../../data/icones/formes_mapping.csv"
if (!fs.existsSync(CSV)) { console.log("data/icones/formes_mapping.csv absent (dossier data/ ignoré par git) : test de parité ignoré"); process.exit(0) }
const rows = fs.readFileSync(CSV, "utf8").trim().split(/\r?\n/).slice(1).map(l => l.split(";"));
let bad = 0;
for (const r of rows) {
  const [forme, , norm, icone, mods, routes, alertes] = r;
  const c = D.classify(forme);
  const got = [c.norm, c.base, c.mods.join("+"), c.routes.join("+"), c.flags.join("+")].join("|");
  const exp = [norm, icone, mods, routes, alertes].join("|");
  if (got !== exp) { bad++; if (bad <= 15) console.log("DIFF", forme, "\n  js :", got, "\n  py :", exp); }
}
console.log(rows.length + " libellés comparés, " + bad + " différences");
console.log(JSON.stringify(D.classify("COMPRIME PELLICULE SECABLE A LIBERATION PROLONGEE", ["20053000"])));
console.log(D.html("SIROP", { codes: ["20053000"], lang: "ar", size: 48 }).slice(0, 260) + "…");
