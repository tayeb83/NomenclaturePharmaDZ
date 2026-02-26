-- ============================================================
-- PharmaVeille DZ — Codes ATC (Anatomical Therapeutic Chemical)
-- Classification OMS — intégrée par DCI
-- ============================================================

-- Table de la classification ATC complète (niveaux 1 à 5)
CREATE TABLE IF NOT EXISTS atc_codes (
  code              TEXT PRIMARY KEY,           -- ex: A01AB03
  parent_code       TEXT,                        -- ex: A01AB (NULL pour niveau 1)
  niveau            SMALLINT NOT NULL,           -- 1 à 5
  label_en          TEXT,                        -- "chlorhexidine"
  label_fr          TEXT,                        -- "chlorhexidine"
  commentaires      TEXT,
  date_creation     DATE,
  date_modification DATE,
  date_inactivation DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Référence self-join pour la hiérarchie (tolère les insertions dans l'ordre)
-- On l'ajoute en différé pour éviter les violations FK pendant l'import
-- ALTER TABLE atc_codes ADD CONSTRAINT fk_atc_parent
--   FOREIGN KEY (parent_code) REFERENCES atc_codes(code) DEFERRABLE INITIALLY DEFERRED;

-- Table de mapping DCI ↔ Code ATC (niveau 5 uniquement)
-- Clé = DCI normalisée en majuscules + trim
CREATE TABLE IF NOT EXISTS dci_atc_mapping (
  dci          TEXT PRIMARY KEY,   -- UPPER(TRIM(dci)) de la nomenclature
  code_atc     TEXT NOT NULL REFERENCES atc_codes(code),
  source       VARCHAR(10) DEFAULT 'auto',  -- 'auto' = correspondance automatique, 'manual' = saisie manuelle
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par code ATC (ex: tous les médicaments avec A01AB03)
CREATE INDEX IF NOT EXISTS idx_atc_niveau     ON atc_codes(niveau);
CREATE INDEX IF NOT EXISTS idx_atc_parent     ON atc_codes(parent_code);
CREATE INDEX IF NOT EXISTS idx_atc_label_fr   ON atc_codes USING gin(label_fr gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_atc_label_en   ON atc_codes USING gin(label_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_dci_atc_code   ON dci_atc_mapping(code_atc);

-- Commentaires
COMMENT ON TABLE atc_codes IS
  'Classification ATC (Anatomical Therapeutic Chemical) de l''OMS — tous niveaux (1 à 5)';
COMMENT ON TABLE dci_atc_mapping IS
  'Mapping DCI (nomenclature algérienne) vers code ATC niveau 5';
COMMENT ON COLUMN dci_atc_mapping.dci IS
  'DCI normalisée : UPPER(TRIM(dci)) pour correspondance insensible à la casse';
COMMENT ON COLUMN dci_atc_mapping.source IS
  'auto = correspondance automatique par nom, manual = saisie/correction manuelle';
