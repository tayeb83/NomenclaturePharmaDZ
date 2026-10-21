#!/usr/bin/env python3
"""
DwaDZ — Dzair-Pharma Training : génération hors ligne des QCM
==============================================================

Produit des questions à choix unique (5 propositions A–E) en statut `draft`,
UNIQUEMENT à partir des champs de la nomenclature (enregistrements, retraits,
classification ATC). Le script n'invente aucun contenu pharmacologique :
indications, effets indésirables, interactions et références bibliographiques
sont hors de son périmètre. Chaque question reste `a_valider` jusqu'à une
relecture humaine (colonnes `relu_par` / `relu_at`) ; seule cette relecture
peut la faire passer en `published`.

Déterminisme : mêmes données + même --seed ⇒ mêmes questions, mêmes
distracteurs, même ordre des propositions, quel que soit l'ordre de lecture
des lignes. Le tirage de chaque question dépend de (seed, question_key).

Types de questions (selon les données disponibles) :
    dci_from_brand          DCI à partir du nom commercial
    reference_generique     produit de référence parmi des génériques
    forme_dosage            forme galénique et dosage
    labo_pays               laboratoire (et pays)
    retrait_motif           motif de retrait d'un produit retiré
    retrait_identification  quel produit a été retiré
    atc_classe              sous-groupe ATC (niveau 3) — si la table existe

Commandes :
    # 1) Génération vers un fichier JSONL (aucune écriture en base)
    python scripts/generate_questions.py generate --out data/questions.jsonl --limit 200
    python scripts/generate_questions.py generate --from-json scripts/fixtures/nomenclature_synthetique.json --out /tmp/q.jsonl

    # 2) Régénération à chaque nouvelle version de la nomenclature (idempotente)
    python scripts/generate_questions.py sync --full
    python scripts/generate_questions.py sync --limit 200        # échantillon

    # 3) Contrôle qualité (une seule bonne réponse, pas de doublons…)
    python scripts/generate_questions.py validate --in data/questions.jsonl

    # La relecture se fait dans l'écran /admin/training/questions.

Variables d'environnement : DATABASE_URL (ou POSTGRES_URL / PG*), comme le
reste du projet. Dépendance : psycopg2 (déjà requise par scripts/import_atc.py),
uniquement pour les modes qui touchent la base.

Régénération sans casse (`sync`) :
  * clé stable `question_key` = hachage des champs d'identité de l'enregistrement
    (nom, DCI, forme, dosage, laboratoire), indépendante des id SERIAL ;
  * nouvelle question ⇒ insérée en `draft` ;
  * question `draft` dont le contenu change ⇒ mise à jour ;
  * question `reviewed` / `published` ⇒ JAMAIS modifiée ; si la nomenclature
    produit désormais un autre contenu, elle est seulement marquée `stale`
    (à relire) ;
  * avec --full, une question dont la source a disparu est marquée `stale`,
    jamais supprimée (l'historique des tentatives la référence).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import re
import sys
import unicodedata
from functools import cached_property, lru_cache
from collections import Counter, defaultdict
from typing import Any, Callable, Iterable, Optional

GENERATOR_VERSION = "1"
OPTION_COUNT = 5
DISTRACTORS = OPTION_COUNT - 1

QUESTION_TYPES = [
    "dci_from_brand",
    "reference_generique",
    "forme_dosage",
    "labo_pays",
    "retrait_motif",
    "retrait_identification",
    "atc_classe",
]

REF_TYPES = {"RE", "I"}   # référence, innovateur (« Ré » est normalisé en RE)
GEN_TYPES = {"GE"}        # générique (« Gé » est normalisé en GE)

# Mots trop génériques pour établir qu'une DCI / un laboratoire en « contient » un autre.
DCI_STOP = {
    "ACIDE", "SODIUM", "SODIQUE", "POTASSIUM", "CALCIUM", "MAGNESIUM", "CHLORHYDRATE",
    "HYDROCHLORIDE", "SULFATE", "PHOSPHATE", "ACETATE", "MALEATE", "TARTRATE",
    "CITRATE", "BROMHYDRATE", "MONOHYDRATE", "DIHYDRATE", "TRIHYDRATE", "ANHYDRE",
}
LABO_STOP = {
    "LABORATOIRES", "LABORATOIRE", "LABO", "PHARMA", "PHARMACEUTICALS", "PHARMACEUTICAL",
    "PHARMACEUTIQUE", "PHARMACEUTIQUES", "INDUSTRIES", "INDUSTRIE", "GROUP", "GROUPE",
    "ALGERIE", "ALGERIA", "LIMITED", "COMPANY", "HEALTHCARE", "SANTE",
}

# ─── Normalisation ───────────────────────────────────────────────────────────


def clean(value: Any) -> str:
    """Texte de la base → chaîne sans espaces superflus (None → '')."""
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


@lru_cache(maxsize=None)
def _norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c)).upper()
    return re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9]+", " ", text)).strip()


def norm(value: Any) -> str:
    """Forme de comparaison : sans accents, majuscules, ponctuation → espace."""
    return _norm(clean(value))


def compact(value: Any) -> str:
    """Comparaison insensible aux espaces et à la ponctuation (« 500 MG » = « 500MG »)."""
    return norm(value).replace(" ", "")


def tokens(value: Any, stop: set[str], min_len: int = 4) -> set[str]:
    return {t for t in norm(value).split() if len(t) >= min_len and t not in stop and not t.isdigit()}


def jaccard(a: Any, b: Any) -> float:
    ta, tb = set(norm(a).split()), set(norm(b).split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def norm_type_prod(value: Any) -> str:
    t = norm(value)
    return {"RÉ": "RE", "GÉ": "GE"}.get(t, t)


def stable_hash(*parts: Any, length: int = 40) -> str:
    return hashlib.sha256("|".join(norm(p) for p in parts).encode("utf-8")).hexdigest()[:length]


def rng_for(seed: int, key: str) -> random.Random:
    digest = hashlib.sha256(f"{seed}:{key}".encode("utf-8")).hexdigest()
    return random.Random(int(digest[:16], 16))


# ─── Jeu de données ──────────────────────────────────────────────────────────


class Nomenclature:
    """Vue indexée de la nomenclature (lecture seule)."""

    def __init__(self, data: dict):
        self.version: str = clean(data.get("version")) or "inconnue"
        self.enr: list[dict] = sorted(data.get("enregistrements", []), key=lambda r: int(r["id"]))
        self.ret: list[dict] = sorted(data.get("retraits", []), key=lambda r: int(r["id"]))
        atc_labels = data.get("atc_codes", {}) or {}
        self.atc_labels: dict[str, dict] = {c: v for c, v in atc_labels.items()}
        self.dci_atc: dict[str, str] = {norm(k): v for k, v in (data.get("dci_atc", {}) or {}).items()}

        self._by_ref: dict[str, dict] = {}
        for table, rows in (("enregistrements", self.enr), ("retraits", self.ret)):
            for r in rows:
                self._by_ref[f"{table}:{r['id']}"] = r
        self.enr_by_brand: dict[str, list[dict]] = defaultdict(list)
        self.enr_by_dci: dict[str, list[dict]] = defaultdict(list)
        self.ret_by_brand: dict[str, list[dict]] = defaultdict(list)
        for r in self.enr:
            if clean(r.get("nom_marque")) and clean(r.get("dci")):
                self.enr_by_brand[norm(r["nom_marque"])].append(r)
                self.enr_by_dci[norm(r["dci"])].append(r)
        for r in self.ret:
            if clean(r.get("nom_marque")):
                self.ret_by_brand[norm(r["nom_marque"])].append(r)

    def resolve(self, source_ref: str) -> Optional[dict]:
        return self._by_ref.get(source_ref)

    # Index calculés une seule fois (les générateurs les consultent pour chaque question).
    @cached_property
    def dci_groups(self) -> dict[str, dict]:
        """DCI normalisée → {text, brand (1ʳᵉ marque), formes, atc}."""
        out: dict[str, dict] = {}
        for dn, rows in sorted(self.enr_by_dci.items()):
            out[dn] = {
                "text": clean(rows[0]["dci"]),
                "brand": clean(rows[0]["nom_marque"]),
                "formes": {norm(r.get("forme")) for r in rows},
                "atc": self.atc_for(rows[0]["dci"]),
            }
        return out

    @cached_property
    def presentations(self) -> dict[tuple[str, str], dict]:
        """(forme, dosage) normalisés → 1ʳᵉ ligne porteuse de cette présentation."""
        out: dict[tuple[str, str], dict] = {}
        for r in self.enr:
            f, d = clean(r.get("forme")), clean(r.get("dosage"))
            if f and d and len(d) <= 70 and len(f) <= 60:
                out.setdefault((norm(f), compact(d)), r)
        return out

    @cached_property
    def labos(self) -> dict[str, dict]:
        out: dict[str, dict] = {}
        for r in self.enr:
            ln = norm(r.get("labo"))
            if ln:
                out.setdefault(ln, r)
        return out

    @cached_property
    def labos_by_dci(self) -> dict[str, set[str]]:
        return {dn: {norm(r.get("labo")) for r in rows} for dn, rows in self.enr_by_dci.items()}

    @cached_property
    def retrait_motifs(self) -> dict[str, dict]:
        out: dict[str, dict] = {}
        for r in self.ret:
            m = clean(r.get("motif_retrait"))
            if m and len(m) <= 220:
                out.setdefault(norm(m), r)
        return out

    @cached_property
    def atc3_groups(self) -> dict[str, dict]:
        """Sous-groupe ATC niveau 3 → {label, dci d'exemple} pour les DCI de la nomenclature."""
        out: dict[str, dict] = {}
        for g in self.dci_groups.values():
            a = g["atc"]
            if a and len(a) >= 4 and self.atc3_label(a[:4]):
                out.setdefault(a[:4], {"label": self.atc3_label(a[:4]), "dci": g["text"]})
        return out

    def atc_for(self, dci: Any) -> Optional[str]:
        return self.dci_atc.get(norm(dci))

    def atc3_label(self, code4: str) -> str:
        return clean((self.atc_labels.get(code4) or {}).get("label_fr")) or clean((self.atc_labels.get(code4) or {}).get("label_en"))

    def has_atc(self) -> bool:
        return bool(self.dci_atc) and bool(self.atc_labels)


def forme_dosage_label(r: dict) -> str:
    return " — ".join(p for p in (clean(r.get("forme")), clean(r.get("dosage"))) if p)


def labo_label(r: dict) -> str:
    labo, pays = clean(r.get("labo")), clean(r.get("pays"))
    return f"{labo} ({pays})" if labo and pays else labo


def date_fr(value: Any) -> str:
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", clean(value))
    return f"{m.group(3)}/{m.group(2)}/{m.group(1)}" if m else clean(value)


def fiche_url(table: str, rid: Any) -> str:
    return f"/medicament/{'retrait' if table == 'retraits' else 'enregistrement'}/{rid}"


# ─── Sélection de distracteurs ───────────────────────────────────────────────


class Candidate(dict):
    """Proposition candidate : {'text', 'tier', 'ref' (brand/dci d'exemple), 'key'}."""


def pick_distractors(
    tiers: list[list[Candidate]],
    rng: random.Random,
    conflicts: Callable[[Candidate, list[Candidate]], bool],
) -> Optional[list[Candidate]]:
    """
    Parcourt les niveaux de plausibilité dans l'ordre (le plus proche d'abord),
    mélange chaque niveau avec le RNG propre à la question, et retient
    DISTRACTORS candidats sans conflit. None si impossible.
    """
    picked: list[Candidate] = []
    seen: set[str] = set()
    for tier_no, tier in enumerate(tiers):
        pool = sorted(tier, key=lambda c: c["key"])
        rng.shuffle(pool)
        for cand in pool:
            if cand["key"] in seen:
                continue
            seen.add(cand["key"])
            if conflicts(cand, picked):
                continue
            cand["tier"] = tier_no
            picked.append(cand)
            if len(picked) == DISTRACTORS:
                return picked
    return None


def difficulty_from(picked: list[Candidate]) -> int:
    close = sum(1 for c in picked if c["tier"] <= 1)
    return 1 if close <= 1 else 2 if close <= 3 else 3


def assemble(
    qtype: str,
    key: str,
    source_table: str,
    source_rec: dict,
    stem: str,
    correct: Candidate,
    picked: list[Candidate],
    rationale_correct: str,
    rationale_wrong: Callable[[Candidate], str],
    contexte: str,
    points_cles: list[str],
    references: list[dict],
    atc_code: Optional[str],
    ds: Nomenclature,
    seed: int,
) -> dict:
    rng = rng_for(seed, key + ":order")
    items = [(correct, True)] + [(c, False) for c in picked]
    rng.shuffle(items)
    options = [c["text"] for c, _ in items]
    correct_index = next(i for i, (_, ok) in enumerate(items) if ok)
    rationales = [rationale_correct if ok else rationale_wrong(c) for c, ok in items]
    explanation = {
        "contexte": contexte,
        "rationales": rationales,
        "points_cles": points_cles,
        "references": references,
    }
    payload = json.dumps(
        {"stem": stem, "options": options, "correct_index": correct_index, "explanation": explanation},
        ensure_ascii=False, sort_keys=True,
    )
    return {
        "question_key": key,
        "type": qtype,
        "source_table": source_table,
        "source_ref": f"{source_table}:{source_rec['id']}",
        "stem": stem,
        "options": options,
        "correct_index": correct_index,
        "explanation": explanation,
        "atc_code": atc_code,
        "difficulty": difficulty_from(picked),
        "status": "draft",
        "a_valider": True,
        "relu_par": None,
        "relu_at": None,
        "content_hash": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
        "db_version": ds.version,
    }


def nomenclature_reference(ds: Nomenclature) -> dict:
    return {"label": f"Nomenclature nationale des produits pharmaceutiques (source MIPH), version {ds.version}"}


def brand_examples(ds: Nomenclature, dci_norm: str, limit: int = 2, exclude: str = "") -> list[str]:
    names: list[str] = []
    for r in ds.enr_by_dci.get(dci_norm, []):
        n = clean(r["nom_marque"])
        if norm(n) != norm(exclude) and n not in names:
            names.append(n)
        if len(names) == limit:
            break
    return names


def describe_record(r: dict) -> str:
    parts = [p for p in (clean(r.get("forme")), clean(r.get("dosage"))) if p]
    labo = labo_label(r)
    txt = ", ".join(parts)
    if labo:
        txt += f"{' ; ' if txt else ''}laboratoire {labo}"
    return txt


# ─── Générateurs par type ────────────────────────────────────────────────────
# Chaque générateur reçoit un enregistrement « source » et renvoie une question
# ou None (la source n'est pas éligible ou aucun jeu de distracteurs propre).


def gen_dci_from_brand(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    brand, dci = clean(rec["nom_marque"]), clean(rec["dci"])
    rows = ds.enr_by_brand[norm(brand)]
    if len({norm(r["dci"]) for r in rows}) != 1 or len(dci) > 90:
        return None
    # Le nom commercial ne doit pas contenir la réponse (question triviale).
    if tokens(dci, DCI_STOP, 5) & set(norm(brand).split()):
        return None
    key = stable_hash("dci_from_brand", brand, dci, rec.get("forme"), rec.get("dosage"), rec.get("labo"))
    rng = rng_for(seed, key)
    correct_atc = ds.atc_for(dci)
    c4 = correct_atc[:4] if correct_atc else None
    forme_n = norm(rec.get("forme"))
    correct_tokens = tokens(dci, DCI_STOP, 5)

    tiers: list[list[Candidate]] = [[], [], [], []]
    for dnorm, g in ds.dci_groups.items():
        if dnorm == norm(dci) or len(g["text"]) > 90:
            continue
        cand = Candidate(text=g["text"], key=dnorm, ref=g["brand"])
        d_atc = g["atc"]
        if c4 and d_atc and d_atc[:4] == c4:
            tiers[0].append(cand)
        elif forme_n and forme_n in g["formes"]:
            tiers[1].append(cand)
        elif correct_atc and d_atc and d_atc[0] == correct_atc[0]:
            tiers[2].append(cand)
        else:
            tiers[3].append(cand)

    def conflicts(cand: Candidate, picked: list[Candidate]) -> bool:
        t = tokens(cand["text"], DCI_STOP, 5)
        if t & correct_tokens:
            return True
        return any(t & tokens(p["text"], DCI_STOP, 5) for p in picked)

    picked = pick_distractors(tiers, rng, conflicts)
    if not picked:
        return None
    ctx = ", ".join(p for p in (clean(rec.get("forme")), clean(rec.get("dosage"))) if p)
    stem = f"Quelle est la DCI de la spécialité {brand}" + (f" ({ctx})" if ctx else "") + " ?"
    others = brand_examples(ds, norm(dci), 2, exclude=brand)
    points = [
        "La DCI est la substance active déclarée dans la nomenclature, indépendamment du nom commercial.",
        f"{brand} : DCI déclarée = {dci}.",
    ]
    if others:
        points.append(f"Autres spécialités de la nomenclature déclarant la même DCI : {', '.join(others)}.")
    if correct_atc:
        points.append(f"Code ATC rattaché à cette DCI dans DwaDZ : {correct_atc}.")
    return assemble(
        "dci_from_brand", key, "enregistrements", rec, stem,
        Candidate(text=dci),
        picked,
        f"Correct. La nomenclature indique « {dci} » comme DCI de {brand}.",
        lambda c: f"Faux. « {c['text']} » est la DCI d'autres spécialités de la nomenclature (par exemple {c['ref']}), pas de {brand}.",
        f"{brand} est une spécialité enregistrée dans la nomenclature nationale"
        f"{' (n° d’enregistrement ' + clean(rec.get('n_enreg')) + ')' if clean(rec.get('n_enreg')) else ''} : "
        f"{describe_record(rec)}. Sa substance active déclarée (DCI) est : {dci}.",
        points,
        [{"label": f"Fiche nomenclature : {brand}", "url": fiche_url("enregistrements", rec["id"])}, nomenclature_reference(ds)],
        correct_atc, ds, seed,
    )


def gen_reference_generique(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    if norm_type_prod(rec.get("type_prod")) not in REF_TYPES:
        return None
    brand, dci, forme = clean(rec["nom_marque"]), clean(rec["dci"]), clean(rec.get("forme"))
    if not forme:
        return None
    group = [r for r in ds.enr_by_dci[norm(dci)] if norm(r.get("forme")) == norm(forme)]
    ref_brands = {norm(r["nom_marque"]) for r in group if norm_type_prod(r.get("type_prod")) in REF_TYPES}
    if ref_brands != {norm(brand)}:
        return None  # plusieurs références pour cette DCI + forme : ambigu
    gens: dict[str, dict] = {}
    for r in group:
        bn = norm(r["nom_marque"])
        if norm_type_prod(r.get("type_prod")) not in GEN_TYPES or bn == norm(brand):
            continue
        # La marque ne doit être référence nulle part ailleurs dans la nomenclature.
        if any(norm_type_prod(x.get("type_prod")) in REF_TYPES for x in ds.enr_by_brand[bn]):
            continue
        gens.setdefault(bn, r)
    if len(gens) < DISTRACTORS:
        return None
    key = stable_hash("reference_generique", dci, forme)
    rng = rng_for(seed, key)
    ref_dosage = compact(rec.get("dosage"))
    tiers: list[list[Candidate]] = [[], []]
    for bn, r in gens.items():
        cand = Candidate(text=clean(r["nom_marque"]), key=bn, ref=norm_type_prod(r.get("type_prod")))
        tiers[0 if compact(r.get("dosage")) == ref_dosage else 1].append(cand)
    picked = pick_distractors(tiers, rng, lambda c, p: False)
    if not picked:
        return None
    return assemble(
        "reference_generique", key, "enregistrements", rec,
        f"Parmi ces spécialités à base de {dci} ({forme}), laquelle est enregistrée comme produit de référence ?",
        Candidate(text=brand), picked,
        f"Correct. Dans la nomenclature, {brand} est enregistré comme produit de référence (type « {norm_type_prod(rec.get('type_prod'))} »).",
        lambda c: f"Faux. {c['text']} est enregistré comme générique (type « {c['ref']} ») dans la nomenclature.",
        f"Les cinq spécialités proposées sont à base de {dci}, sous forme {forme}. Une seule y est enregistrée "
        f"comme produit de référence ; les autres le sont comme génériques.",
        [
            "Le champ « type » de la nomenclature distingue référence / innovateur (RE, I), générique (GE) et biologique (BIO).",
            f"{brand} : type « {norm_type_prod(rec.get('type_prod'))} », laboratoire {labo_label(rec) or 'non renseigné'}.",
            f"Pour {dci} en {forme}, la nomenclature compte {len(gens)} générique(s) distinct(s) pour une seule référence.",
        ],
        [{"label": f"Fiche nomenclature : {brand}", "url": fiche_url("enregistrements", rec["id"])},
         {"label": f"Substitution générique : {dci}", "url": f"/substitution/{dci}"},
         nomenclature_reference(ds)],
        ds.atc_for(dci), ds, seed,
    )


def gen_forme_dosage(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    brand, dci = clean(rec["nom_marque"]), clean(rec["dci"])
    forme, dosage = clean(rec.get("forme")), clean(rec.get("dosage"))
    rows = ds.enr_by_brand[norm(brand)]
    if not forme or not dosage or len(dosage) > 70 or len(forme) > 60:
        return None
    if len({(norm(r.get("forme")), compact(r.get("dosage"))) for r in rows}) != 1:
        return None  # la marque a plusieurs présentations : réponse ambiguë
    key = stable_hash("forme_dosage", brand, dci, forme, dosage, rec.get("labo"))
    rng = rng_for(seed, key)
    own = {(norm(r.get("forme")), compact(r.get("dosage"))) for r in rows}
    correct_text = forme_dosage_label(rec)
    tiers: list[list[Candidate]] = [[], [], [], []]
    for (fn, dn), r in ds.presentations.items():
        if (fn, dn) in own:
            continue
        cand = Candidate(text=forme_dosage_label(r), key=f"{fn}|{dn}", ref=clean(r["nom_marque"]))
        if norm(r["dci"]) == norm(dci):
            tiers[0].append(cand)
        elif fn == norm(forme):
            tiers[1].append(cand)
        elif dn == compact(dosage):
            tiers[2].append(cand)
        else:
            tiers[3].append(cand)
    picked = pick_distractors(tiers, rng, lambda c, p: False)
    if not picked:
        return None
    return assemble(
        "forme_dosage", key, "enregistrements", rec,
        f"Quelle est la présentation (forme galénique et dosage) de la spécialité {brand}, à base de {dci} ?",
        Candidate(text=correct_text), picked,
        f"Correct. La nomenclature enregistre {brand} sous la présentation « {correct_text} ».",
        lambda c: f"Faux. « {c['text']} » est la présentation d'une autre spécialité de la nomenclature (par exemple {c['ref']}), pas de {brand}.",
        f"{brand} ({dci}) figure dans la nomenclature avec une seule présentation : {correct_text}.",
        [
            "La forme galénique et le dosage font partie des champs d'identité d'un enregistrement.",
            f"{brand} : {correct_text}.",
        ],
        [{"label": f"Fiche nomenclature : {brand}", "url": fiche_url("enregistrements", rec["id"])}, nomenclature_reference(ds)],
        ds.atc_for(dci), ds, seed,
    )


def gen_labo_pays(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    brand, dci = clean(rec["nom_marque"]), clean(rec["dci"])
    rows = ds.enr_by_brand[norm(brand)]
    correct_text = labo_label(rec)
    if not clean(rec.get("labo")) or len({norm(r.get("labo")) for r in rows}) != 1:
        return None
    key = stable_hash("labo_pays", brand, dci, rec.get("forme"), rec.get("dosage"), rec.get("labo"))
    rng = rng_for(seed, key)
    same_dci_labos = ds.labos_by_dci[norm(dci)]
    pays_n = norm(rec.get("pays"))
    correct_tokens = tokens(rec["labo"], LABO_STOP)
    tiers: list[list[Candidate]] = [[], [], []]
    for ln, r in ds.labos.items():
        if ln == norm(rec["labo"]):
            continue
        cand = Candidate(text=labo_label(r), key=ln, ref=clean(r["nom_marque"]), labo=clean(r["labo"]))
        if ln in same_dci_labos:
            tiers[0].append(cand)
        elif pays_n and norm(r.get("pays")) == pays_n:
            tiers[1].append(cand)
        else:
            tiers[2].append(cand)

    def conflicts(cand: Candidate, picked: list[Candidate]) -> bool:
        t = tokens(cand["labo"], LABO_STOP)
        return bool(t & correct_tokens) or any(t & tokens(p["labo"], LABO_STOP) for p in picked)

    picked = pick_distractors(tiers, rng, conflicts)
    if not picked:
        return None
    ctx = ", ".join(p for p in (dci, clean(rec.get("forme"))) if p)
    return assemble(
        "labo_pays", key, "enregistrements", rec,
        f"Quel laboratoire détient l'enregistrement de la spécialité {brand} ({ctx}) dans la nomenclature ?",
        Candidate(text=correct_text), picked,
        f"Correct. La nomenclature indique {correct_text} comme laboratoire de {brand}.",
        lambda c: f"Faux. {c['text']} figure dans la nomenclature (par exemple pour {c['ref']}), mais pas pour {brand}.",
        f"{brand} ({ctx}) est enregistré au nom du laboratoire {correct_text}.",
        [
            "Le laboratoire et son pays sont deux champs distincts de la nomenclature.",
            f"{brand} : laboratoire {correct_text}.",
        ],
        [{"label": f"Fiche nomenclature : {brand}", "url": fiche_url("enregistrements", rec["id"])},
         {"label": f"Laboratoire : {clean(rec['labo'])}", "url": "/laboratoires"},
         nomenclature_reference(ds)],
        ds.atc_for(dci), ds, seed,
    )


def gen_retrait_motif(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    brand, dci, motif = clean(rec["nom_marque"]), clean(rec["dci"]), clean(rec.get("motif_retrait"))
    if not motif or len(motif) > 220:
        return None
    rows = ds.ret_by_brand[norm(brand)]
    if len({norm(r.get("motif_retrait")) for r in rows if clean(r.get("motif_retrait"))}) != 1:
        return None
    key = stable_hash("retrait_motif", brand, dci, rec.get("forme"), rec.get("dosage"), rec.get("labo"))
    rng = rng_for(seed, key)
    year = clean(rec.get("date_retrait"))[:4]
    tiers: list[list[Candidate]] = [[], []]
    for mn, r in ds.retrait_motifs.items():
        if mn == norm(motif):
            continue
        cand = Candidate(text=clean(r["motif_retrait"]), key=mn, ref=clean(r["nom_marque"]))
        tiers[0 if year and clean(r.get("date_retrait"))[:4] == year else 1].append(cand)

    def conflicts(cand: Candidate, picked: list[Candidate]) -> bool:
        return jaccard(cand["text"], motif) >= 0.6 or any(jaccard(cand["text"], p["text"]) >= 0.6 for p in picked)

    picked = pick_distractors(tiers, rng, conflicts)
    if not picked:
        return None
    when = date_fr(rec.get("date_retrait"))
    ctx = ", ".join(p for p in (dci, clean(rec.get("forme")), clean(rec.get("dosage"))) if p)
    return assemble(
        "retrait_motif", key, "retraits", rec,
        f"Quel motif de retrait la nomenclature indique-t-elle pour la spécialité {brand} ({ctx}) ?",
        Candidate(text=motif), picked,
        f"Correct. Le motif de retrait indiqué pour {brand} est : « {motif} ».",
        lambda c: f"Faux. Ce motif est indiqué pour d'autres produits retirés (par exemple {c['ref']}), pas pour {brand}.",
        f"{brand} ({ctx}) figure dans la liste des produits retirés de la nomenclature"
        f"{' (date de retrait : ' + when + ')' if when else ''}. Motif indiqué : {motif}.",
        [
            "La liste des retraits précise, pour chaque produit, la date et le motif du retrait.",
            f"{brand} : « {motif} ».",
        ],
        [{"label": f"Fiche (produit retiré) : {brand}", "url": fiche_url("retraits", rec["id"])},
         {"label": "Liste des retraits", "url": "/retraits"},
         nomenclature_reference(ds)],
        ds.atc_for(dci), ds, seed,
    )


def gen_retrait_identification(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    brand, dci = clean(rec["nom_marque"]), clean(rec["dci"])
    if norm(brand) in ds.enr_by_brand:
        return None  # la même marque est encore enregistrée : ambigu
    key = stable_hash("retrait_identification", brand, dci, rec.get("forme"), rec.get("dosage"), rec.get("labo"))
    rng = rng_for(seed, key)
    forme_n = norm(rec.get("forme"))
    actives: dict[str, dict] = {}
    for r in ds.enr_by_dci.get(norm(dci), []):
        bn = norm(r["nom_marque"])
        if bn in ds.ret_by_brand or bn == norm(brand):
            continue  # une marque active aussi présente dans les retraits est écartée
        actives.setdefault(bn, r)
    if len(actives) < DISTRACTORS:
        return None
    tiers: list[list[Candidate]] = [[], []]
    for bn, r in actives.items():
        cand = Candidate(text=clean(r["nom_marque"]), key=bn)
        tiers[0 if forme_n and norm(r.get("forme")) == forme_n else 1].append(cand)
    picked = pick_distractors(tiers, rng, lambda c, p: False)
    if not picked:
        return None
    when = date_fr(rec.get("date_retrait"))
    motif = clean(rec.get("motif_retrait"))
    return assemble(
        "retrait_identification", key, "retraits", rec,
        f"Parmi ces spécialités à base de {dci}, laquelle figure dans la liste des produits retirés de la nomenclature ?",
        Candidate(text=brand), picked,
        f"Correct. {brand} figure dans la liste des retraits"
        f"{' (retrait du ' + when + ')' if when else ''}.",
        lambda c: f"Faux. {c['text']} est toujours enregistré dans la nomenclature actuelle.",
        f"Une seule des cinq spécialités à base de {dci} est un produit retiré : {brand}"
        f"{' (retrait du ' + when + ')' if when else ''}"
        f"{', motif indiqué : ' + motif if motif else ''}.",
        [
            "Un produit retiré n'est plus enregistré : il ne figure que dans la liste des retraits.",
            f"{brand} : produit retiré{' le ' + when if when else ''}.",
        ],
        [{"label": f"Fiche (produit retiré) : {brand}", "url": fiche_url("retraits", rec["id"])},
         {"label": "Liste des retraits", "url": "/retraits"},
         nomenclature_reference(ds)],
        ds.atc_for(dci), ds, seed,
    )


def gen_atc_classe(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    dci = clean(rec["dci"])
    code = ds.atc_for(dci)
    if not code or len(code) < 4:
        return None
    c4, label = code[:4], ds.atc3_label(code[:4])
    if not label:
        return None
    key = stable_hash("atc_classe", dci)
    rng = rng_for(seed, key)
    # Sous-groupes réellement utilisés par la nomenclature (propositions plausibles).
    tiers: list[list[Candidate]] = [[], [], []]
    for g, info in ds.atc3_groups.items():
        if g == c4:
            continue
        cand = Candidate(text=f"{g} — {info['label']}", key=g, label=info["label"], ref=info["dci"])
        tiers[0 if g[:3] == c4[:3] else 1 if g[0] == c4[0] else 2].append(cand)

    def conflicts(cand: Candidate, picked: list[Candidate]) -> bool:
        return jaccard(cand["label"], label) >= 0.7 or any(jaccard(cand["label"], p["label"]) >= 0.7 for p in picked)

    picked = pick_distractors(tiers, rng, conflicts)
    if not picked:
        return None
    correct_text = f"{c4} — {label}"
    return assemble(
        "atc_classe", key, "enregistrements", rec,
        f"Selon la classification ATC, dans quel sous-groupe pharmacologique (niveau 3) la DCI {dci} est-elle classée ?",
        Candidate(text=correct_text), picked,
        f"Correct. Dans la table ATC de DwaDZ, {dci} est rattachée au code {code}, du sous-groupe {c4} (« {label} »).",
        lambda c: f"Faux. {c['text'].split(' — ')[0]} (« {c['label']} ») regroupe d'autres DCI de la nomenclature, par exemple {c['ref']} ; ce n'est pas le sous-groupe de {dci}.",
        f"La DCI {dci} est rattachée au code ATC {code} dans la table de correspondance DCI ↔ ATC de DwaDZ.",
        [
            "Le code ATC comporte 5 niveaux ; les 4 premiers caractères désignent le sous-groupe pharmacologique (niveau 3).",
            f"{dci} : {code}, sous-groupe {c4} (« {label} »).",
        ],
        [{"label": f"Classes thérapeutiques : {c4}", "url": "/classes-therapeutiques"},
         {"label": f"Fiche nomenclature : {clean(rec['nom_marque'])}", "url": fiche_url("enregistrements", rec["id"])},
         nomenclature_reference(ds)],
        code, ds, seed,
    )


GENERATORS: dict[str, tuple[Callable, str]] = {
    "dci_from_brand": (gen_dci_from_brand, "enr"),
    "reference_generique": (gen_reference_generique, "enr"),
    "forme_dosage": (gen_forme_dosage, "enr"),
    "labo_pays": (gen_labo_pays, "enr"),
    "retrait_motif": (gen_retrait_motif, "ret"),
    "retrait_identification": (gen_retrait_identification, "ret"),
    "atc_classe": (gen_atc_classe, "enr"),
}

# ─── Contrôle qualité indépendant ────────────────────────────────────────────


def verify_question(q: dict, ds: Nomenclature) -> list[str]:
    """
    Revérifie une question contre la nomenclature SANS réutiliser la logique
    de génération : compte les propositions vraies. Retourne la liste des
    anomalies (vide = OK).
    """
    errs: list[str] = []
    opts = q.get("options") or []
    ci = q.get("correct_index")
    if len(opts) != OPTION_COUNT:
        return [f"{OPTION_COUNT} propositions attendues, {len(opts)} trouvées"]
    if not isinstance(ci, int) or not 0 <= ci < OPTION_COUNT:
        return ["correct_index invalide"]
    if any(not clean(o) for o in opts):
        errs.append("proposition vide")
    compacts = [compact(o) for o in opts]
    if len(set(compacts)) != OPTION_COUNT:
        errs.append("doublon entre propositions")
    if not clean(q.get("stem")):
        errs.append("énoncé vide")
    expl = q.get("explanation") or {}
    if len(expl.get("rationales") or []) != OPTION_COUNT:
        errs.append("une justification par proposition est requise")
    if not expl.get("contexte") or not expl.get("points_cles") or not expl.get("references"):
        errs.append("explication incomplète (contexte / points clés / références)")
    if q.get("status") == "draft" and q.get("relu_par"):
        errs.append("brouillon déjà marqué relu")

    rec = ds.resolve(q.get("source_ref", ""))
    if rec is None:
        errs.append("source introuvable dans la nomenclature")
        return errs
    brand_n = norm(rec["nom_marque"])
    qtype = q["type"]
    true_idx: list[int] = []

    if qtype == "dci_from_brand":
        valid = {norm(r["dci"]) for r in ds.enr_by_brand.get(brand_n, [])}
        true_idx = [i for i, o in enumerate(opts) if norm(o) in valid]
        ct = tokens(opts[ci], DCI_STOP, 5)
        for i, o in enumerate(opts):
            if i != ci and tokens(o, DCI_STOP, 5) & ct:
                errs.append(f"proposition {chr(65 + i)} ambiguë avec la bonne réponse (substance commune)")
    elif qtype == "reference_generique":
        def is_ref(name: str) -> bool:
            return any(norm_type_prod(r.get("type_prod")) in REF_TYPES for r in ds.enr_by_brand.get(norm(name), []))
        true_idx = [i for i, o in enumerate(opts) if is_ref(o)]
    elif qtype == "forme_dosage":
        valid = {(norm(r.get("forme")), compact(r.get("dosage"))) for r in ds.enr_by_brand.get(brand_n, [])}
        for i, o in enumerate(opts):
            f, _, d = o.partition(" — ")
            if (norm(f), compact(d)) in valid:
                true_idx.append(i)
    elif qtype == "labo_pays":
        valid = {norm(labo_label(r)) for r in ds.enr_by_brand.get(brand_n, [])} | {norm(r.get("labo")) for r in ds.enr_by_brand.get(brand_n, [])}
        true_idx = [i for i, o in enumerate(opts) if norm(o) in valid]
        ct = tokens(rec["labo"], LABO_STOP)
        for i, o in enumerate(opts):
            if i != ci and tokens(re.sub(r"\([^)]*\)", "", o), LABO_STOP) & ct:
                errs.append(f"proposition {chr(65 + i)} ambiguë (laboratoire apparenté)")
    elif qtype == "retrait_motif":
        valid = {norm(r.get("motif_retrait")) for r in ds.ret_by_brand.get(brand_n, [])}
        true_idx = [i for i, o in enumerate(opts) if norm(o) in valid]
        for i, o in enumerate(opts):
            if i != ci and jaccard(o, opts[ci]) >= 0.6:
                errs.append(f"proposition {chr(65 + i)} quasi identique à la bonne réponse")
    elif qtype == "retrait_identification":
        true_idx = [i for i, o in enumerate(opts) if norm(o) in ds.ret_by_brand and norm(o) not in ds.enr_by_brand]
        for i, o in enumerate(opts):
            if i != ci and norm(o) not in ds.enr_by_brand:
                errs.append(f"proposition {chr(65 + i)} n'est pas une spécialité enregistrée")
    elif qtype == "atc_classe":
        full = ds.atc_for(rec["dci"]) or ""
        true_idx = [i for i, o in enumerate(opts) if full.startswith(o.split(" — ")[0].strip())]
    else:
        errs.append(f"type inconnu : {qtype}")

    if true_idx != [ci]:
        errs.append(f"une seule bonne réponse attendue (index {ci}) ; propositions vraies trouvées : {true_idx}")
    return errs


# ─── Orchestration ───────────────────────────────────────────────────────────


def generate(
    ds: Nomenclature,
    seed: int = 42,
    limit: Optional[int] = None,
    per_type: Optional[int] = None,
    types: Optional[Iterable[str]] = None,
    max_per_dci: int = 2,
) -> tuple[list[dict], dict]:
    """Retourne (questions, rapport). `limit`/`per_type` None ⇒ tout générer."""
    wanted = [t for t in QUESTION_TYPES if not types or t in set(types)]
    if not ds.has_atc():
        wanted = [t for t in wanted if t != "atc_classe"]
    report: dict[str, Any] = {"seed": seed, "version": ds.version, "skipped": Counter(), "by_type": {}}
    batches: dict[str, list[dict]] = {}

    for qtype in wanted:
        fn, src = GENERATORS[qtype]
        rows = ds.enr if src == "enr" else ds.ret
        order = [r for r in rows]
        # Tri de présentation reproductible, indépendant de l'ordre de lecture.
        order.sort(key=lambda r: hashlib.sha256(f"{seed}:{qtype}:{r['id']}".encode()).hexdigest())
        out: list[dict] = []
        seen_keys: set[str] = set()
        per_dci: Counter = Counter()
        cap = per_type if per_type is not None else (None if limit is None else limit)
        for r in order:
            if cap is not None and len(out) >= cap:
                break
            dkey = norm(r.get("dci"))
            if (limit is not None or per_type is not None) and per_dci[dkey] >= max_per_dci:
                continue
            q = fn(ds, r, seed)
            if q is None:
                report["skipped"][f"{qtype}:inéligible"] += 1
                continue
            if q["question_key"] in seen_keys:
                continue
            errs = verify_question(q, ds)
            if errs:
                report["skipped"][f"{qtype}:rejetée au contrôle"] += 1
                report.setdefault("rejects", []).append({"key": q["question_key"], "errors": errs})
                continue
            seen_keys.add(q["question_key"])
            per_dci[dkey] += 1
            out.append(q)
        batches[qtype] = out

    questions: list[dict] = []
    if limit is None:
        for t in wanted:
            questions.extend(batches[t])
    else:
        # Répartition équitable entre types, puis complément avec ce qui reste.
        share = max(1, limit // max(1, len(wanted)))
        taken = {t: batches[t][:share] for t in wanted}
        questions = [q for t in wanted for q in taken[t]]
        for t in wanted:
            for q in batches[t][share:]:
                if len(questions) >= limit:
                    break
                questions.append(q)
        questions = questions[:limit]

    report["by_type"] = dict(Counter(q["type"] for q in questions))
    report["total"] = len(questions)
    report["skipped"] = dict(report["skipped"])
    return questions, report


def validate_set(questions: list[dict], ds: Nomenclature) -> list[tuple[str, list[str]]]:
    problems: list[tuple[str, list[str]]] = []
    keys: Counter = Counter(q["question_key"] for q in questions)
    for q in questions:
        errs = verify_question(q, ds)
        if keys[q["question_key"]] > 1:
            errs.append("question_key en double")
        if errs:
            problems.append((q["question_key"], errs))
    return problems


# ─── Accès base de données ───────────────────────────────────────────────────


def get_connection():
    try:
        import psycopg2
    except ImportError:
        sys.exit("psycopg2 non installé. Lancez : pip install psycopg2-binary")
    dsn = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL") or os.environ.get("POSTGRES_PRISMA_URL")
    if dsn:
        ssl = "require" if os.environ.get("DATABASE_SSL") == "true" else None
        return psycopg2.connect(dsn, sslmode=ssl) if ssl else psycopg2.connect(dsn)
    return psycopg2.connect(
        host=os.environ.get("PGHOST"), port=os.environ.get("PGPORT"),
        dbname=os.environ.get("PGDATABASE"), user=os.environ.get("PGUSER"), password=os.environ.get("PGPASSWORD"),
    )


def load_from_db(conn) -> Nomenclature:
    import psycopg2.extras
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def table_exists(name: str) -> bool:
        cur.execute("SELECT to_regclass(%s) IS NOT NULL AS ok", (f"public.{name}",))
        return bool(cur.fetchone()["ok"])

    def rows(sql: str) -> list[dict]:
        cur.execute(sql)
        return [{k: (str(v) if hasattr(v, "isoformat") else v) for k, v in r.items()} for r in cur.fetchall()]

    version = "inconnue"
    if table_exists("nomenclature_versions"):
        cur.execute("SELECT version_label FROM nomenclature_versions ORDER BY reference_date DESC NULLS LAST, created_at DESC LIMIT 1")
        row = cur.fetchone()
        version = row["version_label"] if row else version
    data: dict[str, Any] = {
        "version": version,
        "enregistrements": rows("SELECT id, n_enreg, dci, nom_marque, forme, dosage, labo, pays, type_prod FROM enregistrements"),
        "retraits": rows("SELECT id, n_enreg, dci, nom_marque, forme, dosage, labo, pays, type_prod, date_retrait, motif_retrait FROM retraits"),
    }
    if table_exists("atc_codes") and table_exists("dci_atc_mapping"):
        data["atc_codes"] = {r["code"]: r for r in rows("SELECT code, niveau, label_fr, label_en FROM atc_codes WHERE niveau = 3")}
        data["dci_atc"] = {r["dci"]: r["code_atc"] for r in rows("SELECT dci, code_atc FROM dci_atc_mapping")}
    return Nomenclature(data)


SYNC_COLUMNS = ("type", "source_table", "source_ref", "stem", "options", "correct_index", "explanation",
                "atc_code", "difficulty", "content_hash")


def sync_to_db(conn, questions: list[dict], ds: Nomenclature, full: bool) -> dict:
    """Upsert non destructif — voir la docstring du module."""
    import psycopg2.extras
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT question_key, status, content_hash, stale, stale_reason FROM training_questions")
    existing = {r["question_key"]: r for r in cur.fetchall()}
    stats = Counter()
    produced = set()

    for q in questions:
        produced.add(q["question_key"])
        ex = existing.get(q["question_key"])
        params = {**q, "options": json.dumps(q["options"], ensure_ascii=False), "explanation": json.dumps(q["explanation"], ensure_ascii=False)}
        if ex is None:
            cur.execute(
                """INSERT INTO training_questions
                     (question_key, type, source_table, source_ref, stem, options, correct_index, explanation,
                      atc_code, difficulty, status, a_valider, content_hash, db_version, last_seen_version)
                   VALUES (%(question_key)s, %(type)s, %(source_table)s, %(source_ref)s, %(stem)s, %(options)s::jsonb,
                           %(correct_index)s, %(explanation)s::jsonb, %(atc_code)s, %(difficulty)s, 'draft', TRUE,
                           %(content_hash)s, %(db_version)s, %(db_version)s)""",
                params,
            )
            stats["inserted"] += 1
        elif ex["status"] == "draft":
            if ex["content_hash"] != q["content_hash"]:
                cur.execute(
                    """UPDATE training_questions SET source_ref=%(source_ref)s, stem=%(stem)s, options=%(options)s::jsonb,
                         correct_index=%(correct_index)s, explanation=%(explanation)s::jsonb, atc_code=%(atc_code)s,
                         difficulty=%(difficulty)s, content_hash=%(content_hash)s, db_version=%(db_version)s,
                         last_seen_version=%(db_version)s, stale=FALSE, stale_reason=NULL, updated_at=NOW()
                       WHERE question_key=%(question_key)s""",
                    params,
                )
                stats["draft_updated"] += 1
            else:
                cur.execute("UPDATE training_questions SET last_seen_version=%(db_version)s, stale=FALSE, stale_reason=NULL WHERE question_key=%(question_key)s", params)
                stats["draft_unchanged"] += 1
        else:  # reviewed / published : contenu intouchable
            if ex["content_hash"] != q["content_hash"]:
                cur.execute(
                    """UPDATE training_questions SET stale=TRUE, stale_reason='contenu_modifie_nomenclature',
                         last_seen_version=%(db_version)s WHERE question_key=%(question_key)s""",
                    params,
                )
                stats["reviewed_marked_stale"] += 1
            else:
                cur.execute(
                    """UPDATE training_questions SET last_seen_version=%(db_version)s,
                         stale = CASE WHEN stale_reason = 'contenu_modifie_nomenclature' OR stale_reason = 'non_regeneree'
                                      THEN FALSE ELSE stale END,
                         stale_reason = CASE WHEN stale_reason IN ('contenu_modifie_nomenclature','non_regeneree')
                                             THEN NULL ELSE stale_reason END
                       WHERE question_key=%(question_key)s""",
                    params,
                )
                stats["reviewed_unchanged"] += 1

    if full:
        missing = [k for k in existing if k not in produced]
        if missing:
            cur.execute(
                """UPDATE training_questions SET stale=TRUE, stale_reason='non_regeneree'
                   WHERE question_key = ANY(%s) AND NOT stale""",
                (missing,),
            )
            stats["marked_not_regenerated"] = cur.rowcount
    conn.commit()
    return dict(stats)


# ─── CLI ─────────────────────────────────────────────────────────────────────


def load_dataset(args) -> Nomenclature:
    if getattr(args, "from_json", None):
        with open(args.from_json, encoding="utf-8") as fh:
            return Nomenclature(json.load(fh))
    conn = get_connection()
    try:
        return load_from_db(conn)
    finally:
        conn.close()


def print_report(report: dict) -> None:
    print(f"Version de la nomenclature : {report['version']} — seed {report['seed']}")
    print(f"{report['total']} question(s) générée(s) en `draft` (a_valider = vrai) :")
    for t in QUESTION_TYPES:
        if t in report["by_type"]:
            print(f"  {t:<24}{report['by_type'][t]:>5}")
    if report["skipped"]:
        print("Sources écartées :", ", ".join(f"{k}={v}" for k, v in sorted(report["skipped"].items())))
    for rej in report.get("rejects", [])[:10]:
        print("  REJET", rej["key"], rej["errors"])


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Génération des QCM Dzair-Pharma Training")
    sub = ap.add_subparsers(dest="cmd", required=True)

    def common(p: argparse.ArgumentParser) -> None:
        p.add_argument("--from-json", help="lire la nomenclature depuis un JSON (tests, jeu synthétique) au lieu de la base")
        p.add_argument("--seed", type=int, default=42)
        p.add_argument("--limit", type=int, help="nombre total de questions (échantillon réparti entre types)")
        p.add_argument("--per-type", type=int, help="nombre maximal par type")
        p.add_argument("--types", help="liste de types séparés par des virgules")
        p.add_argument("--max-per-dci", type=int, default=2, help="diversité : questions max par DCI et par type (échantillons)")

    g = sub.add_parser("generate", help="écrit un fichier JSONL (aucune écriture en base)")
    common(g)
    g.add_argument("--out", required=True)

    s = sub.add_parser("sync", help="régénère et synchronise training_questions sans rien casser")
    common(s)
    s.add_argument("--full", action="store_true", help="génération complète : marque `stale` les questions dont la source a disparu")
    s.add_argument("--dry-run", action="store_true")

    v = sub.add_parser("validate", help="contrôle qualité d'un fichier JSONL")
    v.add_argument("--in", dest="infile", required=True)
    v.add_argument("--from-json")

    args = ap.parse_args(argv)

    if args.cmd == "validate":
        ds = load_dataset(args)
        with open(args.infile, encoding="utf-8") as fh:
            qs = [json.loads(line) for line in fh if line.strip()]
        problems = validate_set(qs, ds)
        print(f"{len(qs)} question(s) contrôlée(s), {len(problems)} avec anomalie(s).")
        for key, errs in problems[:50]:
            print(" ", key, errs)
        return 1 if problems else 0

    ds = load_dataset(args)
    types = args.types.split(",") if args.types else None
    limit = None if (args.cmd == "sync" and args.full) else args.limit
    questions, report = generate(ds, args.seed, limit, args.per_type, types, args.max_per_dci)
    print_report(report)

    if args.cmd == "generate":
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as fh:
            for q in questions:
                fh.write(json.dumps(q, ensure_ascii=False, sort_keys=True) + "\n")
        print(f"Écrit : {args.out}")
        return 0

    if args.dry_run:
        print("--dry-run : rien n'est écrit en base.")
        return 0
    conn = get_connection()
    try:
        stats = sync_to_db(conn, questions, ds, args.full)
    finally:
        conn.close()
    print("Synchronisation :", ", ".join(f"{k}={v}" for k, v in sorted(stats.items())) or "rien à faire")
    return 0


if __name__ == "__main__":
    sys.exit(main())
