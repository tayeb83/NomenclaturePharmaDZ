#!/usr/bin/env python3
"""Importe un fichier JSON de pharmacies de garde (format garde_officines) vers PostgreSQL.

Le fichier attendu est celui produit par le pipeline d'extraction
(photo du document DSP -> vision-LLM -> JSON), avec les clés
meta / pharmacies / duty_periods. Voir sql/08_garde_officines.sql
pour le schéma cible.

L'import est idempotent : rejouer le même fichier met simplement à jour
les lignes existantes (upsert par clé naturelle), il ne duplique rien.

Exemple:
  python scripts/import_garde.py --json data/garde_saida_202607.json
"""

import argparse
import json
import os
import sys
from typing import Any, Dict, List

import psycopg2


def upsert_pharmacies(cur, pharmacies: List[Dict[str, Any]], meta: Dict[str, Any]) -> Dict[str, int]:
    external_id_to_pk: Dict[str, int] = {}

    for p in pharmacies:
        # Les pipelines d'extraction ne sont pas tous alignes sur les memes
        # cles pour la commune (ex: "commune" pour Saida vs "commune_name_fr"
        # / "commune_code" pour Oran) : on essaie les variantes connues avant
        # de retomber sur le commune du roster (meta), qui est toujours fiable
        # puisqu un fichier garde_officines ne couvre qu une seule commune.
        commune_name_fr = p.get("commune_name_fr") or p.get("commune") or meta["commune_name_fr"]
        commune_code = p.get("commune_code") or meta["commune_code"]

        cur.execute(
            """
            INSERT INTO garde_pharmacies (
              external_id, wilaya_code, type, name_fr, name_ar, name_fr_confidence,
              commune_code, commune_name_fr, commune_name_ar,
              address_fr, address_ar, phone_raw, phone_e164,
              lat, lng, geocode_status, review_flags, updated_at
            )
            VALUES (
              %(external_id)s, %(wilaya_code)s, %(type)s, %(name_fr)s, %(name_ar)s, %(name_fr_confidence)s,
              %(commune_code)s, %(commune_name_fr)s, %(commune_name_ar)s,
              %(address_fr)s, %(address_ar)s, %(phone_raw)s, %(phone_e164)s,
              %(lat)s, %(lng)s, %(geocode_status)s, %(review_flags)s, NOW()
            )
            ON CONFLICT (wilaya_code, external_id) DO UPDATE SET
              type = EXCLUDED.type,
              name_fr = EXCLUDED.name_fr,
              name_ar = EXCLUDED.name_ar,
              name_fr_confidence = EXCLUDED.name_fr_confidence,
              commune_code = EXCLUDED.commune_code,
              commune_name_fr = EXCLUDED.commune_name_fr,
              commune_name_ar = EXCLUDED.commune_name_ar,
              address_fr = EXCLUDED.address_fr,
              address_ar = EXCLUDED.address_ar,
              phone_raw = EXCLUDED.phone_raw,
              phone_e164 = EXCLUDED.phone_e164,
              lat = EXCLUDED.lat,
              lng = EXCLUDED.lng,
              geocode_status = EXCLUDED.geocode_status,
              review_flags = EXCLUDED.review_flags,
              updated_at = NOW()
            RETURNING id
            """,
            {
                "external_id": p["id"],
                "wilaya_code": p["wilaya_code"],
                "type": p.get("type") or "officine",
                "name_fr": p["name_fr"],
                "name_ar": p.get("name_ar"),
                "name_fr_confidence": p.get("name_fr_confidence"),
                "commune_code": commune_code,
                "commune_name_fr": commune_name_fr,
                "commune_name_ar": p.get("commune_ar"),
                "address_fr": p.get("address_fr"),
                "address_ar": p.get("address_ar"),
                "phone_raw": p.get("phone_raw"),
                "phone_e164": p.get("phone_e164"),
                "lat": (p.get("location") or {}).get("lat") if p.get("location") else None,
                "lng": (p.get("location") or {}).get("lng") if p.get("location") else None,
                "geocode_status": p.get("geocode_status") or "none",
                "review_flags": json.dumps(p.get("review_flags") or []),
            },
        )
        pk = cur.fetchone()[0]
        external_id_to_pk[p["id"]] = pk

    return external_id_to_pk


def upsert_roster(cur, meta: Dict[str, Any], raw_payload: Dict[str, Any]) -> int:
    cur.execute(
        """
        INSERT INTO garde_rosters (
          wilaya_code, wilaya_name_fr, wilaya_name_ar,
          commune_code, commune_name_fr, commune_name_ar,
          period_from, period_to, timezone,
          issuer_fr, issuer_ar,
          source_channel, source_page, document_type, extraction_method, extracted_at,
          review_status, schema_version, raw_payload, imported_at
        )
        VALUES (
          %(wilaya_code)s, %(wilaya_name_fr)s, %(wilaya_name_ar)s,
          %(commune_code)s, %(commune_name_fr)s, %(commune_name_ar)s,
          %(period_from)s, %(period_to)s, %(timezone)s,
          %(issuer_fr)s, %(issuer_ar)s,
          %(source_channel)s, %(source_page)s, %(document_type)s, %(extraction_method)s, %(extracted_at)s,
          %(review_status)s, %(schema_version)s, %(raw_payload)s, NOW()
        )
        ON CONFLICT (wilaya_code, commune_code, period_from, period_to) DO UPDATE SET
          issuer_fr = EXCLUDED.issuer_fr,
          issuer_ar = EXCLUDED.issuer_ar,
          source_channel = EXCLUDED.source_channel,
          source_page = EXCLUDED.source_page,
          document_type = EXCLUDED.document_type,
          extraction_method = EXCLUDED.extraction_method,
          extracted_at = EXCLUDED.extracted_at,
          review_status = EXCLUDED.review_status,
          schema_version = EXCLUDED.schema_version,
          raw_payload = EXCLUDED.raw_payload,
          imported_at = NOW()
        RETURNING id
        """,
        {
            "wilaya_code": meta["wilaya_code"],
            "wilaya_name_fr": meta["wilaya_name_fr"],
            "wilaya_name_ar": meta.get("wilaya_name_ar"),
            "commune_code": meta["commune_code"],
            "commune_name_fr": meta["commune_name_fr"],
            "commune_name_ar": meta.get("commune_name_ar"),
            "period_from": meta["period"]["from"],
            "period_to": meta["period"]["to"],
            "timezone": meta.get("timezone") or "Africa/Algiers",
            "issuer_fr": (meta.get("issuer") or {}).get("fr"),
            "issuer_ar": (meta.get("issuer") or {}).get("ar"),
            "source_channel": (meta.get("source") or {}).get("channel"),
            "source_page": (meta.get("source") or {}).get("page"),
            "document_type": (meta.get("source") or {}).get("document_type"),
            "extraction_method": (meta.get("source") or {}).get("extraction_method"),
            "extracted_at": (meta.get("source") or {}).get("extracted_at"),
            "review_status": (meta.get("source") or {}).get("review_status") or "pending_human_validation",
            "schema_version": meta.get("schema_version"),
            "raw_payload": json.dumps(raw_payload),
        },
    )
    return cur.fetchone()[0]


def upsert_duty_periods(
    cur,
    duty_periods: List[Dict[str, Any]],
    roster_id: int,
    wilaya_code: str,
    commune_code: str,
    external_id_to_pk: Dict[str, int],
) -> int:
    inserted = 0
    for d in duty_periods:
        pharmacy_pk = external_id_to_pk.get(d["pharmacy_id"])
        if pharmacy_pk is None:
            print(
                f"  ! duty_period {d['id']} ignoré: pharmacy_id '{d['pharmacy_id']}' absent de pharmacies[]",
                file=sys.stderr,
            )
            continue

        cur.execute(
            """
            INSERT INTO garde_duty_periods (
              id, roster_id, pharmacy_id, wilaya_code, commune_code,
              duty_date, weekday, shift, starts_at, ends_at, source, source_ref
            )
            VALUES (
              %(id)s, %(roster_id)s, %(pharmacy_id)s, %(wilaya_code)s, %(commune_code)s,
              %(duty_date)s, %(weekday)s, %(shift)s, %(starts_at)s, %(ends_at)s, %(source)s, %(source_ref)s
            )
            ON CONFLICT (id) DO UPDATE SET
              roster_id = EXCLUDED.roster_id,
              pharmacy_id = EXCLUDED.pharmacy_id,
              duty_date = EXCLUDED.duty_date,
              weekday = EXCLUDED.weekday,
              shift = EXCLUDED.shift,
              starts_at = EXCLUDED.starts_at,
              ends_at = EXCLUDED.ends_at,
              source = EXCLUDED.source,
              source_ref = EXCLUDED.source_ref
            """,
            {
                "id": d["id"],
                "roster_id": roster_id,
                "pharmacy_id": pharmacy_pk,
                "wilaya_code": wilaya_code,
                "commune_code": commune_code,
                "duty_date": d["date"],
                "weekday": d.get("weekday"),
                "shift": d["shift"],
                "starts_at": d["starts_at"],
                "ends_at": d["ends_at"],
                "source": d.get("source") or "dsp",
                "source_ref": d.get("source_ref"),
            },
        )
        inserted += 1

    return inserted


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", required=True, help="Chemin du fichier garde_officines.json à importer")
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL manquant", file=sys.stderr)
        return 1

    with open(args.json, "r", encoding="utf-8") as f:
        payload = json.load(f)

    meta = payload.get("meta") or {}
    pharmacies = payload.get("pharmacies") or []
    duty_periods = payload.get("duty_periods") or []

    if meta.get("kind") != "garde_officines":
        print(f"meta.kind inattendu: {meta.get('kind')!r} (attendu 'garde_officines')", file=sys.stderr)
        return 1

    if not pharmacies:
        print("Aucune pharmacie dans le fichier.", file=sys.stderr)
        return 1

    conn = psycopg2.connect(db_url)
    try:
        with conn:
            with conn.cursor() as cur:
                external_id_to_pk = upsert_pharmacies(cur, pharmacies, meta)
                roster_id = upsert_roster(cur, meta, payload)
                inserted = upsert_duty_periods(
                    cur, duty_periods, roster_id, meta["wilaya_code"], meta["commune_code"], external_id_to_pk
                )

        print(
            f"Import terminé: {meta['wilaya_name_fr']} / {meta['commune_name_fr']} "
            f"({meta['period']['from']} -> {meta['period']['to']})"
        )
        print(f"  {len(external_id_to_pk)} pharmacie(s), {inserted} garde(s), roster_id={roster_id}")
        print(f"  review_status={(meta.get('source') or {}).get('review_status')}")
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
