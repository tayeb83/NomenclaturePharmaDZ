#!/usr/bin/env python3
"""
PharmaVeille DZ — Script d'ingestion Excel → PostgreSQL (Supabase)
Usage: python scripts/ingest_to_supabase.py

Variables d'environnement requises:
  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
  ou
  SUPABASE_URL=https://[PROJECT].supabase.co
  SUPABASE_SERVICE_KEY=eyJ...
"""

import os
import sys
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from pathlib import Path
from datetime import datetime

# ─── CONFIG ──────────────────────────────────────────────────
XLSX_DIR = Path(__file__).parent.parent / "data"  # Mettre tes XLSX ici
DATABASE_URL = os.environ.get("DATABASE_URL", "")

FILES = {
    "2024": XLSX_DIR / "2024.xlsx",
    "2025": XLSX_DIR / "2025.xlsx",
    "retraits": XLSX_DIR / "nomenclature-retrait.xlsx",
    "non_renouveles": XLSX_DIR / "nomenclature-non-renouveles.xlsx",
}

# ─── HELPERS ──────────────────────────────────────────────────
def clean_str(val):
    if pd.isna(val): return None
    s = str(val).strip()
    return s if s else None

def clean_date(val):
    if pd.isna(val): return None
    try:
        return pd.to_datetime(val).date()
    except:
        return None

def clean_int(val):
    if pd.isna(val): return None
    try: return int(val)
    except: return None

def log(msg, level="INFO"):
    colors = {"INFO": "\033[94m", "OK": "\033[92m", "WARN": "\033[93m", "ERROR": "\033[91m"}
    reset = "\033[0m"
    print(f"{colors.get(level, '')}[{level}] {msg}{reset}")

# ─── LECTURE ENREGISTREMENTS ──────────────────────────────────
def read_enregistrements(filepath, annee):
    df = pd.read_excel(filepath, header=None)
    # Trouver la ligne d'en-tête (contient 'N°ENREGISTREMENT')
    header_row = None
    for i, row in df.iterrows():
        if any('ENREGISTREMENT' in str(v).upper() for v in row if pd.notna(v)):
            header_row = i
            break
    if header_row is None:
        raise ValueError(f"En-tête introuvable dans {filepath}")

    df = pd.read_excel(filepath, header=header_row)
    # Renommer colonnes
    col_map = {
        df.columns[0]: 'num',
        df.columns[1]: 'n_enreg',
        df.columns[2]: 'code',
        df.columns[3]: 'dci',
        df.columns[4]: 'nom_marque',
        df.columns[5]: 'forme',
        df.columns[6]: 'dosage',
        df.columns[7]: 'conditionnement',
        df.columns[8]: 'liste',
        df.columns[9]: 'prescription',
        df.columns[10]: 'obs',
        df.columns[11]: 'labo',
        df.columns[12]: 'pays',
        df.columns[13]: 'date_init',
        df.columns[14]: 'date_final',
        df.columns[15]: 'type_prod',
        df.columns[16]: 'statut',
    }
    if len(df.columns) > 17:
        col_map[df.columns[17]] = 'stabilite'
    if len(df.columns) > 18:
        col_map[df.columns[18]] = 'obs2'
    df = df.rename(columns=col_map)
    df = df[df['n_enreg'].notna() & df['dci'].notna()]

    rows = []
    for _, r in df.iterrows():
        n_enreg = clean_str(r.get('n_enreg'))
        if not n_enreg: continue
        # Gérer P1/P2 et OBS imbriqués (format variable selon le fichier)
        p1 = clean_str(r.get('prescription'))
        obs = clean_str(r.get('obs'))
        labo_val = clean_str(r.get('labo'))
        pays_val = clean_str(r.get('pays'))
        # Si labo = 'OFF' c'est une valeur de P2, décaler
        if labo_val == 'OFF' or labo_val == 'HOP':
            obs = labo_val
            labo_val = pays_val
            pays_val = clean_str(r.get('date_init') if 'date_init' in r else None)

        rows.append((
            n_enreg,
            clean_str(r.get('code')),
            clean_str(r.get('dci')),
            clean_str(r.get('nom_marque')),
            clean_str(r.get('forme')),
            clean_str(r.get('dosage')),
            clean_str(r.get('conditionnement')),
            clean_str(r.get('liste')),
            p1, obs,
            clean_str(r.get('labo')),
            clean_str(r.get('pays')),
            clean_date(r.get('date_init')),
            clean_date(r.get('date_final')),
            clean_str(r.get('type_prod')),
            clean_str(r.get('statut')),
            clean_str(r.get('stabilite')),
            annee,
        ))
    return rows

# ─── LECTURE RETRAITS ─────────────────────────────────────────
def read_retraits(filepath):
    df = pd.read_excel(filepath, header=None)
    header_row = None
    for i, row in df.iterrows():
        if any('ENREGISTREMENT' in str(v).upper() for v in row if pd.notna(v)):
            header_row = i
            break
    df = pd.read_excel(filepath, header=header_row)
    cols = list(df.columns)
    df = df[df[cols[1]].notna() & df[cols[3]].notna()]

    rows = []
    for _, r in df.iterrows():
        rows.append((
            clean_str(r[cols[1]]),   # n_enreg
            clean_str(r[cols[2]]),   # code
            clean_str(r[cols[3]]),   # dci
            clean_str(r[cols[4]]),   # nom_marque
            clean_str(r[cols[5]]),   # forme
            clean_str(r[cols[6]]),   # dosage
            clean_str(r[cols[7]]),   # conditionnement
            clean_str(r[cols[8]]),   # liste
            clean_str(r[cols[9]]),   # prescription
            clean_str(r[cols[11]]),  # labo
            clean_str(r[cols[12]]),  # pays
            clean_date(r[cols[13]]), # date_init
            clean_str(r[cols[14]]),  # type_prod
            clean_str(r[cols[15]]),  # statut
            clean_date(r[cols[16]]), # date_retrait
            clean_str(r[cols[17]]),  # motif_retrait
        ))
    return rows

# ─── LECTURE NON RENOUVELÉS ───────────────────────────────────
def read_non_renouveles(filepath):
    df = pd.read_excel(filepath, header=None)
    header_row = None
    for i, row in df.iterrows():
        if any('ENREGISTREMENT' in str(v).upper() for v in row if pd.notna(v)):
            header_row = i
            break
    df = pd.read_excel(filepath, header=header_row)
    cols = list(df.columns)
    df = df[df[cols[1]].notna() & df[cols[3]].notna()]

    rows = []
    for _, r in df.iterrows():
        rows.append((
            clean_str(r[cols[1]]),
            clean_str(r[cols[2]]),
            clean_str(r[cols[3]]),
            clean_str(r[cols[4]]),
            clean_str(r[cols[5]]),
            clean_str(r[cols[6]]),
            clean_str(r[cols[7]]),
            clean_str(r[cols[8]]),
            clean_str(r[cols[9]]),
            clean_str(r[cols[11]]),
            clean_str(r[cols[12]]),
            clean_date(r[cols[13]]),
            clean_date(r[cols[14]]) if len(cols) > 14 else None,
            clean_str(r[cols[15]]) if len(cols) > 15 else None,
            clean_str(r[cols[16]]) if len(cols) > 16 else None,
        ))
    return rows

# ─── INGESTION ────────────────────────────────────────────────
def ingest(conn):
    cur = conn.cursor()

    # Enregistrements 2024 + 2025
    log("Lecture enregistrements 2024...")
    rows_2024 = read_enregistrements(FILES["2024"], 2024)
    log(f"  → {len(rows_2024)} lignes")

    log("Lecture enregistrements 2025...")
    rows_2025 = read_enregistrements(FILES["2025"], 2025)
    log(f"  → {len(rows_2025)} lignes")

    all_enreg = rows_2024 + rows_2025
    # Dédoublonner sur n_enreg (certains n° apparaissent deux fois dans les XLSX)
    seen = set()
    deduped = []
    for row in all_enreg:
        key = row[0]  # n_enreg
        if key and key not in seen:
            seen.add(key)
            deduped.append(row)
    log(f"Insertion enregistrements ({len(deduped)} uniques, {len(all_enreg)-len(deduped)} doublons ignorés)...")
    cur.execute("TRUNCATE TABLE enregistrements RESTART IDENTITY CASCADE")
    execute_values(cur, """
        INSERT INTO enregistrements
          (n_enreg, code, dci, nom_marque, forme, dosage, conditionnement, liste,
           prescription, obs, labo, pays, date_init, date_final, type_prod, statut, stabilite, annee)
        VALUES %s
    """, deduped)
    log(f"  ✓ enregistrements insérés", "OK")

    # Retraits
    log("Lecture retraits...")
    rows_r = read_retraits(FILES["retraits"])
    log(f"  → {len(rows_r)} lignes")
    cur.execute("TRUNCATE TABLE retraits RESTART IDENTITY CASCADE")
    execute_values(cur, """
        INSERT INTO retraits
          (n_enreg, code, dci, nom_marque, forme, dosage, conditionnement, liste,
           prescription, labo, pays, date_init, type_prod, statut, date_retrait, motif_retrait)
        VALUES %s
    """, rows_r)
    log(f"  ✓ retraits insérés", "OK")

    # Non renouvelés
    log("Lecture non renouvelés...")
    rows_nr = read_non_renouveles(FILES["non_renouveles"])
    log(f"  → {len(rows_nr)} lignes")
    cur.execute("TRUNCATE TABLE non_renouveles RESTART IDENTITY CASCADE")
    execute_values(cur, """
        INSERT INTO non_renouveles
          (n_enreg, code, dci, nom_marque, forme, dosage, conditionnement, liste,
           prescription, labo, pays, date_init, date_final, type_prod, statut)
        VALUES %s
    """, rows_nr)
    log(f"  ✓ non_renouveles insérés", "OK")

    conn.commit()
    cur.close()
    log("Ingestion terminée avec succès !", "OK")

# ─── MAIN ─────────────────────────────────────────────────────
if __name__ == "__main__":
    if not DATABASE_URL:
        log("DATABASE_URL manquante !", "ERROR")
        log("Exemple: export DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres", "WARN")
        sys.exit(1)

    for name, path in FILES.items():
        if not path.exists():
            log(f"Fichier manquant: {path}", "ERROR")
            log(f"Place tes fichiers XLSX dans le dossier 'data/'", "WARN")
            sys.exit(1)

    log("Connexion à PostgreSQL...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        log("Connecté !", "OK")
        ingest(conn)
        conn.close()
    except Exception as e:
        log(f"Erreur: {e}", "ERROR")
        sys.exit(1)
