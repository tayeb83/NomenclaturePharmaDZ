-- ============================================================
-- DwaDZ — Annuaire des pharmacies (/pharmacies, /pharmacie/<id>-<slug>)
--
-- 1. annuaire_pharmacy_profile : données propres à l'annuaire, éditables
--    depuis l'admin pour N'IMPORTE QUELLE pharmacie (badge « Vérifiée »,
--    horaires d'ouverture, mobile, masquage). Table séparée de
--    garde_pharmacies : les fiches sont réécrites à chaque import DSP
--    (scripts/import_garde.py), ces réglages ne doivent pas être perdus.
--
--    Horaires : opens_at / closes_at / closed_days décrivent l'ouverture
--    habituelle HORS garde. Valeurs NULL = défaut du site, 10h → 21h.
--    closed_days : jours de repos, 0 = dimanche … 6 = samedi.
--
-- 2. annuaire_places : titre affiché pour une wilaya ou une commune
--    (« de Saïda », « d'Alger »…). Facultatif : à défaut, le site déduit
--    le titre du nom de la zone. commune_code = '' pour une wilaya.
--
-- Application : psql "$DATABASE_URL" -f sql/17_annuaire.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS annuaire_pharmacy_profile (
  pharmacy_id   BIGINT PRIMARY KEY REFERENCES garde_pharmacies(id) ON DELETE CASCADE,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,   -- badge « Vérifiée » (appel de contrôle effectué)
  verified_at   DATE,
  is_hidden     BOOLEAN NOT NULL DEFAULT FALSE,   -- masque la fiche sans la supprimer
  mobile_raw    TEXT,
  mobile_e164   TEXT,
  opens_at      TIME,
  closes_at     TIME,
  closed_days   INTEGER[] NOT NULL DEFAULT '{}',
  admin_note    TEXT,                             -- usage interne, jamais affiché
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annuaire_profile_verified
  ON annuaire_pharmacy_profile (verified) WHERE verified;

CREATE TABLE IF NOT EXISTS annuaire_places (
  wilaya_code   TEXT NOT NULL,
  commune_code  TEXT NOT NULL DEFAULT '',
  phrase_fr     TEXT,   -- « de Saïda », « d'Alger », « de Maoussa (Mascara) »
  phrase_ar     TEXT,   -- « سعيدة », « ماوسة، معسكر »
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (wilaya_code, commune_code)
);
