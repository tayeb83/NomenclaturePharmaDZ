#!/usr/bin/env python3
"""
PharmaVeille DZ — Restauration des codes ATC depuis un export CSV de la base
=============================================================================

Ce script importe les codes ATC depuis des fichiers CSV exportés directement
depuis la base de données (format dump Supabase/PostgreSQL).

Usage :
    # Importer uniquement les codes ATC (table atc_codes)
    python scripts/restore_atc_dump.py --atc data/atc_codes.csv

    # Importer uniquement les mappings DCI → ATC (table dci_atc_mapping)
    python scripts/restore_atc_dump.py --mapping data/dci_atc_mapping.csv

    # Importer les deux en une seule commande (recommandé)
    python scripts/restore_atc_dump.py --atc data/atc_codes.csv --mapping data/dci_atc_mapping.csv

    # Vider les tables avant l'import (repartir de zéro)
    python scripts/restore_atc_dump.py --atc data/atc_codes.csv --mapping data/dci_atc_mapping.csv --truncate

Format CSV attendu pour atc_codes (sans en-tête, séparateur virgule, encodage UTF-8) :
    code,parent_code,niveau,label_en,label_fr,commentaires,date_creation,date_modification,date_inactivation,created_at

    Exemple :
    A,null,1,ALIMENTARY TRACT AND METABOLISM,voies digestives et métabolisme,null,null,null,null,2026-02-26 11:28:38.408489 +00:00
    A01,A,2,STOMATOLOGICAL PREPARATIONS,préparations stomatologiques,null,null,null,null,2026-02-26 11:28:38.408489 +00:00

Format CSV attendu pour dci_atc_mapping (sans en-tête, séparateur virgule, encodage UTF-8) :
    dci,code_atc,source,created_at

    Exemple :
    ABACAVIR SULFATE EXPERIME EN ABACAVIR,J05AF06,auto,2026-02-26 11:28:39.171153 +00:00
    ABCIXIMAB,B01AC13,auto,2026-02-26 11:28:39.171153 +00:00

Variables d'environnement :
    DATABASE_URL  (ou POSTGRES_URL / PGHOST+PGDATABASE+… comme le reste du projet)
"""

import os
import sys
import csv
import argparse

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("❌  psycopg2 non installé. Lancez : pip install psycopg2-binary")
    sys.exit(1)


# ─── Connexion DB ─────────────────────────────────────────────────────────────

def get_connection():
    db_url = (
        os.environ.get("DATABASE_URL") or
        os.environ.get("POSTGRES_URL") or
        os.environ.get("POSTGRES_PRISMA_URL") or
        os.environ.get("SUPABASE_DB_URL")
    )
    if db_url:
        return psycopg2.connect(
            db_url,
            sslmode="require" if os.environ.get("DATABASE_SSL") == "true" else "prefer"
        )

    return psycopg2.connect(
        host=os.environ.get("PGHOST", "localhost"),
        port=int(os.environ.get("PGPORT", 5432)),
        dbname=os.environ.get("PGDATABASE", "pharmaveille"),
        user=os.environ.get("PGUSER", "postgres"),
        password=os.environ.get("PGPASSWORD", ""),
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def null_or_value(val: str):
    """Convertit la chaîne 'null' en None Python (NULL SQL)."""
    stripped = val.strip()
    return None if stripped.lower() == "null" or stripped == "" else stripped


# ─── Import atc_codes ─────────────────────────────────────────────────────────

def restore_atc_codes(csv_path: str, conn, truncate: bool = False) -> int:
    """
    Importe la table atc_codes depuis un CSV dump.

    Colonnes attendues (dans l'ordre, sans en-tête) :
        code, parent_code, niveau, label_en, label_fr,
        commentaires, date_creation, date_modification, date_inactivation, created_at
    """
    rows = []

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)

        # Détection automatique : si la première ligne commence par "code" c'est un en-tête
        first_line = next(reader, None)
        if first_line is None:
            print("⚠️  Fichier CSV vide.")
            return 0

        if first_line[0].strip().lower() == "code":
            # En-tête détecté, on l'ignore et on continue
            print("   (en-tête détecté et ignoré)")
        else:
            # Pas d'en-tête → traiter la première ligne comme donnée
            rows.append(first_line)

        for row in reader:
            if len(row) < 9:
                continue
            rows.append(row)

    if not rows:
        print("⚠️  Aucune ligne valide trouvée dans le CSV atc_codes.")
        return 0

    # Transformer en tuples (code, parent_code, niveau, label_en, label_fr,
    #                         commentaires, date_creation, date_modification, date_inactivation)
    # On ignore created_at (géré par DEFAULT NOW())
    parsed = []
    for r in rows:
        try:
            code         = r[0].strip()
            parent_code  = null_or_value(r[1])
            niveau       = int(r[2].strip())
            label_en     = null_or_value(r[3])
            label_fr     = null_or_value(r[4])
            commentaires = null_or_value(r[5])
            date_crea    = null_or_value(r[6])
            date_modif   = null_or_value(r[7])
            date_inact   = null_or_value(r[8])

            if not code:
                continue

            parsed.append((code, parent_code, niveau, label_en, label_fr,
                           commentaires, date_crea, date_modif, date_inact))
        except (IndexError, ValueError):
            continue

    if not parsed:
        print("⚠️  Aucune ligne valide après parsing.")
        return 0

    cur = conn.cursor()

    if truncate:
        print("🗑️   Suppression des données existantes (atc_codes)…")
        # On doit d'abord vider dci_atc_mapping (FK)
        cur.execute("DELETE FROM dci_atc_mapping")
        cur.execute("DELETE FROM atc_codes")

    print(f"📥  Import de {len(parsed)} codes ATC…")

    batch_size = 500
    total = 0
    for i in range(0, len(parsed), batch_size):
        batch = parsed[i:i + batch_size]
        psycopg2.extras.execute_values(cur, """
            INSERT INTO atc_codes
              (code, parent_code, niveau, label_en, label_fr,
               commentaires, date_creation, date_modification, date_inactivation)
            VALUES %s
            ON CONFLICT (code) DO UPDATE SET
              parent_code       = EXCLUDED.parent_code,
              niveau            = EXCLUDED.niveau,
              label_en          = EXCLUDED.label_en,
              label_fr          = EXCLUDED.label_fr,
              commentaires      = EXCLUDED.commentaires,
              date_creation     = EXCLUDED.date_creation,
              date_modification = EXCLUDED.date_modification,
              date_inactivation = EXCLUDED.date_inactivation
        """, batch)
        total += len(batch)
        print(f"   {total}/{len(parsed)} codes insérés…", end="\r")

    conn.commit()
    print(f"\n✅  {len(parsed)} codes ATC restaurés.")
    cur.close()
    return len(parsed)


# ─── Import dci_atc_mapping ───────────────────────────────────────────────────

def restore_dci_mapping(csv_path: str, conn, truncate: bool = False) -> int:
    """
    Importe la table dci_atc_mapping depuis un CSV dump.

    Colonnes attendues (dans l'ordre, sans en-tête) :
        dci, code_atc, source, created_at
    """
    rows = []

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)

        first_line = next(reader, None)
        if first_line is None:
            print("⚠️  Fichier CSV vide.")
            return 0

        if first_line[0].strip().lower() == "dci":
            print("   (en-tête détecté et ignoré)")
        else:
            rows.append(first_line)

        for row in reader:
            if len(row) < 2:
                continue
            rows.append(row)

    if not rows:
        print("⚠️  Aucune ligne valide trouvée dans le CSV dci_atc_mapping.")
        return 0

    parsed = []
    for r in rows:
        try:
            dci      = r[0].strip()
            code_atc = r[1].strip()
            source   = r[2].strip() if len(r) > 2 else "auto"

            if not dci or not code_atc:
                continue

            parsed.append((dci, code_atc, source))
        except IndexError:
            continue

    if not parsed:
        print("⚠️  Aucune ligne valide après parsing.")
        return 0

    cur = conn.cursor()

    if truncate:
        print("🗑️   Suppression des données existantes (dci_atc_mapping)…")
        cur.execute("DELETE FROM dci_atc_mapping")

    print(f"📥  Import de {len(parsed)} mappings DCI → ATC…")

    batch_size = 500
    total = 0
    for i in range(0, len(parsed), batch_size):
        batch = parsed[i:i + batch_size]
        psycopg2.extras.execute_values(cur, """
            INSERT INTO dci_atc_mapping (dci, code_atc, source)
            VALUES %s
            ON CONFLICT (dci) DO UPDATE SET
              code_atc = EXCLUDED.code_atc,
              source   = CASE
                           WHEN dci_atc_mapping.source = 'manual' THEN 'manual'
                           ELSE EXCLUDED.source
                         END
        """, batch)
        total += len(batch)
        print(f"   {total}/{len(parsed)} mappings insérés…", end="\r")

    conn.commit()
    print(f"\n✅  {len(parsed)} mappings DCI restaurés.")
    cur.close()
    return len(parsed)


# ─── Point d'entrée ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Restauration des codes ATC depuis un export CSV de la base de données"
    )
    parser.add_argument(
        "--atc",
        help="Chemin vers le CSV dump de la table atc_codes (ex: data/atc_codes.csv)"
    )
    parser.add_argument(
        "--mapping",
        help="Chemin vers le CSV dump de la table dci_atc_mapping (ex: data/dci_atc_mapping.csv)"
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Vider les tables avant l'import (repartir de zéro)"
    )
    args = parser.parse_args()

    if not args.atc and not args.mapping:
        parser.print_help()
        print("\n❌  Précisez au moins --atc ou --mapping.")
        sys.exit(1)

    print("🔌  Connexion à la base de données…")
    try:
        conn = get_connection()
        print("✅  Connecté.\n")
    except Exception as e:
        print(f"❌  Impossible de se connecter : {e}")
        sys.exit(1)

    try:
        if args.atc:
            print(f"📂  Lecture de : {args.atc}")
            restore_atc_codes(args.atc, conn, truncate=args.truncate)

        if args.mapping:
            print(f"\n📂  Lecture de : {args.mapping}")
            restore_dci_mapping(args.mapping, conn, truncate=False)

    except FileNotFoundError as e:
        print(f"\n❌  Fichier introuvable : {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌  Erreur : {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()
        print("\n🔒  Connexion fermée.")


if __name__ == "__main__":
    main()
