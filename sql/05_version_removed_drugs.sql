-- Migration 05: Table pour stocker les médicaments supprimés à chaque version
-- Permet d'afficher le diff entre deux versions (page /diff)

CREATE TABLE IF NOT EXISTS version_removed_drugs (
  id           SERIAL PRIMARY KEY,
  version_label TEXT NOT NULL,  -- La NOUVELLE version lors de laquelle ils ont été supprimés
  n_enreg      TEXT,
  code         TEXT,
  dci          TEXT,
  nom_marque   TEXT,
  forme        TEXT,
  dosage       TEXT,
  labo         TEXT,
  pays         TEXT,
  type_prod    TEXT,
  statut       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_version_removed_drugs_version
  ON version_removed_drugs(version_label);
