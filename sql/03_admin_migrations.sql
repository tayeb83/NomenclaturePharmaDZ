-- ============================================================
-- Migration : colonnes supplémentaires pour l'historique admin
-- À exécuter une seule fois sur la base de données
-- ============================================================

-- Ajouter les colonnes de suivi à nomenclature_versions
-- (IF NOT EXISTS = idempotent, pas d'erreur si déjà existantes)

ALTER TABLE nomenclature_versions
  ADD COLUMN IF NOT EXISTS total_retraits       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_non_renouveles INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS removed_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uploaded_file        TEXT;

-- Index pour accélérer le tri par date de référence (archive)
CREATE INDEX IF NOT EXISTS idx_versions_ref_date
  ON nomenclature_versions(reference_date DESC NULLS LAST, created_at DESC);

-- Commentaire pour la doc
COMMENT ON TABLE nomenclature_versions IS
  'Historique de toutes les versions de nomenclature importées via l''interface admin';
COMMENT ON COLUMN nomenclature_versions.removed_count IS
  'Nombre d''enregistrements présents dans la version précédente mais absents de la version courante';
COMMENT ON COLUMN nomenclature_versions.uploaded_file IS
  'Nom du fichier Excel importé';
