-- ============================================================
-- DwaDZ — Dzair-Pharma Training : banque de QCM et examens blancs
--
-- Module isolé : aucune table existante n'est modifiée. Tout est préfixé
-- `training_` (sauf attempts / answers / events, propres au module et
-- référençant uniquement des tables training_*).
--
--   training_users      comptes sans mot de passe, validés à la main
--   login_tokens        liens de connexion à usage unique (jeton HACHÉ)
--   training_questions  banque de QCM (brouillon → relue → publiée)
--   attempts / answers  tentatives (mode tuteur ou examen) et réponses
--   events              journal d'usage (mesure, pas de suivi comportemental)
--
-- Les sessions (phase 3) et les flashcards (phase 5) arrivent dans des
-- migrations ultérieures du même module.
--
-- Données personnelles minimales : e-mail, profil, faculté facultative,
-- identifiant Facebook si connexion Facebook. Suppression sur demande :
--   DELETE FROM training_users WHERE email = '...';
-- (cascade sur login_tokens, attempts, answers ; events.user_id passe à NULL).
--
-- Application : psql "$DATABASE_URL" -f sql/23_training.sql
-- Idempotent : peut être rejoué sans effet.
-- ============================================================

-- ─── UTILISATEURS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_users (
  id             BIGSERIAL PRIMARY KEY,
  email          TEXT NOT NULL,                       -- toujours normalisé en minuscules côté application
  source         TEXT NOT NULL DEFAULT 'email' CHECK (source IN ('email', 'facebook')),
  facebook_id    TEXT,
  role           TEXT NOT NULL CHECK (role IN ('etudiant', 'enseignant', 'pharmacien')),
  faculte        TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_changed_at TIMESTAMPTZ,
  approved_at    TIMESTAMPTZ,
  last_login_at  TIMESTAMPTZ,
  CONSTRAINT training_users_email_format CHECK (position('@' IN email) > 1 AND length(email) <= 254),
  CONSTRAINT training_users_faculte_len  CHECK (faculte IS NULL OR length(faculte) <= 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_training_users_email ON training_users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_training_users_fb    ON training_users (facebook_id) WHERE facebook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_users_status     ON training_users (status, created_at DESC);

-- ─── JETONS DE CONNEXION ─────────────────────────────────────
-- Seul le hachage SHA-256 du jeton est stocké : une fuite de la base ne
-- permet pas de se connecter. Usage unique (used_at), validité courte.
CREATE TABLE IF NOT EXISTS login_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES training_users (id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_tokens_user ON login_tokens (user_id, created_at DESC);

-- ─── QUESTIONS ───────────────────────────────────────────────
-- Générées hors ligne par scripts/generate_questions.py, uniquement à partir
-- des champs de la nomenclature. Aucune ne devient visible avant relecture
-- humaine : status = 'published' est posé par un relecteur (relu_par).
--
-- question_key : clé stable (hachage des champs d'identité de l'enregistrement
--   source, indépendante des id SERIAL) — c'est elle qui permet de régénérer à
--   chaque nouvelle version de la nomenclature sans dupliquer ni écraser les
--   questions déjà relues ou publiées.
-- stale : la source a changé ou disparu depuis la relecture ; la question
--   publiée est conservée telle quelle mais signalée pour nouvelle relecture.
CREATE TABLE IF NOT EXISTS training_questions (
  id            BIGSERIAL PRIMARY KEY,
  question_key  TEXT NOT NULL UNIQUE,
  type          TEXT NOT NULL CHECK (type IN (
                  'dci_from_brand', 'reference_generique', 'forme_dosage',
                  'labo_pays', 'retrait_motif', 'retrait_identification', 'atc_classe')),
  source_table  TEXT NOT NULL CHECK (source_table IN ('enregistrements', 'retraits')),
  source_ref    TEXT NOT NULL,                        -- id de l'enregistrement de la nomenclature
  stem          TEXT NOT NULL,
  options       JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) = 5),
  correct_index SMALLINT NOT NULL CHECK (correct_index BETWEEN 0 AND 4),
  explanation   JSONB NOT NULL,                       -- contexte, rationales (5), points_cles, references
  atc_code      TEXT,
  difficulty    SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published')),
  a_valider     BOOLEAN NOT NULL DEFAULT TRUE,        -- contenu ou traduction à valider par un humain
  relu_par      TEXT,
  relu_at       TIMESTAMPTZ,
  stale         BOOLEAN NOT NULL DEFAULT FALSE,
  stale_reason  TEXT,
  content_hash  TEXT NOT NULL,
  db_version    TEXT,                                 -- version de la nomenclature ayant produit ce contenu
  last_seen_version TEXT,                             -- dernière version où la source existait encore
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Garde-fou : une question publiée a forcément un relecteur.
  CONSTRAINT training_questions_published_reviewed
    CHECK (status = 'draft' OR (relu_par IS NOT NULL AND relu_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_training_questions_status ON training_questions (status, type);
CREATE INDEX IF NOT EXISTS idx_training_questions_atc    ON training_questions (atc_code);
CREATE INDEX IF NOT EXISTS idx_training_questions_source ON training_questions (source_table, source_ref);

-- ─── TENTATIVES ET RÉPONSES ──────────────────────────────────
-- question_ids fige la liste ET l'ordre des questions au démarrage : une
-- republication ou une nouvelle version de la banque ne modifie pas un
-- examen en cours.
CREATE TABLE IF NOT EXISTS attempts (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES training_users (id) ON DELETE CASCADE,
  mode           TEXT NOT NULL CHECK (mode IN ('tuteur', 'examen')),
  exam_code      TEXT,                                -- examen blanc nommé, NULL pour une série libre
  question_ids   BIGINT[] NOT NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_limit_s   INTEGER,                             -- NULL = pas de chrono (mode tuteur)
  finished_at    TIMESTAMPTZ,
  score          SMALLINT,                            -- bonnes réponses, renseigné à la fin
  total          SMALLINT NOT NULL CHECK (total > 0)
);

CREATE INDEX IF NOT EXISTS idx_attempts_user    ON attempts (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_started ON attempts (started_at DESC);

CREATE TABLE IF NOT EXISTS answers (
  id           BIGSERIAL PRIMARY KEY,
  attempt_id   BIGINT NOT NULL REFERENCES attempts (id) ON DELETE CASCADE,
  question_id  BIGINT NOT NULL REFERENCES training_questions (id),
  position     SMALLINT NOT NULL,
  choice       SMALLINT CHECK (choice BETWEEN 0 AND 4),
  struck       SMALLINT[] NOT NULL DEFAULT '{}',      -- propositions rayées par l'étudiant
  marked       BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent_s INTEGER NOT NULL DEFAULT 0 CHECK (time_spent_s >= 0),
  is_correct   BOOLEAN,                               -- NULL tant que la correction n'est pas rendue
  answered_at  TIMESTAMPTZ,
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_question ON answers (question_id, is_correct);

-- ─── ÉVÉNEMENTS ──────────────────────────────────────────────
-- type : signup_requested | approved | rejected | login_link_sent | login |
--        attempt_started | attempt_finished | question_answered
-- user_id passe à NULL si le compte est supprimé : les statistiques
-- agrégées subsistent, sans lien avec une personne.
CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES training_users (id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type_date ON events (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events (user_id, created_at DESC);

COMMENT ON TABLE training_questions IS
  'QCM générés à partir de la nomenclature (scripts/generate_questions.py). Visibles uniquement une fois status = published (relecture humaine).';
COMMENT ON TABLE login_tokens IS
  'Liens de connexion sans mot de passe : jeton haché (SHA-256), usage unique, expiration 15 min.';
