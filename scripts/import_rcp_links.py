#!/usr/bin/env python3
"""
Importe dans la base les rattachements RCP ↔ fiches produits par
scripts/match_rcp_anpp.py (tables rcp_documents, rcp_fiches, rcp_dci).

Rien n'est écrit sans --apply : sans lui, tout s'exécute dans une transaction
annulée à la fin, et le compte rendu dit ce qui serait ajouté ou modifié.

Usage :
    psql "$DATABASE_URL" -f sql/26_rcp_anpp.sql                  # une seule fois
    DATABASE_URL=... python scripts/import_rcp_links.py rcp_rapprochement/rapprochement.csv          # essai à blanc
    DATABASE_URL=... python scripts/import_rcp_links.py rcp_rapprochement/rapprochement.csv --apply  # écrit

Règles :
  - auto et probable créent des liens vers les fiches ; dci_seulement ne crée qu'un lien
    vers la substance ; a_relire et aucune ne sont pas importés.
  - Les statuts saisis à la main (confirme, rejete) ne sont jamais modifiés.
  - Les liens auto/probable qui ne sont plus proposés par le rapprochement sont retirés.
  - Les fiches sont rattachées par (n_enreg, code) : les id de la table enregistrements
    changent à chaque import de nomenclature.

Prérequis : pip install psycopg2-binary
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
import uuid
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

IMPORTED = ("auto", "probable", "dci_seulement")


@dataclass
class Record:
    rcp_id: str
    nom_commercial: str
    dci_anpp: str
    laboratoire_anpp: str
    pdf_url: str
    statut: str
    score: float | None
    dosage: str
    fiche_ids: list[int] = field(default_factory=list)


def read_records(path: Path) -> tuple[list[Record], Counter]:
    """Lit rapprochement.csv. Renvoie les lignes à importer et un compte des lignes écartées."""
    skipped: Counter = Counter()
    records: dict[str, Record] = {}
    with path.open(encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh):
            if row["statut"] not in IMPORTED:
                skipped[f"statut {row['statut']}"] += 1
                continue
            try:
                rcp_id = str(uuid.UUID(row["rcp_id"]))
            except ValueError:
                skipped["identifiant de PDF illisible"] += 1
                continue
            if not row["pdf"]:
                skipped["adresse du PDF absente"] += 1
                continue
            if rcp_id in records:
                skipped["doublon"] += 1
                continue
            ids = [int(x) for x in (row["ids_nomenclature"] or "").split(";") if x.strip().isdigit()]
            records[rcp_id] = Record(
                rcp_id=rcp_id,
                nom_commercial=row["nom_commercial"],
                dci_anpp=row["dci_anpp"],
                laboratoire_anpp=row["laboratoire_anpp"],
                pdf_url=row["pdf"],
                statut=row["statut"],
                score=float(row["score"]) if row.get("score") else None,
                dosage=(row.get("dosage") or "")[:12],
                fiche_ids=ids,
            )
    return list(records.values()), skipped


def dci_key(dci: str) -> str:
    """Même clé que dci_monographies : majuscules, espaces normalisés."""
    return " ".join((dci or "").split()).upper()


def import_links(cur, records: list[Record]) -> Counter:
    """Écrit dans la transaction courante (le commit ou l'annulation est décidé par l'appelant)."""
    n: Counter = Counter()

    all_ids = sorted({i for r in records for i in r.fiche_ids})
    cur.execute("SELECT id, n_enreg, COALESCE(code, ''), dci FROM enregistrements WHERE id = ANY(%s)", (all_ids,))
    fiches = {row[0]: (row[1], row[2], dci_key(row[3])) for row in cur.fetchall()}

    for r in records:
        cur.execute(
            """
            INSERT INTO rcp_documents (rcp_id, nom_commercial, dci_anpp, laboratoire_anpp, pdf_url)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (rcp_id) DO UPDATE SET
              nom_commercial = EXCLUDED.nom_commercial, dci_anpp = EXCLUDED.dci_anpp,
              laboratoire_anpp = EXCLUDED.laboratoire_anpp, pdf_url = EXCLUDED.pdf_url,
              retire = FALSE, updated_at = NOW()
            RETURNING (xmax = 0)
            """,
            (r.rcp_id, r.nom_commercial, r.dci_anpp, r.laboratoire_anpp, r.pdf_url),
        )
        n["documents ajoutés" if cur.fetchone()[0] else "documents mis à jour"] += 1

        found = [fiches[i] for i in r.fiche_ids if i in fiches]
        n["fiches introuvables (id absent de enregistrements)"] += len(r.fiche_ids) - len(found)

        keys: set[tuple[str, str]] = set()
        if r.statut in ("auto", "probable"):
            keys = {(f[0], f[1]) for f in found}
            for n_enreg, code in sorted(keys):
                # confirme et rejete saisis à la main sont conservés tels quels
                cur.execute(
                    """
                    INSERT INTO rcp_fiches (rcp_id, n_enreg, code, statut, score, dosage)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (rcp_id, n_enreg, code) DO UPDATE SET
                      statut = CASE WHEN rcp_fiches.statut IN ('confirme', 'rejete')
                                    THEN rcp_fiches.statut ELSE EXCLUDED.statut END,
                      score = EXCLUDED.score, dosage = EXCLUDED.dosage
                    RETURNING (xmax = 0)
                    """,
                    (r.rcp_id, n_enreg, code, r.statut, r.score, r.dosage or None),
                )
                n["liens fiche ajoutés" if cur.fetchone()[0] else "liens fiche mis à jour"] += 1

        # liens auto/probable que le rapprochement ne propose plus
        cur.execute(
            """
            DELETE FROM rcp_fiches
            WHERE rcp_id = %s AND statut IN ('auto', 'probable')
              AND (n_enreg, code) NOT IN (SELECT * FROM unnest(%s::text[], %s::text[]))
            """,
            (r.rcp_id, [k[0] for k in keys], [k[1] for k in keys]),
        )
        n["liens fiche retirés"] += cur.rowcount

        cur.execute("DELETE FROM rcp_dci WHERE rcp_id = %s", (r.rcp_id,))
        for d in sorted({f[2] for f in found if f[2]}):
            cur.execute("INSERT INTO rcp_dci (rcp_id, dci) VALUES (%s, %s)", (r.rcp_id, d))
            n["liens substance"] += 1
    return n


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("rapprochement", type=Path, help="rapprochement.csv produit par match_rcp_anpp.py")
    ap.add_argument("--apply", action="store_true", help="écrit en base (sinon essai à blanc, annulé à la fin)")
    args = ap.parse_args(argv)

    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL absent.")
    try:
        import psycopg2
    except ImportError:
        raise SystemExit("psycopg2 manquant : pip install psycopg2-binary")

    records, skipped = read_records(args.rapprochement)
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.rcp_documents') IS NOT NULL")
            if not cur.fetchone()[0]:
                raise SystemExit('Tables absentes : psql "$DATABASE_URL" -f sql/26_rcp_anpp.sql')
            counts = import_links(cur, records)
        if args.apply:
            conn.commit()
        else:
            conn.rollback()
    finally:
        conn.close()

    print(f"{len(records)} RCP lus dans {args.rapprochement}")
    for label, value in sorted(skipped.items()):
        print(f"  écartés ({label}) : {value}")
    for label, value in counts.items():
        print(f"  {label} : {value}")
    print("Écrit en base." if args.apply else "Essai à blanc : rien n'a été écrit. Ajoutez --apply pour importer.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
