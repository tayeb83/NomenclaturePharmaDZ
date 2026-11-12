-- ============================================================
-- DwaDZ — Interactions médicamenteuses : saisie et sourçage depuis l'admin
--
-- Étend interactions_ansm (sql/29) pour que l'équipe puisse créer, corriger et sourcer
-- des interactions depuis /admin/interactions, en plus de celles du thésaurus ANSM.
--
--   origine        'ansm' (importée du PDF) ou 'manuelle' (saisie dans l'admin). L'import
--                  du thésaurus ne touche jamais une ligne 'manuelle'.
--   mecanisme_*    mécanisme de l'interaction (pharmacocinétique, pharmacodynamique…).
--   source_*       d'où vient l'information : RCP, article scientifique, site, étude…
--                  Obligatoire pour une ligne 'manuelle' (contrôlé côté API et par la base).
--   page           devient facultative : une ligne manuelle n'a pas de page de PDF.
--
-- Application : psql "$DATABASE_URL" -f sql/40_interactions_admin.sql
-- Idempotent : peut être rejoué sans risque.
-- ============================================================

ALTER TABLE interactions_ansm ADD COLUMN IF NOT EXISTS origine VARCHAR(10) NOT NULL DEFAULT 'ansm';
ALTER TABLE interactions_ansm ADD COLUMN IF NOT EXISTS mecanisme_fr TEXT;
ALTER TABLE interactions_ansm ADD COLUMN IF NOT EXISTS mecanisme_ar TEXT;
ALTER TABLE interactions_ansm ADD COLUMN IF NOT EXISTS source_type VARCHAR(10);
ALTER TABLE interactions_ansm ADD COLUMN IF NOT EXISTS source_titre TEXT;
ALTER TABLE interactions_ansm ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE interactions_ansm ADD COLUMN IF NOT EXISTS source_ref TEXT;

ALTER TABLE interactions_ansm ALTER COLUMN page DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE interactions_ansm ADD CONSTRAINT interactions_ansm_origine_chk CHECK (origine IN ('ansm', 'manuelle'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE interactions_ansm ADD CONSTRAINT interactions_ansm_source_type_chk
    CHECK (source_type IS NULL OR source_type IN ('ansm', 'rcp', 'article', 'etude', 'site', 'autre'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE interactions_ansm ADD CONSTRAINT interactions_ansm_source_url_chk
    CHECK (source_url IS NULL OR source_url ~ '^https?://');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- une interaction saisie à la main doit avoir une source (type + titre ou adresse)
DO $$ BEGIN
  ALTER TABLE interactions_ansm ADD CONSTRAINT interactions_ansm_manuelle_sourcee_chk
    CHECK (origine <> 'manuelle' OR (
      source_type IS NOT NULL
      AND (COALESCE(btrim(source_titre), '') <> '' OR COALESCE(btrim(source_url), '') <> '')
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_interactions_ansm_origine ON interactions_ansm (origine);
CREATE INDEX IF NOT EXISTS idx_interactions_ansm_partenaire ON interactions_ansm (partenaire_key);
