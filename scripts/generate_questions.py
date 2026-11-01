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
    interaction_niveau      niveau d'une association (Thesaurus ANSM) — si interactions_ansm existe
    interaction_contre_indication  quelle substance est contre-indiquée avec X (Thesaurus ANSM)
    compare_specialites     comparaison de deux spécialités (DCI, forme, dosage, laboratoire, ATC)
    atc_code                code ATC complet (niveau 5) d'une DCI
    atc_inverse             quelle DCI appartient à un sous-groupe ATC donné
    substitution            spécialité de même DCI, forme et dosage

Chaque question porte, dans `explanation.outils`, la marche à suivre sur le site (recherche,
comparateur, classes ATC, substitution…) pour retrouver la réponse. Ce bloc est de la navigation :
il n'entre pas dans `content_hash` et peut être mis à jour sans re-relecture.

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
  * question `draft` dont le contenu change ⇒ mise à jour (sauf si un relecteur l'a retouchée) ;
  * question `reviewed` / `published` / retouchée à la main ⇒ JAMAIS modifiée ; si la nomenclature
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

GENERATOR_VERSION = "2"
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
    # v2 — questions qui se résolvent avec les outils du site (interactions, comparaison, ATC, substitution)
    "interaction_niveau",
    "interaction_contre_indication",
    "compare_specialites",
    "atc_code",
    "atc_inverse",
    "substitution",
]

# Types qui exigent des données optionnelles (sautés si la table est absente).
NEEDS_ATC = {"atc_classe", "atc_code", "atc_inverse"}
NEEDS_INTERACTIONS = {"interaction_niveau", "interaction_contre_indication"}

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
        # Thesaurus ANSM (tables interactions_ansm et interactions_ansm_classes), optionnel.
        self.interactions: list[dict] = data.get("interactions", []) or []
        self.interaction_classes: list[dict] = data.get("interaction_classes", []) or []

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

    def has_interactions(self) -> bool:
        return bool(self.interactions)

    # ── Thesaurus ANSM ──
    @cached_property
    def thes(self) -> dict:
        rows = [{**r, "_s": norm(r["substance_key"]), "_p": norm(r["partenaire_key"])} for r in self.interactions]
        classes_of: dict[str, set[str]] = defaultdict(set)
        for c in self.interaction_classes:
            classes_of[norm(c["membre_key"])].add(norm(c["classe_key"]))
        known = {r["_s"] for r in rows} | set(classes_of)
        return {"rows": rows, "classes_of": classes_of, "known": known}

    @cached_property
    def thes_dci(self) -> dict[str, str]:
        """DCI (simples, sans « + » ni « / ») dont le nom figure tel quel dans le thésaurus → texte de la DCI."""
        out: dict[str, str] = {}
        for dn, g in self.dci_groups.items():
            if dn in self.thes["known"] and not re.search(r"[+/]", g["text"]) and len(g["text"]) <= 60:
                out[dn] = g["text"]
        return out

    @cached_property
    def _rows_by_substance(self) -> dict[str, list[dict]]:
        out: dict[str, list[dict]] = defaultdict(list)
        for r in self.thes["rows"]:
            out[r["_s"]].append(r)
        return out

    def pair_rows(self, a: str, b: str) -> list[dict]:
        """Lignes du thésaurus qui s'appliquent à l'association a + b (substances ou classes, dans les deux sens)."""
        t = self.thes
        ca, cb = {a} | t["classes_of"].get(a, set()), {b} | t["classes_of"].get(b, set())
        out: list[dict] = []
        for side, other in ((ca, cb), (cb, ca)):
            for s_ in side:
                out.extend(r for r in self._rows_by_substance.get(s_, ()) if r["_p"] in other)
        return list({id(r): r for r in out}.values())

    def pair_level(self, a: str, b: str) -> Optional[str]:
        """Niveau unique et sans équivoque de a + b, sinon None (ligne composée, conflit, pas de ligne directe)."""
        rows = self.pair_rows(a, b)
        direct = [r for r in rows if r["_s"] == a and r["_p"] == b and not r.get("partenaire_est_classe")]
        if not direct:
            return None
        levels = {lv for r in rows for lv in (r.get("niveaux") or [r["niveau"]])}
        if len(levels) != 1 or len(direct[0].get("niveaux") or []) > 1:
            return None
        return next(iter(levels))

    @cached_property
    def interaction_pairs(self) -> dict[str, dict[str, str]]:
        """DCI → {DCI partenaire → niveau}, seulement pour les associations sans ambiguïté."""
        out: dict[str, dict[str, str]] = defaultdict(dict)
        direct = {(r["_s"], r["_p"]) for r in self.thes["rows"] if not r.get("partenaire_est_classe")}
        names = set(self.thes_dci)
        for a, b in sorted(p for p in direct if p[0] in names and p[1] in names and p[0] != p[1]):
            lv = self.pair_level(a, b)
            if lv:
                out[a][b] = lv
                out[b].setdefault(a, lv)
        return out


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
    outils: Optional[list[dict]] = None,
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
    # `outils` (navigation sur le site) est ajouté APRÈS le hachage : il n'est pas du contenu relu.
    explanation["outils"] = outils or []
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



# ─── Outils du site : « comment retrouver la réponse » ───────────────────────
# Chaque question indique les outils de DwaDZ qui permettent de la résoudre. Ce sont de simples
# gabarits de navigation : aucune connaissance médicale n'y est ajoutée.


def u(path: str, **params: str) -> str:
    from urllib.parse import urlencode
    return f"{path}?{urlencode(params)}" if params else path


def slug(dci: Any) -> str:
    from urllib.parse import quote
    return quote(clean(dci).lower(), safe="")


def tool(nom: str, url: str, etapes: list[str]) -> dict:
    return {"outil": nom, "url": url, "etapes": etapes}


def t_recherche(terme: str, etapes: list[str]) -> dict:
    return tool("Recherche (nom, DCI, code, laboratoire)", u("/recherche", q=terme), etapes)


def t_fiche(table: str, rid: Any, etapes: list[str]) -> dict:
    return tool("Fiche du médicament", fiche_url(table, rid), etapes)


def t_atc(code: str, etapes: list[str]) -> dict:
    return tool("Classes thérapeutiques (ATC)", f"/classes-therapeutiques/{code}", etapes)


def t_dci(dci: Any, etapes: list[str]) -> dict:
    return tool("Page de la substance (DCI)", f"/dci/{slug(dci)}", etapes)


def t_substitution(dci: Any, etapes: list[str]) -> dict:
    return tool("Substitution (même DCI)", f"/substitution/{slug(dci)}", etapes)


def t_interactions(etapes: list[str]) -> dict:
    return tool("Comparateur de deux médicaments · interactions ANSM", "/outils/comparateur-medicaments", etapes)


T_RETRAITS = tool("Produits retirés", "/retraits", [
    "Ouvrez la liste des produits retirés.",
    "Cherchez par nom, DCI ou laboratoire ; la fiche indique la date et le motif du retrait.",
])

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
        outils=[
            t_recherche(brand, [f"Saisissez le nom commercial « {brand} » dans la recherche.", "Ouvrez la fiche de la spécialité.", "Lisez le champ DCI (substance active) : c'est la réponse."]),
            t_fiche("enregistrements", rec["id"], ["Sur la fiche, la rubrique d'identification donne la DCI, la forme, le dosage et le laboratoire."]),
        ],
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
        outils=[
            t_substitution(dci, [f"Ouvrez la page de substitution de la DCI {dci}.", "Repérez, pour la forme demandée, la ligne de type référence (RE / innovateur) : les autres sont des génériques (GE)."]),
            t_recherche(dci, ["Cherchez la DCI : la liste montre le type (référence / générique) de chaque spécialité, avec forme et dosage."]),
        ],
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
        outils=[
            t_recherche(brand, [f"Cherchez « {brand} ».", "Les résultats affichent forme galénique et dosage : comparez avec chaque proposition."]),
            t_fiche("enregistrements", rec["id"], ["La fiche confirme la forme et le dosage enregistrés."]),
        ],
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
        outils=[
            t_recherche(brand, [f"Cherchez « {brand} ».", "Ouvrez la fiche : le laboratoire titulaire et son pays y figurent."]),
            tool("Laboratoires", "/laboratoires", ["Pour vérifier un laboratoire : ouvrez l'annuaire des laboratoires et comparez avec les propositions."]),
        ],
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
        outils=[
            T_RETRAITS,
            t_fiche("retraits", rec["id"], [f"Ouvrez la fiche du produit retiré « {brand} » : le motif et la date de retrait y sont indiqués."]),
        ],
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
        outils=[
            T_RETRAITS,
            t_recherche(dci, [f"Cherchez la DCI {dci} : les spécialités actuelles et les produits retirés sont distingués.", "Une proposition absente des enregistrements actuels mais présente dans les retraits est la réponse."]),
        ],
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
        outils=[
            t_dci(dci, [f"Ouvrez la page de la DCI {dci} : le code ATC et sa hiérarchie y sont affichés."]),
            t_atc(c4, [f"La page {c4} liste le sous-groupe (niveau 3) et les DCI de la nomenclature qui y sont rattachées."]),
        ],
    )


# ─── v2 : interactions, comparaison, codage ATC, substitution ────────────────

NIVEAU_LABEL = {
    "contre_indication": "Contre-indication",
    "deconseillee": "Association déconseillée",
    "precaution_emploi": "Précaution d'emploi",
    "a_prendre_en_compte": "À prendre en compte",
}
AUCUNE_INTERACTION = "Aucune interaction répertoriée dans le thésaurus"
# Ordre de gravité (le plus grave d'abord) : sert à choisir les propositions proches.
NIVEAU_ORDRE = ["contre_indication", "deconseillee", "precaution_emploi", "a_prendre_en_compte"]


def _sole_brand_row(ds: Nomenclature, rec: dict) -> bool:
    """La marque n'a qu'une seule ligne dans la nomenclature (sinon forme/dosage/labo ambigus)."""
    return len(ds.enr_by_brand.get(norm(rec["nom_marque"]), [])) == 1


def _clip(text: str, n: int = 420) -> str:
    text = clean(text)
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


def gen_interaction_niveau(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    x = norm(rec["dci"])
    partners = ds.interaction_pairs.get(x)
    if not partners or x not in ds.thes_dci:
        return None
    xt = ds.thes_dci[x]
    key_seed = rng_for(seed, stable_hash("interaction_niveau:pick", xt))
    y = key_seed.choice(sorted(partners))
    yt, niveau = ds.thes_dci[y], partners[y]
    a, b = sorted((x, y))
    key = stable_hash("interaction_niveau", a, b)
    rng = rng_for(seed, key)
    row = next((r for r in ds.pair_rows(x, y) if r["_s"] == x and r["_p"] == y), None) or ds.pair_rows(x, y)[0]
    others = [Candidate(text=NIVEAU_LABEL[n], key=n, tier=0) for n in NIVEAU_ORDRE if n != niveau]
    others.append(Candidate(text=AUCUNE_INTERACTION, key="aucune", tier=2))
    stem = f"Selon le Thesaurus des interactions médicamenteuses de l'ANSM, quel est le niveau de l'association {xt} + {yt} ?"
    label = NIVEAU_LABEL[niveau]
    contexte = (f"Le thésaurus ANSM ({clean(row.get('source_version'))}, p. {row.get('page')}) range l'association {xt} + {yt} "
                f"en « {label} ». Risque indiqué : {_clip(row.get('risque_fr'))}")
    if clean(row.get("conduite_fr")):
        contexte += f" Conduite à tenir : {_clip(row['conduite_fr'])}"

    def wrong(c: Candidate) -> str:
        if c["key"] == "aucune":
            return f"Faux. Le thésaurus recense bien une interaction entre {xt} et {yt} : « {label} »."
        return f"Faux. « {c['text']} » est un autre niveau du thésaurus ; l'association {xt} + {yt} est classée « {label} »."

    return assemble(
        "interaction_niveau", key, "enregistrements", rec, stem,
        Candidate(text=label), others,
        f"Correct. Le thésaurus ANSM classe {xt} + {yt} en « {label} ».",
        wrong, contexte,
        [
            "Le thésaurus raisonne par substance ou par classe, jamais par nom commercial.",
            "Quatre niveaux, du plus grave au moins grave : contre-indication, association déconseillée, précaution d'emploi, à prendre en compte.",
            f"{xt} + {yt} : {label}.",
        ],
        [{"label": f"Fiche nomenclature : {clean(rec['nom_marque'])}", "url": fiche_url("enregistrements", rec["id"])},
         {"label": "Comparateur de deux médicaments (interactions ANSM)", "url": "/outils/comparateur-medicaments"},
         {"label": f"Thesaurus des interactions médicamenteuses, ANSM — {clean(row.get('source_version'))}"}],
        ds.atc_for(xt), ds, seed,
        outils=[
            t_interactions([f"Choisissez {xt} d'un côté et {yt} de l'autre (par substance ou par nom commercial).",
                            "Le comparateur affiche le niveau de l'association, le risque et la conduite à tenir."]),
            t_fiche("enregistrements", rec["id"], [f"Sur la fiche d'un médicament à base de {xt}, ouvrez la rubrique « Interactions (ANSM) » et cherchez {yt}."]),
        ],
    )


def gen_interaction_contre_indication(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    x = norm(rec["dci"])
    partners = ds.interaction_pairs.get(x)
    if not partners or x not in ds.thes_dci:
        return None
    cis = sorted(p for p, lv in partners.items() if lv == "contre_indication")
    if not cis:
        return None
    xt = ds.thes_dci[x]
    y = rng_for(seed, stable_hash("interaction_ci:pick", xt)).choice(cis)
    yt = ds.thes_dci[y]
    key = stable_hash("interaction_ci", x, y)
    rng = rng_for(seed, key)
    y_atc = ds.atc_for(yt)
    tiers: list[list[Candidate]] = [[], [], [], []]
    for d, dt in sorted(ds.thes_dci.items()):
        if d in (x, y):
            continue
        levels = {lv for r in ds.pair_rows(x, d) for lv in (r.get("niveaux") or [r["niveau"]])}
        if "contre_indication" in levels:
            continue  # elle aussi contre-indiquée : serait une 2ᵉ bonne réponse
        cand = Candidate(text=dt, key=d, lvl=None)
        if levels:  # une autre interaction existe, mais pas une contre-indication : le piège classique
            cand["lvl"] = NIVEAU_LABEL[min(levels, key=NIVEAU_ORDRE.index)]
            tiers[0].append(cand)
        elif y_atc and ds.atc_for(dt) and ds.atc_for(dt)[0] == y_atc[0]:
            tiers[1].append(cand)
        else:
            tiers[2].append(cand)

    def conflicts(cand: Candidate, picked: list[Candidate]) -> bool:
        t = tokens(cand["text"], DCI_STOP, 5)
        return bool(t & tokens(yt, DCI_STOP, 5)) or bool(t & tokens(xt, DCI_STOP, 5)) or any(t & tokens(p["text"], DCI_STOP, 5) for p in picked)

    picked = pick_distractors(tiers, rng, conflicts)
    if not picked:
        return None
    row = next((r for r in ds.pair_rows(x, y) if r["_s"] == x and r["_p"] == y), None) or ds.pair_rows(x, y)[0]

    def wrong(c: Candidate) -> str:
        if c.get("lvl"):
            return f"Faux. {xt} + {c['text']} est classée « {c['lvl']} » dans le thésaurus, pas en contre-indication."
        return f"Faux. Le thésaurus ne signale aucune contre-indication entre {xt} et {c['text']}."

    return assemble(
        "interaction_contre_indication", key, "enregistrements", rec,
        f"Selon le Thesaurus ANSM, avec laquelle de ces substances l'association à {xt} est-elle une contre-indication ?",
        Candidate(text=yt), picked,
        f"Correct. Le thésaurus ANSM classe {xt} + {yt} en contre-indication.",
        wrong,
        f"Le thésaurus ANSM ({clean(row.get('source_version'))}, p. {row.get('page')}) classe l'association {xt} + {yt} en contre-indication. "
        f"Risque indiqué : {_clip(row.get('risque_fr'))}",
        [
            "Une contre-indication est le niveau le plus grave : l'association ne doit pas être prescrite.",
            "Une association « déconseillée » ou « avec précaution d'emploi » n'est pas une contre-indication.",
            f"{xt} + {yt} : contre-indication.",
        ],
        [{"label": f"Fiche nomenclature : {clean(rec['nom_marque'])}", "url": fiche_url("enregistrements", rec["id"])},
         {"label": "Comparateur de deux médicaments (interactions ANSM)", "url": "/outils/comparateur-medicaments"},
         {"label": f"Thesaurus des interactions médicamenteuses, ANSM — {clean(row.get('source_version'))}"}],
        ds.atc_for(xt), ds, seed,
        outils=[
            t_fiche("enregistrements", rec["id"], [f"Ouvrez la fiche d'un médicament à base de {xt}.", "Dans « Interactions (ANSM) », les contre-indications sont listées en premier : repérez la substance proposée."]),
            t_interactions([f"Mettez {xt} d'un côté, puis testez chaque proposition de l'autre : le niveau s'affiche pour chaque couple."]),
        ],
    )


_COMPARE_ATTRS = [
    ("dci", "la même DCI", "des DCI différentes"),
    ("forme", "la même forme galénique", "des formes galéniques différentes"),
    ("dosage", "le même dosage", "des dosages différents"),
    ("labo", "le même laboratoire titulaire", "des laboratoires différents"),
    ("atc", "le même sous-groupe ATC (niveau 3)", "des sous-groupes ATC (niveau 3) différents"),
]


def _compare_profile(ds: Nomenclature, r: dict) -> Optional[dict]:
    atc = ds.atc_for(r["dci"])
    p = {"dci": norm(r["dci"]), "forme": norm(r.get("forme")), "dosage": compact(r.get("dosage")),
         "labo": norm(r.get("labo")), "atc": atc[:4] if atc and len(atc) >= 4 else ""}
    return p if all(p.values()) and " ET " not in f" {norm(r['nom_marque'])} " else None


def _compare_show(r: dict, attr: str, ds: Nomenclature) -> str:
    if attr == "atc":
        a = ds.atc_for(r["dci"]) or ""
        return a[:4]
    return clean(r.get({"dci": "dci", "forme": "forme", "dosage": "dosage", "labo": "labo"}[attr]))


def gen_compare_specialites(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    if not ds.has_atc() or not _sole_brand_row(ds, rec):
        return None
    pa = _compare_profile(ds, rec)
    if not pa:
        return None
    brand = clean(rec["nom_marque"])
    same_dci = [r for r in ds.enr_by_dci[pa["dci"]] if norm(r["nom_marque"]) != norm(brand)]
    same_atc = [r for r in ds.enr if _compare_profile(ds, r) and _compare_profile(ds, r)["atc"] == pa["atc"] and norm(r["dci"]) != pa["dci"]]
    key0 = stable_hash("compare_specialites:pick", brand, rec.get("dci"), rec.get("forme"), rec.get("dosage"), rec.get("labo"))
    rng0 = rng_for(seed, key0)
    pool = same_dci if (same_dci and (not same_atc or rng0.random() < 0.6)) else same_atc
    pool = sorted((r for r in pool if _sole_brand_row(ds, r) and _compare_profile(ds, r)), key=lambda r: int(r["id"]))
    if not pool:
        return None
    other = rng0.choice(pool)
    pb = _compare_profile(ds, other)
    bname = clean(other["nom_marque"])
    key = stable_hash("compare_specialites", *sorted([norm(brand), norm(bname)]))
    rng = rng_for(seed, key)
    same = {a: pa[a] == pb[a] for a, _, _ in _COMPARE_ATTRS}
    true_attr = rng.choice([a for a, _, _ in _COMPARE_ATTRS])
    items: list[Candidate] = []
    for attr, p_same, p_diff in _COMPARE_ATTRS:
        claim_same = same[attr] if attr == true_attr else not same[attr]
        items.append(Candidate(text=f"{brand} et {bname} ont {p_same if claim_same else p_diff}", key=attr,
                               tier=0, truth=(claim_same == same[attr]), attr=attr))
    correct = next(c for c in items if c["truth"])
    picked = [c for c in items if not c["truth"]]

    def fact(attr: str) -> str:
        return f"{brand} : {_compare_show(rec, attr, ds)} ; {bname} : {_compare_show(other, attr, ds)}"

    def wrong(c: Candidate) -> str:
        return f"Faux. Le site indique — {fact(c['attr'])}."

    return assemble(
        "compare_specialites", key, "enregistrements", rec,
        f"Comparez {brand} et {bname} dans la nomenclature (DCI, forme, dosage, laboratoire, classe ATC). Laquelle de ces affirmations est exacte ?",
        correct, picked,
        f"Correct. {fact(true_attr)}.",
        wrong,
        f"{brand} ({describe_record(rec)}) et {bname} ({describe_record(other)}) sont deux spécialités de la nomenclature.",
        [
            "Comparer deux médicaments, c'est comparer leur DCI, leur forme, leur dosage, leur titulaire et leur classe ATC.",
            f"DCI : {clean(rec['dci'])} / {clean(other['dci'])}.",
            f"Sous-groupe ATC (niveau 3) : {_compare_show(rec, 'atc', ds)} / {_compare_show(other, 'atc', ds)}.",
        ],
        [{"label": f"Fiche nomenclature : {brand}", "url": fiche_url("enregistrements", rec["id"])},
         {"label": f"Fiche nomenclature : {bname}", "url": fiche_url("enregistrements", other["id"])},
         nomenclature_reference(ds)],
        ds.atc_for(rec["dci"]), ds, seed,
        outils=[
            tool("Comparateur de deux médicaments", "/outils/comparateur-medicaments", [f"Choisissez {brand} et {bname} : les deux fiches s'affichent côte à côte (DCI, forme, dosage, laboratoire)."]),
            t_recherche(brand, [f"Cherchez « {brand} » puis « {bname} » et comparez les lignes de résultats.", "Pour la classe ATC, ouvrez la page de la DCI de chacune."]),
        ],
    )


def gen_substitution(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    if not _sole_brand_row(ds, rec):
        return None
    brand, dci = clean(rec["nom_marque"]), clean(rec["dci"])
    forme, dosage = clean(rec.get("forme")), clean(rec.get("dosage"))
    if not forme or not dosage or len(dosage) > 70 or len(forme) > 60 or len(dci) > 90:
        return None
    triple = (norm(dci), norm(forme), compact(dosage))

    def t3(r: dict) -> tuple:
        return (norm(r["dci"]), norm(r.get("forme")), compact(r.get("dosage")))

    equiv = sorted((r for r in ds.enr_by_dci[norm(dci)] if t3(r) == triple and norm(r["nom_marque"]) != norm(brand) and _sole_brand_row(ds, r)),
                   key=lambda r: int(r["id"]))
    if not equiv:
        return None
    key = stable_hash("substitution", brand, dci, forme, dosage, rec.get("labo"))
    rng = rng_for(seed, key)
    good = rng.choice(equiv)
    # Une marque qui porte aussi la présentation équivalente ailleurs serait ambiguë.
    tiers: list[list[Candidate]] = [[], [], [], []]
    for r in ds.enr:
        bn = norm(r["nom_marque"])
        if bn == norm(brand) or bn == norm(good["nom_marque"]) or not _sole_brand_row(ds, r):
            continue
        t = t3(r)
        if t == triple or not t[1] or not t[2]:
            continue
        cand = Candidate(text=clean(r["nom_marque"]), key=bn, rec=r)
        if t[0] == triple[0] and t[1] == triple[1]:
            tiers[0].append(cand)       # même DCI et forme, autre dosage
        elif t[0] == triple[0]:
            tiers[1].append(cand)       # même DCI, autre forme
        elif t[1:] == triple[1:]:
            tiers[2].append(cand)       # même forme et dosage, autre DCI
        else:
            tiers[3].append(cand)

    picked = pick_distractors(tiers, rng, lambda c, p: False)
    if not picked:
        return None
    gname = clean(good["nom_marque"])

    def wrong(c: Candidate) -> str:
        r = c["rec"]
        diffs = []
        if norm(r["dci"]) != triple[0]:
            diffs.append(f"DCI {clean(r['dci'])}")
        if norm(r.get("forme")) != triple[1]:
            diffs.append(f"forme {clean(r.get('forme'))}")
        if compact(r.get("dosage")) != triple[2]:
            diffs.append(f"dosage {clean(r.get('dosage'))}")
        return f"Faux. {c['text']} diffère de {brand} par : {', '.join(diffs)}."

    return assemble(
        "substitution", key, "enregistrements", rec,
        f"Quelle spécialité de la nomenclature est équivalente à {brand} — même DCI ({dci}), même forme ({forme}) et même dosage ({dosage}) ?",
        Candidate(text=gname), picked,
        f"Correct. {gname} a la même DCI, la même forme et le même dosage que {brand}.",
        wrong,
        f"{brand} : {dci}, {forme}, {dosage}. {gname} ({labo_label(good) or 'laboratoire non renseigné'}) porte la même DCI, la même forme et le même dosage.",
        [
            "Deux spécialités sont équivalentes pour la nomenclature quand DCI, forme galénique et dosage sont identiques.",
            "Un dosage ou une forme différents, ou une autre DCI, rendent les spécialités non équivalentes.",
            f"Équivalent de {brand} : {gname}.",
        ],
        [{"label": f"Substitution : {dci}", "url": f"/substitution/{slug(dci)}"},
         {"label": f"Fiche nomenclature : {brand}", "url": fiche_url("enregistrements", rec["id"])},
         nomenclature_reference(ds)],
        ds.atc_for(dci), ds, seed,
        outils=[
            t_substitution(dci, [f"Ouvrez la page de substitution de {dci}.", f"Repérez la présentation « {forme} — {dosage} » : les spécialités de même DCI, forme et dosage sont regroupées."]),
            t_recherche(dci, ["Autre voie : cherchez la DCI et filtrez la liste par forme et dosage."]),
        ],
    )


def gen_atc_code(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    dci = clean(rec["dci"])
    code = ds.atc_for(dci)
    if not code or len(code) != 7 or len(dci) > 90:
        return None
    key = stable_hash("atc_code", dci)
    rng = rng_for(seed, key)
    owner: dict[str, str] = {}
    for dn, g in sorted(ds.dci_groups.items()):
        c = g["atc"]
        if c and len(c) == 7 and c != code:
            owner.setdefault(c, g["text"])
    tiers: list[list[Candidate]] = [[], [], [], []]
    for c, who in sorted(owner.items()):
        cand = Candidate(text=c, key=c, ref=who)
        tiers[0 if c[:4] == code[:4] else 1 if c[:3] == code[:3] else 2 if c[0] == code[0] else 3].append(cand)
    picked = pick_distractors(tiers, rng, lambda c, p: False)
    if not picked:
        return None
    label = ds.atc3_label(code[:4])
    return assemble(
        "atc_code", key, "enregistrements", rec,
        f"Quel est le code ATC complet (niveau 5) rattaché à la DCI {dci} dans la table ATC du site ?",
        Candidate(text=code), picked,
        f"Correct. La table ATC de DwaDZ rattache {dci} au code {code}.",
        lambda c: f"Faux. {c['text']} est le code ATC de {c['ref']}, pas de {dci}.",
        f"Un code ATC complet compte 7 caractères : 1 lettre (groupe anatomique), 2 chiffres, 2 lettres, puis 2 chiffres (substance). {dci} → {code}.",
        [
            "Lecture d'un code ATC : A (groupe anatomique) · 02 (groupe thérapeutique) · B (sous-groupe pharmacologique) · C (sous-groupe chimique) · 05 (substance).",
            f"{dci} : {code}" + (f" — sous-groupe {code[:4]} (« {label} »)." if label else "."),
        ],
        [{"label": f"Classes thérapeutiques : {code[:4]}", "url": f"/classes-therapeutiques/{code[:4]}"},
         {"label": f"Fiche nomenclature : {clean(rec['nom_marque'])}", "url": fiche_url("enregistrements", rec["id"])},
         nomenclature_reference(ds)],
        code, ds, seed,
        outils=[
            t_dci(dci, [f"Ouvrez la page de la DCI {dci} : le code ATC complet est affiché avec sa hiérarchie."]),
            t_atc(code[:4], [f"Ouvrez {code[:4]} puis descendez jusqu'au niveau 5 : retrouvez {dci} et son code."]),
        ],
    )


def gen_atc_inverse(ds: Nomenclature, rec: dict, seed: int) -> Optional[dict]:
    dci = clean(rec["dci"])
    code = ds.atc_for(dci)
    if not code or len(code) < 4 or len(dci) > 90:
        return None
    c4, label = code[:4], ds.atc3_label(code[:4])
    if not label:
        return None
    key = stable_hash("atc_inverse", dci)
    rng = rng_for(seed, key)
    correct_tokens = tokens(dci, DCI_STOP, 5)
    tiers: list[list[Candidate]] = [[], [], [], []]
    for dn, g in sorted(ds.dci_groups.items()):
        a = g["atc"]
        if dn == norm(dci) or not a or len(a) < 4 or a[:4] == c4 or len(g["text"]) > 90:
            continue
        cand = Candidate(text=g["text"], key=dn, atc=a)
        tiers[0 if a[:3] == c4[:3] else 1 if a[0] == c4[0] else 2].append(cand)

    def conflicts(cand: Candidate, picked: list[Candidate]) -> bool:
        t = tokens(cand["text"], DCI_STOP, 5)
        return bool(t & correct_tokens) or any(t & tokens(p["text"], DCI_STOP, 5) for p in picked)

    picked = pick_distractors(tiers, rng, conflicts)
    if not picked:
        return None
    return assemble(
        "atc_inverse", key, "enregistrements", rec,
        f"Laquelle de ces DCI est classée dans le sous-groupe ATC {c4} — « {label} » ?",
        Candidate(text=dci), picked,
        f"Correct. {dci} est rattachée à {code}, du sous-groupe {c4}.",
        lambda c: f"Faux. {c['text']} est rattachée à {c['atc']} (sous-groupe {c['atc'][:4]}), pas à {c4}.",
        f"Dans la table ATC de DwaDZ, le sous-groupe {c4} (« {label} ») regroupe notamment {dci} ({code}).",
        [
            "Les 4 premiers caractères d'un code ATC désignent le sous-groupe pharmacologique (niveau 3).",
            f"{c4} — {label} : contient {dci} ({code}).",
        ],
        [{"label": f"Classes thérapeutiques : {c4}", "url": f"/classes-therapeutiques/{c4}"},
         nomenclature_reference(ds)],
        code, ds, seed,
        outils=[
            t_atc(c4, [f"Ouvrez la classe {c4} dans « Classes thérapeutiques » : les DCI de la nomenclature rattachées au sous-groupe sont listées."]),
            t_dci(dci, ["Autre voie : ouvrez la page de chaque DCI proposée et lisez son code ATC."]),
        ],
    )


GENERATORS: dict[str, tuple[Callable, str]] = {
    "dci_from_brand": (gen_dci_from_brand, "enr"),
    "reference_generique": (gen_reference_generique, "enr"),
    "forme_dosage": (gen_forme_dosage, "enr"),
    "labo_pays": (gen_labo_pays, "enr"),
    "retrait_motif": (gen_retrait_motif, "ret"),
    "retrait_identification": (gen_retrait_identification, "ret"),
    "atc_classe": (gen_atc_classe, "enr"),
    "interaction_niveau": (gen_interaction_niveau, "enr"),
    "interaction_contre_indication": (gen_interaction_contre_indication, "enr"),
    "compare_specialites": (gen_compare_specialites, "enr"),
    "atc_code": (gen_atc_code, "enr"),
    "atc_inverse": (gen_atc_inverse, "enr"),
    "substitution": (gen_substitution, "enr"),
}

# ─── Contrôle qualité indépendant ────────────────────────────────────────────


def _raw_levels(ds: Nomenclature, a: str, b: str) -> set[str]:
    """Niveaux du thésaurus entre a et b (normalisés), lecture directe des lignes brutes — sans l'index de génération."""
    cls = getattr(ds, "_raw_cls", None)
    if cls is None:  # construit à partir des lignes brutes, une seule fois par jeu de données
        cls = defaultdict(set)
        for c in ds.interaction_classes:
            cls[norm(c["membre_key"])].add(norm(c["classe_key"]))
        ds._raw_cls = cls
    side_a, side_b = {a} | cls.get(a, set()), {b} | cls.get(b, set())
    out: set[str] = set()
    for r in ds.interactions:
        s_, p_ = norm(r["substance_key"]), norm(r["partenaire_key"])
        if (s_ in side_a and p_ in side_b) or (s_ in side_b and p_ in side_a):
            out.update(r.get("niveaux") or [r["niveau"]])
    return out


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
    if not expl.get("outils") or any(not o.get("url") or not o.get("etapes") for o in expl["outils"]):
        errs.append("outils du site manquants (chaque question doit dire où trouver la réponse)")
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
    elif qtype == "interaction_niveau":
        m = re.search(r"association (.+?) \+ (.+?) \?$", q.get("stem", ""))
        if not m:
            errs.append("énoncé illisible (association X + Y attendue)")
        else:
            lv = _raw_levels(ds, norm(m.group(1)), norm(m.group(2)))
            if len(lv) > 1:
                errs.append("niveaux multiples pour cette association")
            for i, o in enumerate(opts):
                if (len(lv) == 1 and o == NIVEAU_LABEL.get(next(iter(lv)))) or (not lv and o == AUCUNE_INTERACTION):
                    true_idx.append(i)
    elif qtype == "interaction_contre_indication":
        m = re.search(r"l'association à (.+?) est-elle", q.get("stem", ""))
        if not m:
            errs.append("énoncé illisible (substance X attendue)")
        else:
            x = norm(m.group(1))
            true_idx = [i for i, o in enumerate(opts) if "contre_indication" in _raw_levels(ds, x, norm(o))]
    elif qtype == "compare_specialites":
        m = re.search(r"^Comparez (.+?) et (.+?) dans la nomenclature", q.get("stem", ""))
        ra = rb = None
        if m:
            la, lb = ds.enr_by_brand.get(norm(m.group(1)), []), ds.enr_by_brand.get(norm(m.group(2)), [])
            if len(la) == 1 and len(lb) == 1:
                ra, rb = la[0], lb[0]
        if ra is None:
            errs.append("les deux spécialités doivent exister une seule fois dans la nomenclature")
        else:
            pa, pb = _compare_profile(ds, ra), _compare_profile(ds, rb)
            if not pa or not pb:
                errs.append("profil incomplet (DCI, forme, dosage, laboratoire, ATC requis)")
            else:
                for i, o in enumerate(opts):
                    for attr, p_same, p_diff in _COMPARE_ATTRS:
                        for phrase, claims_same in ((p_same, True), (p_diff, False)):
                            if o.endswith(f" ont {phrase}") and (pa[attr] == pb[attr]) == claims_same:
                                true_idx.append(i)
    elif qtype == "substitution":
        t3 = (norm(rec["dci"]), norm(rec.get("forme")), compact(rec.get("dosage")))
        for i, o in enumerate(opts):
            if norm(o) != brand_n and any(
                (norm(r["dci"]), norm(r.get("forme")), compact(r.get("dosage"))) == t3 for r in ds.enr_by_brand.get(norm(o), [])
            ):
                true_idx.append(i)
    elif qtype == "atc_code":
        true_idx = [i for i, o in enumerate(opts) if o == (ds.atc_for(rec["dci"]) or "")]
    elif qtype == "atc_inverse":
        m = re.search(r"sous-groupe ATC (\w{4}) ", q.get("stem", ""))
        if not m:
            errs.append("énoncé illisible (code ATC niveau 3 attendu)")
        else:
            true_idx = [i for i, o in enumerate(opts) if (ds.atc_for(o) or "").startswith(m.group(1))]
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
        wanted = [t for t in wanted if t not in NEEDS_ATC]
    if not ds.has_interactions():
        wanted = [t for t in wanted if t not in NEEDS_INTERACTIONS]
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
    if table_exists("interactions_ansm"):
        data["interactions"] = rows(
            "SELECT substance, substance_key, partenaire, partenaire_key, partenaire_est_classe, niveau, niveaux, "
            "risque_fr, conduite_fr, page, source_version FROM interactions_ansm")
        if table_exists("interactions_ansm_classes"):
            data["interaction_classes"] = rows("SELECT classe, classe_key, membre, membre_key, origine FROM interactions_ansm_classes")
    return Nomenclature(data)


SYNC_COLUMNS = ("type", "source_table", "source_ref", "stem", "options", "correct_index", "explanation",
                "atc_code", "difficulty", "content_hash")


def sync_to_db(conn, questions: list[dict], ds: Nomenclature, full: bool) -> dict:
    """Upsert non destructif — voir la docstring du module."""
    import psycopg2.extras
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT question_key, status, content_hash, stale, stale_reason, manually_edited FROM training_questions")
    existing = {r["question_key"]: r for r in cur.fetchall()}
    stats = Counter()
    produced = set()

    def refresh_outils(q: dict) -> None:
        """Met à jour seulement `explanation.outils` (navigation) d'une question dont le contenu ne change pas :
        une question relue ou publiée n'a pas à être relue de nouveau parce qu'un lien du site a évolué."""
        cur.execute(
            """UPDATE training_questions SET explanation = jsonb_set(explanation, '{outils}', %s::jsonb, TRUE)
               WHERE question_key = %s AND (explanation -> 'outils') IS DISTINCT FROM %s::jsonb""",
            (json.dumps(q["explanation"]["outils"], ensure_ascii=False), q["question_key"], json.dumps(q["explanation"]["outils"], ensure_ascii=False)),
        )
        stats["outils_updated"] += cur.rowcount

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
        elif ex["status"] == "draft" and not ex.get("manually_edited"):
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
                refresh_outils(q)
        else:  # reviewed / published / brouillon retouché à la main : contenu intouchable
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
                refresh_outils(q)

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
