#!/usr/bin/env python3
"""Classe les libellés de forme galénique DwaDZ en (icône de base, modificateurs, voies).

Usage : python3 classify_forme.py formes_distinctes.csv [formes_mapping.csv]
Importable : from classify_forme import classify
"""
import csv
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

R = json.loads((Path(__file__).parent / "forme_rules.json").read_text(encoding="utf-8"))
_pre = [(re.compile(p), r) for p, r in R["pre"]]


def normalize(raw: str) -> str:
    s = unicodedata.normalize("NFD", raw.upper())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    for rx, rep in _pre:
        s = rx.sub(rep, s)
    s = re.sub(r"[^A-Z0-9/]+", " ", s)
    return " ".join(R["tokens"].get(t, t) for t in s.split())


def _match(rule, s):
    if not re.search(rule["re"], s):
        return False
    return not (rule.get("not") and re.search(rule["not"], s))


def classify(raw: str, edqm_codes=None) -> dict:
    s = normalize(raw)
    base = next((r["icon"] for r in R["base_rules"] if _match(r, s)), R["fallback_icon"])
    mods = []
    for m in R["modifiers"]:
        if m.get("bases") and base not in m["bases"]:
            continue
        if m.get("not_bases") and base in m["not_bases"]:
            continue
        if re.search(m["re"], s):
            mods.append(m["id"])
    mods = R["implicit_mods"].get(base, []) + mods

    if edqm_codes:
        routes = [R["edqm_route"].get(c, "other") for c in edqm_codes]
        source = "edqm"
    else:
        routes = [h["route"] for h in R["route_hints"] if re.search(h["re"], s)]
        dflt = R["default_route"].get(base)
        # la voie par défaut ne s'ajoute que si le libellé n'en donne aucune
        if not routes and dflt:
            routes = [dflt]
        source = "libelle"
    seen = []
    for r in routes:
        if r not in seen:
            seen.append(r)
    flags = []
    if re.search(r"INJECTABLE", s) and re.search(r"BUVABLE", s):
        flags.append("multi-forme")
    if base == R["fallback_icon"]:
        flags.append("non-illustre")
    return {"norm": s, "base": base, "mods": mods, "routes": seen, "route_source": source, "flags": flags}


def main(src, dst="formes_mapping.csv"):
    rows = list(csv.DictReader(open(src, encoding="utf-8-sig"), delimiter=";"))
    out, by_icon, unmatched = [], Counter(), []
    norm_groups = defaultdict(int)
    total = 0
    for r in rows:
        raw, n = r["forme"], int(r["nb_fiches"] or 0)
        c = classify(raw)
        out.append([raw, n, c["norm"], c["base"], "+".join(c["mods"]), "+".join(c["routes"]), "+".join(c["flags"])])
        by_icon[c["base"]] += n
        norm_groups[c["norm"]] += n
        total += n
        if c["base"] == R["fallback_icon"]:
            unmatched.append((n, raw))
    with open(dst, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["forme", "nb_fiches", "normalise", "icone", "modificateurs", "voies_libelle", "alertes"])
        w.writerows(out)
    print(f"{len(rows)} libellés bruts -> {len(norm_groups)} libellés normalisés, {total} fiches")
    print("\nFiches par icône de base :")
    for k, v in by_icon.most_common():
        print(f"  {k:18s}{v:6d}  {100*v/total:5.1f} %")
    unmatched.sort(reverse=True)
    print(f"\nNon illustrées : {sum(n for n, _ in unmatched)} fiches ({len(unmatched)} libellés)")
    for n, raw in unmatched[:60]:
        print(f"  {n:4d}  {raw}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
