-- ============================================================
-- DwaDZ — Faits courts tirés des RCP (doses chiffrées, contre-indications,
-- grossesse et allaitement, associations), relus avant publication, et
-- interrupteurs d'urgence.
--
-- Rien n'est copié : un fait est une information courte (« 25–30 mg par jour »,
-- « Méthotrexate », « Insuffisance hépatique sévère », « Allaitement : contre-indiqué »)
-- avec sa rubrique, sa page et le lien vers le PDF de l'ANPP.
-- La phrase d'origine (contexte) sert seulement à la relecture dans l'admin ;
-- elle n'est jamais affichée au public.
--
-- Un fait n'est visible qu'une fois publié, avec un relecteur (contrôlé aussi
-- par la base).
--
-- Interrupteurs : rcp_reglages ('liens' = bloc RCP officiel, 'faits' = les faits),
-- masquage par document (faits_masques, retire) et par laboratoire depuis l'admin.
--
-- Prérequis : sql/26_rcp_anpp.sql
-- Rempli par : python scripts/extract_rcp_faits.py puis scripts/import_rcp_faits.py
-- Application : psql "$DATABASE_URL" -f sql/27_rcp_faits.sql
-- ============================================================

ALTER TABLE rcp_documents ADD COLUMN IF NOT EXISTS faits_masques BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS rcp_reglages (
  cle         TEXT PRIMARY KEY CHECK (cle IN ('liens', 'faits')),
  actif       BOOLEAN NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO rcp_reglages (cle, actif) VALUES ('liens', TRUE), ('faits', TRUE)
ON CONFLICT (cle) DO NOTHING;

CREATE TABLE IF NOT EXISTS rcp_faits (
  id           BIGSERIAL PRIMARY KEY,
  rcp_id       UUID NOT NULL REFERENCES rcp_documents (rcp_id) ON DELETE CASCADE,
  type         VARCHAR(18) NOT NULL CHECK (type IN ('dose', 'interaction', 'contre_indication', 'grossesse')),
  section      VARCHAR(8) NOT NULL,                 -- rubrique du RCP : 4.2, 4.3, 4.5
  page         SMALLINT NOT NULL CHECK (page > 0),  -- page du PDF
  libelle      TEXT NOT NULL,                       -- court, modifiable à la relecture
  -- interactions
  gravite      VARCHAR(20) CHECK (gravite IN ('contre_indiquee', 'deconseillee', 'precaution', 'a_prendre_en_compte', 'non_precisee')),
  cible_type   VARCHAR(6) CHECK (cible_type IN ('dci', 'classe')),
  cible        TEXT,                                -- DCI en majuscules, ou code ATC de la classe
  -- doses
  population   VARCHAR(14) CHECK (population IN ('adulte', 'enfant', 'personne_agee', 'non_precisee')),
  dose_min     NUMERIC,
  dose_max     NUMERIC,
  unite        VARCHAR(8),                          -- mg, g, mcg, ui, ml, mg/kg…
  par          VARCHAR(8),                          -- jour, prise, semaine
  -- relecture
  contexte     TEXT,                                -- phrase d'origine : ADMIN SEULEMENT, jamais publiée
  cle          TEXT NOT NULL,                       -- empreinte stable pour les ré-imports
  status       VARCHAR(10) NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'publie', 'rejete')),
  reviewed_by  TEXT,
  reviewed_at  TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rcp_id, cle),
  CHECK (status <> 'publie' OR (reviewed_by IS NOT NULL AND btrim(reviewed_by) <> ''))
);

CREATE INDEX IF NOT EXISTS idx_rcp_faits_publies ON rcp_faits (rcp_id) WHERE status = 'publie';

-- Mise à niveau d'une table créée avant l'ajout des contre-indications et de la grossesse.
ALTER TABLE rcp_faits ALTER COLUMN type TYPE VARCHAR(18);
ALTER TABLE rcp_faits DROP CONSTRAINT IF EXISTS rcp_faits_type_check;
ALTER TABLE rcp_faits ADD CONSTRAINT rcp_faits_type_check
  CHECK (type IN ('dose', 'interaction', 'contre_indication', 'grossesse'));
