-- ============================================================
-- DwaDZ — Vidéos : bouton d'appel à l'action (lien cliquable)
--
-- Un lien ne peut pas être cliquable DANS un fichier vidéo ni sur un Réel Facebook : il l'est dans
-- (1) le bouton affiché sous la vidéo sur le site, (2) la légende Facebook (avec suivi de provenance utm_*).
-- Les trois colonnes sont facultatives.
--
-- Prérequis : sql/37_videos.sql
-- Application : psql "$DATABASE_URL" -f sql/38_videos_cta.sql
-- ============================================================

ALTER TABLE videos ADD COLUMN IF NOT EXISTS cta_url       TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS cta_label_fr  TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS cta_label_ar  TEXT;

DO $$ BEGIN
  ALTER TABLE videos ADD CONSTRAINT videos_cta_url_https CHECK (cta_url IS NULL OR cta_url ~ '^https://');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN videos.cta_url IS 'Lien du bouton affiché sous la vidéo et ajouté à la légende Facebook (https).';
