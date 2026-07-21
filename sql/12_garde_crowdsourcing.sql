-- ============================================================
-- DwaDZ — Crowdsourcing pharmacies de garde
--
-- 1. garde_reports : signalements grand public sur une garde
--    ("confirmée ouverte", "erreur d'horaire/adresse", "fermée")
-- 2. garde_claims : "Revendiquer ma pharmacie" — le pharmacien
--    demande la main sur sa fiche (horaires, garde, téléphone,
--    WhatsApp). Validation manuelle côté admin.
--
-- Application : psql "$DATABASE_URL" -f sql/12_garde_crowdsourcing.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS garde_reports (
  id             BIGSERIAL PRIMARY KEY,
  pharmacy_id    BIGINT REFERENCES garde_pharmacies(id) ON DELETE SET NULL,
  pharmacy_name  TEXT,                -- snapshot au moment du signalement (robuste aux réimports)
  wilaya_code    TEXT NOT NULL,
  commune_code   TEXT NOT NULL,
  report_type    TEXT NOT NULL CHECK (report_type IN ('confirme_ouverte', 'erreur', 'fermee')),
  message        TEXT,
  contact        TEXT,                -- téléphone/email facultatif du signaleur
  ip_hash        TEXT,                -- hash salé de l'IP (anti-abus, pas d'IP en clair)
  status         TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'traite', 'rejete')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garde_reports_status   ON garde_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_garde_reports_pharmacy ON garde_reports (pharmacy_id, report_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_garde_reports_ip       ON garde_reports (ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS garde_claims (
  id               BIGSERIAL PRIMARY KEY,
  pharmacy_id      BIGINT REFERENCES garde_pharmacies(id) ON DELETE SET NULL,
  pharmacy_name    TEXT,
  wilaya_code      TEXT NOT NULL,
  commune_code     TEXT NOT NULL,
  pharmacist_name  TEXT NOT NULL,
  phone            TEXT NOT NULL,
  whatsapp         TEXT,
  email            TEXT,
  message          TEXT,
  ip_hash          TEXT,
  status           TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'verifie', 'rejete')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garde_claims_status   ON garde_claims (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_garde_claims_pharmacy ON garde_claims (pharmacy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_garde_claims_ip       ON garde_claims (ip_hash, created_at DESC);

COMMENT ON TABLE garde_reports IS
  'Signalements crowdsourcés sur les pharmacies de garde : confirmation d''ouverture, erreur de fiche, pharmacie fermée. Modération via status.';
COMMENT ON TABLE garde_claims IS
  'Revendications de fiche par les pharmaciens ("c''est ma pharmacie"). Après vérification manuelle (appel au numéro fourni), passer status à ''verifie'' — le pharmacien devient contributeur de sa fiche.';
