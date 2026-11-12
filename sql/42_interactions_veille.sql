-- ============================================================
-- DwaDZ — Interactions médicamenteuses : veille et candidats à relire
--
-- L'ANSM reste la référence affichée (interactions_ansm, sql/29 et 40). Ces tables ne publient rien :
-- elles gardent les interactions que d'autres sources citent et que le thésaurus ne dit pas (ou dit
-- avec un autre niveau), avec la preuve de chacune, pour qu'un relecteur décide.
--
--   interactions_sources     registre des sources et de ce qu'on a le droit d'en faire
--   interactions_candidates  une ligne par PAIRE non ordonnée (paire_key), recalculée à chaque passage ;
--                            la décision humaine (statut, motif, relecteur) n'est jamais écrasée
--   interactions_evidence    les preuves : quel document, quelle rubrique, quelle page
--
-- Un candidat accepté devient une ligne 'manuelle' de interactions_ansm (sql/40), avec sa source
-- (promoted_id). Son niveau n'est pas celui de l'ANSM : il est choisi par le relecteur.
-- Un candidat rejeté reste en base avec son motif, pour ne pas revenir à chaque passage.
--
-- Prérequis : sql/29_interactions_ansm.sql, sql/40_interactions_admin.sql, sql/26_rcp_anpp.sql
-- Rempli par : npx tsx scripts/ddi_gap_rcp.mts --db --apply
-- Application : psql "$DATABASE_URL" -f sql/42_interactions_veille.sql
-- Idempotent : peut être rejoué sans risque.
-- ============================================================

CREATE TABLE IF NOT EXISTS interactions_sources (
  id           TEXT PRIMARY KEY,                -- ex. 'anpp_rcp', 'openfda'
  nom          TEXT NOT NULL,
  type         VARCHAR(20) NOT NULL CHECK (type IN ('regulateur_national', 'regulateur', 'base_curee', 'litterature', 'deduit')),
  langue       VARCHAR(8),
  url          TEXT,
  licence      TEXT,                            -- à vérifier avant toute réutilisation
  -- ce que DwaDZ peut faire du contenu : texte_libre, faits_seulement (citation + lien, pas de copie),
  -- signal_interne (sert à repérer, jamais affiché ni republié)
  reutilisation VARCHAR(16) NOT NULL DEFAULT 'faits_seulement' CHECK (reutilisation IN ('texte_libre', 'faits_seulement', 'signal_interne')),
  confiance    SMALLINT NOT NULL DEFAULT 3 CHECK (confiance BETWEEN 1 AND 5)
);

INSERT INTO interactions_sources (id, nom, type, langue, url, reutilisation, confiance) VALUES
  ('ansm',     'Thesaurus des interactions médicamenteuses (ANSM)', 'regulateur_national', 'fr', 'https://ansm.sante.fr', 'faits_seulement', 5),
  ('anpp_rcp', 'RCP publiés par l''ANPP (rubrique 4.5)',            'regulateur_national', 'fr', 'https://rcp.anpp.dz/',   'faits_seulement', 5),
  ('openfda',  'openFDA / DailyMed (notices américaines)',          'regulateur',          'en', 'https://open.fda.gov',   'faits_seulement', 4),
  ('cima',     'CIMA (AEMPS, Espagne)',                             'regulateur',          'es', 'https://cima.aemps.es',  'faits_seulement', 4),
  ('ema',      'EMA (RCP centralisés)',                             'regulateur',          'fr', 'https://www.ema.europa.eu', 'faits_seulement', 4),
  ('ddinter',  'DDInter',                                           'base_curee',          'en', 'https://ddinter2.scbdd.com', 'signal_interne', 3),
  ('europepmc','Europe PMC',                                        'litterature',         'en', 'https://europepmc.org',  'signal_interne', 2)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS interactions_candidates (
  id                BIGSERIAL PRIMARY KEY,
  paire_key         TEXT NOT NULL UNIQUE,        -- les deux substances (clés sans accents), triées, séparées par « | »
  substance_a       TEXT NOT NULL,
  substance_b       TEXT NOT NULL,
  ecart             VARCHAR(20) NOT NULL CHECK (ecart IN ('absente', 'divergence_niveau')),
  gravite_source    VARCHAR(20) NOT NULL CHECK (gravite_source IN ('contre_indiquee', 'deconseillee', 'precaution', 'a_prendre_en_compte', 'non_precisee')),
  niveau_ansm       VARCHAR(20),                 -- si divergence : le niveau du thésaurus
  sens              VARCHAR(20) CHECK (sens IN ('source_plus_grave', 'source_moins_grave')),
  via               TEXT[],                      -- lignes du thésaurus qui couvrent déjà la paire (divergence)
  a_hors_thesaurus  BOOLEAN NOT NULL DEFAULT FALSE,
  b_hors_thesaurus  BOOLEAN NOT NULL DEFAULT FALSE,
  n_sources         INTEGER NOT NULL DEFAULT 1,  -- RCP distincts ; indicatif (les génériques recopient le princeps)
  score             INTEGER NOT NULL DEFAULT 0,  -- ordre de revue, voir lib/interactions-gap-core.ts
  -- décision humaine : jamais écrasée par un nouveau passage
  statut            VARCHAR(10) NOT NULL DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'en_revue', 'accepte', 'rejete', 'differe')),
  motif             TEXT,
  reviewed_by       TEXT,
  reviewed_at       TIMESTAMPTZ,
  promoted_id       INTEGER REFERENCES interactions_ansm (id) ON DELETE SET NULL,
  first_seen        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (statut IN ('nouveau', 'en_revue') OR (reviewed_by IS NOT NULL AND btrim(reviewed_by) <> '')),
  CHECK (statut <> 'rejete' OR (motif IS NOT NULL AND btrim(motif) <> ''))
);

CREATE INDEX IF NOT EXISTS idx_interactions_candidates_file ON interactions_candidates (score DESC) WHERE statut IN ('nouveau', 'en_revue');

CREATE TABLE IF NOT EXISTS interactions_evidence (
  id            BIGSERIAL PRIMARY KEY,
  candidate_id  BIGINT NOT NULL REFERENCES interactions_candidates (id) ON DELETE CASCADE,
  source_id     TEXT NOT NULL REFERENCES interactions_sources (id),
  ref           TEXT NOT NULL,                   -- rcp_id, setid, nregistro, PMID…
  section       TEXT NOT NULL DEFAULT '',        -- 4.5, 7…
  page          SMALLINT,
  version       TEXT,                            -- version du document (rcp_documents.version_texte, setid, etc.)
  gravite       VARCHAR(20),                     -- gravité dans les termes de la source
  contexte      TEXT,                            -- phrase d'origine : ADMIN SEULEMENT, jamais publiée
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id, source_id, ref, section)
);

CREATE INDEX IF NOT EXISTS idx_interactions_evidence_candidate ON interactions_evidence (candidate_id);
