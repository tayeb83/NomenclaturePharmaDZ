-- ============================================================
-- DwaDZ — RCP publiés sur le portail de l'ANPP (https://rcp.anpp.dz/)
--
-- DwaDZ ne copie aucun RCP : on garde l'adresse du PDF sur le portail, la
-- marque, le laboratoire et le rattachement aux fiches de la nomenclature.
-- Le lien « RCP officiel » de la fiche pointe vers l'ANPP.
--
-- Rattachement par (n_enreg, code), comme medicament_ppa : la table
-- enregistrements est réécrite à chaque import de nomenclature, ses id ne
-- survivent pas, la clé (n_enreg, code) si. code = '' quand elle est absente.
--
-- Qui s'affiche :
--   auto, confirme   rattachement sûr (marque, substance et laboratoire concordent,
--                    ou validé à la main)
--   probable         à valider avant affichage (laboratoire différent, marque proche)
--   rejete           écarté à la main : un ré-import ne le rétablit jamais
-- Les statuts confirme et rejete saisis à la main ne sont jamais écrasés par
-- scripts/import_rcp_links.py.
--
-- Rempli par : python scripts/import_rcp_links.py rapprochement.csv --apply
-- Application : psql "$DATABASE_URL" -f sql/26_rcp_anpp.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS rcp_documents (
  rcp_id            UUID PRIMARY KEY,               -- identifiant du PDF sur rcp.anpp.dz (nom du fichier)
  nom_commercial    TEXT NOT NULL,
  dci_anpp          TEXT,                           -- libellé de substance tel qu'écrit sur le portail
  laboratoire_anpp  TEXT,                           -- graphie du laboratoire sur le portail
  pdf_url           TEXT NOT NULL UNIQUE,
  source            TEXT NOT NULL DEFAULT 'rcp.anpp.dz',
  version_texte     TEXT,                           -- ex. « v02 · 12/2025 », lue dans le PDF (rubrique 8.5)
  retire            BOOLEAN NOT NULL DEFAULT FALSE, -- lien mort ou RCP retiré du portail
  imported_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rcp_fiches (
  rcp_id          UUID NOT NULL REFERENCES rcp_documents (rcp_id) ON DELETE CASCADE,
  n_enreg         TEXT NOT NULL,
  code            TEXT NOT NULL DEFAULT '',
  statut          VARCHAR(10) NOT NULL CHECK (statut IN ('auto', 'probable', 'confirme', 'rejete')),
  score           NUMERIC(3, 2),
  dosage          VARCHAR(12),                      -- resolu | tous | aucun | pdf_non_lu
  PRIMARY KEY (rcp_id, n_enreg, code)
);

CREATE INDEX IF NOT EXISTS idx_rcp_fiches_fiche ON rcp_fiches (n_enreg, code);

-- Rattachement à la substance : sert à lister les RCP sur la page d'une DCI,
-- et à rattacher les RCP sans fiche équivalente (marque absente de la nomenclature).
-- dci = UPPER(btrim(dci)) de la nomenclature, comme dci_monographies.
CREATE TABLE IF NOT EXISTS rcp_dci (
  rcp_id  UUID NOT NULL REFERENCES rcp_documents (rcp_id) ON DELETE CASCADE,
  dci     TEXT NOT NULL,
  PRIMARY KEY (rcp_id, dci)
);

CREATE INDEX IF NOT EXISTS idx_rcp_dci_dci ON rcp_dci (dci);
