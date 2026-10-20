-- ============================================================
-- DwaDZ — NAQESS : signalements participatifs d'accès aux médicaments
--
-- Un visiteur signale, anonymement, depuis la fiche d'un médicament :
--   introuvable    — « je ne l'ai pas trouvé en pharmacie »
--   prix_inattendu — « trouvé, mais à un prix inattendu »
--   trouve         — « trouvé en pharmacie »
-- avec la wilaya et le nombre de pharmacies consultées.
--
-- Ce sont des SIGNALEMENTS DÉCLARATIFS, jamais des mesures de stock : ils
-- sont comptés à part des consultations de fiche (search_click_events) et
-- aucun chiffre n'en est tiré sans nombre minimal de déclarants distincts.
--
-- Aucune donnée personnelle : seul un hash salé de l'IP est conservé, pour
-- dédoublonner (même client / même médicament / même wilaya / même type
-- par 24 h) et limiter les abus.
--
-- Application : psql "$DATABASE_URL" -f sql/21_acces_signalements.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS acces_signalements (
  id            BIGSERIAL PRIMARY KEY,
  med_source    TEXT NOT NULL,          -- enregistrement | retrait | non_renouvele…
  med_id        INTEGER NOT NULL,
  med_name      TEXT NOT NULL,          -- snapshot (robuste aux ré-imports)
  dci           TEXT,
  wilaya_code   TEXT NOT NULL,
  signal_type   TEXT NOT NULL CHECK (signal_type IN ('introuvable', 'prix_inattendu', 'trouve')),
  pharmacies    TEXT NOT NULL CHECK (pharmacies IN ('1', '2-3', '4+')),
  ip_hash       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'valide' CHECK (status IN ('valide', 'rejete')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acces_med     ON acces_signalements (med_source, med_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acces_wilaya  ON acces_signalements (wilaya_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acces_dedup   ON acces_signalements (ip_hash, med_source, med_id, wilaya_code, signal_type, created_at DESC);

COMMENT ON TABLE acces_signalements IS
  'Signalements anonymes et déclaratifs d''accès aux médicaments (NAQESS). Ne mesure pas le stock. Modération via status = ''rejete''.';
