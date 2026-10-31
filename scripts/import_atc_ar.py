#!/usr/bin/env python3
"""
DwaDZ — Import des libellés ATC en arabe
========================================

Usage :
    python scripts/import_atc_ar.py data/ATC_2026_fr_en_ar.xlsx            # simulation (rien n'est écrit)
    python scripts/import_atc_ar.py data/ATC_2026_fr_en_ar.xlsx --apply    # écrit en base

Prérequis : `psql "$DATABASE_URL" -f sql/31_atc_label_ar.sql` (colonnes label_ar, commentaires_ar),
et la table atc_codes déjà alimentée par scripts/import_atc.py.

Colonnes lues (par leur intitulé) : « ATC_code », « Libellé arabe… », « Commentaires (ar) ».
Les codes absents de atc_codes sont signalés, jamais créés. Les cellules vides n'effacent rien.

Variables d'environnement : DATABASE_URL (ou POSTGRES_URL / PG*), comme import_atc.py.
"""

import argparse
import os
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("❌  openpyxl non installé. Lancez : pip install openpyxl")


def get_connection():
    import psycopg2
    db_url = (
        os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
        or os.environ.get("POSTGRES_PRISMA_URL") or os.environ.get("SUPABASE_DB_URL")
    )
    if db_url:
        return psycopg2.connect(db_url, sslmode="require" if os.environ.get("DATABASE_SSL") == "true" else "prefer")
    return psycopg2.connect(
        host=os.environ.get("PGHOST", "localhost"), port=int(os.environ.get("PGPORT", 5432)),
        dbname=os.environ.get("PGDATABASE", "pharmaveille"), user=os.environ.get("PGUSER", "postgres"),
        password=os.environ.get("PGPASSWORD", ""),
    )


def read_rows(path):
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True).active
    rows = ws.iter_rows(values_only=True)
    header = [str(h or "").strip() for h in next(rows)]

    def col(prefix):
        for i, h in enumerate(header):
            if h.lower().startswith(prefix.lower()):
                return i
        sys.exit(f"❌  Colonne « {prefix}… » introuvable. En-têtes : {header}")

    i_code, i_ar, i_com = col("ATC_code"), col("Libellé arabe"), col("Commentaires (ar)")
    out = []
    for r in rows:
        code = (r[i_code] or "").strip().upper() if isinstance(r[i_code], str) else ""
        if not code:
            continue
        ar = (str(r[i_ar]).strip() if r[i_ar] else None) or None
        com = (str(r[i_com]).strip() if r[i_com] else None) or None
        if ar or com:
            out.append((code, ar, com))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    ap.add_argument("--apply", action="store_true", help="écrire en base (sinon simulation)")
    args = ap.parse_args()

    rows = read_rows(args.xlsx)
    print(f"📄  {len(rows)} lignes avec une traduction dans le fichier")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT code FROM atc_codes")
    known = {r[0] for r in cur.fetchall()}
    missing = [c for c, _, _ in rows if c not in known]
    todo = [(ar, com, code) for code, ar, com in rows if code in known]
    print(f"✅  {len(todo)} codes présents dans atc_codes ; ⚠️  {len(missing)} absents" + (f" (ex. {', '.join(missing[:5])})" if missing else ""))

    if not args.apply:
        print("ℹ️  Simulation : relancez avec --apply pour écrire.")
        conn.close()
        return
    cur.executemany(
        "UPDATE atc_codes SET label_ar = COALESCE(%s, label_ar), commentaires_ar = COALESCE(%s, commentaires_ar) WHERE code = %s",
        todo,
    )
    conn.commit()
    print(f"💾  {len(todo)} codes mis à jour")
    conn.close()


if __name__ == "__main__":
    main()
