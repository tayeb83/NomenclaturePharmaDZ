#!/usr/bin/env python3
"""
Propose des FAITS COURTS tirés des RCP (PDF du portail ANPP), chacun avec sa
rubrique et sa page : doses chiffrées (4.2), contre-indications (4.3, en
libellés courts), substances en interaction (4.3, 4.5), grossesse et allaitement
(4.6, en un statut : contre-indiqué, déconseillé…). Ce sont des brouillons : rien n'est
publié avant relecture dans l'admin (/admin/rcp).

Un fait ne recopie pas le RCP : « 25–30 mg par jour », « Méthotrexate ». La phrase
d'origine est gardée à part (champ contexte) pour aider le relecteur et n'est
jamais affichée au public.

Entrée : un dossier de PDF nommés <rcp_id>.pdf (ceux de match_rcp_anpp.py --download).
Sortie : faits_brouillon.json, à importer avec scripts/import_rcp_faits.py.

Usage :
    python scripts/extract_rcp_faits.py rcp_rapprochement/pdfs --out rcp_rapprochement/faits_brouillon.json

Il faut pdfplumber, pypdf ou pdftotext (poppler).
"""

from __future__ import annotations

import argparse
import bisect
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

# ─── Lecture des PDF ─────────────────────────────────────────────────────────


def pdf_pages(path: Path) -> list[str]:
    """Texte page par page (pdfplumber, sinon pypdf, sinon pdftotext)."""
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(path) as pdf:
            return [(p.extract_text() or "") for p in pdf.pages]
    except ImportError:
        pass
    try:
        from pypdf import PdfReader  # type: ignore
        return [(p.extract_text() or "") for p in PdfReader(str(path)).pages]
    except ImportError:
        pass
    res = subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError("Aucun lecteur PDF : pip install pdfplumber (ou pypdf, ou poppler).")
    return res.stdout.split("\f")[:-1] or [res.stdout]


def fold(text: str | None) -> str:
    s = unicodedata.normalize("NFKD", text or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


_PAGE_NO = re.compile(r"Page\s+\d+\s+sur\s+\d+", re.IGNORECASE)


def body_lines(pages: list[str]) -> list[tuple[int, str]]:
    """(page, ligne) sans l'en-tête répété en haut de chaque page (jusqu'à « Page n sur m »)."""
    out: list[tuple[int, str]] = []
    for n, text in enumerate(pages, start=1):
        lines = [l.rstrip() for l in text.splitlines()]
        cut = 0
        for i, l in enumerate(lines[:12]):
            if _PAGE_NO.search(l):
                cut = i + 1
                if cut < len(lines) and re.fullmatch(r"\s*Version\s*:\s*\d+\s*", lines[cut]):
                    cut += 1
                break
        out += [(n, l) for l in lines[cut:] if l.strip()]
    return out


# ─── Rubriques ───────────────────────────────────────────────────────────────

SECTION_TITLES = {
    "4.1": "indications", "4.2": "posologie", "4.3": "contre", "4.4": "mises en garde",
    "4.5": "interactions", "4.6": "fertilit", "4.7": "effets sur la capacit", "4.8": "effets ind",
    "4.9": "surdosage", "5.1": "propri", "5.2": "propri", "5.3": "donn",
}
_HEAD = re.compile(r"^\s*(\d{1,2}\.\d{1,2})\.?\s+(\S.*)$")


def split_sections(lines: list[tuple[int, str]]) -> dict[str, list[tuple[int, str]]]:
    """Lignes de chaque rubrique (4.2, 4.3, 4.5…), titre exclu."""
    sections: dict[str, list[tuple[int, str]]] = {}
    current: str | None = None
    for page, line in lines:
        m = _HEAD.match(line)
        if m and m.group(1) in SECTION_TITLES and fold(m.group(2)).startswith(fold(SECTION_TITLES[m.group(1)])):
            current = m.group(1)
            sections.setdefault(current, [])
            continue
        if re.match(r"^\s*([5-9]|1\d)\.?\s+[A-ZÉ]{3}", line) and current and current.startswith("4"):
            current = None  # rubrique 5, 6… : on sort du chapitre 4
        if current:
            sections[current].append((page, line))
    return sections


def paragraph_text(lines: list[tuple[int, str]]) -> tuple[str, list[int], list[int]]:
    """Texte continu, avec pour chaque ligne son décalage et sa page."""
    text, offsets, pages = "", [], []
    for page, line in lines:
        offsets.append(len(text))
        pages.append(page)
        text += line.strip() + " "
    return text, offsets, pages


def page_at(offsets: list[int], pages: list[int], pos: int) -> int:
    i = bisect.bisect_right(offsets, pos) - 1
    return pages[max(i, 0)]


# ─── Version du texte ────────────────────────────────────────────────────────


def extract_version(pages: list[str]) -> str | None:
    """« Date de mise à jour du texte : 12/2025 » (rubrique 8). Le numéro de version de l'en-tête est ambigu : ignoré."""
    text = "\n".join(pages[-3:])
    m = re.search(r"Date\s+de\s+mise\s+à\s+jour\s+du\s+texte\s*:?\s*(\d{1,2}/\d{1,2}/\d{4}|\d{1,2}/\d{4}|\d{4})", text, re.IGNORECASE)
    return m.group(1) if m else None


# ─── Interactions et associations contre-indiquées ───────────────────────────

SEVERITY_HEADINGS = [
    (re.compile(r"associations?\s+contre[-\s]?indiqu", re.I), "contre_indiquee"),
    (re.compile(r"associations?\s+déconseillé", re.I), "deconseillee"),
    (re.compile(r"pr[ée]cautions?\s+d['’]emploi", re.I), "precaution"),
    (re.compile(r"à\s+prendre\s+en\s+compte", re.I), "a_prendre_en_compte"),
]
SEVERITY_RANK = {"contre_indiquee": 4, "deconseillee": 3, "precaution": 2, "a_prendre_en_compte": 1, "non_precisee": 0}
_PLUS = re.compile(r"^\s*\+\s*(.{2,120})$")
_BULLET = re.compile(r"^\s*(?:[•·●▪■\-–—]|[^\w\s])?\s*")
_ASSOC = re.compile(
    r"^Associations?\s+(?:avec|de|à)\s+(?:(?:les|le|la|des|du|de la|de l|l)(?:\s+|['’]))?(.+?)\s*(?::|\(|;|$)", re.I)


def clean_name(raw: str) -> str:
    name = re.split(r"\s+:\s+|\s+\(voir\s", raw.strip())[0].strip(" .;,")
    name = re.sub(r"\s+", " ", name)
    return name[:1].upper() + name[1:] if name else name


def extract_interactions(sections: dict[str, list[tuple[int, str]]]) -> list[dict]:
    found: dict[str, dict] = {}

    def add(name: str, gravite: str, section: str, page: int, context: str) -> None:
        key = fold(name)
        if not key or len(key) < 3:
            return
        fact = {"type": "interaction", "section": section, "page": page, "libelle": clean_name(name),
                "gravite": gravite, "nom_brut": name.strip(), "contexte": re.sub(r"\s+", " ", context)[:300]}
        old = found.get(key)
        if old is None or SEVERITY_RANK[gravite] > SEVERITY_RANK[old["gravite"]]:
            found[key] = fact

    # 4.3 : « Association avec les tétracyclines : risque… » → contre-indiquée
    for page, line in sections.get("4.3", []):
        m = _ASSOC.match(_BULLET.sub("", line, count=1))
        if m:
            add(m.group(1), "contre_indiquee", "4.3", page, line)

    # 4.5 : « + Méthotrexate », sous des intertitres de gravité quand le RCP en a
    gravite = "non_precisee"
    for page, line in sections.get("4.5", []):
        for rx, g in SEVERITY_HEADINGS:
            if rx.search(line) and not _PLUS.match(line):
                gravite = g
                break
        m = _PLUS.match(line)
        if m:
            add(m.group(1), gravite, "4.5", page, line)
    return sorted(found.values(), key=lambda f: (-SEVERITY_RANK[f["gravite"]], f["libelle"]))


# ─── Doses chiffrées ─────────────────────────────────────────────────────────

_POP_HEADS = [
    (re.compile(r"^\s*(adultes?|patients?\s+adultes?)\s*:?\s*$", re.I), "adulte"),
    (re.compile(r"^\s*(population\s+p[ée]diatrique|enfants?|nourrissons?|adolescents?)[^.]{0,40}$", re.I), "enfant"),
    (re.compile(r"^\s*(sujets?\s+âg[ée]s?|personnes?\s+âg[ée]es?|patients?\s+âg[ée]s?)\s*:?\s*$", re.I), "personne_agee"),
]
_UNIT = r"(mg|g|µg|μg|mcg|ui|iu|ml)"
_NUM = r"(\d+(?:[.,]\d+)?)"
_RANGE = re.compile(rf"{_NUM}\s*(?:à|-|–|et)\s*{_NUM}\s*{_UNIT}\b(\s*/\s*kg|\s+par\s+kg)?", re.I)
_SINGLE = re.compile(rf"{_NUM}\s*{_UNIT}\b(\s*/\s*kg|\s+par\s+kg)?", re.I)
_PER = [(re.compile(r"par\s+jour|/\s*jour|quotidien|journalier|journalière", re.I), "jour"),
        (re.compile(r"par\s+prise|à\s+chaque\s+prise|/\s*prise", re.I), "prise"),
        (re.compile(r"par\s+semaine|hebdomadaire", re.I), "semaine")]
_ROLES = [(re.compile(r"initiale?", re.I), "dose initiale"), (re.compile(r"entretien", re.I), "entretien"),
          (re.compile(r"jusqu['’]à|(?:pas|sans)\s+dépasser|maxim", re.I), "maximum"),
          (re.compile(r"optimal", re.I), "dose optimale")]
_UNITS = {"µg": "mcg", "μg": "mcg", "iu": "ui"}


def _num(s: str) -> float:
    return float(s.replace(",", "."))


def _fmt(v: float) -> str:
    return f"{v:g}".replace(".", ",")


def dose_label(dmin: float, dmax: float | None, unite: str, par: str | None, role: str | None) -> str:
    amount = f"{_fmt(dmin)}–{_fmt(dmax)}" if dmax is not None and dmax != dmin else _fmt(dmin)
    label = f"{amount} {unite}" + (f" par {par}" if par else "")
    return f"{label} ({role})" if role else label


def extract_doses(lines: list[tuple[int, str]]) -> list[dict]:
    if not lines:
        return []
    population = "non_precisee"
    paras: list[tuple[int, str, str]] = []  # (page, population, texte de la phrase)
    buf: list[tuple[int, str]] = []

    def flush() -> None:
        if not buf:
            return
        text, offs, pgs = paragraph_text(buf)
        for m in re.finditer(r"[^.;]+(?:\.\d|[^.;])*[.;]?", text):
            s = m.group(0).strip()
            if s:
                paras.append((page_at(offs, pgs, m.start()), population, s))
        buf.clear()

    for page, line in lines:
        head = next((pop for rx, pop in _POP_HEADS if rx.match(line)), None)
        if head:
            flush()
            population = head
            continue
        if len(line.strip()) < 40 and not line.strip().endswith((".", ",", ";")) and re.match(r"^[A-ZÉ][\w' ’-]{2,38}$", line.strip()):
            flush()  # intertitre court (Mode d'administration, Traitements associés…) : fin du bloc posologie
            if re.match(r"(?i)\s*(mode d.administration|traitements? associ|population)", line):
                population = "non_precisee" if not re.match(r"(?i)\s*population\s+p", line) else "enfant"
            continue
        buf.append((page, line))
    flush()

    out: dict[tuple, dict] = {}
    for page, pop, sentence in paras:
        per = next((p for rx, p in _PER if rx.search(sentence)), None)
        kg = None
        if not (per or re.search(r"/\s*kg|par\s+kg", sentence, re.I)):
            continue  # « paliers de 10 mg » sans fréquence : pas une posologie
        if re.search(r"palier", sentence, re.I):
            continue  # « augmentée par paliers hebdomadaires de 10 mg » : un pas d'augmentation, pas une posologie
        spans: list[tuple[int, int]] = []
        for rx, ranged in ((_RANGE, True), (_SINGLE, False)):
            for m in rx.finditer(sentence):
                if any(a <= m.start() < b for a, b in spans):
                    continue
                spans.append((m.start(), m.end()))
                if ranged:
                    dmin, dmax, unit, kgs = _num(m.group(1)), _num(m.group(2)), m.group(3).lower(), m.group(4)
                else:
                    dmin, dmax, unit, kgs = _num(m.group(1)), None, m.group(2).lower(), m.group(3)
                before = sentence[max(0, m.start() - 60):m.start()]  # « ne pas dépasser », « jusqu'à » juste avant le chiffre
                role = next((r for rx, r in _ROLES if rx.search(before)), None) or next(
                    (r for rx, r in _ROLES if r in ("dose optimale", "entretien") and rx.search(sentence)), None)
                unit = _UNITS.get(unit, unit)
                if kgs:
                    unit += "/kg"
                par = per if per and not kgs else (per or "jour" if kgs else per)
                key = (pop, dmin, dmax, unit, par, role)
                if key not in out:
                    out[key] = {"type": "dose", "section": "4.2", "page": page, "population": pop,
                                "dose_min": dmin, "dose_max": dmax, "unite": unit, "par": par,
                                "libelle": dose_label(dmin, dmax, unit, par, role),
                                "nom_brut": f"{dmin}-{dmax} {unit} {par} {role}",
                                "contexte": re.sub(r"\s+", " ", sentence)[:300]}
    return list(out.values())


# ─── Contre-indications (libellés courts) et grossesse / allaitement ─────────

_BULLET_ONLY = re.compile(r"^\s*[•·●▪■\-–—*]\s*$")
_BULLET_START = re.compile(r"^\s*[•·●▪■\-–—*]\s+(\S.*)$")
_INTRO = re.compile(r"(contre[-\s]?indiqu[ée]e?s?\s+(?:dans|en cas|chez)|dans\s+les\s+cas\s+suivants|:\s*$)", re.I)
_CUT_CONDITION = re.compile(r"\s*(?:[:;,(]|\s(?:sauf|sans|en cas|chez|lors|mentionn)\b)")


def split_items(lines: list[tuple[int, str]]) -> list[tuple[int, str]]:
    """Éléments d'une liste (puces seules, tirets, ou phrases qui se suivent), avec la page du premier mot."""
    items: list[tuple[int, str]] = []
    cur: list[str] = []
    page0 = 1

    def flush() -> None:
        if cur:
            items.append((page0, re.sub(r"\s+", " ", " ".join(cur)).strip()))
            cur.clear()

    for page, line in lines:
        if _BULLET_ONLY.match(line):
            continue  # la puce est souvent extraite seule, à côté de la 2e ligne de l'élément : on ne s'y fie pas
        m = _BULLET_START.match(line)
        if m:
            flush()
            page0, line = page, m.group(1)
        elif cur and line.strip()[:1].isupper() and (
                cur[-1].rstrip().endswith((".", ";", ":")) or cur[0].lower().startswith("association")):
            flush()  # « Association avec X : risque… » n'a pas toujours de point final : une majuscule ouvre l'élément suivant
        if not cur:
            page0 = page
        cur.append(line.strip())
    flush()
    return [(p, t) for p, t in items if t]


def short_condition(item: str) -> str:
    """Nom court de la situation contre-indiquée : « Insuffisance hépatique sévère », « Hypersensibilité à la substance active »."""
    first = _CUT_CONDITION.split(item.strip().rstrip("."), maxsplit=1)[0].strip(" .;,")
    words = first.split()
    label = " ".join(words[:8]) if len(words) > 8 else first
    return label[:1].upper() + label[1:]


def extract_contre_indications(sections: dict[str, list[tuple[int, str]]]) -> list[dict]:
    out: dict[str, dict] = {}
    for page, item in split_items(sections.get("4.3", [])):
        if _ASSOC.match(item) or _INTRO.search(item) or len(item) < 4:
            continue  # les associations sont des interactions ; les phrases d'introduction ne sont pas des situations
        label = short_condition(item)
        key = fold(label)
        if len(key) >= 4 and key not in out:
            out[key] = {"type": "contre_indication", "section": "4.3", "page": page, "libelle": label,
                        "nom_brut": label, "contexte": item[:300]}
    return list(out.values())


_HEAD_GROSSESSE = re.compile(r"^\s*(grossesse|allaitement)\s*:?\s*(.*)$", re.I)
_LEVELS = [
    ("contre_indiquee", re.compile(r"contre[-\s]?ind(?:iqu|ic)", re.I)),  # contre-indiqué, contre-indication
    ("deconseillee", re.compile(r"d[ée]conseill|[àa]\s+[ée]viter|ne\s+(?:doit|devrait)\s+pas\s+[êe]tre\s+utilis", re.I)),
    ("precaution", re.compile(r"prudence|que\s+si\s+n[ée]cessaire|uniquement\s+si|b[ée]n[ée]fice", re.I)),
]


def extract_grossesse(sections: dict[str, list[tuple[int, str]]]) -> list[dict]:
    """Un statut pour la grossesse et un pour l'allaitement. Plusieurs niveaux dans le texte : « non précisé », à trancher à la relecture."""
    segments: dict[str, tuple[int, list[str]]] = {}
    current: str | None = None
    for page, line in sections.get("4.6", []):
        m = _HEAD_GROSSESSE.match(line)
        if m and (not m.group(2) or line.strip().lower().startswith(m.group(1).lower() + " :")):
            current = m.group(1).lower()
            segments.setdefault(current, (page, []))
            if m.group(2):
                segments[current][1].append(m.group(2))
            continue
        stripped = line.strip()
        if current and len(stripped) <= 60 and stripped[:1].isupper() and not stripped.endswith((".", ",", ";", ":")):
            current = None  # autre intertitre (Fertilité, Femmes en âge de procréer…)
            continue
        if current:
            segments[current][1].append(stripped)

    out = []
    for name, (page, texts) in segments.items():
        text = re.sub(r"\s+", " ", " ".join(texts))[:600]
        lead = " ".join(re.split(r"(?<=[.!?])\s+", text)[:2])  # la phrase de principe est dans les deux premières
        found = [lvl for lvl, rx in _LEVELS if rx.search(lead)]
        gravite = found[0] if len(found) == 1 else "non_precisee"
        out.append({"type": "grossesse", "section": "4.6", "page": page, "libelle": name.capitalize(),
                    "gravite": gravite, "nom_brut": name, "contexte": text[:300]})
    return out


# ─── Orchestration ───────────────────────────────────────────────────────────


def extract_rcp(pages: list[str]) -> dict:
    sections = split_sections(body_lines(pages))
    return {
        "version_texte": extract_version(pages),
        "faits": (extract_doses(sections.get("4.2", [])) + extract_contre_indications(sections)
                  + extract_grossesse(sections) + extract_interactions(sections)),
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf_dir", type=Path, help="dossier de PDF nommés <rcp_id>.pdf")
    ap.add_argument("--out", type=Path, default=Path("faits_brouillon.json"))
    args = ap.parse_args(argv)

    results, errors = [], []
    for pdf in sorted(args.pdf_dir.glob("*.pdf")):
        try:
            r = extract_rcp(pdf_pages(pdf))
        except Exception as exc:  # PDF scanné, corrompu, lecteur absent
            errors.append(f"{pdf.name}: {exc}")
            continue
        results.append({"rcp_id": pdf.stem, **r})
    args.out.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")

    n = lambda t: sum(1 for r in results for f in r["faits"] if f["type"] == t)  # noqa: E731
    vides = [r["rcp_id"] for r in results if not r["faits"]]
    print(f"{len(results)} RCP lus : {n('dose')} doses, {n('contre_indication')} contre-indications, "
          f"{n('grossesse')} statuts grossesse/allaitement, {n('interaction')} interactions ({len(vides)} RCP sans aucun fait)")
    print(f"Version du texte trouvée pour {sum(1 for r in results if r['version_texte'])} RCP")
    for e in errors:
        print(f"  ! {e}", file=sys.stderr)
    print(f"Brouillons : {args.out} (à importer avec scripts/import_rcp_faits.py)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
