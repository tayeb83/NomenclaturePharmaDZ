#!/usr/bin/env python3
"""
Importe en base, comme BROUILLONS, les faits courts proposés par
scripts/extract_rcp_faits.py (table rcp_faits, sql/27_rcp_faits.sql).

Rien n'est publié par ce script : un fait ne s'affiche qu'après relecture dans
l'admin (/admin/rcp). Sans --apply, tout s'exécute dans une transaction annulée
à la fin et le compte rendu dit ce qui serait fait.

Usage :
    psql "$DATABASE_URL" -f sql/27_rcp_faits.sql                               # une seule fois
    DATABASE_URL=... python scripts/import_rcp_faits.py rcp_rapprochement/faits_brouillon.json
    DATABASE_URL=... python scripts/import_rcp_faits.py rcp_rapprochement/faits_brouillon.json --apply

Règles :
  - Un fait déjà relu (publié, rejeté) n'est jamais modifié par un ré-import.
  - Un brouillon que l'extraction ne propose plus est supprimé.
  - Les RCP absents de rcp_documents (sql/26 + import_rcp_links.py) sont ignorés.
  - Les substances sont reliées à votre nomenclature (page /dci/...) ; les familles
    courantes (cyclines, AINS…) à leur classe ATC, si elle existe dans atc_codes.

Prérequis : pip install psycopg2-binary
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from match_rcp_anpp import dci_components  # noqa: E402

# Familles citées dans les RCP → classe ATC (niveau 3 ou 4). Vérifiées dans atc_codes avant usage.
CLASS_ALIASES = {
    "tetracyclines": "J01AA", "cyclines": "J01AA", "macrolides": "J01FA", "fluoroquinolones": "J01MA",
    "quinolones": "J01M", "aines": "M01A", "anti inflammatoires non steroidiens": "M01A",
    "inhibiteurs de l enzyme de conversion": "C09A", "iec": "C09A", "sartans": "C09C",
    "antagonistes des recepteurs de l angiotensine ii": "C09C", "statines": "C10AA",
    "beta bloquants": "C07", "diuretiques": "C03", "sulfamides hypoglycemiants": "A10BB",
    "digitaliques": "C01AA", "antivitamines k": "B01AA",
}


# Noms usuels cités dans les RCP → substance de la nomenclature.
DCI_SYNONYMS = {"VITAMINE A": "RETINOL"}


def fold(text: str | None) -> str:
    s = unicodedata.normalize("NFKD", text or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def fait_key(f: dict) -> str:
    """Empreinte stable d'un fait : ne dépend pas du libellé, que le relecteur peut corriger."""
    raw = f"{f['type']}|{f['section']}|{f.get('population') or ''}|{fold(f.get('nom_brut') or f['libelle'])}"
    return hashlib.sha1(raw.encode()).hexdigest()[:16]


def link_target(name: str, dci_index: dict[str, str], atc_known: set[str]) -> tuple[str, str] | None:
    """('dci', 'METHOTREXATE') ou ('classe', 'J01AA'), ou None si la substance n'est pas dans l'application."""
    key = re.sub(r"^(les|le|la|des|du|de la|de l|l|autres)\s+", "", fold(name))
    code = CLASS_ALIASES.get(key)
    if code and code in atc_known:
        return "classe", code
    comp = tuple(DCI_SYNONYMS.get(c, c) for c in dci_components(name))
    if len(comp) == 1 and comp[0] in dci_index:
        return "dci", dci_index[comp[0]]
    return None


def load_indexes(cur) -> tuple[dict[str, str], set[str]]:
    """Substance simple → libellé de nomenclature le plus fréquent ; codes ATC connus."""
    cur.execute("SELECT UPPER(btrim(dci)), COUNT(*) FROM enregistrements WHERE dci IS NOT NULL GROUP BY 1")
    best: dict[str, tuple[int, str]] = {}
    for dci, n in cur.fetchall():
        comp = dci_components(dci)
        if len(comp) != 1:
            continue
        if comp[0] not in best or n > best[comp[0]][0]:
            best[comp[0]] = (n, dci)
    cur.execute("SELECT to_regclass('public.atc_codes') IS NOT NULL")
    atc: set[str] = set()
    if cur.fetchone()[0]:
        cur.execute("SELECT code FROM atc_codes WHERE code = ANY(%s)", (sorted(set(CLASS_ALIASES.values())),))
        atc = {r[0] for r in cur.fetchall()}
    return {k: v[1] for k, v in best.items()}, atc


def import_faits(cur, rcps: list[dict]) -> Counter:
    n: Counter = Counter()
    dci_index, atc_known = load_indexes(cur)
    cur.execute("SELECT rcp_id::text FROM rcp_documents WHERE rcp_id::text = ANY(%s)", ([r["rcp_id"] for r in rcps],))
    known = {r[0] for r in cur.fetchall()}

    for rcp in rcps:
        rid = rcp["rcp_id"]
        if rid not in known:
            n["RCP absents de rcp_documents (ignorés)"] += 1
            continue
        if rcp.get("version_texte"):
            cur.execute("UPDATE rcp_documents SET version_texte = %s WHERE rcp_id = %s AND version_texte IS DISTINCT FROM %s",
                        (rcp["version_texte"], rid, rcp["version_texte"]))
            n["versions du texte renseignées"] += cur.rowcount

        keys: list[str] = []
        for f in rcp["faits"]:
            cle = fait_key(f)
            keys.append(cle)
            target = link_target(f["libelle"], dci_index, atc_known) if f["type"] == "interaction" else None
            cur.execute(
                """
                INSERT INTO rcp_faits (rcp_id, type, section, page, libelle, gravite, cible_type, cible,
                                       population, dose_min, dose_max, unite, par, contexte, cle)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (rcp_id, cle) DO UPDATE SET
                  page = EXCLUDED.page, contexte = EXCLUDED.contexte,
                  libelle = CASE WHEN rcp_faits.status = 'brouillon' THEN EXCLUDED.libelle ELSE rcp_faits.libelle END,
                  gravite = CASE WHEN rcp_faits.status = 'brouillon' THEN EXCLUDED.gravite ELSE rcp_faits.gravite END,
                  cible_type = CASE WHEN rcp_faits.status = 'brouillon' THEN EXCLUDED.cible_type ELSE rcp_faits.cible_type END,
                  cible = CASE WHEN rcp_faits.status = 'brouillon' THEN EXCLUDED.cible ELSE rcp_faits.cible END,
                  updated_at = NOW()
                RETURNING (xmax = 0)
                """,
                (rid, f["type"], f["section"], f["page"], f["libelle"], f.get("gravite"),
                 target[0] if target else None, target[1] if target else None,
                 f.get("population"), f.get("dose_min"), f.get("dose_max"), f.get("unite"), f.get("par"),
                 f.get("contexte"), cle),
            )
            n["faits ajoutés (brouillon)" if cur.fetchone()[0] else "faits déjà connus (mis à jour)"] += 1
            if target:
                n["interactions reliées à l'application"] += 1

        cur.execute("DELETE FROM rcp_faits WHERE rcp_id = %s AND status = 'brouillon' AND cle <> ALL(%s)", (rid, keys))
        n["brouillons obsolètes supprimés"] += cur.rowcount
    return n


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("faits", type=Path, help="faits_brouillon.json produit par extract_rcp_faits.py")
    ap.add_argument("--apply", action="store_true", help="écrit en base (sinon essai à blanc, annulé à la fin)")
    args = ap.parse_args(argv)

    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL absent.")
    try:
        import psycopg2
    except ImportError:
        raise SystemExit("psycopg2 manquant : pip install psycopg2-binary")

    rcps = json.loads(args.faits.read_text(encoding="utf-8"))
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.rcp_faits') IS NOT NULL")
            if not cur.fetchone()[0]:
                raise SystemExit('Table absente : psql "$DATABASE_URL" -f sql/27_rcp_faits.sql')
            counts = import_faits(cur, rcps)
        conn.commit() if args.apply else conn.rollback()
    finally:
        conn.close()

    print(f"{len(rcps)} RCP lus dans {args.faits}")
    for label, value in counts.items():
        print(f"  {label} : {value}")
    print("Écrit en base. Relisez dans /admin/rcp." if args.apply
          else "Essai à blanc : rien n'a été écrit. Ajoutez --apply pour importer.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
