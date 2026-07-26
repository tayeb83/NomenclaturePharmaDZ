#!/usr/bin/env python3
"""
Import du mapping médicaments critiques ↔ base de données pharmaceutique
dans la table critical_mapping.

Usage:
    python scripts/import_critical_mapping.py mapping.tsv
    python scripts/import_critical_mapping.py mapping.csv --sep ","
    python scripts/import_critical_mapping.py mapping.xlsx

Prérequis:
    pip install psycopg2-binary pandas openpyxl
    Variables d'environnement : DATABASE_URL ou PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE
"""

import sys
import os
import argparse
import math
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch

# ─── Colonnes attendues (noms normalisés) ────────────────────────────────────

COLUMN_MAP = {
    # TSV header → nom interne
    'N° critique':           'n_critique',
    'Classe thérapeutique':  'classe_therapeutique',
    'DCI critique':          'dci_critique',
    'Forme critique':        'forme_critique',
    'Dosage critique':       'dosage_critique',
    'Statut match':          'statut_match',
    'Score global':          'score_global',
    'Score DCI':             'score_dci',
    'Score forme':           'score_forme',
    'Score dosage':          'score_dosage',
    'Source base':           'source_base',
    'N° base':               'n_base',
    'Code base':             'code_base',
    'N° enregistrement':     'n_enregistrement',
    'DCI base':              'dci_base',
    'Marque':                'marque',
    'Forme base':            'forme_base',
    'Dosage base':           'dosage_base',
    'Conditionnement':       'conditionnement',
}

def clean(val):
    """Retourne None si NaN/vide, sinon la valeur en string."""
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    s = str(val).strip()
    return s if s else None

def to_int(val):
    v = clean(val)
    if v is None:
        return None
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return None

def load_file(path: str, sep: str = '\t') -> pd.DataFrame:
    ext = os.path.splitext(path)[1].lower()
    if ext in ('.xlsx', '.xls'):
        df = pd.read_excel(path, dtype=str)
    elif ext == '.csv':
        df = pd.read_csv(path, sep=sep, dtype=str)
    else:
        df = pd.read_csv(path, sep='\t', dtype=str)
    return df

def get_connection():
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        return psycopg2.connect(db_url)
    return psycopg2.connect(
        host=os.environ.get('PGHOST', 'localhost'),
        port=int(os.environ.get('PGPORT', 5432)),
        user=os.environ.get('PGUSER', 'postgres'),
        password=os.environ.get('PGPASSWORD', ''),
        dbname=os.environ.get('PGDATABASE', 'pharma'),
    )

def main():
    parser = argparse.ArgumentParser(description='Import mapping médicaments critiques')
    parser.add_argument('file', help='Fichier TSV, CSV ou Excel')
    parser.add_argument('--sep', default='\t', help='Séparateur CSV (défaut: tabulation)')
    parser.add_argument('--truncate', action='store_true',
                        help='Vider la table avant import (remplacement complet)')
    args = parser.parse_args()

    print(f'📂 Chargement : {args.file}')
    df = load_file(args.file, sep=args.sep)

    # Renommer les colonnes
    df = df.rename(columns={k: v for k, v in COLUMN_MAP.items() if k in df.columns})

    required = ['dci_critique']
    for col in required:
        if col not in df.columns:
            sys.exit(f'❌ Colonne manquante : {col}')

    print(f'📊 {len(df)} lignes lues')

    rows = []
    for _, r in df.iterrows():
        rows.append({
            'n_critique':         to_int(r.get('n_critique')),
            'classe_therapeutique': clean(r.get('classe_therapeutique')),
            'dci_critique':       clean(r.get('dci_critique')) or '',
            'forme_critique':     clean(r.get('forme_critique')),
            'dosage_critique':    clean(r.get('dosage_critique')),
            'statut_match':       clean(r.get('statut_match')),
            'score_global':       to_int(r.get('score_global')),
            'score_dci':          to_int(r.get('score_dci')),
            'score_forme':        to_int(r.get('score_forme')),
            'score_dosage':       to_int(r.get('score_dosage')),
            'source_base':        clean(r.get('source_base')),
            'n_base':             to_int(r.get('n_base')),
            'code_base':          clean(r.get('code_base')),
            'n_enregistrement':   clean(r.get('n_enregistrement')),
            'dci_base':           clean(r.get('dci_base')),
            'marque':             clean(r.get('marque')),
            'forme_base':         clean(r.get('forme_base')),
            'dosage_base':        clean(r.get('dosage_base')),
            'conditionnement':    clean(r.get('conditionnement')),
        })

    INSERT_SQL = """
        INSERT INTO critical_mapping (
            n_critique, classe_therapeutique, dci_critique,
            forme_critique, dosage_critique,
            statut_match, score_global, score_dci, score_forme, score_dosage,
            source_base, n_base, code_base, n_enregistrement,
            dci_base, marque, forme_base, dosage_base, conditionnement
        ) VALUES (
            %(n_critique)s, %(classe_therapeutique)s, %(dci_critique)s,
            %(forme_critique)s, %(dosage_critique)s,
            %(statut_match)s, %(score_global)s, %(score_dci)s, %(score_forme)s, %(score_dosage)s,
            %(source_base)s, %(n_base)s, %(code_base)s, %(n_enregistrement)s,
            %(dci_base)s, %(marque)s, %(forme_base)s, %(dosage_base)s, %(conditionnement)s
        )
    """

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                if args.truncate:
                    cur.execute('TRUNCATE TABLE critical_mapping')
                    print('🗑️  Table vidée')
                execute_batch(cur, INSERT_SQL, rows, page_size=500)
        print(f'✅ {len(rows)} lignes importées dans critical_mapping')
    finally:
        conn.close()

if __name__ == '__main__':
    main()
