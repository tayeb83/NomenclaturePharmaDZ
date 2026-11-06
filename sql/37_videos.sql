-- ============================================================
-- DwaDZ — Vidéos pédagogiques (arabe standard, sous-titres français)
--
-- Une ligne par vidéo. Le fichier MP4 n'est PAS dans la base : on y stocke son adresse
-- (Vercel Blob ou toute adresse https). Les sous-titres WebVTT sont stockés ici et servis
-- par /api/videos/<slug>/captions/<ar|fr> (même origine : pas de souci CORS).
--
-- Seules les vidéos status = 'publie' sont visibles du public. La base refuse de publier
-- sans fichier vidéo, sans relecteur et sans sources (comme les monographies).
--
-- Application : psql "$DATABASE_URL" -f sql/37_videos.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS videos (
  id                    SERIAL PRIMARY KEY,
  slug                  TEXT NOT NULL UNIQUE,
  episode               SMALLINT,
  titre_ar              TEXT NOT NULL,
  titre_fr              TEXT NOT NULL,
  description_ar        TEXT NOT NULL DEFAULT '',
  description_fr        TEXT NOT NULL DEFAULT '',
  video_url             TEXT,                          -- adresse https du fichier MP4
  poster_url            TEXT,                          -- image d'aperçu (facultative)
  sous_titres_incrustes BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE : les sous-titres sont déjà dans l'image
  vtt_ar                TEXT,                          -- sous-titres WebVTT arabes
  vtt_fr                TEXT,                          -- sous-titres WebVTT français
  duree_sec             INTEGER CHECK (duree_sec IS NULL OR duree_sec > 0),
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  sources               TEXT NOT NULL DEFAULT '',      -- références médicales (ANSM, RCP, OMS…), une par ligne
  statut                VARCHAR(10) NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'publie')),
  reviewed_by           TEXT,                          -- relecteur (pharmacien / médecin)
  reviewed_at           DATE,
  published_at          TIMESTAMPTZ,
  fb_post_id            TEXT,                          -- identifiant de la vidéo sur la Page Facebook
  fb_published_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (video_url IS NULL OR video_url ~ '^https://'),
  CHECK (poster_url IS NULL OR poster_url ~ '^https://'),
  CHECK (
    statut <> 'publie' OR (
      video_url IS NOT NULL
      AND reviewed_by IS NOT NULL AND btrim(reviewed_by) <> ''
      AND btrim(sources) <> ''
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_videos_publie ON videos (episode, published_at DESC) WHERE statut = 'publie';

COMMENT ON TABLE videos IS 'Vidéos pédagogiques DwaDZ : voix et texte en arabe standard, traduction française en sous-titres.';
