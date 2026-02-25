-- ============================================================
-- PharmaVeille DZ — Schema PostgreSQL (Supabase)
-- Ministère de l'Industrie Pharmaceutique Algérien
-- ============================================================

-- Extension pour la recherche fulltext
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── TABLE ENREGISTREMENTS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS enregistrements (
  id              SERIAL PRIMARY KEY,
  n_enreg         TEXT UNIQUE NOT NULL,          -- certains exports récents dépassent 30
  code            VARCHAR(15),                   -- max : 8
  dci             TEXT NOT NULL,                 -- max : 254
  nom_marque      TEXT NOT NULL,                 -- max : 37
  forme           TEXT,                          -- max : 59
  dosage          TEXT,                          -- max : 227 (formules complexes)
  conditionnement TEXT,                          -- max : 174
  liste           VARCHAR(20),                   -- max : 8
  prescription    VARCHAR(20),
  obs             TEXT,
  labo            TEXT,                          -- max : 74
  pays            VARCHAR(50),                   -- max : 21 ("REPUBLIQUE DU BELARUS")
  date_init       DATE,
  date_final      DATE,
  type_prod       VARCHAR(20),                   -- max : 3 mais on prend de la marge
  statut          VARCHAR(10),                   -- max : 1 (F/I)
  stabilite       VARCHAR(30),
  annee           SMALLINT,
  source_version  VARCHAR(40),
  is_new_vs_previous BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nomenclature_versions (
  id              SERIAL PRIMARY KEY,
  version_label   VARCHAR(40) UNIQUE NOT NULL,
  reference_date  DATE,
  previous_label  VARCHAR(40),
  total_enregistrements INTEGER DEFAULT 0,
  total_nouveautes INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE RETRAITS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retraits (
  id              SERIAL PRIMARY KEY,
  n_enreg         TEXT,
  code            VARCHAR(15),
  dci             TEXT NOT NULL,
  nom_marque      TEXT NOT NULL,
  forme           TEXT,
  dosage          TEXT,                          -- max : 109
  conditionnement TEXT,                          -- max : 144
  liste           VARCHAR(20),                   -- max : 11 ("Liste I HOP")
  prescription    TEXT,                          -- max : 84 (prescriptions longues)
  labo            TEXT,                          -- max : 80
  pays            VARCHAR(50),                   -- max : 21
  date_init       DATE,
  type_prod       VARCHAR(20),
  statut          VARCHAR(10),
  date_retrait    DATE,
  motif_retrait   TEXT,                          -- max : 335
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE NON RENOUVELÉS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS non_renouveles (
  id              SERIAL PRIMARY KEY,
  n_enreg         TEXT,
  code            VARCHAR(15),
  dci             TEXT NOT NULL,
  nom_marque      TEXT NOT NULL,                 -- max : 271
  forme           TEXT,                          -- max : 66
  dosage          TEXT,                          -- max : 253
  conditionnement TEXT,                          -- max : 574
  liste           VARCHAR(20),
  prescription    VARCHAR(20),
  obs             TEXT,                          -- max : 45
  labo            TEXT,                          -- max : 75
  pays            VARCHAR(50),
  date_init       DATE,
  date_final      DATE,
  type_prod       VARCHAR(20),
  statut          VARCHAR(10),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE NEWSLETTER ABONNÉS ────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  nom           VARCHAR(100),
  ville         VARCHAR(100),
  confirmed     BOOLEAN DEFAULT FALSE,
  confirm_token VARCHAR(64),
  unsubscribe_token VARCHAR(64),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE PUBLICATIONS RÉSEAUX SOCIAUX ──────────────────────
CREATE TABLE IF NOT EXISTS social_posts (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(20) NOT NULL, -- 'retrait', 'nouveaute', 'newsletter'
  platform      VARCHAR(20) NOT NULL, -- 'facebook', 'twitter', 'newsletter'
  content       TEXT NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending', -- 'pending', 'published', 'failed'
  published_at  TIMESTAMPTZ,
  error_msg     TEXT,
  ref_id        INTEGER, -- ID du médicament concerné
  ref_table     VARCHAR(30),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEX POUR RECHERCHE FULLTEXT ───────────────────────────
-- Index trigramme pour recherche floue (typos tolérées)
CREATE INDEX idx_enreg_dci_trgm      ON enregistrements USING gin(dci gin_trgm_ops);
CREATE INDEX idx_enreg_marque_trgm   ON enregistrements USING gin(nom_marque gin_trgm_ops);
CREATE INDEX idx_retrait_dci_trgm    ON retraits USING gin(dci gin_trgm_ops);
CREATE INDEX idx_retrait_marque_trgm ON retraits USING gin(nom_marque gin_trgm_ops);
CREATE INDEX idx_nonrenouv_dci_trgm  ON non_renouveles USING gin(dci gin_trgm_ops);
CREATE INDEX idx_nonrenouv_marque_trgm ON non_renouveles USING gin(nom_marque gin_trgm_ops);

-- Index classiques
CREATE INDEX idx_enreg_annee     ON enregistrements(annee);
CREATE INDEX idx_enreg_version   ON enregistrements(source_version);
CREATE INDEX idx_enreg_new       ON enregistrements(is_new_vs_previous);
CREATE INDEX idx_enreg_type      ON enregistrements(type_prod);
CREATE INDEX idx_enreg_statut    ON enregistrements(statut);
CREATE INDEX idx_enreg_pays      ON enregistrements(pays);
CREATE INDEX idx_retraits_motif  ON retraits(motif_retrait);
CREATE INDEX idx_retraits_date   ON retraits(date_retrait);

-- ─── FONCTION RECHERCHE UNIFIÉE ──────────────────────────────
CREATE OR REPLACE FUNCTION search_medicaments(query TEXT, scope TEXT DEFAULT 'all', lim INTEGER DEFAULT 30)
RETURNS TABLE (
  source        TEXT,
  id            INTEGER,
  n_enreg       VARCHAR,
  dci           TEXT,
  nom_marque    TEXT,
  forme         TEXT,
  dosage        VARCHAR,
  labo          TEXT,
  pays          VARCHAR,
  type_prod     VARCHAR,
  statut        VARCHAR,
  annee         SMALLINT,
  date_retrait  DATE,
  motif_retrait TEXT,
  date_final    DATE,
  similarity_score FLOAT
) LANGUAGE SQL STABLE AS $$
  SELECT 'enregistrement'::TEXT, e.id, e.n_enreg, e.dci, e.nom_marque, e.forme, e.dosage,
         e.labo, e.pays, e.type_prod, e.statut, e.annee,
         NULL::DATE, NULL::TEXT, e.date_final,
         GREATEST(similarity(lower(e.dci), lower(query)), similarity(lower(e.nom_marque), lower(query)))
  FROM enregistrements e
  WHERE (scope = 'all' OR scope = 'enregistrement')
    AND (e.dci ILIKE '%' || query || '%' OR e.nom_marque ILIKE '%' || query || '%'
         OR similarity(lower(e.dci), lower(query)) > 0.2
         OR similarity(lower(e.nom_marque), lower(query)) > 0.2)

  UNION ALL

  SELECT 'retrait'::TEXT, r.id, r.n_enreg, r.dci, r.nom_marque, r.forme, r.dosage,
         r.labo, r.pays, r.type_prod, r.statut, NULL::SMALLINT,
         r.date_retrait, r.motif_retrait, NULL::DATE,
         GREATEST(similarity(lower(r.dci), lower(query)), similarity(lower(r.nom_marque), lower(query)))
  FROM retraits r
  WHERE (scope = 'all' OR scope = 'retrait')
    AND (r.dci ILIKE '%' || query || '%' OR r.nom_marque ILIKE '%' || query || '%'
         OR similarity(lower(r.dci), lower(query)) > 0.2
         OR similarity(lower(r.nom_marque), lower(query)) > 0.2)

  UNION ALL

  SELECT 'non_renouvele'::TEXT, n.id, n.n_enreg, n.dci, n.nom_marque, n.forme, n.dosage,
         n.labo, n.pays, n.type_prod, n.statut, NULL::SMALLINT,
         NULL::DATE, NULL::TEXT, n.date_final,
         GREATEST(similarity(lower(n.dci), lower(query)), similarity(lower(n.nom_marque), lower(query)))
  FROM non_renouveles n
  WHERE (scope = 'all' OR scope = 'non_renouvele')
    AND (n.dci ILIKE '%' || query || '%' OR n.nom_marque ILIKE '%' || query || '%'
         OR similarity(lower(n.dci), lower(query)) > 0.2
         OR similarity(lower(n.nom_marque), lower(query)) > 0.2)

  ORDER BY similarity_score DESC
  LIMIT lim;
$$;

-- ─── VUE STATISTIQUES ────────────────────────────────────────
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
