#!/usr/bin/env python3
"""
PharmaVeille DZ — Import de la classification ATC et matching DCI
=================================================================

Usage :
    python scripts/import_atc.py --atc data/atc_codes.csv

    # Import + auto-matching avec les DCIs de la nomenclature :
    python scripts/import_atc.py --atc data/atc_codes.csv --match

    # Rapport des DCIs sans correspondance :
    python scripts/import_atc.py --atc data/atc_codes.csv --match --report

Format CSV attendu (séparateur virgule, encodage UTF-8) :
    Niveau code,ATC_code,ATC_codePere,Libellé anglais,Libellé français,Commentaires,Création,Modification,Inactivation

Variables d'environnement :
    DATABASE_URL  (ou POSTGRES_URL / PGHOST+PGDATABASE+… comme le reste du projet)
"""

import os
import sys
import csv
import re
import argparse
import unicodedata
from datetime import date
from typing import Optional

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("❌  psycopg2 non installé. Lancez : pip install psycopg2-binary")
    sys.exit(1)

# ─── Connexion DB ────────────────────────────────────────────────────────────

def get_connection():
    db_url = (
        os.environ.get("DATABASE_URL") or
        os.environ.get("POSTGRES_URL") or
        os.environ.get("POSTGRES_PRISMA_URL") or
        os.environ.get("SUPABASE_DB_URL")
    )
    if db_url:
        return psycopg2.connect(db_url, sslmode="require" if os.environ.get("DATABASE_SSL") == "true" else "prefer")

    return psycopg2.connect(
        host=os.environ.get("PGHOST", "localhost"),
        port=int(os.environ.get("PGPORT", 5432)),
        dbname=os.environ.get("PGDATABASE", "pharmaveille"),
        user=os.environ.get("PGUSER", "postgres"),
        password=os.environ.get("PGPASSWORD", ""),
    )

# ─── Normalisation des textes ────────────────────────────────────────────────

def normalize(text: str) -> str:
    """Normalise pour la comparaison : minuscules, sans accents, sans ponctuation superflue."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text.lower().strip())
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    # supprimer les espaces multiples
    return re.sub(r"\s+", " ", ascii_str).strip()

def parse_date(s: str) -> Optional[date]:
    """Parse une date au format DD/MM/YYYY ou YYYY-MM-DD."""
    if not s or not s.strip():
        return None
    s = s.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d.%m.%Y"):
        try:
            from datetime import datetime
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None

# ─── Import de la table atc_codes ────────────────────────────────────────────

def import_atc_codes(csv_path: str, conn) -> int:
    """Importe tous les codes ATC depuis le CSV. Retourne le nombre de lignes insérées."""

    rows = []
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            niveau_raw = row.get("Niveau code", "").strip()
            code = row.get("ATC_code", "").strip()
            parent_raw = row.get("ATC_codePere", "").strip()

            if not code or not niveau_raw:
                continue

            try:
                niveau = int(niveau_raw)
            except ValueError:
                continue

            parent = None if parent_raw in ("-", "", None) else parent_raw
            label_en = row.get("Libellé anglais", "").strip() or None
            label_fr = row.get("Libellé français", "").strip() or None
            commentaires = row.get("Commentaires", "").strip() or None
            date_crea = parse_date(row.get("Création", ""))
            date_modif = parse_date(row.get("Modification", ""))
            date_inact = parse_date(row.get("Inactivation", ""))

            rows.append((code, parent, niveau, label_en, label_fr, commentaires, date_crea, date_modif, date_inact))

    if not rows:
        print("⚠️  Aucune ligne valide trouvée dans le CSV.")
        return 0

    cur = conn.cursor()

    print(f"📥  Import de {len(rows)} codes ATC…")

    # UPSERT par batch de 500
    batch_size = 500
    inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        psycopg2.extras.execute_values(cur, """
            INSERT INTO atc_codes
              (code, parent_code, niveau, label_en, label_fr, commentaires, date_creation, date_modification, date_inactivation)
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
        inserted += len(batch)
        print(f"   {inserted}/{len(rows)} codes insérés…", end="\r")

    conn.commit()
    print(f"\n✅  {len(rows)} codes ATC importés avec succès.")
    cur.close()
    return len(rows)

# ─── Auto-matching DCI → ATC ─────────────────────────────────────────────────

def auto_match_dci(conn, report: bool = False) -> None:
    """
    Pour chaque DCI unique de la nomenclature, tente de trouver un code ATC niveau 5.

    Stratégie de matching (par ordre de priorité) :
      1. Correspondance exacte sur le label français (normalisé)
      2. Correspondance exacte sur le label anglais (normalisé)
      3. La DCI normalisée commence par le label normalisé (pour gérer "paracétamol + codéine")
    """
    cur = conn.cursor()

    # Récupérer toutes les DCIs uniques de la nomenclature (UPPER TRIM)
    cur.execute("""
        SELECT DISTINCT UPPER(TRIM(dci)) AS dci
        FROM enregistrements
        WHERE dci IS NOT NULL AND TRIM(dci) <> ''
        ORDER BY 1
    """)
    nomenclature_dcis = [row[0] for row in cur.fetchall()]
    print(f"\n🔍  {len(nomenclature_dcis)} DCIs uniques dans la nomenclature.")

    # Récupérer tous les codes ATC de niveau 5 avec leurs labels
    cur.execute("""
        SELECT code, label_fr, label_en
        FROM atc_codes
        WHERE niveau = 5
          AND date_inactivation IS NULL
        ORDER BY code
    """)
    atc_level5 = cur.fetchall()
    print(f"💊  {len(atc_level5)} codes ATC niveau 5 disponibles.")

    # Construire les index de recherche
    # label_fr normalisé → code
    fr_index: dict[str, str] = {}
    en_index: dict[str, str] = {}
    for code, label_fr, label_en in atc_level5:
        if label_fr:
            key = normalize(label_fr)
            if key not in fr_index:
                fr_index[key] = code
        if label_en:
            key = normalize(label_en)
            if key not in en_index:
                en_index[key] = code

    matched = []
    no_match = []

    for dci in nomenclature_dcis:
        norm_dci = normalize(dci)
        code_found = None
        method = None

        # 1. Exact FR
        if norm_dci in fr_index:
            code_found = fr_index[norm_dci]
            method = "exact_fr"

        # 2. Exact EN
        elif norm_dci in en_index:
            code_found = en_index[norm_dci]
            method = "exact_en"

        # 3. Starts-with (DCI = "substance + autre chose" → on cherche "substance")
        # On tente avec les 40 premiers caractères minimum
        else:
            for fr_label, code in fr_index.items():
                if len(fr_label) >= 5 and norm_dci.startswith(fr_label):
                    code_found = code
                    method = "startswith_fr"
                    break
            if not code_found:
                for en_label, code in en_index.items():
                    if len(en_label) >= 5 and norm_dci.startswith(en_label):
                        code_found = code
                        method = "startswith_en"
                        break

        if code_found:
            matched.append((dci, code_found))
        else:
            no_match.append(dci)

    print(f"\n📊  Résultats du matching :")
    print(f"   ✅  {len(matched)} DCIs matchées")
    print(f"   ❌  {len(no_match)} DCIs sans correspondance ATC")

    if matched:
        # UPSERT dans dci_atc_mapping (ne pas écraser les entrées manuelles)
        psycopg2.extras.execute_values(cur, """
            INSERT INTO dci_atc_mapping (dci, code_atc, source)
            VALUES %s
            ON CONFLICT (dci) DO UPDATE SET
              code_atc = EXCLUDED.code_atc,
              source   = CASE
                           WHEN dci_atc_mapping.source = 'manual' THEN 'manual'
                           ELSE EXCLUDED.source
                         END
        """, [(dci, code, "auto") for dci, code in matched])
        conn.commit()
        print(f"   💾  {len(matched)} mappings enregistrés dans dci_atc_mapping.")

    if report:
        print(f"\n📋  DCIs sans correspondance ATC ({len(no_match)}) :")
        for dci in sorted(no_match):
            print(f"      - {dci}")

        # Exporter dans un fichier pour correction manuelle
        report_path = "data/dci_sans_atc.txt"
        os.makedirs("data", exist_ok=True)
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("# DCIs de la nomenclature algérienne sans correspondance ATC\n")
            f.write("# Format pour correction manuelle :\n")
            f.write("# DCI_NORMALISEE;CODE_ATC\n\n")
            for dci in sorted(no_match):
                f.write(f"{dci};\n")
        print(f"\n   📄  Rapport exporté dans : {report_path}")
        print(f"       Complétez les codes manquants puis relancez avec --manual-mapping {report_path}")

    cur.close()

# ─── Import manuel de corrections ────────────────────────────────────────────

def import_manual_mapping(mapping_path: str, conn) -> None:
    """
    Importe un fichier de mapping manuel DCI;CODE_ATC.
    Lignes commençant par # ignorées.
    Marque la source comme 'manual'.
    """
    rows = []
    with open(mapping_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(";")
            if len(parts) < 2:
                continue
            dci = parts[0].strip().upper()
            code = parts[1].strip().upper()
            if dci and code:
                rows.append((dci, code))

    if not rows:
        print("⚠️  Aucune ligne valide dans le fichier de mapping manuel.")
        return

    cur = conn.cursor()
    psycopg2.extras.execute_values(cur, """
        INSERT INTO dci_atc_mapping (dci, code_atc, source)
        VALUES %s
        ON CONFLICT (dci) DO UPDATE SET
          code_atc = EXCLUDED.code_atc,
          source   = 'manual'
    """, [(dci, code, "manual") for dci, code in rows])
    conn.commit()
    print(f"✅  {len(rows)} mappings manuels importés.")
    cur.close()

# ─── Point d'entrée ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Import de la classification ATC et matching DCI"
    )
    parser.add_argument("--atc", help="Chemin vers le fichier CSV ATC")
    parser.add_argument("--match", action="store_true", help="Lancer l'auto-matching DCI → ATC après l'import")
    parser.add_argument("--report", action="store_true", help="Afficher et exporter les DCIs sans correspondance")
    parser.add_argument("--manual-mapping", help="Fichier de mapping manuel DCI;CODE_ATC à importer")
    args = parser.parse_args()

    if not args.atc and not args.manual_mapping:
        parser.print_help()
        sys.exit(1)

    print("🔌  Connexion à la base de données…")
    try:
        conn = get_connection()
        print("✅  Connecté.")
    except Exception as e:
        print(f"❌  Impossible de se connecter : {e}")
        sys.exit(1)

    try:
        if args.atc:
            import_atc_codes(args.atc, conn)

        if args.match:
            auto_match_dci(conn, report=args.report)

        if args.manual_mapping:
            import_manual_mapping(args.manual_mapping, conn)

    finally:
        conn.close()
        print("\n🔒  Connexion fermée.")

if __name__ == "__main__":
    main()
