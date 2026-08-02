-- ============================================================
-- DwaDZ — Fiche Pharmacie Premium (offre /pro, 500 DZD/mois)
--
-- 1. garde_pharmacy_premium : badge « Vérifiée », mise en avant dans
--    les pages de garde, WhatsApp cliquable, photos, horaires détaillés.
-- 2. garde_pharmacy_views   : compteur de consultations de la fiche,
--    agrégé par jour — c'est la statistique promise au pharmacien.
--
-- Table séparée de garde_pharmacies volontairement : les fiches sont
-- réécrites à chaque import DSP (scripts/import_garde.py), l'abonnement
-- ne doit dépendre d'aucune colonne que l'import touche.
--
-- Application : psql "$DATABASE_URL" -f sql/15_garde_premium.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS garde_pharmacy_premium (
  pharmacy_id    BIGINT PRIMARY KEY REFERENCES garde_pharmacies(id) ON DELETE CASCADE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  verified       BOOLEAN NOT NULL DEFAULT FALSE,  -- badge « Vérifiée » (appel de contrôle effectué)
  plan           TEXT NOT NULL DEFAULT 'premium',
  starts_on      DATE,
  ends_on        DATE,                            -- fin d'abonnement : au-delà, la fiche redevient normale
  whatsapp_e164  TEXT,
  hours_fr       TEXT,                            -- horaires détaillés, texte libre (« Sam-Jeu 8h-20h, Ven 14h-20h »)
  hours_ar       TEXT,
  highlight_fr   TEXT,                            -- accroche courte affichée sous le nom
  highlight_ar   TEXT,
  photos         JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ "url": "https://…", "caption": "…" }]
  admin_note     TEXT,                            -- usage interne (facturation, contact) — jamais affiché
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garde_premium_active
  ON garde_pharmacy_premium (is_active, ends_on);

CREATE TABLE IF NOT EXISTS garde_pharmacy_views (
  pharmacy_id  BIGINT NOT NULL REFERENCES garde_pharmacies(id) ON DELETE CASCADE,
  day          DATE NOT NULL DEFAULT CURRENT_DATE,
  views        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pharmacy_id, day)
);

CREATE INDEX IF NOT EXISTS idx_garde_views_day ON garde_pharmacy_views (day DESC);

COMMENT ON TABLE garde_pharmacy_premium IS
  'Abonnements « Fiche Pharmacie Premium » (page /pro). Une fiche est premium si is_active et que la date du jour est dans [starts_on, ends_on] (bornes nulles = illimité).';
COMMENT ON TABLE garde_pharmacy_views IS
  'Consultations des fiches pharmacie, agrégées par jour. Aucun identifiant visiteur n''est stocké — seulement un compteur.';
