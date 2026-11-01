#!/usr/bin/env python3
"""
Nomenclature SYNTHÉTIQUE pour développer et tester Dzair-Pharma Training
sans accès à la base de production.

⚠️  Les données produites ici sont FICTIVES : noms commerciaux et laboratoires
    inventés, motifs de retrait génériques, dosages indicatifs. Elles ont le
    schéma réel des tables (enregistrements, retraits, atc_codes,
    dci_atc_mapping) mais AUCUNE valeur de référence. Ne jamais les publier :
    les vraies questions sortent du script sur la vraie base.

Usage :
    python scripts/synthetic_nomenclature.py --json scripts/fixtures/nomenclature_synthetique.json
    python scripts/synthetic_nomenclature.py --load-db      # charge dans $DATABASE_URL (base de DEV uniquement)
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from datetime import date, timedelta

VERSION = "SYNTHETIQUE-TEST-2026"

# (DCI, code ATC niveau 5)
DCIS = [
    ("PARACETAMOL", "N02BE01"), ("IBUPROFENE", "M01AE01"), ("DICLOFENAC", "M01AB05"),
    ("KETOPROFENE", "M01AE03"), ("AMOXICILLINE", "J01CA04"), ("AMPICILLINE", "J01CA01"),
    ("AZITHROMYCINE", "J01FA10"), ("CLARITHROMYCINE", "J01FA09"), ("CIPROFLOXACINE", "J01MA02"),
    ("OFLOXACINE", "J01MA01"), ("CEFIXIME", "J01DD08"), ("CEFTRIAXONE", "J01DD04"),
    ("OMEPRAZOLE", "A02BC01"), ("ESOMEPRAZOLE", "A02BC05"), ("RANITIDINE", "A02BA02"),
    ("METFORMINE", "A10BA02"), ("GLIMEPIRIDE", "A10BB12"), ("GLICLAZIDE", "A10BB09"),
    ("AMLODIPINE", "C08CA01"), ("NIFEDIPINE", "C08CA05"), ("RAMIPRIL", "C09AA05"),
    ("ENALAPRIL", "C09AA02"), ("LOSARTAN", "C09CA01"), ("VALSARTAN", "C09CA03"),
    ("ATORVASTATINE", "C10AA05"), ("SIMVASTATINE", "C10AA01"), ("BISOPROLOL", "C07AB07"),
    ("ATENOLOL", "C07AB03"), ("SALBUTAMOL", "R03AC02"), ("CETIRIZINE", "R06AE07"),
    ("LORATADINE", "R06AX13"), ("LEVOTHYROXINE", "H03AA01"), ("PREDNISOLONE", "H02AB06"),
    ("FLUCONAZOLE", "J02AC01"), ("SERTRALINE", "N06AB06"), ("ESCITALOPRAM", "N06AB10"),
    ("ALPRAZOLAM", "N05BA12"), ("BROMAZEPAM", "N05BA08"),
]

ATC3_LABELS = {
    "N02B": "Autres analgésiques et antipyrétiques",
    "M01A": "Anti-inflammatoires et antirhumatismaux non stéroïdiens",
    "J01C": "Bêta-lactamines, pénicillines",
    "J01D": "Autres bêta-lactamines",
    "J01F": "Macrolides, lincosamides et streptogramines",
    "J01M": "Quinolones antibactériennes",
    "A02B": "Médicaments pour l'ulcère peptique et le reflux gastro-œsophagien",
    "A10B": "Médicaments hypoglycémiants, hors insulines",
    "C08C": "Inhibiteurs calciques sélectifs à effets vasculaires",
    "C09A": "Inhibiteurs de l'enzyme de conversion non associés",
    "C09C": "Antagonistes de l'angiotensine II non associés",
    "C10A": "Hypolipémiants non associés",
    "C07A": "Bêtabloquants",
    "R03A": "Adrénergiques en inhalation",
    "R06A": "Antihistaminiques à usage systémique",
    "H03A": "Préparations thyroïdiennes",
    "H02A": "Corticoïdes systémiques non associés",
    "J02A": "Antimycosiques à usage systémique",
    "N06A": "Antidépresseurs",
    "N05B": "Anxiolytiques",
}

# Interactions FICTIVES (jeu de test) : (A, B, niveau). Écrites dans les deux sens, comme dans le thésaurus.
# Aucune valeur n'est une donnée de référence : ne jamais s'en servir pour autre chose que les tests.
INTERACTIONS = [
    ("SIMVASTATINE", "CLARITHROMYCINE", "contre_indication"), ("SIMVASTATINE", "FLUCONAZOLE", "contre_indication"),
    ("ESCITALOPRAM", "SERTRALINE", "contre_indication"), ("ALPRAZOLAM", "FLUCONAZOLE", "contre_indication"),
    ("ATORVASTATINE", "CLARITHROMYCINE", "precaution_emploi"), ("AMLODIPINE", "SIMVASTATINE", "precaution_emploi"),
    ("METFORMINE", "CIPROFLOXACINE", "precaution_emploi"), ("CIPROFLOXACINE", "PREDNISOLONE", "precaution_emploi"),
    ("LEVOTHYROXINE", "OMEPRAZOLE", "precaution_emploi"),
    ("KETOPROFENE", "DICLOFENAC", "deconseillee"), ("IBUPROFENE", "DICLOFENAC", "deconseillee"),
    ("RAMIPRIL", "LOSARTAN", "deconseillee"), ("ENALAPRIL", "VALSARTAN", "deconseillee"),
    ("BISOPROLOL", "ATENOLOL", "deconseillee"), ("GLIMEPIRIDE", "FLUCONAZOLE", "deconseillee"),
    ("GLICLAZIDE", "FLUCONAZOLE", "deconseillee"), ("AZITHROMYCINE", "CLARITHROMYCINE", "deconseillee"),
    ("ALPRAZOLAM", "BROMAZEPAM", "a_prendre_en_compte"), ("OFLOXACINE", "PREDNISOLONE", "a_prendre_en_compte"),
    # Piège volontaire : une ligne directe « déconseillée » que la ligne de CLASSE contredit (« précaution ») ⇒ à écarter.
    ("DICLOFENAC", "RAMIPRIL", "deconseillee"),
]
INTERACTION_CLASSE = "ANTI-INFLAMMATOIRES NON STEROIDIENS"
INTERACTION_CLASSE_MEMBRES = ["IBUPROFENE", "KETOPROFENE", "DICLOFENAC"]
INTERACTION_CLASSE_LIGNE = (INTERACTION_CLASSE, "RAMIPRIL", "precaution_emploi")


def interactions_synthetiques() -> tuple[list[dict], list[dict]]:
    def ligne(a: str, b: str, niveau: str, classe: bool = False) -> dict:
        return {
            "substance": a, "substance_key": a.lower(), "partenaire": b, "partenaire_key": b.lower(),
            "partenaire_est_classe": classe, "niveau": niveau, "niveaux": None,
            "risque_fr": "Texte fictif de test : majoration du risque (donnée SYNTHÉTIQUE).",
            "conduite_fr": "Texte fictif de test : conduite à tenir (donnée SYNTHÉTIQUE).",
            "page": 12, "source_version": "Thesaurus SYNTHETIQUE (test)",
        }
    rows: list[dict] = []
    for a, b, n in INTERACTIONS:
        rows.append(ligne(a, b, n))
        if not (a, b) == ("DICLOFENAC", "RAMIPRIL"):
            rows.append(ligne(b, a, n))
    rows.append(ligne(*INTERACTION_CLASSE_LIGNE))
    classes = [{"classe": INTERACTION_CLASSE, "classe_key": INTERACTION_CLASSE.lower(), "membre": m, "membre_key": m.lower(), "origine": "liste"}
               for m in INTERACTION_CLASSE_MEMBRES]
    return rows, classes


FORMES = ["COMPRIME", "COMPRIME PELLICULE", "GELULE", "SIROP", "SOLUTION INJECTABLE", "POUDRE POUR SUSPENSION BUVABLE", "SUPPOSITOIRE", "CREME"]
DOSAGES = ["5 MG", "10 MG", "20 MG", "40 MG", "50 MG", "100 MG", "200 MG", "250 MG", "500 MG", "1 G", "125 MG/5 ML", "250 MG/5 ML"]
LABOS = [
    ("PHARMALYS", "ALGERIE"), ("BIOVANTA", "ALGERIE"), ("ALTHERA PHARMA", "ALGERIE"), ("NOVAREX", "ALGERIE"),
    ("MEDIKORA", "ALGERIE"), ("SANDORIA", "FRANCE"), ("LABORATOIRES VELTIS", "FRANCE"), ("GENEVAL", "SUISSE"),
    ("TRIDENT HEALTHCARE", "INDE"), ("CURAMED", "INDE"), ("ORIONIS", "JORDANIE"), ("HAYATPHARM", "TUNISIE"),
    ("KARMEN", "TURQUIE"), ("ISTRAL", "ESPAGNE"), ("VERDIA", "ALLEMAGNE"), ("MERIDIAN PHARMA", "ITALIE"),
]
MOTIFS = [
    "Non renouvellement de la décision d'enregistrement",
    "Retrait à la demande du titulaire",
    "Arrêt de commercialisation du produit",
    "Dossier de renouvellement non conforme",
    "Cessation d'activité du titulaire",
    "Fin de validité de l'enregistrement",
    "Produit non commercialisé pendant la durée de validité",
    "Transfert de l'enregistrement vers un autre titulaire",
]
SYLLABLES = ["zy", "ra", "lex", "mo", "vi", "tar", "nex", "pro", "ka", "dol", "ben", "sol", "ver", "ium", "ora", "cil", "tum", "fen", "ax", "ido"]


def brand_name(rng: random.Random, used: set[str]) -> str:
    while True:
        name = "".join(rng.choice(SYLLABLES) for _ in range(rng.choice((2, 3)))).upper()
        if name not in used and len(name) >= 5:
            used.add(name)
            return name


def build(seed: int = 7) -> dict:
    rng = random.Random(seed)
    used: set[str] = set()
    enr: list[dict] = []
    ret: list[dict] = []
    rid = 0

    def row(dci: str, brand: str, forme: str, dosage: str, labo: tuple[str, str], typ: str) -> dict:
        nonlocal rid
        rid += 1
        return {
            "id": rid, "n_enreg": f"{rng.randint(1, 999):03d}/{rng.randint(1, 30):02d}A{rng.randint(1, 99):02d}/{rng.randint(10, 24)}",
            "dci": dci, "nom_marque": brand, "forme": forme, "dosage": dosage,
            "labo": labo[0], "pays": labo[1], "type_prod": typ,
        }

    for dci, _atc in DCIS:
        formes = rng.sample(FORMES[:5], 2)
        for forme in formes:
            doses = rng.sample(DOSAGES, 2)
            # une référence par (DCI, forme), plusieurs génériques
            ref_brand = brand_name(rng, used)
            ref_labo = rng.choice(LABOS)
            enr.append(row(dci, ref_brand, forme, doses[0], ref_labo, "RE"))
            for _ in range(rng.randint(4, 7)):
                enr.append(row(dci, brand_name(rng, used), forme, rng.choice(doses), rng.choice(LABOS), "GE"))

    for dci, _atc in rng.sample(DCIS, 22):
        for _ in range(rng.randint(1, 3)):
            forme, dosage = rng.choice(FORMES[:5]), rng.choice(DOSAGES)
            r = row(dci, brand_name(rng, used), forme, dosage, rng.choice(LABOS), rng.choice(("GE", "GE", "RE")))
            r["date_retrait"] = (date(2019, 1, 1) + timedelta(days=rng.randint(0, 2300))).isoformat()
            r["motif_retrait"] = rng.choice(MOTIFS)
            ret.append(r)

    return {
        "version": VERSION,
        "enregistrements": enr,
        "retraits": ret,
        "atc_codes": {c[:4]: {"code": c[:4], "niveau": 3, "label_fr": ATC3_LABELS[c[:4]], "label_en": None}
                      for _d, c in DCIS},
        "dci_atc": {d: c for d, c in DCIS},
        **dict(zip(("interactions", "interaction_classes"), interactions_synthetiques())),
    }


def load_db(data: dict) -> None:
    import psycopg2
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL requis (base de DEV : les tables sont VIDÉES).")
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute("TRUNCATE enregistrements, retraits RESTART IDENTITY")
    for r in data["enregistrements"]:
        cur.execute(
            "INSERT INTO enregistrements (id, n_enreg, dci, nom_marque, forme, dosage, labo, pays, type_prod, source_version)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (r["id"], r["n_enreg"], r["dci"], r["nom_marque"], r["forme"], r["dosage"], r["labo"], r["pays"], r["type_prod"], data["version"]),
        )
    for r in data["retraits"]:
        cur.execute(
            "INSERT INTO retraits (id, n_enreg, dci, nom_marque, forme, dosage, labo, pays, type_prod, date_retrait, motif_retrait)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (r["id"], r["n_enreg"], r["dci"], r["nom_marque"], r["forme"], r["dosage"], r["labo"], r["pays"], r["type_prod"], r["date_retrait"], r["motif_retrait"]),
        )
    for code, a in data["atc_codes"].items():
        cur.execute("INSERT INTO atc_codes (code, niveau, label_fr) VALUES (%s, 3, %s) ON CONFLICT (code) DO NOTHING", (code, a["label_fr"]))
    for dci, code in data["dci_atc"].items():
        cur.execute("INSERT INTO atc_codes (code, parent_code, niveau, label_fr) VALUES (%s, %s, 5, %s) ON CONFLICT (code) DO NOTHING", (code, code[:5], dci.lower()))
        cur.execute("INSERT INTO dci_atc_mapping (dci, code_atc) VALUES (%s, %s) ON CONFLICT (dci) DO NOTHING", (dci, code))
    cur.execute(
        "INSERT INTO nomenclature_versions (version_label, reference_date) VALUES (%s, CURRENT_DATE) ON CONFLICT (version_label) DO NOTHING",
        (data["version"],),
    )
    conn.commit()
    conn.close()
    print("Chargé :", len(data["enregistrements"]), "enregistrements,", len(data["retraits"]), "retraits.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--json")
    ap.add_argument("--load-db", action="store_true")
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    d = build(a.seed)
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        with open(a.json, "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, indent=1, sort_keys=True)
        print("Écrit :", a.json)
    if a.load_db:
        load_db(d)
