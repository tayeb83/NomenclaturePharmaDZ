#!/usr/bin/env python3
"""
Applique les traductions arabes de data/ansm/interactions_ar.json aux lignes de
interactions_ansm (sql/29_interactions_ansm.sql).

Le fichier est indexé par le TEXTE FRANÇAIS : une phrase traduite une fois sert à toutes
les lignes qui la portent, et une ligne dont le texte français change perd sa traduction
(voir import_ansm_interactions.py).

Statut : les lignes traduites passent à « brouillon » (affichées, à relire). Une ligne
déjà marquée « relu » n'est jamais modifiée, sauf avec --ecraser-relu.
Pour valider une relecture : UPDATE interactions_ansm SET ar_statut = 'relu' WHERE …

Sans --apply, tout s'exécute dans une transaction annulée à la fin.

Usage :
    DATABASE_URL=... python scripts/import_ansm_traductions_ar.py data/ansm/interactions_ar.json
    DATABASE_URL=... python scripts/import_ansm_traductions_ar.py data/ansm/interactions_ar.json --apply

Prérequis : pip install psycopg2-binary
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("json", type=Path)
    ap.add_argument("--apply", action="store_true", help="valider la transaction (sinon : simulation)")
    ap.add_argument("--ecraser-relu", action="store_true", help="remplacer aussi les traductions déjà relues")
    args = ap.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL absent", file=sys.stderr)
        return 2
    import psycopg2
    from psycopg2.extras import execute_values

    tr = json.loads(args.json.read_text(encoding="utf8"))
    risques, conduites, partenaires = tr["risques"], tr["conduites"], tr["partenaires"]

    conn = psycopg2.connect(dsn)
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT id, partenaire, risque_fr, conduite_fr, ar_statut FROM interactions_ansm")
            updates, vus_relus = [], 0
            for id_, partenaire, risque_fr, conduite_fr, statut in cur.fetchall():
                if statut == "relu" and not args.ecraser_relu:
                    vus_relus += 1
                    continue
                r = risques.get(risque_fr)
                c = conduites.get(conduite_fr) if conduite_fr else ""
                p = partenaires.get(partenaire)
                # une ligne n'est traduite que si tout ce qu'elle affiche l'est : sinon la fiche
                # arabe garde le texte français d'origine, jamais un mélange
                complet = bool(r) and (not conduite_fr or bool(c))
                updates.append((id_, r if complet else None, (c or None) if complet and conduite_fr else None, p, "brouillon" if complet else "absent"))

            execute_values(cur, """
                UPDATE interactions_ansm AS t SET
                  risque_ar = v.risque_ar, conduite_ar = v.conduite_ar, partenaire_ar = v.partenaire_ar,
                  ar_statut = v.ar_statut, updated_at = NOW()
                FROM (VALUES %s) AS v(id, risque_ar, conduite_ar, partenaire_ar, ar_statut)
                WHERE t.id = v.id
            """, updates, template="(%s::int, %s::text, %s::text, %s::text, %s::text)", page_size=500)

            cur.execute("""
                SELECT niveau, count(*) FILTER (WHERE ar_statut <> 'absent'), count(*)
                FROM interactions_ansm GROUP BY niveau ORDER BY min(CASE niveau WHEN 'contre_indication' THEN 0
                  WHEN 'deconseillee' THEN 1 WHEN 'precaution_emploi' THEN 2 ELSE 3 END)
            """)
            for niveau, traduites, total in cur.fetchall():
                print(f"  {niveau:22} {traduites:5} / {total:5} traduites")
            print(f"{len(updates)} lignes examinées, {vus_relus} déjà relues et laissées telles quelles")
            if not args.apply:
                conn.rollback()
                print("Simulation : rien n'est enregistré. Relancez avec --apply.")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
