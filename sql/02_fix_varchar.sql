-- ============================================================
-- PharmaVeille DZ — Migration : correction des tailles VARCHAR
-- Lance ce script si les tables existent déjà et que tu as
-- l'erreur "value too long for type character varying"
--
-- Usage dans le terminal :
--   psql -U postgres -d pharmaveille -f sql/02_fix_varchar.sql
-- ============================================================

-- La vue v_stats dépend de la colonne statut de enregistrements.
-- On la supprime temporairement pour autoriser ALTER COLUMN,
-- puis on la recrée à la fin.
DROP VIEW IF EXISTS v_stats;

-- ─── TABLE enregistrements ───────────────────────────────────

ALTER TABLE enregistrements
  DROP CONSTRAINT IF EXISTS enregistrements_n_enreg_key;

ALTER TABLE enregistrements
  ALTER COLUMN n_enreg       TYPE TEXT,
  ALTER COLUMN code          TYPE VARCHAR(15),
  ALTER COLUMN dosage        TYPE TEXT,
  ALTER COLUMN conditionnement TYPE TEXT,
  ALTER COLUMN liste         TYPE VARCHAR(20),
  ALTER COLUMN prescription  TYPE VARCHAR(20),
  ALTER COLUMN obs           TYPE TEXT,
  ALTER COLUMN pays          TYPE VARCHAR(50),
  ALTER COLUMN type_prod     TYPE VARCHAR(20),
  ALTER COLUMN statut        TYPE VARCHAR(10),
  ALTER COLUMN stabilite     TYPE TEXT;

-- ─── TABLE retraits ──────────────────────────────────────────
ALTER TABLE retraits
  ALTER COLUMN n_enreg       TYPE TEXT,
  ALTER COLUMN code          TYPE VARCHAR(15),
  ALTER COLUMN dosage        TYPE TEXT,
  ALTER COLUMN conditionnement TYPE TEXT,
  ALTER COLUMN liste         TYPE VARCHAR(20),
  ALTER COLUMN prescription  TYPE TEXT,
  ALTER COLUMN pays          TYPE VARCHAR(50),
  ALTER COLUMN type_prod     TYPE VARCHAR(20),
  ALTER COLUMN statut        TYPE VARCHAR(10);

-- ─── TABLE non_renouveles ────────────────────────────────────
ALTER TABLE non_renouveles
  ALTER COLUMN n_enreg       TYPE TEXT,
  ALTER COLUMN code          TYPE VARCHAR(15),
  ALTER COLUMN dosage        TYPE TEXT,
  ALTER COLUMN conditionnement TYPE TEXT,
  ALTER COLUMN liste         TYPE VARCHAR(20),
  ALTER COLUMN obs           TYPE TEXT,
  ALTER COLUMN pays          TYPE VARCHAR(50),
  ALTER COLUMN type_prod     TYPE VARCHAR(20),
  ALTER COLUMN statut        TYPE VARCHAR(10);

-- Nettoyer les valeurs avec espaces parasites (ex: 'RE ')
UPDATE enregistrements SET type_prod = TRIM(type_prod) WHERE type_prod != TRIM(type_prod);
UPDATE enregistrements SET statut    = TRIM(statut)    WHERE statut    != TRIM(statut);
UPDATE retraits         SET type_prod = TRIM(type_prod) WHERE type_prod != TRIM(type_prod);
UPDATE non_renouveles   SET type_prod = TRIM(type_prod) WHERE type_prod != TRIM(type_prod);

-- Recréer la vue supprimée en début de migration
CREATE OR REPLACE VIEW v_stats AS
WITH last_version AS (
  SELECT version_label
  FROM nomenclature_versions
  ORDER BY reference_date DESC NULLS LAST, created_at DESC
  LIMIT 1
)
SELECT
  (SELECT COUNT(*) FROM enregistrements e
   WHERE e.source_version = COALESCE((SELECT version_label FROM last_version), e.source_version))::INT AS total_enregistrements,
  (SELECT COUNT(*) FROM enregistrements e
   WHERE e.source_version = COALESCE((SELECT version_label FROM last_version), e.source_version)
   AND e.is_new_vs_previous = TRUE)::INT AS total_nouveautes,
  (SELECT COUNT(*) FROM retraits)::INT                               AS total_retraits,
  (SELECT COUNT(*) FROM non_renouveles)::INT                         AS total_non_renouveles,
  (SELECT COUNT(*) FROM enregistrements e
   WHERE e.source_version = COALESCE((SELECT version_label FROM last_version), e.source_version)
   AND e.statut = 'F')::INT     AS fabriques_algerie,
  (SELECT COUNT(DISTINCT dci) FROM enregistrements e
   WHERE e.source_version = COALESCE((SELECT version_label FROM last_version), e.source_version))::INT AS dci_uniques,
  (SELECT COUNT(*) FROM newsletter_subscribers WHERE confirmed = TRUE)::INT AS abonnes_newsletter,
  (SELECT version_label FROM last_version) AS last_version;

SELECT 'Migration terminée ✓' AS status;
