-- ============================================================
-- DwaDZ — Logos (armoiries) des wilayas pour les visuels de garde
--
-- Les images publiées sur Facebook pour les pharmacies de garde
-- affichent, quand il est disponible, le logo officiel de la wilaya
-- concernée. Le stockage se fait en base (et non sur le disque) :
-- l'hébergement Vercel est en lecture seule et sans volume persistant.
--
-- Les logos restent petits (≤ 400 Ko, PNG/JPEG) : ils sont chargés une
-- fois par instance et injectés en data URI dans le rendu satori.
--
-- Application : psql "$DATABASE_URL" -f sql/16_garde_wilaya_logos.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS garde_wilaya_logos (
  wilaya_code  TEXT PRIMARY KEY,            -- code wilaya tel qu'utilisé par garde_rosters
  mime         TEXT NOT NULL,               -- image/png | image/jpeg
  data_base64  TEXT NOT NULL,               -- contenu binaire encodé base64
  file_name    TEXT,                        -- nom d'origine (usage informatif)
  byte_size    INTEGER,                     -- taille du binaire d'origine
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE garde_wilaya_logos IS
  'Logos/armoiries des wilayas affichés sur les visuels Facebook des pharmacies de garde.';
COMMENT ON COLUMN garde_wilaya_logos.data_base64 IS
  'Image encodée en base64 (data URI reconstruit à la volée pour le rendu satori).';
