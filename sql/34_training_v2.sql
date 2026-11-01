-- ============================================================
-- DwaDZ — Dzair-Pharma Training, v2 : nouveaux types de questions
--
-- Ajoute six types, tous résolubles avec les outils du site :
--   interaction_niveau, interaction_contre_indication  (Thesaurus ANSM)
--   compare_specialites, substitution                  (comparateur, substitution)
--   atc_code, atc_inverse                              (classification / codage ATC)
--
-- Seule la contrainte CHECK sur training_questions.type change ; aucune donnée n'est modifiée.
-- (Le profil « enseignant » n'est plus proposé, mais la valeur reste acceptée par la base :
--  d'éventuels comptes existants ne sont ni supprimés ni convertis.)
--
-- Application : psql "$DATABASE_URL" -f sql/34_training_v2.sql      (après 23 à 25)
-- Idempotent : peut être rejoué sans effet.
-- ============================================================

DO $$
DECLARE c TEXT;
BEGIN
  -- la contrainte est anonyme dans 23_training.sql : on la retrouve par sa définition
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'training_questions'::regclass AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%dci_from_brand%'
  LOOP
    EXECUTE format('ALTER TABLE training_questions DROP CONSTRAINT %I', c);
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'training_questions'::regclass AND conname = 'training_questions_type_check_v2') THEN
    ALTER TABLE training_questions ADD CONSTRAINT training_questions_type_check_v2 CHECK (type IN (
      'dci_from_brand', 'reference_generique', 'forme_dosage', 'labo_pays', 'retrait_motif',
      'retrait_identification', 'atc_classe',
      'interaction_niveau', 'interaction_contre_indication', 'compare_specialites',
      'atc_code', 'atc_inverse', 'substitution'));
  END IF;
END $$;
