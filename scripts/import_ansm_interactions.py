#!/usr/bin/env python3
"""
Charge en base (sql/29_interactions_ansm.sql) le JSON produit par
scripts/extract_ansm_interactions.py.

Sans --apply, tout s'exécute dans une transaction annulée à la fin et le compte
rendu dit ce qui serait fait.

Usage :
    psql "$DATABASE_URL" -f sql/29_interactions_ansm.sql                       # une seule fois
    python scripts/extract_ansm_interactions.py data/ansm/<thesaurus>.pdf data/ansm/interactions_fr.json
    DATABASE_URL=... python scripts/import_ansm_interactions.py data/ansm/interactions_fr.json
    DATABASE_URL=... python scripts/import_ansm_interactions.py data/ansm/interactions_fr.json --apply

Règles :
  - Ré-importer une nouvelle version du thésaurus met à jour les textes français.
  - Une traduction arabe est conservée tant que le texte français de la ligne n'a pas changé ;
    sinon elle est effacée (elle ne décrirait plus le même texte).
  - Les lignes qui ne figurent plus dans le thésaurus sont supprimées.

Prérequis : pip install psycopg2-binary
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from pathlib import Path


def fold(text: str) -> str:
    """Même clé que foldNom (lib/rcp-match.ts) : sans accents ni ponctuation, en minuscules."""
    s = text.replace("œ", "oe").replace("Œ", "OE").replace("æ", "ae").replace("Æ", "AE")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def build_rows(data: dict) -> tuple[list[tuple], list[tuple]]:
    version = data["source"]["version"]
    titres = {fold(s["nom"]): s["nom"] for s in data["substances"]}

    # classes : un titre qui énumère ses membres, ou vers lequel une substance renvoie (« Voir aussi »)
    classes: dict[str, str] = {fold(s["nom"]): s["nom"] for s in data["substances"] if s.get("membres")}
    liens: dict[tuple[str, str, str], tuple] = {}
    for s in data["substances"]:
        for m in s.get("membres", []):
            k = (fold(s["nom"]), fold(m), "liste")
            liens[k] = (s["nom"], fold(s["nom"]), m, fold(m), "liste")
        for v in s["voir_aussi"]:
            ck = fold(v)
            if ck in titres:
                classes[ck] = titres[ck]
                k = (ck, fold(s["nom"]), "voir_aussi")
                liens[k] = (titres[ck], ck, s["nom"], fold(s["nom"]), "voir_aussi")

    def est_classe(partenaire: str) -> bool:
        key = fold(partenaire)
        # « AUTRES AMINOSIDES » désigne le reste d'une classe, même quand elle n'a pas de titre propre
        return key in classes or key.startswith("autres ")

    rows = []
    for i in data["interactions"]:
        rows.append((
            i["substance"], fold(i["substance"]), i["partenaire"], fold(i["partenaire"]), est_classe(i["partenaire"]),
            i["niveau"], i.get("niveaux"), i["risque"], i["conduite"], i["page"], version,
        ))
    return rows, list(liens.values())


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("json", type=Path)
    ap.add_argument("--apply", action="store_true", help="valider la transaction (sinon : simulation)")
    args = ap.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL absent", file=sys.stderr)
        return 2
    import psycopg2
    from psycopg2.extras import execute_values

    data = json.loads(args.json.read_text(encoding="utf8"))
    rows, liens = build_rows(data)
    if not rows:
        print("Aucune interaction dans le fichier : rien à faire.", file=sys.stderr)
        return 2

    conn = psycopg2.connect(dsn)
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.interactions_ansm') IS NOT NULL")
            if not cur.fetchone()[0]:
                print("Table absente : appliquez d'abord sql/29_interactions_ansm.sql", file=sys.stderr)
                return 2

            cur.execute("SELECT count(*) FROM interactions_ansm")
            avant = cur.fetchone()[0]

            execute_values(cur, """
                INSERT INTO interactions_ansm
                  (substance, substance_key, partenaire, partenaire_key, partenaire_est_classe,
                   niveau, niveaux, risque_fr, conduite_fr, page, source_version)
                VALUES %s
                ON CONFLICT (substance_key, partenaire_key) DO UPDATE SET
                  substance = EXCLUDED.substance, partenaire = EXCLUDED.partenaire,
                  partenaire_est_classe = EXCLUDED.partenaire_est_classe,
                  niveau = EXCLUDED.niveau, niveaux = EXCLUDED.niveaux, page = EXCLUDED.page,
                  source_version = EXCLUDED.source_version,
                  -- texte français modifié : la traduction ne s'applique plus
                  risque_ar = CASE WHEN interactions_ansm.risque_fr = EXCLUDED.risque_fr
                                    AND interactions_ansm.conduite_fr = EXCLUDED.conduite_fr
                                   THEN interactions_ansm.risque_ar END,
                  conduite_ar = CASE WHEN interactions_ansm.risque_fr = EXCLUDED.risque_fr
                                      AND interactions_ansm.conduite_fr = EXCLUDED.conduite_fr
                                     THEN interactions_ansm.conduite_ar END,
                  ar_statut = CASE WHEN interactions_ansm.risque_fr = EXCLUDED.risque_fr
                                    AND interactions_ansm.conduite_fr = EXCLUDED.conduite_fr
                                   THEN interactions_ansm.ar_statut ELSE 'absent' END,
                  risque_fr = EXCLUDED.risque_fr, conduite_fr = EXCLUDED.conduite_fr,
                  updated_at = NOW()
            """, rows, page_size=500)

            cur.execute("""
                DELETE FROM interactions_ansm
                WHERE (substance_key, partenaire_key) NOT IN (SELECT * FROM unnest(%s::text[], %s::text[]))
            """, ([r[1] for r in rows], [r[3] for r in rows]))
            supprimees = cur.rowcount

            cur.execute("DELETE FROM interactions_ansm_classes")
            execute_values(cur, """
                INSERT INTO interactions_ansm_classes (classe, classe_key, membre, membre_key, origine) VALUES %s
                ON CONFLICT DO NOTHING
            """, liens, page_size=500)

            cur.execute("SELECT count(*) FROM interactions_ansm")
            apres = cur.fetchone()[0]
            print(f"interactions : {avant} avant, {apres} après ({supprimees} supprimées) ; {len(liens)} liens substance/classe")
            if not args.apply:
                conn.rollback()
                print("Simulation : rien n'est enregistré. Relancez avec --apply.")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
