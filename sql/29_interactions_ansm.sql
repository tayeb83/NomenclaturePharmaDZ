-- ============================================================
-- DwaDZ — Interactions médicamenteuses (Thesaurus ANSM)
--
-- Le thésaurus raisonne par SUBSTANCE (ou classe de substances), pas par
-- spécialité. Chaque ligne ci-dessous est une ligne « + PARTENAIRE » du
-- thésaurus : « quand on prend <substance>, avec <partenaire> : <risque>,
-- <niveau>, <conduite à tenir> ». Une fiche médicament affiche les interactions
-- de ses substances, et de leurs classes (rubrique « Voir aussi » du thésaurus).
--
-- Les textes français sont ceux de l'ANSM, non reformulés. Les traductions
-- arabes (risque_ar, conduite_ar, partenaire_ar) sont ajoutées à part ; tant
-- qu'elles sont absentes la fiche arabe affiche le texte français d'origine.
-- ar_statut : 'absent' (rien) · 'brouillon' (traduit, pas relu) · 'relu'.
--
-- Rempli par : python scripts/extract_ansm_interactions.py (PDF → JSON)
--              python scripts/import_ansm_interactions.py  (JSON → base)
-- Application : psql "$DATABASE_URL" -f sql/29_interactions_ansm.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS interactions_ansm (
  id                    SERIAL PRIMARY KEY,
  substance             TEXT NOT NULL,        -- titre dans le thésaurus, tel qu'écrit (majuscules)
  substance_key         TEXT NOT NULL,        -- même texte sans accents ni ponctuation, en minuscules
  partenaire            TEXT NOT NULL,        -- « + PARTENAIRE » : une substance ou une classe
  partenaire_key        TEXT NOT NULL,
  partenaire_est_classe BOOLEAN NOT NULL DEFAULT FALSE,
  -- niveau principal (le plus grave). Une ligne composée (« CI - ASDEC - APEC ») les
  -- garde tous dans `niveaux`, le détail par condition est dans conduite_fr.
  niveau                VARCHAR(20) NOT NULL CHECK (niveau IN
                          ('contre_indication', 'deconseillee', 'precaution_emploi', 'a_prendre_en_compte')),
  niveaux               TEXT[],
  risque_fr             TEXT NOT NULL,        -- colonne de gauche du thésaurus
  conduite_fr           TEXT NOT NULL DEFAULT '',   -- colonne de droite, après le niveau ; vide si le thésaurus n'en donne pas
  risque_ar             TEXT,
  conduite_ar           TEXT,
  partenaire_ar         TEXT,
  ar_statut             VARCHAR(10) NOT NULL DEFAULT 'absent' CHECK (ar_statut IN ('absent', 'brouillon', 'relu')),
  page                  SMALLINT NOT NULL CHECK (page > 0),   -- page du PDF source
  source_version        TEXT NOT NULL,        -- ex. « Thesaurus ANSM, septembre 2023 »
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (substance_key, partenaire_key)
);

CREATE INDEX IF NOT EXISTS idx_interactions_ansm_substance ON interactions_ansm (substance_key);

-- Appartenance d'une substance à une classe du thésaurus, de deux façons :
--   'liste'      : la classe énumère ses membres « (a, b, c) » sous son titre ;
--   'voir_aussi' : la substance renvoie à la classe (« Voir aussi : … »).
-- Les interactions d'une classe s'appliquent à tous ses membres.
CREATE TABLE IF NOT EXISTS interactions_ansm_classes (
  id          SERIAL PRIMARY KEY,
  classe      TEXT NOT NULL,                  -- titre de la classe dans le thésaurus
  classe_key  TEXT NOT NULL,
  membre      TEXT NOT NULL,                  -- nom du membre (titre ou nom cité dans la liste)
  membre_key  TEXT NOT NULL,
  origine     VARCHAR(10) NOT NULL CHECK (origine IN ('liste', 'voir_aussi')),
  UNIQUE (classe_key, membre_key, origine)
);

CREATE INDEX IF NOT EXISTS idx_interactions_ansm_classes_membre ON interactions_ansm_classes (membre_key);
CREATE INDEX IF NOT EXISTS idx_interactions_ansm_classes_classe ON interactions_ansm_classes (classe_key);
