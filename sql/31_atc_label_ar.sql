-- ============================================================
-- DwaDZ — Libellés ATC en arabe
-- Colonnes remplies par scripts/import_atc_ar.py à partir du fichier ATC_2026_fr_en_ar.xlsx.
-- Tant que la colonne n'existe pas, le site retombe sur le libellé français.
-- Application : psql "$DATABASE_URL" -f sql/31_atc_label_ar.sql
-- ============================================================
ALTER TABLE atc_codes ADD COLUMN IF NOT EXISTS label_ar TEXT;
ALTER TABLE atc_codes ADD COLUMN IF NOT EXISTS commentaires_ar TEXT;
COMMENT ON COLUMN atc_codes.label_ar IS 'Libellé arabe (traduction du libellé français, relue)';
