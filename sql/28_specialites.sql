-- ============================================================
-- DwaDZ — Spécialités (dentisterie, …) : un classement de navigation
--
-- Une spécialité regroupe des classes ATC (ou des substances isolées) pour
-- retrouver vite « les médicaments du dentiste ». Aucune information médicale
-- n'est stockée ici : les listes, fiches, prix et RCP restent ceux du site,
-- les compteurs sont calculés à chaque affichage.
--
-- specialites       : titre et présentation en français et en arabe
-- specialite_items  : une ligne par classe ATC ('atc', ex. N01B) ou par
--                     substance ('dci', ex. CHLORHEXIDINE), avec libellé arabe
--                     optionnel (la table ATC n'existe qu'en FR/EN).
--
-- Gérée depuis /admin/specialites. Sans cette migration, le site affiche une
-- spécialité « Dentisterie » par défaut (lib/specialites.ts) en lecture seule.
--
-- Application : psql "$DATABASE_URL" -f sql/28_specialites.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS specialites (
  slug            TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titre_fr        TEXT NOT NULL,
  titre_ar        TEXT,
  description_fr  TEXT,
  description_ar  TEXT,
  ordre           INT NOT NULL DEFAULT 0,
  actif           BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS specialite_items (
  id              BIGSERIAL PRIMARY KEY,
  specialite_slug TEXT NOT NULL REFERENCES specialites (slug) ON DELETE CASCADE ON UPDATE CASCADE,
  kind            VARCHAR(3) NOT NULL CHECK (kind IN ('atc', 'dci')),
  valeur          TEXT NOT NULL,          -- code ATC en majuscules, ou DCI = UPPER(TRIM(dci)) de la nomenclature
  libelle_ar      TEXT,
  ordre           INT NOT NULL DEFAULT 0,
  UNIQUE (specialite_slug, kind, valeur)
);

CREATE INDEX IF NOT EXISTS idx_specialite_items_slug ON specialite_items (specialite_slug, ordre);

-- Point de départ : Dentisterie. Les libellés arabes sont à relire.
INSERT INTO specialites (slug, titre_fr, titre_ar, ordre)
VALUES ('dentaire', 'Dentisterie', 'طب الأسنان', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO specialite_items (specialite_slug, kind, valeur, libelle_ar, ordre) VALUES
  ('dentaire', 'atc', 'A01',  'مستحضرات الفم والأسنان', 1),
  ('dentaire', 'atc', 'N01B', 'المخدّرات الموضعية', 2),
  ('dentaire', 'atc', 'J01',  'مضادات الجراثيم للاستعمال الجهازي', 3),
  ('dentaire', 'atc', 'N02',  'المسكّنات', 4),
  ('dentaire', 'atc', 'M01',  'مضادات الالتهاب ومضادات الروماتيزم', 5)
ON CONFLICT (specialite_slug, kind, valeur) DO NOTHING;
