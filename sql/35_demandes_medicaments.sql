-- ============================================================
-- DwaDZ — Demandes de médicaments (ruptures / recherches de disponibilité)
--
-- L'admin colle un JSON déjà structuré (sans donnée personnelle) ; chaque
-- demande reste « active » jusqu'à expiration ou clôture. Le cron
-- /api/cron/demandes-daily en tire un brouillon de post Facebook par jour
-- (rubrique 'demande' de social_content_queue) et /demandes les affiche.
--
-- Aucune donnée de patient : ni nom, ni contact, ni pathologie. Le lieu
-- (wilaya, commune) est facultatif. La commune n'est jamais publiée.
-- ============================================================

CREATE TABLE IF NOT EXISTS demandes_medicaments (
  id                  SERIAL PRIMARY KEY,
  medicament          TEXT NOT NULL,                 -- DCI + dosage + forme, tel que saisi
  dci                 TEXT,                          -- DCI seule (minuscules, sans accents)
  dci_match           TEXT,                          -- DCI canonique de la nomenclature, si rapprochée
  marques             TEXT[] NOT NULL DEFAULT '{}',  -- noms commerciaux cités
  wilaya              TEXT,                          -- facultatif
  commune             TEXT,                          -- facultatif, jamais publié
  urgence             VARCHAR(8) NOT NULL DEFAULT 'normale'
                        CHECK (urgence IN ('haute', 'normale')),
  nb_demandes         INTEGER NOT NULL DEFAULT 1 CHECK (nb_demandes > 0),
  statut              VARCHAR(8) NOT NULL DEFAULT 'active'
                        CHECK (statut IN ('active', 'trouvee', 'expiree', 'clos')),
  agg_key             TEXT NOT NULL,                 -- médicament normalisé | wilaya normalisée
  note_privee         TEXT,                          -- jamais publiée
  derniere_demande_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expire_le           TIMESTAMPTZ NOT NULL,
  trouvee_le          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Une seule demande ACTIVE par (médicament, wilaya) : une nouvelle saisie
-- identique incrémente nb_demandes et repousse l'expiration.
CREATE UNIQUE INDEX IF NOT EXISTS uq_demandes_active_key
  ON demandes_medicaments (agg_key) WHERE statut = 'active';

CREATE INDEX IF NOT EXISTS idx_demandes_statut_expire
  ON demandes_medicaments (statut, expire_le);

COMMENT ON TABLE demandes_medicaments IS
  'Demandes de disponibilité de médicaments, agrégées par (médicament, wilaya). Aucune donnée personnelle.';
COMMENT ON COLUMN demandes_medicaments.statut IS
  'active = relayée ; trouvee = disponibilité confirmée ; expiree = délai dépassé ; clos = abandonnée par l''admin.';
COMMENT ON COLUMN demandes_medicaments.commune IS
  'Usage interne uniquement : ni le site ni les posts Facebook ne l''affichent (risque de ré-identification).';
