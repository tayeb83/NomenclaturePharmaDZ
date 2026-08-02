#!/usr/bin/env python3
"""Importe un fichier JSON de pharmacies de garde (format garde_officines) vers PostgreSQL.

Le fichier attendu est celui produit par le pipeline d'extraction
(photo du document DSP -> vision-LLM -> JSON), avec les clés
meta / pharmacies / duty_periods. Voir sql/08_garde_officines.sql
pour le schéma cible.

Deux cas sont acceptés :

1. Fichier mono-commune (historique) — la commune est portée par
   meta.commune_code / meta.commune_name_fr.
2. Fichier multi-communes — meta n'a pas de commune, et chaque pharmacie
   porte la sienne (commune_code / commune_name_fr, ou simplement
   "commune"). Un roster garde_rosters est alors créé par commune, avec
   le sous-ensemble correspondant du payload en raw_payload. Les codes
   et noms arabes des communes peuvent aussi être fournis via
   meta.communes[] :
     "communes": [{"code": "saida", "name_fr": "Saïda", "name_ar": "سعيدة"}]

L'import est idempotent : rejouer le même fichier met simplement à jour
les lignes existantes (upsert par clé naturelle), il ne duplique rien.

Les données saisies à la main après un import précédent sont préservées :
adresses (FR/AR), téléphones et coordonnées pointées manuellement dans
l'admin (geocode_status = 'manual') ne sont jamais écrasées par une
nouvelle extraction, qui ne fait que remplir les champs vides. Comme les
identifiants d'extraction (pharmacies[].id) ne sont pas stables d'un
fichier à l'autre, une pharmacie non retrouvée par son external_id est
rapprochée par son nom normalisé dans la même commune — la fiche
existante est alors mise à jour (et son external_id réaligné), ce qui
conserve son adresse, sa géoloc, ses signalements et sa revendication.

Exemples:
  python scripts/import_garde.py --json data/garde_saida_202608.json --dry-run
  python scripts/import_garde.py --json data/garde_saida_202608.json
"""

import argparse
import json
import os
import re
import sys
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

import psycopg2
import psycopg2.extras

# Statuts de géocodage utilisés ailleurs dans le projet : 'none' (à
# géocoder, cf. scripts/geocode_garde.py), 'auto_geocoded' (Nominatim),
# 'manual' (point posé à la main dans /admin/garde). 'source' = position
# fournie par le fichier d'extraction lui-même.
GEOCODE_MANUAL = "manual"
GEOCODE_NONE = "none"
GEOCODE_SOURCE = "source"

# Champs typiquement complétés à la main dans l'admin : une réimportation
# ne doit ni les vider ni les remplacer silencieusement.
CURATED_FIELDS = ("address_fr", "address_ar", "phone_raw", "phone_e164")


# ─── Normalisation ────────────────────────────────────────────


def is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def strip_accents(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def normalize_name(value: Optional[str]) -> str:
    """Clé de rapprochement d'un nom (pharmacie ou commune).

    Insensible à la casse, aux accents, à la ponctuation et au préfixe
    "Pharmacie"/"Officine"/"صيدلية" : "Pharmacie EL-HIKMA" et
    "pharmacie el hikma" se rapprochent.
    """
    if not value:
        return ""
    text = strip_accents(value).lower()
    # Les lettres arabes (U+0600-U+06FF) sont conservées telles quelles.
    text = re.sub(r"[^a-z0-9؀-ۿ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"^(pharmacie|officine|صيدلية)\s+", "", text)
    text = re.sub(r"^(de|du|des|d)\s+", "", text)
    return text.strip()


def slug_code(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", strip_accents(value).lower()).strip("-")
    return slug or "inconnu"


# ─── Découpage du payload par commune ─────────────────────────


class CommuneBundle:
    """Un roster à importer : une commune, ses pharmacies, ses gardes."""

    def __init__(self, name_fr: str, name_ar: Optional[str], code: Optional[str]) -> None:
        self.name_fr = name_fr
        self.name_ar = name_ar
        self.declared_code = code
        self.code: str = ""
        self.pharmacies: List[Dict[str, Any]] = []
        self.duty_periods: List[Dict[str, Any]] = []


def pharmacy_commune(
    p: Dict[str, Any], meta: Dict[str, Any]
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """(name_fr, name_ar, code) de la commune d'une pharmacie.

    Les pipelines d'extraction ne sont pas tous alignés sur les mêmes clés
    (ex: "commune" pour Saïda vs "commune_name_fr" / "commune_code" pour
    Oran) : on essaie les variantes connues avant de retomber sur la
    commune du roster (meta), présente uniquement sur les fichiers
    mono-commune.
    """
    name_fr = p.get("commune_name_fr") or p.get("commune") or meta.get("commune_name_fr")
    name_ar = p.get("commune_name_ar") or p.get("commune_ar") or meta.get("commune_name_ar")
    code = p.get("commune_code") or meta.get("commune_code")
    return name_fr, name_ar, code


def split_by_commune(payload: Dict[str, Any]) -> List[CommuneBundle]:
    meta = payload.get("meta") or {}
    pharmacies = payload.get("pharmacies") or []
    duty_periods = payload.get("duty_periods") or []

    # Codes / noms arabes éventuellement déclarés dans meta.communes[].
    declared: Dict[str, Dict[str, Any]] = {}
    for entry in meta.get("communes") or []:
        key = normalize_name(entry.get("name_fr") or entry.get("name") or "")
        if key:
            declared[key] = entry

    bundles: Dict[str, CommuneBundle] = {}
    pharmacy_commune_key: Dict[str, str] = {}
    orphans: List[str] = []

    for p in pharmacies:
        name_fr, name_ar, code = pharmacy_commune(p, meta)
        if is_blank(name_fr):
            orphans.append(str(p.get("id")))
            continue

        key = normalize_name(name_fr)
        bundle = bundles.get(key)
        if bundle is None:
            entry = declared.get(key) or {}
            bundle = CommuneBundle(
                name_fr=name_fr.strip(),
                name_ar=(name_ar or entry.get("name_ar")),
                code=(code or entry.get("code")),
            )
            bundles[key] = bundle
        else:
            # Complété au fil des pharmacies : le nom arabe ou le code ne
            # sont pas forcément portés par la première ligne rencontrée.
            bundle.name_ar = bundle.name_ar or name_ar
            bundle.declared_code = bundle.declared_code or code

        bundle.pharmacies.append(p)
        pharmacy_commune_key[str(p.get("id"))] = key

    if orphans:
        raise ValueError(
            f"Commune manquante pour {len(orphans)} pharmacie(s) "
            "(ni meta.commune_name_fr, ni pharmacies[].commune) : "
            + ", ".join(orphans[:10])
            + ("…" if len(orphans) > 10 else "")
        )

    for d in duty_periods:
        key = pharmacy_commune_key.get(str(d.get("pharmacy_id")))
        if key is None:
            print(
                f"  ! garde {d.get('id')} ignorée : pharmacy_id "
                f"'{d.get('pharmacy_id')}' absent de pharmacies[]",
                file=sys.stderr,
            )
            continue
        bundles[key].duty_periods.append(d)

    return sorted(bundles.values(), key=lambda b: normalize_name(b.name_fr))


def bundle_payload(payload: Dict[str, Any], bundle: CommuneBundle) -> Dict[str, Any]:
    """raw_payload du roster : la tranche du fichier propre à cette commune."""
    meta = dict(payload.get("meta") or {})
    meta.pop("communes", None)
    meta["commune_code"] = bundle.code
    meta["commune_name_fr"] = bundle.name_fr
    if bundle.name_ar:
        meta["commune_name_ar"] = bundle.name_ar
    return {"meta": meta, "pharmacies": bundle.pharmacies, "duty_periods": bundle.duty_periods}


# ─── Résolution des codes commune ─────────────────────────────


def existing_commune_codes(cur, wilaya_code: str) -> Dict[str, str]:
    """Codes commune déjà en base pour cette wilaya, par nom normalisé."""
    cur.execute(
        """
        SELECT commune_code, commune_name_fr FROM garde_rosters WHERE wilaya_code = %s
        UNION
        SELECT commune_code, commune_name_fr FROM garde_pharmacies WHERE wilaya_code = %s
        """,
        (wilaya_code, wilaya_code),
    )
    known: Dict[str, str] = {}
    for row in cur.fetchall():
        key = normalize_name(row["commune_name_fr"])
        if key:
            known.setdefault(key, row["commune_code"])
    return known


def resolve_commune_codes(cur, wilaya_code: str, bundles: List[CommuneBundle], reuse: bool) -> Dict[str, str]:
    """Fixe bundle.code en privilégiant le code déjà utilisé en base.

    Les URLs publiques sont construites sur le slug du nom de commune,
    mais la couverture et les rosters sont clés sur commune_code : si une
    nouvelle extraction change le code d'une commune déjà importée, le
    site se retrouve avec deux entrées concurrentes pour la même commune.
    On réaligne donc sur le code existant.

    Renvoie les communes déjà connues en base (nom normalisé -> code), pour
    distinguer ensuite une commune réellement nouvelle d'une commune déjà
    importée dont le code aurait changé.
    """
    known = existing_commune_codes(cur, wilaya_code)
    if not reuse:
        known = {}

    for bundle in bundles:
        existing = known.get(normalize_name(bundle.name_fr))
        declared = bundle.declared_code

        if existing and declared and existing != declared:
            print(
                f"  · commune '{bundle.name_fr}' : code '{declared}' du fichier ignoré, "
                f"on conserve '{existing}' déjà en base (--no-reuse-commune-codes pour forcer)"
            )
        bundle.code = existing or declared or slug_code(bundle.name_fr)
        if not existing and not declared:
            print(f"  · commune '{bundle.name_fr}' : aucun code fourni, code dérivé '{bundle.code}'")

    return known


# ─── Pharmacies : rapprochement + fusion ──────────────────────


class PharmacyIndex:
    """Pharmacies déjà en base pour une wilaya, indexées pour rapprochement."""

    def __init__(self, rows: List[Dict[str, Any]]) -> None:
        self.rows = rows
        self.by_external_id: Dict[str, Dict[str, Any]] = {}
        self.by_commune_name: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
        self.by_name: Dict[str, List[Dict[str, Any]]] = {}
        self.claimed: set = set()

        for row in rows:
            self.by_external_id[row["external_id"]] = row
            for name in (row["name_fr"], row["name_ar"]):
                key = normalize_name(name)
                if key:
                    self.by_commune_name.setdefault((row["commune_code"], key), []).append(row)
                    self.by_name.setdefault(key, []).append(row)

    def commune_size(self, commune_code: str) -> int:
        return sum(1 for row in self.rows if row["commune_code"] == commune_code)

    def match(self, p: Dict[str, Any], commune_code: str) -> Tuple[Optional[Dict[str, Any]], str]:
        existing = self.by_external_id.get(str(p.get("id")))
        if existing is not None and existing["id"] not in self.claimed:
            self.claimed.add(existing["id"])
            return existing, "external_id"

        # Le nom peut n'exister qu'en arabe (name_fr NULL sur beaucoup de
        # fiches DSP) : les deux langues servent de clé.
        keys = [key for key in (normalize_name(p.get("name_fr")), normalize_name(p.get("name_ar"))) if key]

        for key in keys:
            candidates = [
                row
                for row in self.by_commune_name.get((commune_code, key), [])
                if row["id"] not in self.claimed
            ]
            # Rapprochement par nom seulement s'il est sans ambiguïté : deux
            # homonymes dans la même commune -> on préfère créer une fiche
            # plutôt que recopier l'adresse de la mauvaise.
            if len(candidates) == 1:
                self.claimed.add(candidates[0]["id"])
                return candidates[0], "nom"

        # Filet : si le commune_code a changé d'une extraction à l'autre, la
        # fiche existe dans la wilaya sous un autre code. On ne l'accepte que
        # si le nom est unique dans toute la wilaya — « Pharmacie Centrale »
        # existe dans chaque commune.
        for key in keys:
            candidates = [row for row in self.by_name.get(key, []) if row["id"] not in self.claimed]
            if len(candidates) == 1:
                self.claimed.add(candidates[0]["id"])
                return candidates[0], "nom-wilaya"

        return None, "nouvelle"


def load_pharmacy_index(cur, wilaya_code: str) -> PharmacyIndex:
    cur.execute(
        """
        SELECT id, external_id, type, commune_code, name_fr, name_ar,
               address_fr, address_ar, phone_raw, phone_e164,
               lat, lng, geocode_status
        FROM garde_pharmacies
        WHERE wilaya_code = %s
        """,
        (wilaya_code,),
    )
    return PharmacyIndex([dict(row) for row in cur.fetchall()])


class MergeStats:
    def __init__(self) -> None:
        self.created = 0
        self.matched_external_id = 0
        self.matched_name = 0
        self.matched_name_wilaya = 0
        self.addresses_kept = 0
        self.addresses_filled = 0
        self.addresses_overwritten = 0
        self.phones_kept = 0
        self.manual_geo_kept = 0

    def summary(self) -> str:
        matched_by_name = self.matched_name + self.matched_name_wilaya
        return (
            f"{self.created} nouvelle(s), "
            f"{self.matched_external_id + matched_by_name} existante(s) "
            f"(dont {matched_by_name} rapprochée(s) par nom) | "
            f"adresses conservées {self.addresses_kept}, complétées {self.addresses_filled}, "
            f"remplacées {self.addresses_overwritten} | "
            f"téléphones conservés {self.phones_kept} | "
            f"géoloc manuelle préservée {self.manual_geo_kept}"
        )


def payload_coords(p: Dict[str, Any]) -> Tuple[Optional[float], Optional[float]]:
    location = p.get("location")
    if not isinstance(location, dict):
        return None, None
    lat, lng = location.get("lat"), location.get("lng")
    if lat is None or lng is None:
        return None, None
    return lat, lng


def merge_pharmacy(
    p: Dict[str, Any],
    existing: Optional[Dict[str, Any]],
    commune: CommuneBundle,
    wilaya_code: str,
    overwrite_addresses: bool,
    overwrite_geo: bool,
    stats: MergeStats,
) -> Dict[str, Any]:
    """Valeurs finales d'une fiche : le fichier alimente, la saisie manuelle prime."""
    values: Dict[str, Any] = {
        "external_id": p["id"],
        "wilaya_code": wilaya_code,
        "type": p.get("type") or (existing or {}).get("type") or "officine",
        # Beaucoup de fiches DSP n'ont qu'un nom arabe : une extraction sans
        # name_fr ne doit pas effacer un nom français saisi entre-temps.
        "name_fr": p.get("name_fr") or (existing or {}).get("name_fr"),
        "name_ar": p.get("name_ar") or (existing or {}).get("name_ar"),
        "name_fr_confidence": p.get("name_fr_confidence")
        or (None if p.get("name_fr") else (existing or {}).get("name_fr_confidence")),
        "commune_code": commune.code,
        "commune_name_fr": p.get("commune_name_fr") or p.get("commune") or commune.name_fr,
        "commune_name_ar": p.get("commune_name_ar") or p.get("commune_ar") or commune.name_ar,
        "review_flags": json.dumps(p.get("review_flags") or []),
    }

    for field in CURATED_FIELDS:
        incoming = p.get(field)
        current = (existing or {}).get(field)
        if is_blank(current):
            values[field] = incoming
            if field == "address_fr" and existing is not None and not is_blank(incoming):
                stats.addresses_filled += 1
        elif overwrite_addresses and not is_blank(incoming):
            values[field] = incoming
            if field == "address_fr":
                stats.addresses_overwritten += 1
        else:
            # La valeur en base a été saisie ou corrigée à la main : elle gagne.
            values[field] = current
            if field == "address_fr":
                stats.addresses_kept += 1
            elif field == "phone_e164":
                stats.phones_kept += 1

    lat, lng = payload_coords(p)
    ex_lat, ex_lng = (existing or {}).get("lat"), (existing or {}).get("lng")
    ex_status = (existing or {}).get("geocode_status")
    has_existing_point = ex_lat is not None and ex_lng is not None

    if has_existing_point and ex_status == GEOCODE_MANUAL and not overwrite_geo:
        # Point posé à la main dans /admin/garde : jamais écrasé.
        values["lat"], values["lng"], values["geocode_status"] = ex_lat, ex_lng, GEOCODE_MANUAL
        stats.manual_geo_kept += 1
    elif lat is not None and lng is not None:
        values["lat"], values["lng"] = lat, lng
        values["geocode_status"] = p.get("geocode_status") or GEOCODE_SOURCE
    elif has_existing_point:
        # Géocodage automatique déjà fait : inutile de le rejouer.
        values["lat"], values["lng"] = ex_lat, ex_lng
        values["geocode_status"] = ex_status or GEOCODE_SOURCE
    else:
        values["lat"], values["lng"] = None, None
        values["geocode_status"] = p.get("geocode_status") or GEOCODE_NONE

    return values


def upsert_pharmacies(
    cur,
    bundle: CommuneBundle,
    wilaya_code: str,
    index: PharmacyIndex,
    overwrite_addresses: bool,
    overwrite_geo: bool,
) -> Tuple[Dict[str, int], MergeStats]:
    external_id_to_pk: Dict[str, int] = {}
    stats = MergeStats()

    for p in bundle.pharmacies:
        existing, how = index.match(p, bundle.code)
        label = p.get("name_fr") or p.get("name_ar") or p.get("id")
        if how == "external_id":
            stats.matched_external_id += 1
        elif how in ("nom", "nom-wilaya"):
            if how == "nom":
                stats.matched_name += 1
                origin = ""
            else:
                stats.matched_name_wilaya += 1
                origin = f", commune '{existing['commune_code']}' -> '{bundle.code}'"
            print(
                f"    ~ '{label}' rapprochée de la fiche #{existing['id']} "
                f"(external_id '{existing['external_id']}' -> '{p['id']}'{origin})"
            )
        else:
            stats.created += 1

        values = merge_pharmacy(
            p, existing, bundle, wilaya_code, overwrite_addresses, overwrite_geo, stats
        )

        if existing is not None:
            values["id"] = existing["id"]
            cur.execute(
                """
                UPDATE garde_pharmacies SET
                  external_id = %(external_id)s,
                  type = %(type)s,
                  name_fr = %(name_fr)s,
                  name_ar = %(name_ar)s,
                  name_fr_confidence = %(name_fr_confidence)s,
                  commune_code = %(commune_code)s,
                  commune_name_fr = %(commune_name_fr)s,
                  commune_name_ar = %(commune_name_ar)s,
                  address_fr = %(address_fr)s,
                  address_ar = %(address_ar)s,
                  phone_raw = %(phone_raw)s,
                  phone_e164 = %(phone_e164)s,
                  lat = %(lat)s,
                  lng = %(lng)s,
                  geocode_status = %(geocode_status)s,
                  review_flags = %(review_flags)s,
                  updated_at = NOW()
                WHERE id = %(id)s
                RETURNING id
                """,
                values,
            )
        else:
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
                  address_fr = COALESCE(garde_pharmacies.address_fr, EXCLUDED.address_fr),
                  address_ar = COALESCE(garde_pharmacies.address_ar, EXCLUDED.address_ar),
                  phone_raw = COALESCE(garde_pharmacies.phone_raw, EXCLUDED.phone_raw),
                  phone_e164 = COALESCE(garde_pharmacies.phone_e164, EXCLUDED.phone_e164),
                  lat = EXCLUDED.lat,
                  lng = EXCLUDED.lng,
                  geocode_status = EXCLUDED.geocode_status,
                  review_flags = EXCLUDED.review_flags,
                  updated_at = NOW()
                RETURNING id
                """,
                values,
            )

        external_id_to_pk[p["id"]] = cur.fetchone()["id"]

    return external_id_to_pk, stats


# ─── Rosters & gardes ─────────────────────────────────────────


def upsert_roster(cur, meta: Dict[str, Any], bundle: CommuneBundle, raw_payload: Dict[str, Any]) -> int:
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
          commune_name_fr = EXCLUDED.commune_name_fr,
          commune_name_ar = COALESCE(EXCLUDED.commune_name_ar, garde_rosters.commune_name_ar),
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
            "commune_code": bundle.code,
            "commune_name_fr": bundle.name_fr,
            "commune_name_ar": bundle.name_ar,
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
            "raw_payload": json.dumps(raw_payload, ensure_ascii=False),
        },
    )
    return cur.fetchone()["id"]


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
              wilaya_code = EXCLUDED.wilaya_code,
              commune_code = EXCLUDED.commune_code,
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


# ─── Entrée ───────────────────────────────────────────────────


def import_payload(cur, payload: Dict[str, Any], args: argparse.Namespace) -> None:
    meta = payload.get("meta") or {}
    wilaya_code = meta["wilaya_code"]

    bundles = split_by_commune(payload)
    if not bundles:
        raise ValueError("Aucune pharmacie exploitable dans le fichier.")

    print(
        f"{meta['wilaya_name_fr']} — {len(bundles)} commune(s), période "
        f"{meta['period']['from']} -> {meta['period']['to']}"
    )

    known_communes = resolve_commune_codes(
        cur, wilaya_code, bundles, reuse=not args.no_reuse_commune_codes
    )
    index = load_pharmacy_index(cur, wilaya_code)
    print(f"  {len(index.rows)} fiche(s) déjà en base pour la wilaya '{wilaya_code}'")

    total_pharmacies = 0
    total_duties = 0

    for bundle in bundles:
        already = index.commune_size(bundle.code)
        print(f"\n  {bundle.name_fr} ({bundle.code}) — {already} fiche(s) déjà en base pour cette commune")
        if already == 0 and normalize_name(bundle.name_fr) in known_communes:
            # Rien à rapprocher ici alors que la wilaya est peuplée : le plus
            # souvent un commune_code qui a changé d'une extraction à l'autre.
            print(
                "    · aucune fiche existante sous ce commune_code — vérifier les codes en base :\n"
                "      SELECT commune_code, commune_name_fr, count(*) FROM garde_pharmacies "
                f"WHERE wilaya_code = '{wilaya_code}' GROUP BY 1,2;"
            )
        external_id_to_pk, stats = upsert_pharmacies(
            cur, bundle, wilaya_code, index, args.overwrite_addresses, args.overwrite_geo
        )
        roster_id = upsert_roster(cur, meta, bundle, bundle_payload(payload, bundle))
        inserted = upsert_duty_periods(
            cur, bundle.duty_periods, roster_id, wilaya_code, bundle.code, external_id_to_pk
        )

        print(f"    {len(external_id_to_pk)} pharmacie(s), {inserted} garde(s), roster_id={roster_id}")
        print(f"    {stats.summary()}")

        total_pharmacies += len(external_id_to_pk)
        total_duties += inserted

    print(
        f"\nTotal : {total_pharmacies} pharmacie(s), {total_duties} garde(s) "
        f"sur {len(bundles)} commune(s)"
    )
    print(f"review_status={(meta.get('source') or {}).get('review_status')}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", required=True, help="Chemin du fichier garde_officines.json à importer")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simule l'import (tout est joué puis annulé) et affiche le rapport",
    )
    parser.add_argument(
        "--overwrite-addresses",
        action="store_true",
        help="Remplace les adresses/téléphones existants par ceux du fichier (par défaut ils sont conservés)",
    )
    parser.add_argument(
        "--overwrite-geo",
        action="store_true",
        help="Autorise le fichier à écraser les coordonnées pointées à la main (geocode_status='manual')",
    )
    parser.add_argument(
        "--no-reuse-commune-codes",
        action="store_true",
        help="Utilise les commune_code du fichier même si la commune existe déjà en base sous un autre code",
    )
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL manquant", file=sys.stderr)
        return 1

    with open(args.json, "r", encoding="utf-8") as f:
        payload = json.load(f)

    meta = payload.get("meta") or {}
    if meta.get("kind") != "garde_officines":
        print(f"meta.kind inattendu: {meta.get('kind')!r} (attendu 'garde_officines')", file=sys.stderr)
        return 1

    if not (payload.get("pharmacies") or []):
        print("Aucune pharmacie dans le fichier.", file=sys.stderr)
        return 1

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            try:
                import_payload(cur, payload, args)
            except (ValueError, KeyError) as err:
                conn.rollback()
                print(f"Import interrompu : {err}", file=sys.stderr)
                return 1

            if args.dry_run:
                conn.rollback()
                print("\n[dry-run] aucune modification enregistrée.")
            else:
                conn.commit()
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
