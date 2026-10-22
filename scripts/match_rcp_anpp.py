#!/usr/bin/env python3
"""
Rapprochement des RCP du portail ANPP (https://rcp.anpp.dz/) avec la
nomenclature (table `enregistrements`).

Entrée  : la liste relevée sur le portail (JSON, une entrée par RCP :
          nomCommercial, dci, laboratoire, pdf, …) et la nomenclature.
Sortie  : un fichier CSV avec, pour chaque RCP, la ou les fiches de la
          nomenclature auxquelles le rattacher, un statut de confiance et la
          raison. Rien n'est écrit en base : le résultat se relit avant import.

Statuts (du plus sûr au moins sûr) :
    auto           marque identique, substance concordante, laboratoire concordant
    probable       marque identique mais laboratoire différent, ou marque très proche
    a_relire       un candidat existe mais un des trois critères ne concorde pas
    dci_seulement  aucune marque trouvée, mais la substance existe : RCP rattachable
                   à la page de la substance, pas à une fiche
    aucune         rien dans la nomenclature

Usage :
    # nomenclature lue dans la base (psql doit être installé)
    DATABASE_URL=... python scripts/match_rcp_anpp.py resultats.json --db

    # ou depuis un export CSV (colonnes : id, dci, nom_marque, labo, dosage, forme)
    python scripts/match_rcp_anpp.py resultats.json --csv nomenclature.csv

    # ou depuis le JSON de test du dépôt
    python scripts/match_rcp_anpp.py resultats.json --json scripts/fixtures/nomenclature_synthetique.json

Dosages : une marque a souvent un PDF par dosage. Avec --download (ou un dossier
de PDF déjà téléchargés, --pdf-dir), le script lit les dosages dans le début du
RCP (titre, composition) et ne garde que les fiches de ce dosage :
    python scripts/match_rcp_anpp.py resultats.json --db --download
Il faut pdfplumber, pypdf ou pdftotext (poppler) pour lire les PDF.

Sorties dans --out (défaut : rcp_rapprochement/) :
    rapprochement.csv        une ligne par RCP
    equivalences_dci.csv     libellé ANPP → libellé nomenclature (à valider)
    equivalences_labos.csv   graphie ANPP → graphie nomenclature (à valider)
    resume.json              compteurs par statut
"""

from __future__ import annotations

import argparse
import csv
import difflib
import io
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

# ─── Normalisation ───────────────────────────────────────────────────────────


def fold(text: str | None) -> str:
    """Majuscules, sans accents ni ponctuation, espaces simples."""
    s = unicodedata.normalize("NFKD", text or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    return re.sub(r"[^A-Z0-9]+", " ", s).strip()


def ratio(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, a, b).ratio()


# Sels, hydrates et formulations qui ne changent pas la substance active.
SALT_WORDS = {
    "CALCIQUE", "SODIQUE", "POTASSIQUE", "MAGNESIQUE", "MAGNESIUM", "CALCIUM", "SODIUM", "POTASSIUM",
    "MONOSODIQUE", "DISODIQUE", "CHLORHYDRATE", "DICHLORHYDRATE", "BROMHYDRATE", "HYDROCHLORIDE",
    "DIHYDROCHLORIDE", "CHLORIDE", "BESILATE", "MESILATE", "MESYLATE", "MALEATE", "DIMALEATE",
    "FUMARATE", "SUCCINATE", "SULFATE", "NITRATE", "TARTRATE", "ACETATE", "PHOSPHATE", "OXALATE", "PROPANEDIOL",
    "TRIHYDRATE", "DIHYDRATE", "MONOHYDRATE", "HEMIHYDRATE", "ANHYDRE", "DIETHYLAMINE", "DIETHYLAMMONIUM",
}
STOP_WORDS = {"DE", "D", "DU", "DES", "LA", "LE", "L", "ET", "ACIDE"}
# Rares équivalences de nom qu'une simple suppression de sel ne couvre pas.
DCI_ALIASES = {"ALENDRONATE": "ALENDRONIQUE"}

_CUT = re.compile(r"\b(EXPRIME(?:E)? EN|SOUS FORME DE|SOUS FORME)\b.*$")


def dci_components(dci: str | None) -> tuple[str, ...]:
    """
    Substances actives d'un libellé, sels et formulations retirés, triées.

    « ATORVASTATINE CALCIQUE TRIHYDRATE EXPRIME EN ATORVASTATINE » → (ATORVASTATINE,)
    « AMLODIPINE BESILATE EXPRIME EN AMLODIPINE/VALSARTAN »        → (AMLODIPINE, VALSARTAN)
    """
    parts = re.split(r"\s*[/+]\s*|\s+ET\s+", (dci or "").upper())
    out: list[str] = []
    for part in parts:
        folded = _CUT.sub("", fold(part)).strip()
        toks = [DCI_ALIASES.get(t, t) for t in folded.split()]
        core = [t for t in toks if t not in SALT_WORDS and t not in STOP_WORDS]
        key = " ".join(core or toks)
        if key:
            out.append(key)
    return tuple(sorted(set(out)))


def dci_relation(a: tuple[str, ...], b: tuple[str, ...]) -> str | None:
    """exact | proche (fautes de frappe) | partielle (association vs mono) | None."""
    if not a or not b:
        return None
    if a == b:
        return "exact"
    if len(a) == len(b) and all(any(ratio(x, y) >= 0.88 for y in b) for x in a):
        return "proche"
    if set(a) & set(b):
        return "partielle"
    return None


LABO_STOP = {
    "SPA", "SARL", "EURL", "SAS", "SA", "GMBH", "LTD", "LIMITED", "AG", "BV", "NV", "INC", "AB",
    "LABORATOIRE", "LABORATOIRES", "LABO", "LABS", "INDUSTRIE", "DU", "DE", "DES", "ET", "MEDICAMENT",
    "INTERNATIONAL", "PHARMACEUTIQUE", "ALGERIENNE", "ALGERIE",
}


def labo_key(labo: str | None) -> str:
    toks = [t for t in fold(labo).split() if t not in LABO_STOP]
    return "".join(toks)


def labo_relation(a: str | None, b: str | None) -> str | None:
    """exact | proche | None. « ELKENDI » et « EL KENDI INDUSTRIE DU MEDICAMENT » sont exacts."""
    ka, kb = labo_key(a), labo_key(b)
    if not ka or not kb:
        return None
    if ka == kb:
        return "exact"
    short, long_ = sorted((ka, kb), key=len)
    if len(short) >= 4 and short in long_:
        return "proche"
    return "proche" if ratio(ka, kb) >= 0.85 else None


UNIT_WORDS = {"MG", "G", "MCG", "UG", "ML", "UI", "IU", "MUI", "L"}


def brand_variants(nom: str, labo: str | None) -> list[tuple[str, str]]:
    """
    Formes sous lesquelles chercher une marque, de la plus fidèle à la plus lâche :
    exacte, sans dosage (« FLUVASTINE 40 MG »), sans nom de laboratoire final
    (« ANASTROZOLE DEMOCEDES »).
    """
    full = fold(nom)
    out = [(full, "exacte")]
    toks = full.split()
    no_dose = [t for t in toks if not (t.isdigit() or t in UNIT_WORDS)]
    if no_dose and no_dose != toks:
        out.append((" ".join(no_dose), "sans_dosage"))
    labo_toks = {t for t in fold(labo).split() if t not in LABO_STOP and len(t) >= 4}
    base = no_dose or toks
    while len(base) > 1 and base[-1] in labo_toks:
        base = base[:-1]
    if base != (no_dose or toks):
        out.append((" ".join(base), "sans_labo"))
    seen: set[str] = set()
    return [(k, t) for k, t in out if k and not (k in seen or seen.add(k))]


# ─── Données ─────────────────────────────────────────────────────────────────


@dataclass
class Fiche:
    id: str
    dci: str
    nom_marque: str
    labo: str
    dosage: str = ""
    forme: str = ""
    comp: tuple[str, ...] = field(default=())


def load_nomenclature(rows: list[dict]) -> list[Fiche]:
    out = []
    for r in rows:
        f = Fiche(
            id=str(r.get("id", "")),
            dci=r.get("dci") or "",
            nom_marque=r.get("nom_marque") or "",
            labo=r.get("labo") or "",
            dosage=r.get("dosage") or "",
            forme=r.get("forme") or "",
        )
        f.comp = dci_components(f.dci)
        if f.nom_marque:
            out.append(f)
    return out


def read_json(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["enregistrements"] if isinstance(data, dict) else data


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def read_db() -> list[dict]:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL absent : exportez la variable ou utilisez --csv / --json.")
    sql = "SELECT id, n_enreg, dci, nom_marque, labo, forme, dosage FROM enregistrements"
    res = subprocess.run(["psql", url, "--csv", "-c", sql], capture_output=True, text=True)
    if res.returncode != 0:
        raise SystemExit(f"psql a échoué : {res.stderr.strip()}")
    return list(csv.DictReader(io.StringIO(res.stdout)))


def dedupe_rcp(entries: list[dict]) -> tuple[list[dict], int]:
    """Une ligne par PDF : le portail renvoie parfois deux fois le même document."""
    seen: set[str] = set()
    out = []
    for e in entries:
        key = e.get("pdf") or json.dumps(e, sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
    return out, len(entries) - len(out)


# ─── Rapprochement ───────────────────────────────────────────────────────────


class Index:
    def __init__(self, fiches: list[Fiche]):
        self.by_brand: dict[str, list[Fiche]] = defaultdict(list)
        self.by_dci: dict[str, list[Fiche]] = defaultdict(list)
        for f in fiches:
            self.by_brand[fold(f.nom_marque)].append(f)
            for c in f.comp:
                self.by_dci[c].append(f)
        self.brand_keys = list(self.by_brand)

    def find_brand(self, nom: str, labo: str | None) -> tuple[list[Fiche], str]:
        """Fiches portant la marque, et comment on l'a trouvée (exacte, sans_dosage, sans_labo, proche)."""
        for key, how in brand_variants(nom, labo):
            if key in self.by_brand:
                return self.by_brand[key], how
        full = fold(nom)
        close = difflib.get_close_matches(full, self.brand_keys, n=2, cutoff=0.88)
        if close:
            return [f for k in close for f in self.by_brand[k]], "proche"
        return [], ""

    def find_dci(self, comp: tuple[str, ...]) -> list[Fiche]:
        found: dict[str, Fiche] = {}
        for c in comp:
            for f in self.by_dci.get(c, []):
                if dci_relation(comp, f.comp):
                    found[f.id] = f
        return list(found.values())


@dataclass
class Result:
    statut: str
    score: float
    brand: str = ""
    dci: str = ""
    labo: str = ""
    fiches: list[Fiche] = field(default_factory=list)
    note: str = ""
    dosage: str = ""          # resolu | tous | aucun | pdf_non_lu | ""
    dosages_pdf: str = ""
    nb_fiches_marque: int = 0


def match_one(entry: dict, index: Index) -> Result:
    nom = entry.get("nomCommercial") or ""
    labo = entry.get("laboratoire") or ""
    comp = dci_components(entry.get("dci") or entry.get("dciRecherchee"))

    cands, how = index.find_brand(nom, labo)
    if not cands:
        by_dci = index.find_dci(comp)
        if by_dci:
            marques = len({fold(f.nom_marque) for f in by_dci})
            return Result("dci_seulement", 0.3, dci="exact", fiches=by_dci[:50],
                          note=f"marque absente ; {marques} marque(s) avec cette substance")
        return Result("aucune", 0.0, note="ni la marque ni la substance")

    scored = []
    for f in cands:
        d = dci_relation(comp, f.comp)
        lb = labo_relation(labo, f.labo)
        scored.append((f, d, lb))
    # on garde, dans l'ordre de préférence, les lignes qui concordent le mieux
    best_rank = max(_rank(d, lb) for _, d, lb in scored)
    kept = [t for t in scored if _rank(t[1], t[2]) == best_rank]
    _, d, lb = kept[0]
    strong = how in ("exacte", "sans_dosage")
    dci_ok, labo_ok = d in ("exact", "proche"), lb is not None

    if strong and dci_ok and labo_ok:
        statut = "auto"
    elif strong and dci_ok:
        statut = "probable"
    elif strong and d == "partielle" and labo_ok:
        statut = "probable"
    elif not strong and dci_ok and labo_ok:
        statut = "probable"
    else:
        statut = "a_relire"

    notes = []
    if how != "exacte":
        notes.append(f"marque {how.replace('_', ' ')}")
    if d is None:
        notes.append("substance différente")
    elif d == "partielle":
        notes.append("substance partiellement concordante (association ?)")
    if lb is None:
        notes.append("laboratoire différent")
    score = round(
        0.5 * {"exacte": 1, "sans_dosage": 0.95, "sans_labo": 0.85, "proche": 0.7}.get(how, 0)
        + 0.3 * {"exact": 1, "proche": 0.85, "partielle": 0.5}.get(d or "", 0)
        + 0.2 * {"exact": 1, "proche": 0.7}.get(lb or "", 0),
        2,
    )
    return Result(statut, score, brand=how, dci=d or "", labo=lb or "",
                  fiches=[f for f, _, _ in kept], note="; ".join(notes))


def _rank(d: str | None, lb: str | None) -> int:
    return {"exact": 3, "proche": 2, "partielle": 1}.get(d or "", 0) * 10 + {"exact": 2, "proche": 1}.get(lb or "", 0)


STATUTS = ["auto", "probable", "a_relire", "dci_seulement", "aucune"]


def run(entries: list[dict], fiches: list[Fiche]) -> list[tuple[dict, Result]]:
    index = Index(fiches)
    return [(e, match_one(e, index)) for e in entries]


# ─── Dosages lus dans les PDF ────────────────────────────────────────────────

_STRENGTH = re.compile(
    r"(\d+(?:[.,]\d+)?(?:\s*[/+]\s*\d+(?:[.,]\d+)?)*)\s*(mg|g|mcg|µg|μg|ug|mui|ui|iu|ml|%)(?![^\W\d_])",
    re.IGNORECASE,
)
_TO_BASE = {"g": ("mg", 1000.0), "mg": ("mg", 1.0), "mcg": ("mcg", 1.0), "µg": ("mcg", 1.0),
            "μg": ("mcg", 1.0), "ug": ("mcg", 1.0), "ui": ("ui", 1.0), "iu": ("ui", 1.0),
            "mui": ("mui", 1.0), "ml": ("ml", 1.0), "%": ("%", 1.0)}


def strengths(text: str | None) -> set[tuple[float, str]]:
    """
    Dosages d'un texte, ramenés à une unité commune.
    « 5/160 mg » → {(5, mg), (160, mg)} ; « 0,5 g » → {(500, mg)} ; « 10mg/5ml » → {(10, mg), (5, ml)}.
    """
    out: set[tuple[float, str]] = set()
    for nums, unit in _STRENGTH.findall(text or ""):
        base, mult = _TO_BASE[unit.lower()]
        for n in re.split(r"\s*[/+]\s*", nums):
            out.add((round(float(n.replace(",", ".")) * mult, 4), base))
    return out


def dosage_zone(text: str) -> str:
    """Début du RCP (titre, composition, forme), sans les excipients ni les données cliniques."""
    cut = re.search(r"\b4\.?\s*DONN[ÉE]ES\s+CLINIQUES", text, re.IGNORECASE)
    zone = text[: cut.start()] if cut else text[:6000]
    return re.sub(r"Excipients?\b.*?(?=\n\s*3\.?\s*FORME\s+PHARMACEUTIQUE)", " ", zone, flags=re.IGNORECASE | re.DOTALL)


def narrow_by_dosage(fiches: list[Fiche], pdf_strengths: set[tuple[float, str]]) -> tuple[list[Fiche], str]:
    """
    Garde les fiches dont le dosage figure dans le PDF.
      resolu  des fiches ont été écartées
      tous    le PDF couvre toutes les fiches (RCP multi-dosages, ou une seule fiche)
      aucun   aucune fiche ne concorde : on garde tout et on signale
    Le score d'une fiche est la part de ses valeurs retrouvées dans le PDF, ce qui
    départage « 5/160 » de « 5/80 » et tolère « 10,84 mg exprimé en 10 mg ».
    """
    def frac(f: Fiche) -> float:
        own = strengths(f.dosage)
        return len(own & pdf_strengths) / len(own) if own else -1.0  # -1 : dosage inconnu

    scores = [(f, frac(f)) for f in fiches]
    best = max((sc for _, sc in scores), default=0)
    if best <= 0:
        return fiches, "aucun"
    kept = [f for f, sc in scores if sc == best or sc < 0]  # dosage inconnu : on ne l'écarte pas
    return kept, ("tous" if len(kept) == len(fiches) else "resolu")


def pdf_text(path: Path, pages: int = 3) -> str:
    """Texte des premières pages (pdfplumber, sinon pypdf, sinon pdftotext)."""
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(path) as pdf:
            return "\n".join((p.extract_text() or "") for p in pdf.pages[:pages])
    except ImportError:
        pass
    try:
        from pypdf import PdfReader  # type: ignore
        return "\n".join((p.extract_text() or "") for p in PdfReader(str(path)).pages[:pages])
    except ImportError:
        pass
    res = subprocess.run(["pdftotext", "-layout", "-f", "1", "-l", str(pages), str(path), "-"],
                         capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError("Aucun lecteur PDF : installez pdfplumber (pip install pdfplumber), pypdf ou poppler.")
    return res.stdout


def fetch_pdf(url: str, dest: Path, timeout: int = 40) -> str | None:
    """Télécharge un PDF s'il manque. Renvoie un message d'erreur, ou None."""
    if dest.exists() and dest.stat().st_size > 0:
        return None
    req = urllib.request.Request(url, headers={"User-Agent": "DwaDZ-rapprochement-RCP/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return str(exc)
    if not data.startswith(b"%PDF"):
        return "la réponse n'est pas un PDF"
    tmp = dest.with_suffix(".part")
    tmp.write_bytes(data)
    tmp.replace(dest)
    time.sleep(0.3)  # un seul document à la fois, sans charger le portail
    return None


def resolve_dosages(results: list[tuple[dict, Result]], pdf_dir: Path, download: bool) -> list[str]:
    """Affecte chaque PDF au bon dosage. Renvoie les erreurs de téléchargement ou de lecture."""
    errors: list[str] = []
    pdf_dir.mkdir(parents=True, exist_ok=True)
    for e, r in results:
        if r.statut not in ("auto", "probable") or not r.fiches:
            continue
        r.nb_fiches_marque = len(r.fiches)
        dest = pdf_dir / f"{rcp_id(e) or fold(e.get('nomCommercial'))}.pdf"
        if download and e.get("pdf"):
            err = fetch_pdf(e["pdf"], dest)
            if err:
                errors.append(f"{e.get('nomCommercial')}: {err}")
        if not dest.exists():
            r.dosage = "pdf_non_lu"
            continue
        try:
            found = strengths(dosage_zone(pdf_text(dest)))
        except Exception as exc:  # PDF corrompu, scanné, lecteur absent
            errors.append(f"{e.get('nomCommercial')}: lecture impossible ({exc})")
            r.dosage = "pdf_non_lu"
            continue
        r.dosages_pdf = " ; ".join(f"{v:g} {u}" for v, u in sorted(found, key=lambda t: (t[1], t[0])))
        if not found:
            r.dosage = "aucun"
            continue
        r.fiches, r.dosage = narrow_by_dosage(r.fiches, found)
    return errors


# ─── Sorties ─────────────────────────────────────────────────────────────────


def rcp_id(entry: dict) -> str:
    m = re.search(r"/([0-9a-f-]{36})\.pdf$", entry.get("pdf") or "")
    return m.group(1) if m else ""


def write_outputs(results: list[tuple[dict, Result]], out: Path, duplicates: int) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    with (out / "rapprochement.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["rcp_id", "statut", "score", "nom_commercial", "dci_anpp", "laboratoire_anpp", "pdf",
                    "marque_trouvee", "dci_concordance", "labo_concordance", "nb_fiches", "ids_nomenclature",
                    "marques_nomenclature", "dci_nomenclature", "labos_nomenclature", "remarque",
                    "autres_rcp_sur_ces_fiches", "dosage", "dosages_dans_le_pdf", "nb_fiches_avant_dosage"])
        order = {s: i for i, s in enumerate(STATUTS)}
        # Plusieurs PDF pour une même marque (un par dosage ?) tombent sur les mêmes fiches :
        # le rattachement est alors sûr pour la marque, pas pour le dosage.
        per_fiche = Counter(f.id for _, r in results if r.statut in ("auto", "probable") for f in r.fiches)
        shared = lambda r: (max((per_fiche[f.id] for f in r.fiches), default=1) - 1  # noqa: E731
                            if r.statut in ("auto", "probable") else 0)
        for e, r in sorted(results, key=lambda t: (order[t[1].statut], t[0].get("nomCommercial", ""))):
            fs = r.fiches
            uniq = lambda xs: " | ".join(sorted({x for x in xs if x}))  # noqa: E731
            w.writerow([
                rcp_id(e), r.statut, r.score, e.get("nomCommercial"), e.get("dci"), e.get("laboratoire"), e.get("pdf"),
                r.brand, r.dci, r.labo, len(fs), ";".join(f.id for f in fs[:30]),
                uniq(f.nom_marque for f in fs[:30]), uniq(f.dci for f in fs[:30]), uniq(f.labo for f in fs[:30]), r.note,
                shared(r), r.dosage, r.dosages_pdf, r.nb_fiches_marque or "",
            ])

    # Tables d'équivalence tirées des rapprochements sûrs, à valider à la main.
    dci_eq: dict[tuple[str, str], int] = Counter()
    labo_eq: dict[tuple[str, str], int] = Counter()
    for e, r in results:
        if r.statut not in ("auto", "probable") or not r.fiches:
            continue
        f = r.fiches[0]
        if e.get("dci") and fold(e["dci"]) != fold(f.dci):
            dci_eq[(e["dci"], f.dci)] += 1
        if e.get("laboratoire") and fold(e["laboratoire"]) != fold(f.labo):
            labo_eq[(e["laboratoire"], f.labo)] += 1
    for name, table, head in (("equivalences_dci.csv", dci_eq, ["libelle_anpp", "libelle_nomenclature", "occurrences"]),
                              ("equivalences_labos.csv", labo_eq, ["graphie_anpp", "graphie_nomenclature", "occurrences"])):
        with (out / name).open("w", encoding="utf-8-sig", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(head)
            for (a, b), n in sorted(table.items(), key=lambda kv: (-kv[1], kv[0])):
                w.writerow([a, b, n])

    counts = Counter(r.statut for _, r in results)
    summary = {
        "rcp_total": len(results),
        "doublons_ignores": duplicates,
        **{s: counts.get(s, 0) for s in STATUTS},
        "rattachables_a_une_fiche": counts["auto"] + counts["probable"],
        "rattachables_a_une_substance": counts["dci_seulement"],
        "rattaches_avec_dosage_ambigu": sum(1 for _, r in results if shared(r) > 0),
        **{f"dosage_{k}": sum(1 for _, r in results if r.dosage == k) for k in ("resolu", "tous", "aucun", "pdf_non_lu")},
    }
    (out / "resume.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("resultats", type=Path, help="JSON relevé sur rcp.anpp.dz")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--db", action="store_true", help="lit enregistrements via psql et $DATABASE_URL")
    src.add_argument("--csv", type=Path, help="export CSV de la nomenclature")
    src.add_argument("--json", type=Path, help="JSON de nomenclature (format scripts/fixtures)")
    ap.add_argument("--out", type=Path, default=Path("rcp_rapprochement"))
    ap.add_argument("--pdf-dir", type=Path, help="dossier des PDF (défaut : <out>/pdfs)")
    ap.add_argument("--download", action="store_true", help="télécharge les PDF manquants depuis rcp.anpp.dz")
    args = ap.parse_args(argv)

    entries, dup = dedupe_rcp(json.loads(args.resultats.read_text(encoding="utf-8")))
    rows = read_db() if args.db else read_csv(args.csv) if args.csv else read_json(args.json)
    fiches = load_nomenclature(rows)
    if not fiches:
        raise SystemExit("Nomenclature vide : rien à rapprocher.")

    results = run(entries, fiches)
    pdf_dir = args.pdf_dir or args.out / "pdfs"
    if args.download or (pdf_dir.is_dir() and any(pdf_dir.glob("*.pdf"))):
        for err in resolve_dosages(results, pdf_dir, args.download):
            print(f"  ! {err}", file=sys.stderr)
    else:
        print("Dosages non vérifiés : ajoutez --download ou --pdf-dir pour lire les PDF.")
    summary = write_outputs(results, args.out, dup)
    print(f"{summary['rcp_total']} RCP ({dup} doublons ignorés) rapprochés de {len(fiches)} fiches de nomenclature")
    for s in STATUTS:
        n = summary[s]
        print(f"  {s:<14} {n:>4}  {100 * n / max(1, summary['rcp_total']):5.1f} %")
    if summary["dosage_resolu"] + summary["dosage_tous"] + summary["dosage_aucun"] + summary["dosage_pdf_non_lu"]:
        print(f"Dosages : {summary['dosage_resolu']} affectés à un dosage précis, {summary['dosage_tous']} couvrant tous les "
              f"dosages de la marque, {summary['dosage_aucun']} à relire, {summary['dosage_pdf_non_lu']} PDF non lus")
    print(f"Détail : {args.out / 'rapprochement.csv'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
