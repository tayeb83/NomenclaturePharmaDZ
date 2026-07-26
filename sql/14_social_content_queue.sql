-- ============================================================
-- DwaDZ — File d'attente des publications réseaux sociaux (Facebook)
-- Rubriques éditoriales générées depuis la nomenclature, publiées
-- tous les 2-3 jours sur la Page Facebook (auto + validation).
-- ============================================================

CREATE TABLE IF NOT EXISTS social_content_queue (
  id            SERIAL PRIMARY KEY,
  rubrique      VARCHAR(20) NOT NULL,          -- 'classe' | 'algerie' | 'retrait' | 'nouveaute'
  titre         TEXT NOT NULL,                 -- titre court (usage interne / admin)
  corps         TEXT NOT NULL,                 -- corps du post (éditable), SANS le lien
  lien          TEXT,                          -- URL vers le site (aperçu Facebook)
  statut        VARCHAR(12) NOT NULL DEFAULT 'draft', -- draft | approuve | publie | ignore
  scheduled_for TIMESTAMPTZ,                   -- date de publication proposée
  published_at  TIMESTAMPTZ,
  fb_post_id    TEXT,
  error         TEXT,                          -- dernière erreur de publication le cas échéant
  dedup_key     TEXT UNIQUE,                   -- ex: 'classe:N06A' — évite de reproposer le même sujet
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- File d'attente à publier : prochains posts approuvés dont la date est arrivée
CREATE INDEX IF NOT EXISTS idx_social_content_queue_due
  ON social_content_queue(statut, scheduled_for);

-- Historique de rotation : derniers sujets couverts par rubrique
CREATE INDEX IF NOT EXISTS idx_social_content_queue_rubrique
  ON social_content_queue(rubrique, created_at DESC);

COMMENT ON TABLE social_content_queue IS
  'File d''attente éditoriale des publications Facebook (rubriques thématiques sur la nomenclature).';
COMMENT ON COLUMN social_content_queue.statut IS
  'draft = brouillon proposé par le générateur ; approuve = validé par l''admin ; publie = envoyé sur Facebook ; ignore = écarté.';
COMMENT ON COLUMN social_content_queue.dedup_key IS
  'Clé de déduplication (rubrique:sujet) pour ne pas reproposer un sujet déjà en file ou déjà publié.';
