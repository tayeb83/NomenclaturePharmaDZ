-- ============================================================
-- DwaDZ — Dzair-Pharma Training : sessions de connexion (phase 3)
--
-- Une session = un cookie HttpOnly dont seul le hachage SHA-256 est stocké ici :
-- une fuite de la base ne permet pas d'usurper une session, et une session se
-- révoque côté serveur (refus, remise en attente, déconnexion).
--
-- Application : psql "$DATABASE_URL" -f sql/24_training_sessions.sql
-- Idempotent. Nécessite sql/23_training.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS training_sessions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES training_users (id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_user    ON training_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_expires ON training_sessions (expires_at);
