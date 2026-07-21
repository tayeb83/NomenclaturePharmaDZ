-- ============================================================
-- DwaDZ — Espace Pro : prospects B2B (page /pro)
--
-- Offres : veille réglementaire labos/distributeurs, API de la
-- nomenclature structurée, fiche pharmacie premium.
--
-- Application : psql "$DATABASE_URL" -f sql/13_pro_leads.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS pro_leads (
  id           BIGSERIAL PRIMARY KEY,
  offer        TEXT NOT NULL CHECK (offer IN ('veille', 'api', 'fiche_pharmacie', 'autre')),
  organisation TEXT,
  nom          TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  message      TEXT,
  ip_hash      TEXT,
  status       TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'contacte', 'converti', 'rejete')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pro_leads_status ON pro_leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pro_leads_ip     ON pro_leads (ip_hash, created_at DESC);

COMMENT ON TABLE pro_leads IS
  'Prospects B2B de la page /pro : labos (veille réglementaire), éditeurs (API nomenclature), pharmaciens (fiche premium).';
