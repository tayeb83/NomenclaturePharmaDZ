#!/usr/bin/env python3
"""
Extrait les interactions du « Thesaurus des interactions médicamenteuses » de
l'ANSM (PDF) vers un JSON structuré, une entrée par ligne « + PARTENAIRE ».

Le PDF a une mise en page stable : un titre de substance en gros caractères,
une ligne « Voir aussi : classes… », puis des blocs « + PARTENAIRE » avec deux
colonnes (à gauche le risque, à droite le niveau puis la conduite à tenir).
On lit les coordonnées des mots (pdftotext -bbox-layout) pour séparer les
colonnes, ce que le texte brut ne permet pas de faire sûrement.

Rien n'est interprété ni reformulé : les textes sont ceux du thésaurus.
Le script s'arrête avec une erreur si un contrôle de cohérence échoue.

Usage :
    python scripts/extract_ansm_interactions.py \
        data/ansm/20230915-thesaurus-interactions-medicamenteuses-septembre-2023.pdf \
        data/ansm/interactions_fr.json

Prérequis : pdftotext (poppler-utils).
"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

LINE_RE = re.compile(r'<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>', re.S)
WORD_RE = re.compile(r'<word xMin="([\d.]+)" yMin="[\d.]+" xMax="([\d.]+)" yMax="[\d.]+">([^<]*)</word>')
PAGE_RE = re.compile(r"<page [^>]*>(.*?)</page>", re.S)

FIRST_TABLE_PAGE = 3          # les pages 1 et 2 sont la couverture et les informations générales
COL0_MAX_X = 60               # titres, partenaires, « Voir aussi », numéros de page
RIGHT_MIN_X = 200             # colonne de droite (niveau + conduite à tenir)
HEADING_MIN_HEIGHT = 10.0     # le titre d'une substance est en plus gros caractères que le reste
WORD_GAP = 14.0               # un écart plus grand sépare deux colonnes tombées sur la même ligne

# Libellé de la colonne de droite, en toutes lettres ou en abrégé. Une même ligne
# peut cumuler plusieurs niveaux (« CI - ASDEC - APEC ») : le détail par condition
# suit alors dans le texte de la colonne de droite.
NIVEAUX = {
    "contre indication": "contre_indication", "ci": "contre_indication",
    "association deconseillee": "deconseillee", "asdec": "deconseillee",
    "precaution d emploi": "precaution_emploi", "pe": "precaution_emploi",
    "a prendre en compte": "a_prendre_en_compte", "apec": "a_prendre_en_compte",
}
GRAVITE = ["contre_indication", "deconseillee", "precaution_emploi", "a_prendre_en_compte"]  # du plus grave au moins grave
PARA_GAP = 12.0               # écart vertical (pt) qui sépare deux paragraphes ; l'interligne courant fait environ 8
PARA_START = re.compile(r"^(-|•|■)\s|^(Contre-indication|Association déconseillée|Précaution d.emploi|A prendre en compte)\b", re.I)


def parse_niveaux(text: str) -> list[str] | None:
    """Niveaux d'un libellé de colonne, ou None si ce n'en est pas un. Un libellé suivi de « : » est un sous-titre."""
    if ":" in text:
        return None
    out = []
    for part in re.split(r"\s+-\s+", text):
        n = NIVEAUX.get(fold(part))
        if n is None:
            return None
        if n not in out:
            out.append(n)
    return out


def fold(text: str) -> str:
    s = unicodedata.normalize("NFKD", text)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(text).replace(" ", " ")).strip()


def join_lines(lines: list[dict]) -> str:
    """Recolle les lignes d'une cellule ; un saut de paragraphe devient « \n »."""
    out = ""
    prev: dict | None = None
    for ln in lines:
        text = ln["text"]
        if prev is None:
            out = text
        else:
            gap = ln["y"] - prev["y"] if ln["page"] == prev["page"] else 0
            if gap > PARA_GAP or PARA_START.match(text):
                out += "\n" + text
            elif out.endswith("-") and out[-2:-1].isalpha() and text[:1].islower():
                out += text  # coupure de mot en fin de ligne
            else:
                out += " " + text
        prev = ln
    return "\n".join(clean(p) for p in out.split("\n") if p.strip())


def read_lines(pdf: Path) -> list[dict]:
    xml = subprocess.run(
        ["pdftotext", "-bbox-layout", str(pdf), "-"], check=True, capture_output=True
    ).stdout.decode("utf8")
    lines: list[dict] = []
    for page_no, page in enumerate(PAGE_RE.findall(xml), start=1):
        for m in LINE_RE.finditer(page):
            words = [(float(a), float(b), html.unescape(t)) for a, b, t in WORD_RE.findall(m.group(5))]
            if not words:
                continue
            # une ligne qui enjambe les deux colonnes est coupée à l'écart
            groups: list[list[tuple[float, float, str]]] = [[words[0]]]
            for prev, w in zip(words, words[1:]):
                if w[0] - prev[1] > WORD_GAP and w[0] >= RIGHT_MIN_X > prev[0]:
                    groups.append([w])
                else:
                    groups[-1].append(w)
            y, h = float(m.group(2)), float(m.group(4)) - float(m.group(2))
            for g in groups:
                lines.append({"page": page_no, "x": g[0][0], "y": y, "h": h, "text": clean(" ".join(w[2] for w in g))})
    return lines


def split_voir_aussi(text: str) -> list[str]:
    body = re.sub(r"^Voir aussi\s*:\s*", "", text, flags=re.I)
    return [p.strip() for p in re.split(r"\s+-\s+", body) if p.strip()]


def split_membres(text: str) -> list[str]:
    """« a, b (c, d), e » → [a, « b (c, d) », e ] : on ne coupe pas dans les parenthèses."""
    out, depth, buf = [], 0, ""
    for ch in text:
        depth += (ch == "(") - (ch == ")")
        if ch == "," and depth == 0:
            out.append(buf.strip())
            buf = ""
        else:
            buf += ch
    out.append(buf.strip())
    return [m for m in out if m]


def extract(pdf: Path) -> dict:
    substances: list[dict] = []
    interactions: list[dict] = []
    warnings: list[str] = []

    sub: dict | None = None
    partner: dict | None = None     # {"lines": [...], "closed": bool}
    cur: dict | None = None         # interaction en cours
    state = "none"                  # heading | voir | partner | body
    right_lines: list[dict] = []
    left_lines: list[dict] = []

    def flush() -> None:
        nonlocal cur, right_lines, left_lines
        if cur is not None:
            cur["risque"] = join_lines(left_lines)
            cur["conduite"] = join_lines(right_lines)
            interactions.append(cur)
        elif left_lines:
            warnings.append(f"p.{left_lines[0]['page']} texte sans niveau ignoré : {left_lines[0]['text'][:60]}")
        cur, right_lines, left_lines = None, [], []

    pages: dict[int, list[dict]] = {}
    for ln in read_lines(pdf):
        pages.setdefault(ln["page"], []).append(ln)

    for page_no in sorted(pages):
        if page_no < FIRST_TABLE_PAGE:
            continue
        # même ordonnée : le niveau (colonne de droite) passe avant le texte de gauche
        for ln in sorted(pages[page_no], key=lambda l: (round(l["y"], 0), 0 if l["x"] >= RIGHT_MIN_X else 1)):
            text, x = ln["text"], ln["x"]
            if re.fullmatch(r"\d{1,3}", text) and (ln["y"] < 50 or ln["y"] > 800):
                continue  # numéro de page
            if x < COL0_MAX_X:
                if text.startswith("+"):
                    flush()
                    partner = {"lines": [text.lstrip("+ ").strip()]}
                    state = "partner"
                elif ln["h"] >= HEADING_MIN_HEIGHT:
                    if state == "heading" and sub is not None:
                        sub["nom"] = clean(sub["nom"] + " " + text)
                    else:
                        flush()
                        sub = {"nom": text, "voir_aussi": [], "page": page_no}
                        substances.append(sub)
                        partner, state = None, "heading"
                elif text.lower().startswith("voir aussi"):
                    sub["voir_aussi_brut"] = text
                    state = "voir"
                elif state == "voir" and sub is not None:
                    sub["voir_aussi_brut"] += " " + text
                elif state == "partner" and partner is not None:
                    partner["lines"].append(text)
                elif state in ("heading", "voir") and sub is not None:
                    sub.setdefault("precisions", []).append(text)
                else:
                    warnings.append(f"p.{page_no} ligne en marge ignorée : {text[:60]}")
                continue

            if sub is None or partner is None:
                warnings.append(f"p.{page_no} texte hors partenaire ignoré : {text[:60]}")
                continue
            state = "body"

            if x >= RIGHT_MIN_X:
                niveaux = parse_niveaux(text) if cur is None else None
                if niveaux:
                    # un seul niveau (éventuellement composé) par partenaire ; les intertitres
                    # suivants (« Précaution d'emploi », « Association déconseillée »…) font partie de la conduite à tenir
                    cur = {
                        "substance": sub["nom"],
                        "partenaire": clean(" ".join(partner["lines"])),
                        "niveau": min(niveaux, key=GRAVITE.index),
                        **({"niveaux": sorted(niveaux, key=GRAVITE.index)} if len(niveaux) > 1 else {}),
                        "page": page_no,
                    }
                elif cur is not None:
                    right_lines.append(ln)
                else:
                    warnings.append(f"p.{page_no} colonne de droite sans niveau : {text[:60]}")
            else:
                left_lines.append(ln)
    flush()

    for s in substances:
        s["voir_aussi"] = split_voir_aussi(s.pop("voir_aussi_brut", "")) if "voir_aussi_brut" in s else []
        texte = clean(" ".join(s.pop("precisions", [])))
        m = re.match(r"^\((.*)\)$", texte)
        if m:
            s["membres"] = split_membres(m.group(1))
        elif texte and not texte.startswith("("):
            s["precision"] = texte  # une liste « (… » non fermée est tronquée dans le PDF source : on l'écarte

    return {"substances": substances, "interactions": interactions, "warnings": warnings}


def check(data: dict, expected_partners: int | None) -> list[str]:
    errors: list[str] = []
    inter = data["interactions"]
    if expected_partners is not None and len(inter) < expected_partners:
        errors.append(f"{len(inter)} interactions extraites pour {expected_partners} lignes « + » dans le PDF")
    for i in inter:
        if not i["risque"]:
            errors.append(f"p.{i['page']} {i['substance']} + {i['partenaire']} : colonne « risques » vide")
        if i["niveau"] == "contre_indication" and not i["risque"]:
            errors.append(f"p.{i['page']} contre-indication sans texte")
    return errors


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--version", default="Thesaurus ANSM, septembre 2023")
    ap.add_argument("--url", default="https://ansm.sante.fr/uploads/2024/06/07/20230915-thesaurus-interactions-medicamenteuses-septembre-2023.pdf")
    args = ap.parse_args()

    raw = subprocess.run(["pdftotext", "-layout", str(args.pdf), "-"], check=True, capture_output=True).stdout.decode("utf8")
    expected = sum(1 for l in raw.splitlines() if l.startswith("+ "))

    data = extract(args.pdf)
    errors = check(data, expected)

    niveaux: dict[str, int] = {}
    for i in data["interactions"]:
        niveaux[i["niveau"]] = niveaux.get(i["niveau"], 0) + 1
    print(f"{len(data['substances'])} substances, {len(data['interactions'])} interactions (« + » dans le PDF : {expected})")
    print("niveaux :", niveaux)
    print(f"{len(data['warnings'])} avertissements, {len(errors)} erreurs")
    for w in data["warnings"][:15]:
        print("  ~", w)
    for e in errors[:25]:
        print("  !", e)

    out = {
        "source": {"version": args.version, "url": args.url, "fichier": args.pdf.name},
        "substances": data["substances"],
        "interactions": data["interactions"],
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
