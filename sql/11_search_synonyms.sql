-- ============================================================
-- DwaDZ — Recherche tolérante : synonymie
-- noms commerciaux / appellations populaires / arabe ↔ DCI
--
-- La recherche floue (trigram + repli phonétique) fonctionne sans
-- cette table (extensions unaccent + pg_trgm déjà créées dans
-- 01_schema.sql). Cette migration ajoute l'expansion de synonymes :
-- "doliprane" ou "دوليبران" → PARACETAMOL.
--
-- Application : psql "$DATABASE_URL" -f sql/11_search_synonyms.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS search_synonyms (
  id          SERIAL PRIMARY KEY,
  term        TEXT NOT NULL,             -- tel que tapé par l'utilisateur ('doliprane', 'دوليبران')
  term_norm   TEXT NOT NULL DEFAULT '',  -- forme latine normalisée (minuscules, sans accents/espaces ;
                                         -- translittération pour les termes arabes)
  target      TEXT NOT NULL,             -- terme à rechercher dans la nomenclature (DCI en général)
  kind        VARCHAR(12) NOT NULL DEFAULT 'marque',  -- 'marque' | 'populaire' | 'ar' | 'darija'
  verified    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT search_synonyms_unique UNIQUE (term, target)
);

CREATE INDEX IF NOT EXISTS idx_search_synonyms_term_trgm
  ON search_synonyms USING gin (LOWER(term) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_synonyms_norm_trgm
  ON search_synonyms USING gin (term_norm gin_trgm_ops);

COMMENT ON TABLE search_synonyms IS
  'Synonymie de recherche : noms commerciaux étrangers, appellations populaires et graphies arabes → terme officiel de la nomenclature (DCI). Utilisée quand la recherche stricte ne renvoie rien.';
COMMENT ON COLUMN search_synonyms.term_norm IS
  'Forme latine normalisée du terme (translittération pour l''arabe) — comparée par trigram à la requête normalisée.';

-- ── Seeds : marques connues (souvent absentes de la nomenclature DZ) → DCI ──
INSERT INTO search_synonyms (term, term_norm, target, kind) VALUES
  ('doliprane',   'doliprane',   'PARACETAMOL',             'marque'),
  ('dafalgan',    'dafalgan',    'PARACETAMOL',             'marque'),
  ('efferalgan',  'efferalgan',  'PARACETAMOL',             'marque'),
  ('panadol',     'panadol',     'PARACETAMOL',             'marque'),
  ('aspirine',    'aspirine',    'ACIDE ACETYLSALICYLIQUE', 'populaire'),
  ('aspegic',     'aspegic',     'ACIDE ACETYLSALICYLIQUE', 'marque'),
  ('augmentin',   'augmentin',   'AMOXICILLINE',            'marque'),
  ('clamoxyl',    'clamoxyl',    'AMOXICILLINE',            'marque'),
  ('ventoline',   'ventoline',   'SALBUTAMOL',              'marque'),
  ('voltarene',   'voltarene',   'DICLOFENAC',              'marque'),
  ('spasfon',     'spasfon',     'PHLOROGLUCINOL',          'marque'),
  ('smecta',      'smecta',      'DIOSMECTITE',             'marque'),
  ('gaviscon',    'gaviscon',    'ALGINATE',                'marque'),
  ('zithromax',   'zithromax',   'AZITHROMYCINE',           'marque'),
  ('mopral',      'mopral',      'OMEPRAZOLE',              'marque'),
  ('lovenox',     'lovenox',     'ENOXAPARINE',             'marque'),
  ('glucophage',  'glucophage',  'METFORMINE',              'marque'),
  ('lasilix',     'lasilix',     'FUROSEMIDE',              'marque'),
  ('levothyrox',  'levothyrox',  'LEVOTHYROXINE',           'marque'),
  ('tahor',       'tahor',       'ATORVASTATINE',           'marque'),
  ('plavix',      'plavix',      'CLOPIDOGREL',             'marque'),
  ('coversyl',    'coversyl',    'PERINDOPRIL',             'marque'),
  ('flagyl',      'flagyl',      'METRONIDAZOLE',           'marque'),
  ('motilium',    'motilium',    'DOMPERIDONE',             'marque'),
  ('primperan',   'primperan',   'METOCLOPRAMIDE',          'marque'),
  ('solupred',    'solupred',    'PREDNISOLONE',            'marque'),
  ('celestene',   'celestene',   'BETAMETHASONE',           'marque'),
  ('zyrtec',      'zyrtec',      'CETIRIZINE',              'marque'),
  ('clarityne',   'clarityne',   'LORATADINE',              'marque'),
  ('daktarin',    'daktarin',    'MICONAZOLE',              'marque'),
  ('fucidine',    'fucidine',    'ACIDE FUSIDIQUE',         'marque'),
  ('betadine',    'betadine',    'POVIDONE',                'marque')
ON CONFLICT (term, target) DO NOTHING;

-- ── Seeds : graphies arabes (term_norm = translittération latine) ──
INSERT INTO search_synonyms (term, term_norm, target, kind) VALUES
  ('دوليبران',    'doulibran',    'PARACETAMOL',             'ar'),
  ('باراسيتامول', 'barasitamoul', 'PARACETAMOL',             'ar'),
  ('بنادول',      'bnadoul',      'PARACETAMOL',             'ar'),
  ('أسبرين',      'asbrin',       'ACIDE ACETYLSALICYLIQUE', 'ar'),
  ('أموكسيسيلين', 'amouksisilin', 'AMOXICILLINE',            'ar'),
  ('أوغمنتين',    'aoughmntin',   'AMOXICILLINE',            'ar'),
  ('فنتولين',     'fntoulin',     'SALBUTAMOL',              'ar'),
  ('فولتارين',    'foultarin',    'DICLOFENAC',              'ar'),
  ('سميكتا',      'smikta',       'DIOSMECTITE',             'ar'),
  ('غلوكوفاج',    'ghloukoufaj',  'METFORMINE',              'ar'),
  ('إيبوبروفين',  'iboubroufin',  'IBUPROFENE',              'ar'),
  ('أوميبرازول',  'aoumibrazoul', 'OMEPRAZOLE',              'ar')
ON CONFLICT (term, target) DO NOTHING;
