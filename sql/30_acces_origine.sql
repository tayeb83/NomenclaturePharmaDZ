-- ============================================================
-- DwaDZ — d'où vient une demande d'accès (compte unique Training / outils à accès limité)
--
-- Les outils à accès limité (comparateur de deux médicaments) réutilisent les comptes
-- de sql/23_training.sql : même validation à la main, même lien de connexion envoyé par e-mail.
-- `origine` dit seulement quel formulaire a servi, pour l'administration et pour le texte
-- des e-mails ; le compte donne accès aux deux.
--
-- Application : psql "$DATABASE_URL" -f sql/30_acces_origine.sql
-- Idempotent : peut être rejoué sans effet.
-- ============================================================

ALTER TABLE training_users
  ADD COLUMN IF NOT EXISTS origine TEXT NOT NULL DEFAULT 'training';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_users_origine_check') THEN
    ALTER TABLE training_users
      ADD CONSTRAINT training_users_origine_check CHECK (origine IN ('training', 'comparateur'));
  END IF;
END $$;
