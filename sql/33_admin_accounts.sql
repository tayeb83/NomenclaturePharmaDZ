-- ─────────────────────────────────────────────────────────────
-- Migration 33 — Comptes administrateur nominatifs
--
-- Remplace le mot de passe unique par des comptes (e-mail + mot de passe).
-- Création d'un compte en trois temps :
--   1. un admin saisit l'e-mail du futur admin       (pending_approval)
--   2. le propriétaire approuve par e-mail            (invited)
--   3. le futur admin choisit son mot de passe        (active)
-- Le mot de passe unique ADMIN_PASSWORD reste valable pour le propriétaire.
--
-- Idempotent :  psql "$DATABASE_URL" -f sql/33_admin_accounts.sql
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_accounts (
  id             BIGSERIAL PRIMARY KEY,
  email          TEXT NOT NULL,                    -- stocké en minuscules
  name           TEXT NOT NULL DEFAULT '',
  role           TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  status         TEXT NOT NULL DEFAULT 'pending_approval'
                 CHECK (status IN ('pending_approval', 'invited', 'active', 'disabled', 'rejected')),
  password_hash  TEXT,                             -- scrypt$sel$hash
  invited_by     TEXT,                             -- e-mail de l'invitant (ou 'owner')
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at    TIMESTAMPTZ,
  activated_at   TIMESTAMPTZ,
  last_login_at  TIMESTAMPTZ,
  CONSTRAINT admin_accounts_email_format CHECK (position('@' IN email) > 1 AND length(email) <= 254)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_accounts_email ON admin_accounts (lower(email));

-- Jetons à usage unique : seul le hachage SHA-256 est stocké.
CREATE TABLE IF NOT EXISTS admin_tokens (
  id          BIGSERIAL PRIMARY KEY,
  account_id  BIGINT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('approval', 'activation', 'reset')),
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_tokens_account ON admin_tokens (account_id, kind);
