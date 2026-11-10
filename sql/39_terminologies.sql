-- ============================================================
-- DwaDZ — Référentiel terminologique : Standard Terms EDQM et unités UCUM,
-- et leur lien avec chaque médicament de la nomenclature.
--
-- edqm_termes              : les listes EDQM (formes pharmaceutiques, voies et méthodes d'administration),
--                            en anglais, français et arabe. L'arabe est le nôtre (l'EDQM n'en fournit pas
--                            dans nos sources) : ar_statut suit sa relecture, comme pour les interactions ANSM.
-- ucum_unites              : les unités UCUM employées par les dosages de la nomenclature.
-- forme_edqm_mapping       : écriture de forme de la nomenclature → terme EDQM (même principe que
--                            dci_atc_mapping). source = 'auto' : calculé par lib/guide-core.ts ;
--                            'manual' : corrigé à la main, jamais écrasé par la synchronisation.
-- medicament_terminologie  : pour chaque fiche, sa forme EDQM, ses voies et sa méthode d'administration EDQM,
--                            et les unités UCUM de son dosage. Reconstruite à chaque synchronisation
--                            (les identifiants de enregistrements changent à chaque import).
-- v_medicament_terminologie: la même chose avec les libellés, pour consultation.
--
-- Alimentation : DATABASE_URL=... npx tsx scripts/sync_terminologies.mts --apply
-- (relancée automatiquement après un import de nomenclature depuis l'admin).
-- Les Standard Terms sont la propriété de l'EDQM (Conseil de l'Europe) : https://standardterms.edqm.eu
--
-- Application : psql "$DATABASE_URL" -f sql/39_terminologies.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS edqm_termes (
  code        TEXT PRIMARY KEY,                 -- ex : 10221000 (forme), 20053000 (voie), 0019 (méthode)
  classe      TEXT NOT NULL CHECK (classe IN ('forme', 'voie', 'methode')),
  label_en    TEXT NOT NULL,                    -- "Film-coated tablet"
  label_fr    TEXT,                             -- « Comprimé pelliculé » ; NULL si la source n'est pas fiable
  label_ar    TEXT,                             -- traduction DwaDZ
  ar_statut   TEXT NOT NULL DEFAULT 'absent' CHECK (ar_statut IN ('absent', 'brouillon', 'relu')),
  source      TEXT,                             -- paquet d'origine, ex : ch.fhir.ig.ch-term 3.3.0
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edqm_termes_classe ON edqm_termes(classe);

CREATE TABLE IF NOT EXISTS ucum_unites (
  code        TEXT PRIMARY KEY,                 -- code UCUM, sensible à la casse : mg, mL, [iU]
  symbole     TEXT NOT NULL,                    -- écriture affichée : mg, ml, UI
  label_ar    TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forme_edqm_mapping (
  forme         TEXT PRIMARY KEY,               -- UPPER(btrim(forme)) de la nomenclature
  forme_norm    TEXT,                           -- forme normalisée affichée
  code_forme    TEXT REFERENCES edqm_termes(code),
  relation      TEXT CHECK (relation IN ('exact', 'plus-large', 'proche')),
  codes_voie    TEXT[] NOT NULL DEFAULT '{}',
  code_methode  TEXT REFERENCES edqm_termes(code),
  source        VARCHAR(10) NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forme_edqm_code ON forme_edqm_mapping(code_forme);

CREATE TABLE IF NOT EXISTS medicament_terminologie (
  enregistrement_id    INTEGER PRIMARY KEY,     -- enregistrements.id (sans clé étrangère : table réécrite à l'import)
  n_enreg              TEXT,
  forme_norm           TEXT,
  edqm_forme           TEXT REFERENCES edqm_termes(code),
  edqm_forme_relation  TEXT,
  edqm_voies           TEXT[] NOT NULL DEFAULT '{}',
  edqm_methode         TEXT REFERENCES edqm_termes(code),
  dosage_norm          TEXT,
  dosage_quantites     JSONB,                   -- { "quantites": [{valeur, unite, ucum}], "denominateur": {…} | null }
  ucum_unites          TEXT[] NOT NULL DEFAULT '{}',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_med_termino_forme ON medicament_terminologie(edqm_forme);
CREATE INDEX IF NOT EXISTS idx_med_termino_voies ON medicament_terminologie USING gin(edqm_voies);
CREATE INDEX IF NOT EXISTS idx_med_termino_ucum ON medicament_terminologie USING gin(ucum_unites);

CREATE OR REPLACE VIEW v_medicament_terminologie AS
SELECT
  e.id, e.n_enreg, e.nom_marque, e.dci, e.forme, e.dosage,
  t.forme_norm,
  t.edqm_forme, f.label_fr AS edqm_forme_fr, f.label_en AS edqm_forme_en, f.label_ar AS edqm_forme_ar, t.edqm_forme_relation,
  t.edqm_voies,
  (SELECT string_agg(COALESCE(v.label_fr, v.label_en), ' ; ' ORDER BY v.code)
     FROM edqm_termes v WHERE v.code = ANY (t.edqm_voies)) AS edqm_voies_fr,
  t.edqm_methode, m.label_fr AS edqm_methode_fr,
  t.dosage_norm, t.ucum_unites, t.dosage_quantites
FROM enregistrements e
LEFT JOIN medicament_terminologie t ON t.enregistrement_id = e.id
LEFT JOIN edqm_termes f ON f.code = t.edqm_forme
LEFT JOIN edqm_termes m ON m.code = t.edqm_methode;
