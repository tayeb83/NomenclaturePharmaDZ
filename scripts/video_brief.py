#!/usr/bin/env python3
"""Ossature d'épisode vidéo à partir du Thesaurus ANSM (data/ansm/interactions_fr.json).

Usage :
  python3 scripts/video_brief.py PARACETAMOL
  python3 scripts/video_brief.py "ANTI-INFLAMMATOIRES NON STÉROÏDIENS" --max 4

Sortie : Markdown à compléter (hook, dose de la notice, relecteur). Rien n'est inventé :
chaque ligne « Attention » reprend le risque ANSM, son niveau et sa page.
"""
import argparse, json, sys, unicodedata
from pathlib import Path

NIVEAUX = [
    ("contre_indication", "Contre-indication"),
    ("deconseillee", "Association déconseillée"),
    ("precaution_emploi", "Précaution d'emploi"),
    ("a_prendre_en_compte", "À prendre en compte"),
]
DATA = Path(__file__).resolve().parent.parent / "data/ansm/interactions_fr.json"


def fold(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s.upper()) if unicodedata.category(c) != "Mn").strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("substance", help="DCI ou classe, comme dans le thésaurus (accents ignorés)")
    ap.add_argument("--max", type=int, default=3, help="lignes max par niveau (défaut 3)")
    a = ap.parse_args()

    d = json.loads(DATA.read_text(encoding="utf-8"))
    cle = fold(a.substance)
    rows = [i for i in d["interactions"] if fold(i["substance"]) == cle]
    if not rows:
        noms = sorted({i["substance"] for i in d["interactions"] if cle in fold(i["substance"])})
        print(f"Aucune interaction pour « {a.substance} ». Proches : {noms[:8] or 'aucune'}", file=sys.stderr)
        return 1

    print(f"# Ép. XX — {a.substance}\n")
    print(f"- **Source** : {d['source']['version']} ({len(rows)} interactions)")
    print("- **Relu par** : ________ · **Date** : ________  ← ne pas tourner sans\n")
    print("| Bloc | Voix (darija) | Écran / capture |\n|---|---|---|")
    print("| Hook | À écrire (erreur courante) | Boîte + texte |")
    print("| C'est quoi | DCI → indication en 1 phrase | Fiche DwaDZ, DCI + ATC |")
    print("| Comment | Dose/durée **de la notice** [A] | Zoom notice |")
    for code, label in NIVEAUX:
        sel = [r for r in rows if r["niveau"] == code]
        for r in sel[: a.max]:
            risque = " ".join(r["risque"].split())
            print(f"| Attention — {label} | « … {r['partenaire'].title()} » : {risque[:140]} | Onglet Interactions, badge « {label} » (ANSM p. {r['page']}) |")
        if len(sel) > a.max:
            print(f"| _({label}: +{len(sel) - a.max} autres)_ | | |")
    print("| Réflexe | Demander au pharmacien/médecin | Texte plein écran |")
    print("| Appel | « Tape le nom sur DwaDZ » + « ما تعوضش رأي الطبيب ولا الصيدلي » | Logo + site |")
    return 0


if __name__ == "__main__":
    sys.exit(main())
