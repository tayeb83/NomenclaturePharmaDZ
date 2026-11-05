#!/usr/bin/env python3
"""
DwaDZ — Graphe de connaissances de la nomenclature algérienne
=============================================================

Produit deux choses à partir de la nomenclature (base ou export JSON) :

  1. un graphe RDF en Turtle (`dwadz_kg.ttl`) ;
  2. des indicateurs (`indicateurs.json` et `indicateurs.md`) pour une publication.

Aucune dépendance hors bibliothèque standard (psycopg2 seulement pour lire la base).

Usage :
    python scripts/kg_export.py --json scripts/fixtures/nomenclature_synthetique.json --out data/kg
    DATABASE_URL=... python scripts/kg_export.py --db --out data/kg

⚠️  Avec la fixture synthétique, les chiffres sont FICTIFS : ils servent à tester le
    script, jamais à publier. Les vrais chiffres sortent du script sur la vraie base.

Choix de modélisation
  - Substance : une par DCI telle qu'enregistrée (clé en majuscules, sans accents).
    Une DCI associée (« A + B ») garde son nœud et pointe vers ses composants
    (dwa:composant), car le thésaurus ANSM raisonne par substance seule.
  - ATC : hiérarchie SKOS (broader) ; libellés fr/en/ar quand ils existent.
  - Interaction : nœud réifié avec la gravité et la page du thésaurus. Les textes
    (risque, conduite à tenir) ne sont PAS exportés : ils sont sous droits ANSM.
  - Une classe du thésaurus (« AINS ») est un nœud dwa:ClasseSubstances relié à ses membres.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

BASE = "https://www.dzair-pharma.net/kg/"
PAYS_LOCAL = "ALGERIE"
NIVEAUX_GRAVITE = {"contre_indication": 4, "deconseillee": 3, "precaution_emploi": 2, "a_prendre_en_compte": 1}


# ─── Normalisation ───────────────────────────────────────────────────────────

def fold(s: str | None) -> str:
    """Majuscules sans accents, espaces compactés : clé de jointure."""
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip().upper()


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", fold(s).lower()).strip("-") or "inconnu"


def composants(dci: str) -> list[str]:
    """« A + B » → [A, B]. Une DCI simple renvoie une liste d'un élément."""
    parts = [fold(p) for p in re.split(r"\s\+\s|\+", dci or "") if fold(p)]
    return parts


def atc_parents(code: str) -> list[str]:
    """Ancêtres d'un code ATC par préfixe (niveaux de 1, 3, 4, 5 et 7 caractères)."""
    return [code[:n] for n in (1, 3, 4, 5) if n < len(code)]


# ─── Lecture des données ─────────────────────────────────────────────────────

def load_json(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    d["atc_codes"] = list(d["atc_codes"].values()) if isinstance(d["atc_codes"], dict) else d["atc_codes"]
    d["dci_atc"] = dict(d["dci_atc"])
    return d


def load_db() -> dict:
    import psycopg2
    import psycopg2.extras

    url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    conn = psycopg2.connect(url) if url else psycopg2.connect(
        host=os.environ.get("PGHOST", "localhost"), dbname=os.environ.get("PGDATABASE", "pharmaveille"),
        user=os.environ.get("PGUSER", "postgres"), password=os.environ.get("PGPASSWORD", ""),
    )
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def rows(sql: str) -> list[dict]:
        cur.execute(sql)
        return [dict(r) for r in cur.fetchall()]

    d = {
        "enregistrements": rows("SELECT id, n_enreg, dci, nom_marque, forme, dosage, labo, pays, type_prod, statut FROM enregistrements"),
        "retraits": rows("SELECT id, n_enreg, dci, nom_marque, labo, pays, type_prod, date_retrait, motif_retrait FROM retraits"),
        "atc_codes": rows("SELECT code, parent_code, niveau, label_fr, label_en, label_ar FROM atc_codes"),
        "interactions": rows(
            "SELECT substance, substance_key, partenaire, partenaire_key, partenaire_est_classe, niveau, page, source_version FROM interactions_ansm"
        ),
        "interaction_classes": rows("SELECT classe, classe_key, membre, membre_key, origine FROM interactions_ansm_classes"),
        "version": (rows("SELECT version_label FROM nomenclature_versions ORDER BY id DESC LIMIT 1") or [{"version_label": "inconnue"}])[0]["version_label"],
    }
    d["dci_atc"] = {fold(r["dci"]): r["code_atc"] for r in rows("SELECT dci, code_atc FROM dci_atc_mapping")}
    for r in d["retraits"]:
        r["date_retrait"] = r["date_retrait"].isoformat() if r.get("date_retrait") else None
    conn.close()
    return d


# ─── Export Turtle ───────────────────────────────────────────────────────────

PREFIXES = f"""@prefix dwa:  <{BASE}> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix dct:  <http://purl.org/dc/terms/> .
@prefix atc:  <{BASE}atc/> .
@prefix sub:  <{BASE}substance/> .
@prefix lab:  <{BASE}labo/> .
@prefix pays: <{BASE}pays/> .
@prefix spec: <{BASE}specialite/> .
@prefix ret:  <{BASE}retrait/> .
@prefix cls:  <{BASE}classe/> .
@prefix itx:  <{BASE}interaction/> .
@prefix niv:  <{BASE}niveau/> .

"""


def lit(s: str | None, lang: str | None = None) -> str:
    s = (s or "").replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")
    return f'"{s}"@{lang}' if lang else f'"{s}"'


def to_turtle(d: dict) -> str:
    out: list[str] = [PREFIXES]
    emit = out.append
    emit(f"<{BASE}> a dct:Dataset ; dct:title {lit('Graphe de connaissances de la nomenclature pharmaceutique algérienne (DwaDZ)', 'fr')} ;"
         f" dct:source {lit(str(d.get('version', '')))} .\n")

    # ATC
    atc = {a["code"]: a for a in d["atc_codes"]}
    codes_utilises: set[str] = set()
    for code in set(d["dci_atc"].values()):
        codes_utilises.add(code)
        codes_utilises.update(atc_parents(code))
    for code in sorted(codes_utilises | set(atc)):
        a = atc.get(code, {})
        parents = atc_parents(code)
        s = [f"atc:{code} a skos:Concept ; skos:notation {lit(code)}"]
        for lang, key in (("fr", "label_fr"), ("en", "label_en"), ("ar", "label_ar")):
            if a.get(key):
                s.append(f"skos:prefLabel {lit(a[key], lang)}")
        if parents:
            s.append(f"skos:broader atc:{parents[-1]}")
        emit(" ;\n    ".join(s) + " .\n")

    # Substances, laboratoires, pays, spécialités
    substances = sorted({fold(e["dci"]) for e in d["enregistrements"]} | {fold(r["dci"]) for r in d["retraits"]})
    for sub in substances:
        s = [f"sub:{slug(sub)} a dwa:Substance ; rdfs:label {lit(sub)} ; dwa:cle {lit(sub)}"]
        if sub in d["dci_atc"]:
            s.append(f"dwa:classeATC atc:{d['dci_atc'][sub]}")
        comps = composants(sub)
        if len(comps) > 1:
            s.append("dwa:composant " + ", ".join(f"sub:{slug(c)}" for c in comps))
        emit(" ;\n    ".join(s) + " .\n")
        for c in comps if len(comps) > 1 else []:
            if c not in substances:
                emit(f"sub:{slug(c)} a dwa:Substance ; rdfs:label {lit(c)} ; dwa:cle {lit(c)} .\n")

    labos = sorted({fold(e["labo"]) for e in d["enregistrements"] if e.get("labo")} | {fold(r.get("labo")) for r in d["retraits"] if r.get("labo")})
    for lab in labos:
        emit(f"lab:{slug(lab)} a dwa:Laboratoire ; rdfs:label {lit(lab)} .\n")
    pays = sorted({fold(e["pays"]) for e in d["enregistrements"] if e.get("pays")})
    for p in pays:
        emit(f"pays:{slug(p)} a dwa:Pays ; rdfs:label {lit(p)} ; dwa:estLocal {'true' if p == PAYS_LOCAL else 'false'} .\n")

    for e in d["enregistrements"]:
        s = [f"spec:{e['id']} a dwa:Specialite ; rdfs:label {lit(e['nom_marque'])}",
             f"dwa:substance sub:{slug(fold(e['dci']))}"]
        if e.get("n_enreg"):
            s.append(f"dwa:numeroEnregistrement {lit(e['n_enreg'])}")
        for key, prop in (("forme", "forme"), ("dosage", "dosage"), ("type_prod", "typeProduit")):
            if e.get(key):
                s.append(f"dwa:{prop} {lit(e[key])}")
        if e.get("labo"):
            s.append(f"dwa:fabricant lab:{slug(fold(e['labo']))}")
        if e.get("pays"):
            s.append(f"dwa:paysOrigine pays:{slug(fold(e['pays']))}")
        emit(" ;\n    ".join(s) + " .\n")

    # Retraits
    for r in d["retraits"]:
        s = [f"ret:{r['id']} a dwa:Retrait ; rdfs:label {lit(r['nom_marque'])}",
             f"dwa:substance sub:{slug(fold(r['dci']))}"]
        if r.get("labo"):
            s.append(f"dwa:fabricant lab:{slug(fold(r['labo']))}")
        if r.get("date_retrait"):
            s.append(f'dwa:dateRetrait "{r["date_retrait"]}"^^xsd:date')
        if r.get("motif_retrait"):
            s.append(f"dwa:motif {lit(r['motif_retrait'], 'fr')}")
        emit(" ;\n    ".join(s) + " .\n")

    # Classes du thésaurus
    classes: dict[str, dict] = defaultdict(lambda: {"titre": "", "membres": set()})
    for c in d["interaction_classes"]:
        classes[c["classe_key"]]["titre"] = c["classe"]
        classes[c["classe_key"]]["membres"].add(fold(c["membre"]))
    for key, c in sorted(classes.items()):
        s = [f"cls:{slug(key)} a dwa:ClasseSubstances ; rdfs:label {lit(c['titre'])}"]
        s.append("dwa:membre " + ", ".join(f"sub:{slug(m)}" for m in sorted(c["membres"])))
        emit(" ;\n    ".join(s) + " .\n")

    # Interactions (réifiées, sans texte)
    for i, it in enumerate(d["interactions"], 1):
        src = f"cls:{slug(it['substance_key'])}" if it["substance_key"] in classes else f"sub:{slug(it['substance'])}"
        par = (f"cls:{slug(it['partenaire_key'])}" if it["partenaire_est_classe"] or it["partenaire_key"] in classes
               else f"sub:{slug(it['partenaire'])}")
        s = [f"itx:{i} a dwa:Interaction ; dwa:source {src} ; dwa:partenaire {par}",
             f"dwa:niveau niv:{it['niveau']} ; dwa:gravite {NIVEAUX_GRAVITE.get(it['niveau'], 0)}"]
        if it.get("page"):
            s.append(f"dwa:pageThesaurus {it['page']}")
        if it.get("source_version"):
            s.append(f"dct:source {lit(it['source_version'])}")
        emit(" ;\n    ".join(s) + " .\n")
    return "\n".join(out)


# ─── Indicateurs ─────────────────────────────────────────────────────────────

def hhi(counts: list[int]) -> float:
    """Indice de Herfindahl-Hirschman (0 à 10 000) : 10 000 = un seul acteur."""
    total = sum(counts)
    return round(sum((c / total * 100) ** 2 for c in counts), 1) if total else 0.0


def indicateurs(d: dict, top: int = 10) -> dict:
    enr = d["enregistrements"]
    par_sub: dict[str, list[dict]] = defaultdict(list)
    for e in enr:
        par_sub[fold(e["dci"])].append(e)

    # 1. Dépendance à l'importation
    n = len(enr)
    importes = [e for e in enr if fold(e.get("pays")) != PAYS_LOCAL]
    sub_rows = []
    for sub, es in par_sub.items():
        pays = {fold(e["pays"]) for e in es if e.get("pays")}
        labos = {fold(e["labo"]) for e in es if e.get("labo")}
        sub_rows.append({
            "substance": sub, "specialites": len(es), "laboratoires": len(labos), "pays": len(pays),
            "produite_localement": PAYS_LOCAL in pays,
            "classe_atc": d["dci_atc"].get(sub),
        })
    mono_source = [r for r in sub_rows if r["laboratoires"] == 1]
    sans_prod_locale = [r for r in sub_rows if not r["produite_localement"]]
    mono_pays_import = [r for r in sub_rows if r["pays"] == 1 and not r["produite_localement"]]

    # 2. Concentration par classe ATC niveau 3
    par_classe: dict[str, Counter] = defaultdict(Counter)
    for sub, es in par_sub.items():
        code = d["dci_atc"].get(sub)
        if not code or len(code) < 4:
            continue
        for e in es:
            if e.get("labo"):
                par_classe[code[:4]][fold(e["labo"])] += 1
    libelles = {a["code"]: a.get("label_fr") for a in d["atc_codes"]}
    concentration = sorted(
        ({"classe_atc": c, "libelle": libelles.get(c), "specialites": sum(cnt.values()), "laboratoires": len(cnt),
          "hhi": hhi(list(cnt.values())), "labo_dominant": cnt.most_common(1)[0][0],
          "part_dominant": round(cnt.most_common(1)[0][1] / sum(cnt.values()), 3)}
         for c, cnt in par_classe.items() if sum(cnt.values()) >= 3),
        key=lambda r: -r["hhi"])

    # 3. Redondance : spécialités par substance
    tailles = sorted((len(es) for es in par_sub.values()), reverse=True)
    redondance = {
        "substances": len(par_sub), "mediane": statistics.median(tailles) if tailles else 0,
        "max": tailles[0] if tailles else 0,
        "substances_une_seule_specialite": sum(1 for t in tailles if t == 1),
        "plus_redondantes": [{"substance": s, "specialites": len(es)} for s, es in
                             sorted(par_sub.items(), key=lambda kv: -len(kv[1]))[:top]],
    }

    # 4. Interactions : graphe substance—substance, classes dépliées
    membres: dict[str, set[str]] = defaultdict(set)
    for c in d["interaction_classes"]:
        membres[c["classe_key"]].add(fold(c["membre"]))
    connues = set(par_sub)

    def etendre(key: str, nom: str) -> set[str]:
        base = membres.get(key) or {fold(nom)}
        return {s for s in base if s in connues}

    aretes: dict[frozenset, int] = {}
    for it in d["interactions"]:
        a = etendre(it["substance_key"], it["substance"])
        b = etendre(it["partenaire_key"], it["partenaire"])
        g = NIVEAUX_GRAVITE.get(it["niveau"], 0)
        for x in a:
            for y in b:
                if x != y:
                    k = frozenset((x, y))
                    aretes[k] = max(aretes.get(k, 0), g)
    degre, degre_ci = Counter(), Counter()
    for k, g in aretes.items():
        for x in k:
            degre[x] += 1
            if g == NIVEAUX_GRAVITE["contre_indication"]:
                degre_ci[x] += 1
    nb = len(connues)
    interactions = {
        "paires_substances": len(aretes),
        "densite": round(len(aretes) / (nb * (nb - 1) / 2), 4) if nb > 1 else 0,
        "par_gravite": dict(Counter({v: sum(1 for g in aretes.values() if g == k) for v, k in
                                     ((name, rank) for name, rank in NIVEAUX_GRAVITE.items())}).most_common()),
        "plus_connectees": [{"substance": s, "interactions": c, "contre_indications": degre_ci[s]} for s, c in degre.most_common(top)],
        "plus_de_contre_indications": [{"substance": s, "contre_indications": c} for s, c in degre_ci.most_common(top)],
        "substances_sans_interaction_connue": len(connues - set(degre)),
    }

    # 5. Propagation d'un retrait : ce que le retrait d'une substance touche encore
    exposition = []
    for sub in sorted({fold(r["dci"]) for r in d["retraits"]}):
        es = par_sub.get(sub, [])
        if not es:
            continue
        exposition.append({
            "substance": sub, "retraits": sum(1 for r in d["retraits"] if fold(r["dci"]) == sub),
            "specialites_encore_enregistrees": len(es),
            "laboratoires": len({fold(e["labo"]) for e in es if e.get("labo")}),
            "interactions_contre_indiquees": degre_ci.get(sub, 0),
        })
    exposition.sort(key=lambda r: -r["specialites_encore_enregistrees"])
    motifs = Counter(fold(r.get("motif_retrait")) or "NON PRECISE" for r in d["retraits"])

    return {
        "version": d.get("version"),
        "volume": {"specialites": n, "substances": len(par_sub), "laboratoires": len({fold(e['labo']) for e in enr if e.get('labo')}),
                   "pays": len({fold(e['pays']) for e in enr if e.get('pays')}), "retraits": len(d["retraits"]),
                   "interactions_thesaurus": len(d["interactions"])},
        "importation": {
            "part_specialites_importees": round(len(importes) / n, 3) if n else 0,
            "substances_sans_production_locale": len(sans_prod_locale),
            "substances_un_seul_laboratoire": len(mono_source),
            "substances_importees_depuis_un_seul_pays": len(mono_pays_import),
            "exemples_un_seul_laboratoire": sorted(mono_source, key=lambda r: r["substance"])[:top],
            "specialites_par_pays": dict(Counter(fold(e["pays"]) for e in enr if e.get("pays")).most_common(top)),
        },
        "concentration_par_classe": concentration[:top],
        "redondance": redondance,
        "interactions": interactions,
        "retraits_exposition": exposition[:top],
        "retraits_motifs": dict(motifs.most_common(top)),
    }


def to_markdown(ind: dict, synthetique: bool) -> str:
    v, imp, inter = ind["volume"], ind["importation"], ind["interactions"]
    L = []
    if synthetique:
        L += ["> ⚠️ Données SYNTHÉTIQUES : chiffres fictifs, pour tester le script. Ne pas publier.", ""]
    L += [f"# Indicateurs du graphe — {ind['version']}", "",
          f"{v['specialites']} spécialités · {v['substances']} substances · {v['laboratoires']} laboratoires · "
          f"{v['pays']} pays · {v['retraits']} retraits · {v['interactions_thesaurus']} lignes d'interaction", "",
          "## 1. Dépendance à l'importation", "",
          f"- Part de spécialités importées : **{imp['part_specialites_importees']:.1%}**",
          f"- Substances sans production locale : **{imp['substances_sans_production_locale']}** / {v['substances']}",
          f"- Substances avec un seul laboratoire : **{imp['substances_un_seul_laboratoire']}**",
          f"- Substances importées d'un seul pays : **{imp['substances_importees_depuis_un_seul_pays']}**", "",
          "## 2. Concentration par classe ATC (indice HHI, 10 000 = un seul laboratoire)", "",
          "| Classe | Libellé | Spécialités | Labos | HHI | Dominant |", "|---|---|---:|---:|---:|---|"]
    for r in ind["concentration_par_classe"]:
        L.append(f"| {r['classe_atc']} | {r['libelle'] or ''} | {r['specialites']} | {r['laboratoires']} | {r['hhi']} | {r['labo_dominant']} ({r['part_dominant']:.0%}) |")
    L += ["", "## 3. Redondance", "",
          f"Médiane de {ind['redondance']['mediane']} spécialités par substance ; maximum {ind['redondance']['max']} ; "
          f"{ind['redondance']['substances_une_seule_specialite']} substances n'ont qu'une spécialité.", "",
          "| Substance | Spécialités |", "|---|---:|"]
    L += [f"| {r['substance']} | {r['specialites']} |" for r in ind["redondance"]["plus_redondantes"]]
    L += ["", "## 4. Interactions (thésaurus ANSM, classes dépliées)", "",
          f"{inter['paires_substances']} paires de substances en interaction, densité {inter['densite']:.2%}.", "",
          "| Substance | Interactions | Contre-indications |", "|---|---:|---:|"]
    L += [f"| {r['substance']} | {r['interactions']} | {r['contre_indications']} |" for r in inter["plus_connectees"]]
    L += ["", "## 5. Retraits et substances encore enregistrées", "",
          "| Substance | Retraits | Spécialités encore enregistrées | Labos |", "|---|---:|---:|---:|"]
    L += [f"| {r['substance']} | {r['retraits']} | {r['specialites_encore_enregistrees']} | {r['laboratoires']} |" for r in ind["retraits_exposition"]]
    return "\n".join(L) + "\n"


# ─── Programme principal ─────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--json", help="export JSON (même schéma que scripts/fixtures/nomenclature_synthetique.json)")
    src.add_argument("--db", action="store_true", help="lit la base ($DATABASE_URL)")
    ap.add_argument("--out", default="data/kg", help="dossier de sortie")
    ap.add_argument("--top", type=int, default=10, help="taille des classements")
    a = ap.parse_args(argv)

    d = load_db() if a.db else load_json(a.json)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "dwadz_kg.ttl").write_text(to_turtle(d), encoding="utf-8")
    ind = indicateurs(d, a.top)
    (out / "indicateurs.json").write_text(json.dumps(ind, ensure_ascii=False, indent=2), encoding="utf-8")
    synthetique = "SYNTHETIQUE" in str(d.get("version", "")).upper()
    (out / "indicateurs.md").write_text(to_markdown(ind, synthetique), encoding="utf-8")
    print(f"✅ {out}/dwadz_kg.ttl, indicateurs.json, indicateurs.md "
          f"({ind['volume']['specialites']} spécialités, {ind['volume']['substances']} substances)")
    if synthetique:
        print("⚠️  Données synthétiques : ne pas publier ces chiffres.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
