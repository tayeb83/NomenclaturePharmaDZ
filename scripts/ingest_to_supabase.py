#!/usr/bin/env python3
"""
Ingestion nomenclature MIPH (1 fichier multi-feuilles) → PostgreSQL.

Usage:
  DATABASE_URL=... python scripts/ingest_to_supabase.py \
    --current data/nomenclature_decembre_2025.xlsx \
    --previous data/nomenclature_aout_2025.xlsx
"""

import argparse
import os
import re
import sys
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2 import errors
from psycopg2.extras import execute_values

DATABASE_URL = os.environ.get("DATABASE_URL", "")
DEFAULT_DATA_DIR = Path(__file__).parent.parent / "data"


def log(msg, level="INFO"):
    colors = {"INFO": "\033[94m", "OK": "\033[92m", "WARN": "\033[93m", "ERROR": "\033[91m"}
    print(f"{colors.get(level, '')}[{level}] {msg}\033[0m")


def clean_str(val):
    if pd.isna(val):
        return None
    s = str(val).strip()
    return s if s else None


def clean_date(val):
    if pd.isna(val):
        return None
    try:
        return pd.to_datetime(val, dayfirst=True).date()
    except Exception:
        return None


def clean_n_enreg(val):
    s = clean_str(val)
    if not s:
        return None
    # Normaliser les espaces parasites qui existent dans certains exports MIPH
    return " ".join(s.split())


def parse_reference_date(label: str):
    months = {
        "janvier": 1, "fevrier": 2, "février": 2, "mars": 3, "avril": 4, "mai": 5,
        "juin": 6, "juillet": 7, "aout": 8, "août": 8, "septembre": 9, "octobre": 10,
        "novembre": 11, "decembre": 12, "décembre": 12,
    }
    text = label.lower()
    year_m = re.search(r"(20\d{2})", text)
    if not year_m:
        return None
    year = int(year_m.group(1))
    month = 12
    for name, m in months.items():
        if name in text:
            month = m
            break
    return pd.Timestamp(year=year, month=month, day=1).date()


def detect_sheet(workbook: pd.ExcelFile, needle: str):
    needle_upper = needle.upper()
    for name in workbook.sheet_names:
        if needle_upper in name.upper():
            return name
    raise ValueError(f"Feuille introuvable: {needle}")


def read_table(filepath: Path, sheet_name: str):
    raw = pd.read_excel(filepath, sheet_name=sheet_name, header=None)
    header_row = None
    for i, row in raw.iterrows():
        if any('ENREGISTREMENT' in str(v).upper() for v in row if pd.notna(v)):
            header_row = i
            break
    if header_row is None:
        raise ValueError(f"En-tête introuvable dans {filepath.name} / {sheet_name}")
    return pd.read_excel(filepath, sheet_name=sheet_name, header=header_row)


def parse_enregistrements(filepath: Path):
    wb = pd.ExcelFile(filepath)
    sheet = detect_sheet(wb, "Nomenclature")
    df = read_table(filepath, sheet)
    cols = list(df.columns)
    df = df[df[cols[1]].notna() & df[cols[3]].notna()]

    rows = []
    for _, r in df.iterrows():
        rows.append({
            "n_enreg": clean_n_enreg(r[cols[1]]),
            "code": clean_str(r[cols[2]]),
            "dci": clean_str(r[cols[3]]),
            "nom_marque": clean_str(r[cols[4]]),
            "forme": clean_str(r[cols[5]]),
            "dosage": clean_str(r[cols[6]]),
            "conditionnement": clean_str(r[cols[7]]),
            "liste": clean_str(r[cols[8]]),
            "prescription": clean_str(r[cols[9]]),
            "obs": clean_str(r[cols[11]] if len(cols) > 11 else None),
            "labo": clean_str(r[cols[12]] if len(cols) > 12 else None),
            "pays": clean_str(r[cols[13]] if len(cols) > 13 else None),
            "date_init": clean_date(r[cols[14]] if len(cols) > 14 else None),
            "date_final": clean_date(r[cols[15]] if len(cols) > 15 else None),
            "type_prod": clean_str(r[cols[16]] if len(cols) > 16 else None),
            "statut": clean_str(r[cols[17]] if len(cols) > 17 else None),
            "stabilite": clean_str(r[cols[18]] if len(cols) > 18 else None),
        })
    return rows, sheet


def parse_non_renouveles(filepath: Path):
    wb = pd.ExcelFile(filepath)
    sheet = detect_sheet(wb, "Non Renouvel")
    df = read_table(filepath, sheet)
    cols = list(df.columns)
    df = df[df[cols[1]].notna() & df[cols[3]].notna()]

    rows = []
    for _, r in df.iterrows():
        rows.append((
            clean_n_enreg(r[cols[1]]), clean_str(r[cols[2]]), clean_str(r[cols[3]]), clean_str(r[cols[4]]),
            clean_str(r[cols[5]]), clean_str(r[cols[6]]), clean_str(r[cols[7]]), clean_str(r[cols[8]]),
            clean_str(r[cols[9]]), clean_str(r[cols[11]] if len(cols) > 11 else None), clean_str(r[cols[12]] if len(cols) > 12 else None),
            clean_date(r[cols[13]] if len(cols) > 13 else None), clean_date(r[cols[14]] if len(cols) > 14 else None),
            clean_str(r[cols[15]] if len(cols) > 15 else None), clean_str(r[cols[16]] if len(cols) > 16 else None),
        ))
    return rows


def parse_retraits(filepath: Path):
    wb = pd.ExcelFile(filepath)
    sheet = detect_sheet(wb, "Retraits")
    df = read_table(filepath, sheet)
    cols = list(df.columns)
    df = df[df[cols[1]].notna() & df[cols[3]].notna()]

    rows = []
    for _, r in df.iterrows():
        rows.append((
            clean_n_enreg(r[cols[1]]), clean_str(r[cols[2]]), clean_str(r[cols[3]]), clean_str(r[cols[4]]),
            clean_str(r[cols[5]]), clean_str(r[cols[6]]), clean_str(r[cols[7]]), clean_str(r[cols[8]]),
            clean_str(r[cols[9]]), clean_str(r[cols[11]]), clean_str(r[cols[12]]),
            clean_date(r[cols[13]]), clean_str(r[cols[14]]), clean_str(r[cols[15]]),
            clean_date(r[cols[16]]), clean_str(r[cols[17]] if len(cols) > 17 else None),
        ))
    return rows


def identity_key(r: dict):
    if r["n_enreg"]:
        return f"N::{r['n_enreg']}"
    return f"F::{r['code']}::{r['dci']}::{r['nom_marque']}::{r['dosage']}"


def infer_version_from_filename(filepath: Path):
    base = filepath.stem.replace('_', ' ').replace('-', ' ')
    m = re.search(r"(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)\s*(20\d{2})", base, re.I)
    if m:
        return f"{m.group(1).capitalize()} {m.group(2)}"
    year = re.search(r"(20\d{2})", base)
    return year.group(1) if year else base


def ensure_schema_compatibility(cur):
    """
    Rend l'ingestion robuste face aux anciens schémas Supabase
    (colonnes historiques en VARCHAR(50), etc.).
    """
    columns_to_widen = {
        "enregistrements": [
            "n_enreg", "dci", "nom_marque", "forme", "dosage", "conditionnement", "obs", "labo",
        ],
        "retraits": [
            "n_enreg", "dci", "nom_marque", "forme", "dosage", "conditionnement", "prescription", "labo", "motif_retrait",
        ],
        "non_renouveles": [
            "n_enreg", "dci", "nom_marque", "forme", "dosage", "conditionnement", "prescription", "obs", "labo",
        ],
    }

    for table, columns in columns_to_widen.items():
        for column in columns:
            savepoint = f"schema_compat_{table}_{column}"
            cur.execute(f'SAVEPOINT "{savepoint}"')
            try:
                cur.execute(f'ALTER TABLE IF EXISTS "{table}" ALTER COLUMN "{column}" TYPE TEXT')
            except errors.FeatureNotSupported as exc:
                # Colonnes parfois référencées par des vues historiques (ex: v_stats)
                # -> on garde le type existant et on poursuit l'ingestion.
                cur.execute(f'ROLLBACK TO SAVEPOINT "{savepoint}"')
                log(
                    f"Compat schéma ignorée pour {table}.{column}: {exc.pgerror.strip() if exc.pgerror else exc}",
                    "WARN",
                )
            finally:
                cur.execute(f'RELEASE SAVEPOINT "{savepoint}"')


def ingest(conn, current_file: Path, previous_file: Path | None, current_label: str, previous_label: str | None):
    cur = conn.cursor()
    ensure_schema_compatibility(cur)

    current_rows, sheet_name = parse_enregistrements(current_file)
    prev_rows = parse_enregistrements(previous_file)[0] if previous_file else []

    prev_keys = {identity_key(r) for r in prev_rows}
    enreg_payload = []
    current_year = parse_reference_date(current_label).year if parse_reference_date(current_label) else None

    for r in current_rows:
        enreg_payload.append((
            r["n_enreg"], r["code"], r["dci"], r["nom_marque"], r["forme"], r["dosage"], r["conditionnement"],
            r["liste"], r["prescription"], r["obs"], r["labo"], r["pays"], r["date_init"], r["date_final"],
            r["type_prod"], r["statut"], r["stabilite"], current_year, current_label,
            identity_key(r) not in prev_keys,
        ))

    retraits = parse_retraits(current_file)
    non_renouveles = parse_non_renouveles(current_file)

    n_enreg_lengths = [len(r["n_enreg"]) for r in current_rows if r.get("n_enreg")]
    if n_enreg_lengths:
        log(f"Longueur max n_enreg détectée: {max(n_enreg_lengths)}")

    cur.execute("TRUNCATE TABLE enregistrements RESTART IDENTITY CASCADE")
    execute_values(cur, """
      INSERT INTO enregistrements
      (n_enreg, code, dci, nom_marque, forme, dosage, conditionnement, liste,
       prescription, obs, labo, pays, date_init, date_final, type_prod, statut,
       stabilite, annee, source_version, is_new_vs_previous)
      VALUES %s
    """, enreg_payload)

    cur.execute("TRUNCATE TABLE retraits RESTART IDENTITY CASCADE")
    execute_values(cur, """
      INSERT INTO retraits
      (n_enreg, code, dci, nom_marque, forme, dosage, conditionnement, liste,
       prescription, labo, pays, date_init, type_prod, statut, date_retrait, motif_retrait)
      VALUES %s
    """, retraits)

    cur.execute("TRUNCATE TABLE non_renouveles RESTART IDENTITY CASCADE")
    execute_values(cur, """
      INSERT INTO non_renouveles
      (n_enreg, code, dci, nom_marque, forme, dosage, conditionnement, liste,
       prescription, labo, pays, date_init, date_final, type_prod, statut)
      VALUES %s
    """, non_renouveles)

    cur.execute("TRUNCATE TABLE nomenclature_versions RESTART IDENTITY CASCADE")
    cur.execute(
        """
        INSERT INTO nomenclature_versions
          (version_label, reference_date, previous_label, total_enregistrements, total_nouveautes)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            current_label,
            parse_reference_date(current_label),
            previous_label,
            len(enreg_payload),
            sum(1 for row in enreg_payload if row[-1]),
        ),
    )

    conn.commit()
    cur.close()
    log(f"Feuille active détectée: {sheet_name}")
    log(f"Enregistrements: {len(enreg_payload)}", "OK")
    log(f"Nouveautés vs précédente: {sum(1 for row in enreg_payload if row[-1])}", "OK")
    log(f"Retraits: {len(retraits)}", "OK")
    log(f"Non renouvelés: {len(non_renouveles)}", "OK")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--current", type=Path, help="Fichier nomenclature courant (.xlsx)")
    parser.add_argument("--previous", type=Path, default=None, help="Fichier nomenclature précédent (.xlsx)")
    parser.add_argument("--current-label", type=str, default=None, help="Libellé version courante (ex: Décembre 2025)")
    parser.add_argument("--previous-label", type=str, default=None, help="Libellé version précédente")
    args = parser.parse_args()

    if args.current is None:
        candidates = sorted(DEFAULT_DATA_DIR.glob("*.xlsx"))
        if not candidates:
            raise SystemExit("Aucun .xlsx trouvé dans data/. Passe --current")
        args.current = candidates[-1]
    if args.current_label is None:
        args.current_label = infer_version_from_filename(args.current)
    if args.previous and args.previous_label is None:
        args.previous_label = infer_version_from_filename(args.previous)
    return args


if __name__ == "__main__":
    if not DATABASE_URL:
        log("DATABASE_URL manquante", "ERROR")
        sys.exit(1)

    args = parse_args()
    if not args.current.exists():
        log(f"Fichier introuvable: {args.current}", "ERROR")
        sys.exit(1)
    if args.previous and not args.previous.exists():
        log(f"Fichier introuvable: {args.previous}", "ERROR")
        sys.exit(1)

    conn = psycopg2.connect(DATABASE_URL)
    try:
        ingest(conn, args.current, args.previous, args.current_label, args.previous_label)
        log("Ingestion terminée", "OK")
    finally:
        conn.close()
