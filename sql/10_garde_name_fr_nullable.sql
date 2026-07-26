-- Certaines DSP (ex: Sidi Bel Abbès) publient leurs listes de garde
-- exclusivement en arabe. Le pipeline d'extraction laisse alors name_fr à
-- null plutôt que de transcrire automatiquement (translittération réservée
-- à une relecture humaine ultérieure, cf. meta.notes des JSON concernés).
-- garde_pharmacies.name_fr était NOT NULL, ce qui rejetait ces imports.
ALTER TABLE garde_pharmacies ALTER COLUMN name_fr DROP NOT NULL;
