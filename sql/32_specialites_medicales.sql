-- ============================================================
-- DwaDZ — Spécialités médicales (suite de 28_specialites.sql)
--
-- Ajoute 17 spécialités à côté de « Dentisterie » (ordre 1), chacune définie
-- par ses classes ATC. Une classe peut figurer dans plusieurs spécialités
-- (H02, M05, B03, M03, J01… sont volontairement partagées) : les totaux
-- affichés comptent chaque DCI / fiche une seule fois par spécialité.
--
-- Idempotent : ne touche ni aux spécialités ni aux lignes déjà présentes
-- (ON CONFLICT DO NOTHING) ; ce qui a été modifié depuis /admin/specialites
-- n'est pas écrasé. Les libellés arabes des classes sont laissés vides :
-- l'affichage retombe sur le libellé ATC français (modifiable en admin).
--
-- Prérequis : sql/28_specialites.sql
-- Application : psql "$DATABASE_URL" -f sql/32_specialites_medicales.sql
-- ============================================================

INSERT INTO specialites (slug, titre_fr, titre_ar, ordre) VALUES
  ('cardiologie',        'Cardiologie',                              'أمراض القلب والأوعية الدموية',   2),
  ('diabetologie',       'Diabétologie / Endocrinologie',            'السكري والغدد الصماء',            3),
  ('pneumologie',        'Pneumologie / Allergologie',               'أمراض الرئة والحساسية',           4),
  ('gastro-enterologie', 'Gastro-entérologie / Hépatologie',         'أمراض الجهاز الهضمي والكبد',      5),
  ('infectiologie',      'Infectiologie',                            'الأمراض المعدية',                 6),
  ('neurologie',         'Neurologie',                               'طب الأعصاب',                      7),
  ('psychiatrie',        'Psychiatrie',                              'الطب النفسي',                     8),
  ('rhumatologie',       'Rhumatologie',                             'أمراض الروماتيزم',                9),
  ('dermatologie',       'Dermatologie',                             'الأمراض الجلدية',                 10),
  ('ophtalmologie',      'Ophtalmologie',                            'طب العيون',                       11),
  ('orl',                'ORL',                                      'أمراض الأنف والأذن والحنجرة',     12),
  ('gynecologie',        'Gynécologie-obstétrique',                  'أمراض النساء والتوليد',           13),
  ('urologie-nephrologie','Urologie / Néphrologie',                  'المسالك البولية وأمراض الكلى',    14),
  ('oncologie',          'Oncologie',                                'طب الأورام',                      15),
  ('hematologie',        'Hématologie',                              'أمراض الدم',                      16),
  ('anesthesie-reanimation','Anesthésie-réanimation / Urgences',     'التخدير والإنعاش والاستعجالات',   17),
  ('imagerie',           'Imagerie / Radiologie',                    'التصوير الطبي والأشعة',           18)
ON CONFLICT (slug) DO NOTHING;

-- Classes ATC par spécialité, dans l'ordre d'affichage.
INSERT INTO specialite_items (specialite_slug, kind, valeur, ordre)
SELECT s.slug, 'atc', c.valeur, c.ord::INT
  FROM (VALUES
    ('cardiologie',           ARRAY['C01','C02','C03','C04','C05','C07','C08','C09','C10','B01']),
    ('diabetologie',          ARRAY['A10','H01','H02','H03','H04','H05','M05']),
    ('pneumologie',           ARRAY['R03','R05','R06']),
    ('gastro-enterologie',    ARRAY['A02','A03','A04','A05','A06','A07','A09','A16','J05AP']),
    ('infectiologie',         ARRAY['J01','J02','J04','J05','P01','P02']),
    ('neurologie',            ARRAY['N03','N04','N02C','N06D','N07']),
    ('psychiatrie',           ARRAY['N05A','N05B','N05C','N06A']),
    ('rhumatologie',          ARRAY['M01','M03','M04','M05','L04']),
    ('dermatologie',          ARRAY['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11']),
    ('ophtalmologie',         ARRAY['S01','S03']),
    ('orl',                   ARRAY['S02','R01','R02']),
    ('gynecologie',           ARRAY['G01','G02','G03','H01BB']),
    ('urologie-nephrologie',  ARRAY['G04','B03','A11CC','V03AE']),
    ('oncologie',             ARRAY['L01','L02','L03']),
    ('hematologie',           ARRAY['B02','B03']),
    ('anesthesie-reanimation',ARRAY['N01','N02A','M03','B05','V03AB']),
    ('imagerie',              ARRAY['V08','V09'])
  ) AS s(slug, codes)
  CROSS JOIN LATERAL unnest(s.codes) WITH ORDINALITY AS c(valeur, ord)
  WHERE EXISTS (SELECT 1 FROM specialites sp WHERE sp.slug = s.slug)
ON CONFLICT (specialite_slug, kind, valeur) DO NOTHING;

-- Contrôle : codes ATC retenus mais absents de la classification chargée
-- (les compteurs seraient à 0 ; à corriger depuis /admin/specialites).
--   SELECT i.specialite_slug, i.valeur
--     FROM specialite_items i LEFT JOIN atc_codes a ON a.code = i.valeur
--    WHERE i.kind = 'atc' AND a.code IS NULL;
