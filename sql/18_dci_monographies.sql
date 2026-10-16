-- ============================================================
-- DwaDZ — Monographies par DCI (contenu médical rédigé et relu)
--
-- La nomenclature MIPH ne publie ni indications, ni contre-indications, ni
-- effets indésirables. Ce contenu est saisi à la main (admin → Monographies),
-- sourcé et relu, puis affiché sur TOUTES les fiches qui partagent la DCI.
--
-- Une ligne par (DCI, langue). Seules les lignes status = 'publie' sont
-- visibles du public ; 'brouillon' reste interne.
--
-- Application : psql "$DATABASE_URL" -f sql/18_dci_monographies.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS dci_monographies (
  dci                    TEXT NOT NULL,                 -- UPPER(TRIM(dci)) de la nomenclature
  lang                   VARCHAR(2) NOT NULL CHECK (lang IN ('fr', 'ar')),
  status                 VARCHAR(10) NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'publie')),
  mecanisme              TEXT,
  indications            TEXT,
  posologie              TEXT,
  contre_indications     TEXT,
  effets_indesirables    TEXT,
  grossesse_allaitement  TEXT,
  interactions           TEXT,
  sources                TEXT,                          -- références (RCP, ANSM, EMA, OMS…), une par ligne
  reviewed_by            TEXT,                          -- relecteur (affiché)
  reviewed_at            DATE,
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (dci, lang)
);

CREATE INDEX IF NOT EXISTS idx_dci_monographies_status
  ON dci_monographies (status) WHERE status = 'publie';
