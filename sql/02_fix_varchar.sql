-- ============================================================
-- PharmaVeille DZ — Migration : correction des tailles VARCHAR
-- Lance ce script si les tables existent déjà et que tu as
-- l'erreur "value too long for type character varying"
--
-- Usage dans le terminal :
--   psql -U postgres -d pharmaveille -f sql/02_fix_varchar.sql
-- ============================================================

-- ─── TABLE enregistrements ───────────────────────────────────
ALTER TABLE enregistrements
  ALTER COLUMN n_enreg       TYPE VARCHAR(30),
  ALTER COLUMN code          TYPE VARCHAR(15),
  ALTER COLUMN dosage        TYPE TEXT,
  ALTER COLUMN conditionnement TYPE TEXT,
  ALTER COLUMN liste         TYPE VARCHAR(20),
  ALTER COLUMN prescription  TYPE VARCHAR(20),
  ALTER COLUMN obs           TYPE TEXT,
  ALTER COLUMN pays          TYPE VARCHAR(50),
  ALTER COLUMN type_prod     TYPE VARCHAR(20),
  ALTER COLUMN statut        TYPE VARCHAR(10);

-- ─── TABLE retraits ──────────────────────────────────────────
ALTER TABLE retraits
  ALTER COLUMN n_enreg       TYPE VARCHAR(30),
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
  ALTER COLUMN n_enreg       TYPE VARCHAR(30),
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

SELECT 'Migration terminée ✓' AS status;
