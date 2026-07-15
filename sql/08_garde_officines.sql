-- Pharmacies de garde par wilaya/commune.
-- Alimenté manuellement via scripts/import_garde.py à partir des listes DSP
-- (extraction vision-LLM depuis des documents officiels publiés sur Facebook,
-- d'où le review_status sur garde_rosters).

CREATE TABLE IF NOT EXISTS garde_pharmacies (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT NOT NULL,
  wilaya_code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'officine',
  name_fr TEXT NOT NULL,
  name_ar TEXT,
  name_fr_confidence TEXT,
  commune_code TEXT NOT NULL,
  commune_name_fr TEXT NOT NULL,
  commune_name_ar TEXT,
  address_fr TEXT,
  address_ar TEXT,
  phone_raw TEXT,
  phone_e164 TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geocode_status TEXT NOT NULL DEFAULT 'none',
  review_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT garde_pharmacies_unique_external UNIQUE (wilaya_code, external_id)
);

CREATE INDEX IF NOT EXISTS idx_garde_pharmacies_commune ON garde_pharmacies (wilaya_code, commune_code);

CREATE TABLE IF NOT EXISTS garde_rosters (
  id BIGSERIAL PRIMARY KEY,
  wilaya_code TEXT NOT NULL,
  wilaya_name_fr TEXT NOT NULL,
  wilaya_name_ar TEXT,
  commune_code TEXT NOT NULL,
  commune_name_fr TEXT NOT NULL,
  commune_name_ar TEXT,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Algiers',
  issuer_fr TEXT,
  issuer_ar TEXT,
  source_channel TEXT,
  source_page TEXT,
  document_type TEXT,
  extraction_method TEXT,
  extracted_at DATE,
  review_status TEXT NOT NULL DEFAULT 'pending_human_validation',
  schema_version TEXT,
  raw_payload JSONB,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT garde_rosters_unique_period UNIQUE (wilaya_code, commune_code, period_from, period_to)
);

CREATE TABLE IF NOT EXISTS garde_duty_periods (
  id TEXT PRIMARY KEY,
  roster_id BIGINT NOT NULL REFERENCES garde_rosters(id) ON DELETE CASCADE,
  pharmacy_id BIGINT NOT NULL REFERENCES garde_pharmacies(id) ON DELETE CASCADE,
  wilaya_code TEXT NOT NULL,
  commune_code TEXT NOT NULL,
  duty_date DATE NOT NULL,
  weekday TEXT,
  shift TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'dsp',
  source_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garde_duty_lookup ON garde_duty_periods (wilaya_code, commune_code, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_garde_duty_date ON garde_duty_periods (wilaya_code, commune_code, duty_date);
