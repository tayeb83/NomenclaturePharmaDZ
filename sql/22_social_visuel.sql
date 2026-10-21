-- ============================================================
-- DwaDZ — Image jointe aux publications thématiques Facebook
-- Contenu structuré du visuel (chiffres clés, exemples, motif…) dessiné
-- par lib/social-visual.tsx et publié avec le post. Colonne optionnelle :
-- sans elle, le brouillon est créé quand même et l'image est déduite du texte.
-- ============================================================

ALTER TABLE social_content_queue
  ADD COLUMN IF NOT EXISTS visuel JSONB;

COMMENT ON COLUMN social_content_queue.visuel IS
  'Données du visuel joint au post (PostVisual, voir lib/facebook-content.ts).';
