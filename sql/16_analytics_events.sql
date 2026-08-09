-- ─────────────────────────────────────────────────────────────
-- Migration 16 — Tables analytics (visites, clics de recherche, API)
--
-- Ces trois tables n'existaient que dans sql/01_schema.sql, le schéma de
-- base : une base créée avant leur ajout ne les a donc jamais reçues, et
-- aucune migration numérotée ne permettait de rattraper le retard. Le code
-- applicatif teste la présence de chaque table avant de l'interroger
-- (hasTable dans lib/queries.ts), si bien que leur absence ne provoque
-- aucune erreur visible : le dashboard analytics et le classement des
-- pages les plus consultées sur l'accueil restent simplement vides.
--
-- Cette migration est intégralement idempotente : elle peut être rejouée
-- sur une base qui possède déjà tout ou partie de ces objets.
--
--   psql "$DATABASE_URL" -f sql/16_analytics_events.sql
-- ─────────────────────────────────────────────────────────────

-- ─── Clics sur un résultat de recherche ──────────────────────
CREATE TABLE IF NOT EXISTS search_click_events (
  id            BIGSERIAL PRIMARY KEY,
  search_query  TEXT NOT NULL,
  scope         VARCHAR(30) NOT NULL DEFAULT 'all',
  result_source VARCHAR(20) NOT NULL,
  result_id     INTEGER NOT NULL,
  result_name   TEXT NOT NULL,
  result_dci    TEXT NOT NULL,
  result_labo   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Visites de pages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_visit_events (
  id            BIGSERIAL PRIMARY KEY,
  page_path     TEXT NOT NULL,
  page_title    TEXT,
  referrer      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Exécutions d'API ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_exec_events (
  id            BIGSERIAL PRIMARY KEY,
  api_path      TEXT NOT NULL,
  method        VARCHAR(10) NOT NULL,
  status_code   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Index ───────────────────────────────────────────────────
-- created_at : fenêtre glissante des agrégations (30 jours par défaut).
-- page_path / search_query : regroupement des classements.
CREATE INDEX IF NOT EXISTS idx_search_click_events_created_at ON search_click_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_click_events_query      ON search_click_events(search_query);
CREATE INDEX IF NOT EXISTS idx_page_visit_events_created_at   ON page_visit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visit_events_path         ON page_visit_events(page_path);
CREATE INDEX IF NOT EXISTS idx_api_exec_events_created_at     ON api_exec_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_exec_events_path           ON api_exec_events(api_path);

-- ─── Vérification ────────────────────────────────────────────
-- Après exécution, les trois tables doivent apparaître ; le classement de
-- l'accueil se remplit ensuite au fil des visites (il faut au moins une
-- page visitée hors accueil pour que la section s'affiche).
SELECT
  table_name,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = tables.table_name) AS index_count
FROM information_schema.tables AS tables
WHERE table_schema = 'public'
  AND table_name IN ('search_click_events', 'page_visit_events', 'api_exec_events')
ORDER BY table_name;
