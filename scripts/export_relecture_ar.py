#!/usr/bin/env python3
"""
Produit le classeur de relecture des traductions arabes du thésaurus ANSM.

Chaque ligne du classeur est un texte distinct (risque, conduite à tenir ou nom de partenaire),
classé par nombre d'interactions qui l'utilisent : relire d'abord les phrases qui reviennent le plus
corrige le plus de fiches. La colonne « Couverture » dit quelle part des interactions du même type
est déjà couverte une fois les lignes jusqu'ici relues.

Dans le classeur, on remplit seulement :
  - « Statut » : À relire (défaut) · Relu · À corriger
  - « Correction AR » : la traduction à retenir à la place, s'il y en a une
  - « Commentaire » : libre
Puis on réimporte avec scripts/import_relecture_ar.py.

Usage :
    python scripts/export_relecture_ar.py                        # -> data/ansm/relecture_ar.xlsx
    python scripts/export_relecture_ar.py --sortie /tmp/r.xlsx

Prérequis : pip install openpyxl
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
GRAVITE = ["contre_indication", "deconseillee", "precaution_emploi", "a_prendre_en_compte"]
GRAVITE_LIBELLE = {
    "contre_indication": "Contre-indication",
    "deconseillee": "Association déconseillée",
    "precaution_emploi": "Précaution d'emploi",
    "a_prendre_en_compte": "À prendre en compte",
}
TYPES = (("risque", "risques", "Risque"), ("conduite", "conduites", "Conduite"))

# Charte Casbah du site
NAVY, BRASS, BRASS_LIGHT, CREAM, CREAM_EDGE, TEAL_LIGHT = "12233F", "B98425", "E3B65B", "FBF7EC", "EFE4C8", "E2F1EF"

# Choix de vocabulaire à valider en premier : ils se répètent dans tout le thésaurus.
GLOSSAIRE = [
    ("torsades de pointes", "التواء الذُّرى (torsades de pointes)", r"torsades? de pointes"),
    ("rhabdomyolyse", "انحلال العضلات المخططة", r"rhabdomyolyse"),
    ("millepertuis", "نبتة سانت جون (الهيبيريكوم)", r"millepertuis"),
    ("cinchonisme", "السنكونية (cinchonisme)", r"cinchonisme"),
    ("syndrome sérotoninergique", "متلازمة السيروتونين", r"syndrome s[ée]rotoninergique"),
    ("ergotisme", "التسمم بالإرغوت (ergotisme)", r"ergotisme"),
    ("syndrome malin des neuroleptiques", "المتلازمة الخبيثة لمضادات الذهان", r"syndrome malin"),
    ("syndrome de sevrage", "متلازمة الانسحاب", r"syndrome de sevrage"),
    ("effet antabuse", "تأثير أنتابوز (antabuse)", r"antabuse"),
    ("hyperkaliémie", "فرط بوتاسيوم الدم", r"hyperkali[ée]mie"),
    ("hypokaliémie", "نقص بوتاسيوم الدم", r"hypokali[ée]mie"),
    ("lithémie", "مستوى الليثيوم في الدم", r"lith[ée]mie"),
    ("digoxinémie", "مستوى الديجوكسين في الدم", r"digoxin[ée]mie"),
    ("théophyllinémie", "مستوى الثيوفيلين في الدم", r"th[ée]ophyllin[ée]mie"),
    ("créatininémie", "الكرياتينين في الدم", r"cr[ée]atinin[ée]mie"),
    ("clairance", "التصفية", r"clairance"),
    ("métabolisme hépatique", "الاستقلاب الكبدي", r"m[ée]tabolisme h[ée]patique"),
    ("concentrations plasmatiques", "التراكيز البلازمية", r"concentrations? plasmatiques?"),
    ("effets indésirables", "الآثار غير المرغوبة", r"effets? ind[ée]sirables?"),
    ("inducteur enzymatique", "المحرّض الإنزيمي", r"inducteur"),
    ("antivitamine K", "مضاد فيتامين K", r"antivitamine K"),
    ("bithérapie", "العلاج الثنائي", r"bith[ée]rapie"),
    ("surveillance clinique", "مراقبة سريرية", r"surveillance clinique"),
    ("adaptation de la posologie", "تعديل الجرعة", r"adaptation (?:[ée]ventuelle )?de la posologie"),
    ("à distance (prises espacées)", "بعيدًا عن (فاصل زمني بين الجرعتين)", r"[àa] distance"),
    ("contre-indication", "مضاد استطباب", r"contre-indication"),
    ("association déconseillée", "جمع غير موصى به", r"association d[ée]conseill[ée]e"),
    ("précaution d'emploi", "احتياطات الاستعمال", r"pr[ée]caution d.emploi"),
    ("à prendre en compte", "يؤخذ بعين الاعتبار", r"[àa] prendre en compte"),
]


def cle(texte: str) -> str:
    return hashlib.md5(texte.encode()).hexdigest()[:8]


def charger(chemin: Path) -> dict:
    return json.loads(chemin.read_text(encoding="utf8"))


def lignes_par_texte(fr: dict, ar: dict) -> list[dict]:
    """Un enregistrement par texte distinct traduit : fréquence, gravité la plus haute, exemple."""
    usage: dict[tuple[str, str], dict] = {}
    for i in fr["interactions"]:
        for nature, _, _ in TYPES:
            texte = i[nature]
            if texte:
                usage.setdefault((nature, texte), {"n": 0, "niveaux": Counter(), "exemple": f"{i['substance']} + {i['partenaire']}"})
        usage.setdefault(("partenaire", i["partenaire"]), {"n": 0, "niveaux": Counter(), "exemple": f"{i['substance']} + {i['partenaire']}"})
        for nature in ("risque", "conduite", "partenaire"):
            texte = i[nature]
            if texte:
                u = usage[(nature, texte)]
                u["n"] += 1
                u["niveaux"][i["niveau"]] += 1

    relus = ar.get("relus", {})
    out = []
    for (nature, texte), u in usage.items():
        cat = {"risque": "risques", "conduite": "conduites", "partenaire": "partenaires"}[nature]
        trad = ar[cat].get(texte)
        if trad is None:
            continue
        grave = min(u["niveaux"], key=GRAVITE.index)
        out.append({
            "nature": nature, "libelle": {"risque": "Risque", "conduite": "Conduite", "partenaire": "Partenaire"}[nature],
            "fr": texte, "ar": trad, "n": u["n"], "grave": grave, "exemple": u["exemple"],
            "relu": texte in relus.get(cat, []),
        })
    out.sort(key=lambda r: (-r["n"], GRAVITE.index(r["grave"]), r["nature"], r["fr"]))
    return out


def couverture(lignes: list[dict]) -> None:
    """Part cumulée des interactions du même type dont le texte est déjà relu quand on arrive à la ligne."""
    total = Counter()
    for r in lignes:
        total[r["nature"]] += r["n"]
    cumul: Counter = Counter()
    for r in lignes:
        cumul[r["nature"]] += r["n"]
        r["couverture"] = cumul[r["nature"]] / total[r["nature"]]


def construire(fr: dict, ar: dict, sortie: Path) -> None:
    lignes = lignes_par_texte(fr, ar)
    couverture(lignes)

    wb = Workbook()
    fin = Side(style="thin", color=CREAM_EDGE)
    cadre = Border(left=fin, right=fin, top=fin, bottom=fin)
    entete = Font(bold=True, color=BRASS_LIGHT, name="Calibri")
    fond_entete = PatternFill("solid", fgColor=NAVY)

    # ─── Notice ──────────────────────────────────────────────
    ws = wb.active
    ws.title = "Notice"
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 120
    notice = [
        ("Relecture des traductions arabes du Thesaurus ANSM", True),
        ("Source française : Thesaurus des interactions médicamenteuses, ANSM, septembre 2023. Les textes français ne se corrigent pas ici.", False),
        ("", False),
        ("Comment relire", True),
        ("1. Onglet « À relire » : les textes sont classés par nombre d'interactions concernées. Commencez par le haut.", False),
        ("2. Si la traduction est juste : mettre « Relu » dans la colonne Statut.", False),
        ("3. Si elle est à corriger : écrire la bonne version dans « Correction AR » (laisser le Statut tel quel ou « À corriger »).", False),
        ("4. La colonne « Couverture » indique la part des interactions du même type dont le texte est relu une fois cette ligne atteinte.", False),
        ("5. Onglet « Vocabulaire » : les choix de termes qui reviennent partout. À trancher en premier, puis à propager.", False),
        ("", False),
        ("Réimporter", True),
        ("python scripts/import_relecture_ar.py data/ansm/relecture_ar.xlsx", False),
        ("puis, pour mettre à jour le site : python scripts/import_ansm_traductions_ar.py data/ansm/interactions_ar.json --apply", False),
        ("Une interaction passe à « traduction relue » quand son texte de risque et sa conduite à tenir (s'il y en a une) sont relus.", False),
        ("", False),
        ("Chiffres", True),
    ]
    totaux = Counter()
    relus = Counter()
    for r in lignes:
        totaux[r["libelle"]] += 1
        relus[r["libelle"]] += r["relu"]
    for lib in ("Risque", "Conduite", "Partenaire"):
        notice.append((f"{lib} : {totaux[lib]} textes distincts, dont {relus[lib]} déjà relus.", False))
    for i, (txt, gras) in enumerate(notice, start=1):
        c = ws.cell(row=i, column=1, value=txt)
        c.font = Font(bold=gras, size=14 if i == 1 else 11, color=NAVY if gras else "333333", name="Calibri")
        c.alignment = Alignment(wrap_text=True, vertical="top")

    # ─── À relire ────────────────────────────────────────────
    ws = wb.create_sheet("À relire")
    colonnes = [
        ("Rang", 6), ("Type", 11), ("Lignes", 8), ("Gravité la plus haute", 22), ("Exemple (substance + partenaire)", 34),
        ("Texte français (ANSM)", 60), ("Traduction arabe", 60), ("Couverture", 11), ("Statut", 12),
        ("Correction AR", 50), ("Commentaire", 30), ("Clé", 10),
    ]
    for j, (nom, largeur) in enumerate(colonnes, start=1):
        c = ws.cell(row=1, column=j, value=nom)
        c.font, c.fill, c.border = entete, fond_entete, cadre
        c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        ws.column_dimensions[get_column_letter(j)].width = largeur
    ws.row_dimensions[1].height = 32

    # le Statut peut avoir été saisi : on ne l'écrase pas à la ré-exportation d'un texte relu
    for i, r in enumerate(lignes, start=1):
        row = i + 1
        valeurs = [i, r["libelle"], r["n"], GRAVITE_LIBELLE[r["grave"]], r["exemple"], r["fr"], r["ar"], r["couverture"],
                   "Relu" if r["relu"] else "À relire", None, None, f"{r['nature'][0]}-{cle(r['fr'])}"]
        for j, v in enumerate(valeurs, start=1):
            c = ws.cell(row=row, column=j, value=v)
            c.border = cadre
            c.alignment = Alignment(wrap_text=True, vertical="top")
            if j == 7 or j == 10:  # arabe : lecture de droite à gauche
                c.alignment = Alignment(wrap_text=True, vertical="top", horizontal="right", readingOrder=2)
                c.font = Font(name="Arial", size=12)
            if j == 8:
                c.number_format = "0%"
            if j == 6:
                c.alignment = Alignment(wrap_text=True, vertical="top", readingOrder=1)
        if r["relu"]:
            for j in range(1, len(colonnes) + 1):
                ws.cell(row=row, column=j).fill = PatternFill("solid", fgColor=TEAL_LIGHT)
        elif i % 2 == 0:
            for j in range(1, len(colonnes) + 1):
                ws.cell(row=row, column=j).fill = PatternFill("solid", fgColor=CREAM)

    dernier = len(lignes) + 1
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(colonnes))}{dernier}"
    validation = DataValidation(type="list", formula1='"À relire,Relu,À corriger"', allow_blank=False, showErrorMessage=True)
    validation.error, validation.errorTitle = "Choisir : À relire, Relu ou À corriger.", "Statut"
    ws.add_data_validation(validation)
    validation.add(f"I2:I{dernier}")
    ws.sheet_properties.tabColor = BRASS

    # ─── Vocabulaire ─────────────────────────────────────────
    wv = wb.create_sheet("Vocabulaire")
    for j, (nom, largeur) in enumerate([("Terme français", 36), ("Choix actuel en arabe", 46), ("Textes distincts", 16), ("Interactions concernées", 22), ("Votre choix", 46), ("Commentaire", 40)], start=1):
        c = wv.cell(row=1, column=j, value=nom)
        c.font, c.fill, c.border = entete, fond_entete, cadre
        c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        wv.column_dimensions[get_column_letter(j)].width = largeur
    stats = []
    for terme, choix, motif in GLOSSAIRE:
        rx = re.compile(motif, re.I)
        textes = [r for r in lignes if r["nature"] in ("risque", "conduite") and rx.search(r["fr"])]
        stats.append((terme, choix, len(textes), sum(r["n"] for r in textes)))
    for i, (terme, choix, nt, nl) in enumerate(sorted(stats, key=lambda s: -s[3]), start=2):
        for j, v in enumerate([terme, choix, nt, nl, None, None], start=1):
            c = wv.cell(row=i, column=j, value=v)
            c.border = cadre
            c.alignment = Alignment(wrap_text=True, vertical="top", horizontal="right" if j in (2, 5) else None, readingOrder=2 if j in (2, 5) else 1)
            if j in (2, 5):
                c.font = Font(name="Arial", size=12)
    wv.freeze_panes = "A2"

    sortie.parent.mkdir(parents=True, exist_ok=True)
    wb.save(sortie)
    print(f"{len(lignes)} textes distincts écrits dans {sortie}")
    for nature, _, lib in TYPES + (("partenaire", "partenaires", "Partenaire"),):
        pris = [r for r in lignes if r["nature"] == nature]
        for k in (50, 100, 200):
            if len(pris) > k:
                print(f"  {lib} : les {k} premiers textes couvrent {pris[k - 1]['couverture']:.0%} des interactions")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fr", type=Path, default=ROOT / "data/ansm/interactions_fr.json")
    ap.add_argument("--ar", type=Path, default=ROOT / "data/ansm/interactions_ar.json")
    ap.add_argument("--sortie", type=Path, default=ROOT / "data/ansm/relecture_ar.xlsx")
    args = ap.parse_args()
    construire(charger(args.fr), charger(args.ar), args.sortie)


if __name__ == "__main__":
    main()
