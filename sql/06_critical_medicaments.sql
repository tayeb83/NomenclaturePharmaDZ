-- Liste ministérielle des médicaments critiques (DCI + forme + dosage)
-- Exécuter ce script puis importer les lignes via scripts/import_critical_medicaments.py

CREATE TABLE IF NOT EXISTS critical_medicaments (
  id BIGSERIAL PRIMARY KEY,
  dci TEXT NOT NULL,
  forme TEXT NOT NULL,
  dosage TEXT NOT NULL,
  classe_therapeutique TEXT,
  source_label TEXT DEFAULT 'Ministère de la Santé Algérie',
  published_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dci_norm TEXT GENERATED ALWAYS AS (
    UPPER(REGEXP_REPLACE(UNACCENT(COALESCE(dci, '')), '[^A-Z0-9]+', '', 'g'))
  ) STORED,
  forme_norm TEXT GENERATED ALWAYS AS (
    UPPER(REGEXP_REPLACE(UNACCENT(COALESCE(forme, '')), '[^A-Z0-9]+', '', 'g'))
  ) STORED,
  dosage_norm TEXT GENERATED ALWAYS AS (
    UPPER(REGEXP_REPLACE(UNACCENT(COALESCE(dosage, '')), '[^A-Z0-9]+', '', 'g'))
  ) STORED,
  CONSTRAINT critical_medicaments_unique_norm UNIQUE (dci_norm, forme_norm, dosage_norm)
);

CREATE INDEX IF NOT EXISTS idx_critical_medicaments_dci_norm ON critical_medicaments (dci_norm);
CREATE INDEX IF NOT EXISTS idx_critical_medicaments_forme_norm ON critical_medicaments (forme_norm);
CREATE INDEX IF NOT EXISTS idx_critical_medicaments_dosage_norm ON critical_medicaments (dosage_norm);
