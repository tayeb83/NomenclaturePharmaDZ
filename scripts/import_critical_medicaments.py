#!/usr/bin/env python3
"""Importe une liste CSV de médicaments critiques vers PostgreSQL.

Colonnes attendues (insensibles à la casse, accents tolérés):
- dci
- forme
- dosage
- classe_therapeutique (optionnelle)

Exemple:
  python scripts/import_critical_medicaments.py --csv data/critical_medicaments.csv
"""

import argparse
import csv
import os
import re
import sys
import unicodedata
from typing import Dict, Iterable, List, Optional

import psycopg2


def normalize_header(value: str) -> str:
    value = unicodedata.normalize('NFKD', value or '')
    value = ''.join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r'[^a-z0-9]+', '_', value.lower()).strip('_')


def pick(row: Dict[str, str], *keys: str) -> str:
    for key in keys:
        if key in row and str(row[key]).strip():
            return str(row[key]).strip()
    return ''


def iter_rows(path: str) -> Iterable[Dict[str, str]]:
    with open(path, 'r', encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            return
        header_map = {h: normalize_header(h) for h in reader.fieldnames}
        for raw in reader:
            row: Dict[str, str] = {}
            for original, norm in header_map.items():
                row[norm] = (raw.get(original) or '').strip()
            yield row


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv', required=True, help='Chemin du fichier CSV à importer')
    parser.add_argument('--source-label', default='Ministère de la Santé Algérie')
    parser.add_argument('--published-at', default=None, help='Date ISO ex: 2026-03-24')
    args = parser.parse_args()

    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print('DATABASE_URL manquant', file=sys.stderr)
        return 1

    rows: List[tuple] = []
    skipped = 0
    for row in iter_rows(args.csv):
        dci = pick(row, 'dci', 'denomination_commune_internationale')
        forme = pick(row, 'forme', 'forme_pharmaceutique')
        dosage = pick(row, 'dosage')
        classe = pick(row, 'classe_therapeutique', 'classe_therapeutique_')
        if not dci or not forme or not dosage:
            skipped += 1
            continue
        rows.append((dci, forme, dosage, classe or None, args.source_label, args.published_at))

    if not rows:
        print('Aucune ligne valide à importer.')
        return 1

    conn = psycopg2.connect(db_url)
    try:
        with conn:
            with conn.cursor() as cur:
                cur.executemany(
                    """
                    INSERT INTO critical_medicaments (dci, forme, dosage, classe_therapeutique, source_label, published_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (dci_norm, forme_norm, dosage_norm)
                    DO UPDATE SET
                      classe_therapeutique = EXCLUDED.classe_therapeutique,
                      source_label = EXCLUDED.source_label,
                      published_at = COALESCE(EXCLUDED.published_at, critical_medicaments.published_at)
                    """,
                    rows,
                )
        print(f'Import terminé: {len(rows)} ligne(s), {skipped} ignorée(s).')
    finally:
        conn.close()

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
