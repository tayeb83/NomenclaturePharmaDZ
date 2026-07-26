-- Tokens push mobile (app DwaDZ Capacitor) — alertes retraits/nouvelles AMM en temps réel.
-- Voir lib/push.ts (envoi via Firebase Admin SDK) et app/api/push/register/route.ts (enregistrement).

CREATE TABLE IF NOT EXISTS push_tokens (
  id            BIGSERIAL PRIMARY KEY,
  token         TEXT UNIQUE NOT NULL,
  platform      VARCHAR(20) NOT NULL, -- 'android' | 'ios'
  active        BOOLEAN DEFAULT TRUE,
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens (active);
