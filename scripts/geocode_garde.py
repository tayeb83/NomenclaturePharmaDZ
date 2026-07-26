#!/usr/bin/env python3
"""Geocode automatiquement les pharmacies de garde (n'importe quelle wilaya)
qui n'ont pas encore de coordonnees (geocode_status = 'none'), via l'API
Nominatim (OpenStreetMap) — gratuite, sans cle.

Un resultat n'est accepte que s'il obtient un score de confiance
("importance") suffisant ; sinon la pharmacie reste a geocoder
manuellement via /admin/garde (le géocodage automatique de rues
informelles — cites, quartiers — echoue souvent en dehors des grandes
villes algeriennes).

Usage:
  python scripts/geocode_garde.py                  # toutes les wilayas
  python scripts/geocode_garde.py --wilaya 20       # une seule wilaya
  python scripts/geocode_garde.py --limit 50        # limiter le lot
"""

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request

import psycopg2
import psycopg2.extras

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Nominatim exige un User-Agent identifiant l'appli (politique d'usage) :
# https://operations.osmfoundation.org/policies/nominatim/
USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "DwaDZ-Garde-Geocoder/1.0 (+https://dzair-pharma.net)")
MIN_IMPORTANCE = 0.25


def geocode(search_terms):
    params = {
        "q": search_terms,
        "format": "jsonv2",
        "addressdetails": 1,
        "countrycodes": "dz",
        "limit": 1,
    }
    url = NOMINATIM_URL + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=10) as resp:
        results = json.loads(resp.read().decode("utf-8"))

    if not results:
        return None

    top = results[0]
    importance = float(top.get("importance", 0))
    if importance < MIN_IMPORTANCE:
        return None

    return {"lat": float(top["lat"]), "lng": float(top["lon"]), "importance": importance}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--wilaya", default=None, help="Ne traiter qu'une wilaya (code, ex: 20)")
    parser.add_argument("--limit", type=int, default=None, help="Nombre maximum de pharmacies a traiter")
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL manquant", file=sys.stderr)
        return 1

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            sql = "SELECT id, wilaya_code, commune_name_fr, name_fr, address_fr FROM garde_pharmacies WHERE geocode_status = 'none'"
            params = []
            if args.wilaya:
                sql += " AND wilaya_code = %s"
                params.append(args.wilaya)
            sql += " ORDER BY id"
            if args.limit:
                sql += " LIMIT %s"
                params.append(args.limit)
            cur.execute(sql, params)
            rows = cur.fetchall()

        if not rows:
            print("Aucune pharmacie a geocoder.")
            return 0

        geocoded = 0
        skipped = 0
        for i, row in enumerate(rows):
            search_terms = ", ".join(filter(None, [row["address_fr"], row["commune_name_fr"], "Algerie"]))
            print(f"[{i + 1}/{len(rows)}] {row['name_fr']} — {search_terms}")

            try:
                result = geocode(search_terms)
            except Exception as exc:
                print(f"  ! erreur reseau: {exc}", file=sys.stderr)
                result = None

            if result:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE garde_pharmacies
                        SET lat = %s, lng = %s, geocode_status = 'auto_geocoded', updated_at = NOW()
                        WHERE id = %s
                        """,
                        (result["lat"], result["lng"], row["id"]),
                    )
                conn.commit()
                geocoded += 1
                print(f"  -> geocodee (confiance {result['importance']:.2f})")
            else:
                skipped += 1
                print("  -> aucun resultat fiable, a pointer manuellement via /admin/garde")

            time.sleep(1)  # politique d'usage Nominatim : 1 requete / seconde max

        print(f"\nTermine : {geocoded} geocodee(s) automatiquement, {skipped} a traiter manuellement.")
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
