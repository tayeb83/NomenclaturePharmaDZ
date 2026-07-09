-- Mapping pré-calculé entre les médicaments critiques et la base de données pharmaceutique
-- Exécuter ce script, puis importer les données via scripts/import_critical_mapping.py

CREATE TABLE IF NOT EXISTS critical_mapping (
  id                  BIGSERIAL PRIMARY KEY,
  n_critique          INTEGER,
  classe_therapeutique TEXT,
  dci_critique        TEXT NOT NULL,
  forme_critique      TEXT,
  dosage_critique     TEXT,

  -- Statut du match et scores de similarité (0-100)
  statut_match        TEXT CHECK (statut_match IN ('OUI', 'A_REVOIR')),
  score_global        SMALLINT,
  score_dci           SMALLINT,
  score_forme         SMALLINT,
  score_dosage        SMALLINT,

  -- Médicament correspondant dans la base
  source_base         TEXT CHECK (source_base IN ('ACTIVE', 'RETRAIT', 'NON_RENOUVELE')),
  n_base              INTEGER,
  code_base           TEXT,
  n_enregistrement    TEXT,
  dci_base            TEXT,
  marque              TEXT,
  forme_base          TEXT,
  dosage_base         TEXT,
  conditionnement     TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_critical_mapping_dci       ON critical_mapping (UPPER(dci_critique));
CREATE INDEX IF NOT EXISTS idx_critical_mapping_classe    ON critical_mapping (classe_therapeutique);
CREATE INDEX IF NOT EXISTS idx_critical_mapping_statut    ON critical_mapping (statut_match);
CREATE INDEX IF NOT EXISTS idx_critical_mapping_source    ON critical_mapping (source_base);
CREATE INDEX IF NOT EXISTS idx_critical_mapping_n         ON critical_mapping (n_critique);

-- Clé de jointure utilisée par lib/queries.ts::searchMedicaments() pour retrouver le
-- médicament critique correspondant à un enregistrement/retrait/non-renouvelé.
CREATE INDEX IF NOT EXISTS idx_critical_mapping_lookup    ON critical_mapping (source_base, n_enregistrement);
