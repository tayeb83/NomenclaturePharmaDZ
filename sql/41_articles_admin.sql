-- ============================================================
-- DwaDZ — Articles publiés depuis l'admin (français / arabe)
--
-- Les articles historiques restent dans lib/articles*.ts. Cette table reçoit ceux que l'équipe écrit
-- (ou importe d'une autre source) dans /admin/articles. Le site fusionne les deux : les articles de la
-- base apparaissent dans /articles, le sitemap et le partage Facebook, comme les autres.
--
--   lang              'fr' ou 'ar' : un article = une langue ; relier les deux versions avec traduction_slug.
--   body              texte en Markdown simple (## titres, listes, tableaux, > encadrés, images).
--   source_nom/url    article écrit ailleurs : la source d'origine est affichée sous l'article.
--   statut            seuls les articles 'publie' sont visibles du public.
--   fb_post_id        publication de l'article sur la Page Facebook (depuis l'admin).
--
-- Application : psql "$DATABASE_URL" -f sql/41_articles_admin.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS articles (
  id               SERIAL PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  lang             VARCHAR(2) NOT NULL CHECK (lang IN ('fr', 'ar')),
  audience         VARCHAR(12) NOT NULL DEFAULT 'professionnel' CHECK (audience IN ('professionnel', 'etudiant')),
  title            TEXT NOT NULL,
  subtitle         TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  seo_title        TEXT,
  tags             TEXT[] NOT NULL DEFAULT '{}',
  image_url        TEXT CHECK (image_url IS NULL OR image_url ~ '^https://'),
  body             TEXT NOT NULL DEFAULT '',
  traduction_slug  TEXT,
  source_nom       TEXT,
  source_url       TEXT CHECK (source_url IS NULL OR source_url ~ '^https?://'),
  statut           VARCHAR(10) NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'publie')),
  published_at     TIMESTAMPTZ,
  fb_post_id       TEXT,
  fb_published_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CHECK (statut <> 'publie' OR (btrim(body) <> '' AND btrim(description) <> ''))
);

CREATE INDEX IF NOT EXISTS idx_articles_publie ON articles (lang, published_at DESC) WHERE statut = 'publie';

COMMENT ON TABLE articles IS 'Articles DwaDZ publiés depuis /admin/articles (FR/AR), en plus de ceux écrits dans lib/articles*.ts.';
