-- ============================================================
-- DwaDZ — Graphes de connaissances (démos publiques + explorateur payant)
--
--  * graphe_abonnements : qui a accès à l'explorateur complet (/graphe/explorer).
--    Le paiement se fait hors ligne (CCP, BaridiMob, virement…) ; l'équipe active
--    l'abonnement ici après réception. L'accès passe par le compte e-mail déjà
--    utilisé pour Training et le comparateur (lien de connexion à usage unique).
--  * pro_leads accepte l'offre « graphe » (demandes d'abonnement depuis /graphe).
--
-- Application : psql "$DATABASE_URL" -f sql/36_graphe.sql
-- Idempotent : peut être rejoué sans effet.
-- ============================================================

CREATE TABLE IF NOT EXISTS graphe_abonnements (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'explorateur' CHECK (plan IN ('explorateur', 'recherche')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  starts_on   DATE,
  ends_on     DATE,
  note        TEXT,                       -- référence du paiement, organisation… (jamais exposée au public)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Paiement : virement CCP ou PayPal uniquement (reçu à la main, voir l'admin /admin/graphe).
ALTER TABLE graphe_abonnements ADD COLUMN IF NOT EXISTS moyen_paiement TEXT;
ALTER TABLE graphe_abonnements ADD COLUMN IF NOT EXISTS reference_paiement TEXT;   -- n° de virement CCP, identifiant de transaction PayPal
ALTER TABLE graphe_abonnements ADD COLUMN IF NOT EXISTS montant TEXT;              -- libre : « 4 000 DZD », « 25 EUR »
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'graphe_abonnements_moyen_check') THEN
    ALTER TABLE graphe_abonnements ADD CONSTRAINT graphe_abonnements_moyen_check CHECK (moyen_paiement IS NULL OR moyen_paiement IN ('ccp', 'paypal'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_graphe_abonnements_email ON graphe_abonnements (lower(email));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pro_leads_offer_check') THEN
    ALTER TABLE pro_leads DROP CONSTRAINT pro_leads_offer_check;
  END IF;
  ALTER TABLE pro_leads
    ADD CONSTRAINT pro_leads_offer_check CHECK (offer IN ('veille', 'api', 'fiche_pharmacie', 'graphe', 'autre'));
EXCEPTION WHEN undefined_table THEN
  NULL; -- sql/13 pas encore appliqué : rien à faire
END $$;
