-- ============================================================
-- PharmaVeille DZ — Cache des logos de laboratoires
-- Migration optionnelle : permet de surcharger/enrichir le
-- mapping statique de lib/lab-logos.ts avec des URLs vérifiées.
-- ============================================================

CREATE TABLE IF NOT EXISTS lab_logos_cache (
  id           SERIAL PRIMARY KEY,
  labo_name    TEXT UNIQUE NOT NULL,       -- Nom normalisé du labo (UPPER TRIM)
  logo_url     TEXT,                        -- URL du logo (null = non trouvé)
  source       VARCHAR(50)                  -- 'manual', 'clearbit', 'wikipedia'
                 DEFAULT 'manual',
  verified     BOOLEAN DEFAULT FALSE,       -- URL vérifiée manuellement
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index insensible à la casse pour la recherche par nom
CREATE INDEX IF NOT EXISTS idx_lab_logos_name
  ON lab_logos_cache (LOWER(labo_name));

-- ─── Données initiales (labos algériens vérifiés) ─────────────
INSERT INTO lab_logos_cache (labo_name, logo_url, source, verified)
VALUES
  ('SAIDAL',     'https://logo.clearbit.com/saidal-pharma.com',    'clearbit', false),
  ('BIOPHARM',   'https://logo.clearbit.com/biopharm.dz',          'clearbit', false),
  ('EL KENDI',   'https://logo.clearbit.com/elkendi.com',           'clearbit', false),
  ('HIKMA',      'https://logo.clearbit.com/hikma.com',             'clearbit', false),
  ('SANOFI',     'https://logo.clearbit.com/sanofi.com',            'clearbit', false),
  ('PFIZER',     'https://logo.clearbit.com/pfizer.com',            'clearbit', false),
  ('NOVARTIS',   'https://logo.clearbit.com/novartis.com',          'clearbit', false),
  ('BAYER',      'https://logo.clearbit.com/bayer.com',             'clearbit', false),
  ('ROCHE',      'https://logo.clearbit.com/roche.com',             'clearbit', false)
ON CONFLICT (labo_name) DO NOTHING;
