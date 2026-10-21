-- ============================================================
-- DwaDZ — Dzair-Pharma Training : examens, relecture, flashcards (phase 4)
--
--   training_questions.manually_edited : la question a été modifiée à la main par
--     un relecteur ; la régénération (scripts/generate_questions.py sync) ne
--     l'écrase jamais et se contente de la signaler `stale`.
--   training_flashcards : questions que l'utilisateur ajoute à ses flashcards
--     (écran de révision en phase 5).
--
-- Application : psql "$DATABASE_URL" -f sql/25_training_exam.sql
-- Idempotent. Nécessite sql/23 et sql/24.
-- ============================================================

ALTER TABLE training_questions ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS training_flashcards (
  user_id      BIGINT NOT NULL REFERENCES training_users (id) ON DELETE CASCADE,
  question_id  BIGINT NOT NULL REFERENCES training_questions (id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);
