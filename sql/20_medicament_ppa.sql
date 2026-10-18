-- ============================================================
-- DwaDZ — PPA (Prix Public Algérien) par médicament
--
-- La nomenclature MIPH ne publie pas les prix. Le PPA est saisi à la main
-- (admin → PPA) et affiché sur la fiche ; sans valeur, la fiche indique
-- « Prix non disponible ».
--
-- Table séparée de enregistrements, réécrite à chaque import de
-- nomenclature : la clé (n_enreg, code) survit aux ré-imports.
-- code = '' quand la nomenclature n'en fournit pas.
--
-- Application : psql "$DATABASE_URL" -f sql/20_medicament_ppa.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS medicament_ppa (
  n_enreg     TEXT NOT NULL,
  code        TEXT NOT NULL DEFAULT '',
  ppa_dzd     NUMERIC(12, 2) NOT NULL CHECK (ppa_dzd >= 0),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (n_enreg, code)
);
