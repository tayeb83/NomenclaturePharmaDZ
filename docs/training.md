# Dzair-Pharma Training — documentation du module

Module d'entraînement aux QCM (étudiants, pharmaciens) construit à
partir de la nomenclature. Il est **isolé** du reste du site : tables
`training_*`, routes `/training/*` et `/admin/training/*`, aucune table
existante modifiée.

Branche de travail : `claude/sweet-davinci-ruky9s`. Un commit par phase.

## Phase 1 — modèle de données et génération des questions

### Fichiers

| Fichier | Rôle |
|---|---|
| `sql/23_training.sql` | Tables `training_users`, `login_tokens`, `training_questions`, `attempts`, `answers`, `events` (idempotent) |
| `scripts/generate_questions.py` | Génération déterministe (seed), contrôle qualité, synchronisation non destructive |
| `scripts/synthetic_nomenclature.py` | Nomenclature **fictive** (schéma réel) pour développer et tester sans la base de production |
| `scripts/tests/test_generate_questions.py` | 28 tests (génération, contrôle qualité, synchronisation PostgreSQL) |
| `scripts/fixtures/` | Jeu synthétique et échantillon de 200 questions issu de ce jeu (**fictif, ne jamais publier**) |

### Lancer en local

```bash
# 1. Base de dev : schéma du site + module (psql ≥ 14)
psql "$DATABASE_URL" -f sql/01_schema.sql -f sql/04_atc_codes.sql -f sql/23_training.sql

# 2. Données : soit votre base réelle, soit le jeu fictif (VIDE enregistrements/retraits !)
python scripts/synthetic_nomenclature.py --load-db

# 3. Générer
pip install psycopg2-binary
python scripts/generate_questions.py generate --limit 200 --out data/questions.jsonl   # fichier seul
python scripts/generate_questions.py sync --limit 200                                  # écrit en base (draft)
python scripts/generate_questions.py validate --in data/questions.jsonl

# 4. Tests
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/dwa_test \
  python3 -m unittest discover -s scripts/tests -v
```

### Règles de génération

* Sept types de base (voir aussi la phase 6 pour les six types ajoutés) : DCI à partir de la marque, référence/générique, forme et
  dosage, laboratoire et pays, motif de retrait, produit retiré, sous-groupe ATC
  (niveau 3, seulement si `atc_codes` et `dci_atc_mapping` existent).
* 5 propositions, une seule bonne réponse. Distracteurs classés par
  plausibilité (même classe ATC > même forme galénique > même groupe ATC
  > quelconque), tirés avec un RNG propre à chaque question (`seed` +
  `question_key`) : mêmes données ⇒ mêmes questions, quel que soit l'ordre des
  lignes lues.
* Écartés d'office : marque portant plusieurs DCI / présentations / laboratoires
  (réponse ambiguë), nom commercial contenant la DCI, DCI qui partagent une
  substance (ex. `X` et `X TRIHYDRATE`), laboratoires apparentés, motifs de
  retrait quasi identiques.
* Explications construites **uniquement** avec les champs de la base (contexte,
  justification de chaque proposition, points clés, lien vers la fiche). Aucune
  indication, aucun effet indésirable, aucune interaction, aucune référence
  bibliographique. Un test interdit ces termes dans les gabarits.
* Chaque question naît `draft`, `a_valider = true`, `relu_par = NULL`. Une
  contrainte SQL interdit `reviewed`/`published` sans relecteur.
* `verify_question` revérifie chaque question contre la nomenclature, sans
  réutiliser la logique de génération : il compte les propositions vraies
  (exactement une) et détecte doublons et ambiguïtés. Toute question rejetée
  n'est jamais écrite.

### Régénération à chaque nouvelle version de la nomenclature

```bash
python scripts/generate_questions.py sync --full      # après l'import de la nouvelle version
```

* Clé stable `question_key` (hachage nom + DCI + forme + dosage + laboratoire),
  indépendante des `id` SERIAL qui changent à chaque ré-import.
* Nouvelle question : insérée en `draft`. `draft` modifié : mise à jour.
* `reviewed` / `published` : **contenu jamais modifié**. Si la nomenclature
  produit désormais un autre contenu : `stale = true` (à relire). Avec `--full`,
  une source disparue est aussi marquée `stale`. Rien n'est jamais supprimé
  (les tentatives passées référencent ces questions).

### Limites connues (à connaître avant de relire)

* Les équivalents arabes de l'interface seront marqués « à valider » ; le
  contenu des questions reste en français (noms commerciaux et DCI).
* `difficulty` est une heuristique (proximité des distracteurs), pas une
  mesure : à recalibrer avec les taux de réussite réels.
* Sur la vraie base, les types dépendent de la qualité des champs : motifs de
  retrait très répétitifs ⇒ peu de questions `retrait_motif`.

## Phase 2 — page produit, demande d'accès, validation admin

### Routes

| Route | Rôle |
|---|---|
| `/training` | Page produit + formulaire « Accès gratuit sur inscription » (FR/AR) |
| `/training/attente` | « Demande envoyée » : frise reçue → validation → e-mail d'ouverture, lien Facebook |
| `/admin/training` | Compteurs, liste, Valider / Refuser / Remettre en attente / Renvoyer le lien, recherche, export CSV |
| `POST /api/training/request` | Crée la demande `pending` (réponse identique que l'e-mail existe ou non) |
| `/api/admin/training/requests` (+ `/[id]`, `/export`) | API admin (session admin existante + contrôle d'origine) |

### Fichiers

`lib/training/` (`validation.ts`, `security.ts`, `service.ts`, `mail.ts`, `copy.ts`, `index.ts`),
`components/training/`, `app/training/`, `app/admin/training/`, `app/api/training/`,
`app/api/admin/training/`, `tests/training/`. Seules modifications de l'existant :
lien « Training QCM » dans le menu « Plus » (`Nav.tsx`), lien dans `/admin`
(`AdminClient.tsx`), `allowImportingTsExtensions` dans `tsconfig.json`
(imports `.ts` du module, testables sans outil de build), script `test:training`,
variables dans `env.local.example`, `.gitignore`.

### Configuration

* `ADMIN_EMAILS` : destinataires des notifications (séparés par des virgules).
  L'accès à `/admin/training` utilise la session admin existante (`ADMIN_PASSWORD`).
* E-mails : Brevo, sinon Gmail, comme le reste du site. En développement sans
  fournisseur, les messages sont déposés dans `.training-outbox/` (ignoré par git) ;
  rien n'est écrit dans les journaux, un lien de connexion est un secret.
* `TRAINING_FACEBOOK_APP_ID` / `_SECRET` : tant qu'ils sont absents, le bouton
  Facebook est affiché désactivé (phase 3).

### Lancer en local

```bash
psql "$DATABASE_URL" -f sql/23_training.sql
ADMIN_PASSWORD=... ADMIN_SESSION_SECRET=... ADMIN_EMAILS=vous@exemple.dz npm run dev
# http://localhost:3000/training  puis  /admin  →  /admin/training
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/dwa_test npm run test:training
```

### Sécurité de cette phase

* CSRF : `Origin`/`Referer` doit être notre site (POST public et actions admin).
* Rate limiting : 6 demandes/h/IP et 3/h/e-mail ; champ piège anti-robot.
* Jeton de connexion : 32 octets, stocké haché (SHA-256), usage unique, 15 min ;
  refuser ou remettre en attente invalide les liens encore actifs.
* Texte saisi : échappé dans les e-mails ; export CSV protégé contre l'injection de formule.
* Le lien envoyé à la validation pointe vers `/api/training/auth/verify`,
  **livré en phase 3** : d'ici là le lien est émis mais la route de connexion n'existe pas.

### À valider

* Traductions arabes de `lib/training/copy.ts` (`AR_VALIDATED = false` affiche
  une mention « en cours de validation » sur les pages arabes).

## Phase 3 — connexion par lien, sessions, Facebook Login

Migration à appliquer : `psql "$DATABASE_URL" -f sql/24_training_sessions.sql`
(après `sql/23_training.sql`).

### Parcours

1. L'admin valide → e-mail avec un lien `/training/connexion?token=…`.
2. Le lien ouvre une **page de confirmation** (bouton « Me connecter ») : le jeton
   n'est consommé que par ce clic. Les antivirus et aperçus de messagerie ouvrent
   les liens à l'avance ; un `GET` qui consommerait le jeton le « brûlerait » avant
   l'utilisateur. L'ancien format `/api/training/auth/verify?token=` redirige
   vers cette page sans rien consommer.
3. `POST /api/training/auth/verify` : jeton de 32 octets, **haché** en base, **usage
   unique** (UPDATE conditionnel atomique), **15 minutes**. Expiré, déjà utilisé,
   inconnu ou compte non validé : une seule réponse (`invalid`). Le jeton est retiré
   de la barre d'adresse et la page est servie avec `Referrer-Policy: no-referrer`.
4. Session : cookie `__Host-tr_session` (production) / `tr_session` (local),
   **HttpOnly, Secure, SameSite=Lax**, 14 jours. Seul son hachage est en base
   (`training_sessions`) : elle se révoque côté serveur.
5. Utilisateur déjà validé : `/training/connexion` → « Recevoir un lien ». Réponse
   identique (corps, statut, durée ≈ 2 s) que l'adresse existe ou non, soit validée,
   en attente, refusée ou invalide. Limites : 8/h/IP et 3/h/adresse.
6. Refuser ou remettre en attente coupe immédiatement les sessions et les liens actifs.
   `getSessionUser` vérifie en plus `status = 'approved'` à chaque requête.

### Protéger une page ou une route (phases 4-5)

```ts
import { requireTrainingUserPage, requireTrainingUserApi } from '@/lib/training/auth'
const user = await requireTrainingUserPage()          // page : redirige vers /training/connexion
const r = await requireTrainingUserApi(req)           // API : 401 JSON
if ('response' in r) return r.response
```
`/training/espace` est la première page protégée (placeholder : les examens arrivent en phase 4).

### Facebook Login

Le flux ne fait **que créer une demande `pending`** : Facebook ne connecte jamais
directement et ne prouve pas qu'un compte suit la page ; la validation reste manuelle.

1. Bouton → `/api/training/auth/facebook` : état aléatoire dans un cookie signé (10 min).
2. Retour → `/api/training/auth/facebook/callback` : état vérifié, `code` échangé
   côté serveur (le secret ne quitte jamais le serveur), lecture de `id` et `email`.
3. L'identifiant et l'e-mail sont placés dans un cookie signé de 10 minutes ;
   `/training/facebook` demande le profil (étudiant / pharmacien) et la
   faculté, puis `POST /api/training/facebook/complete` crée la demande. L'e-mail et
   l'identifiant ne viennent **jamais** du corps de la requête, seulement du cookie signé.
4. Pas d'e-mail renvoyé par Facebook (compte créé avec un numéro, permission refusée) :
   retour sur `/training` avec un message invitant à utiliser l'e-mail.

#### Créer l'application Meta (à faire par vous)

1. https://developers.facebook.com → **Mes applications → Créer une application**.
2. Cas d'usage : **Authentifier les personnes et leur demander des données avec Facebook Login**
   (type « Consommateur » / « Autre » selon l'assistant). Nommez-la, par exemple « DwaDZ Training ».
3. **Paramètres de l'application → Général** :
   * *Domaines de l'application* : `dzair-pharma.net` ;
   * *URL de la politique de confidentialité* : `https://www.dzair-pharma.net/privacy`
     (contient une section « Dzair-Pharma Training ») ;
   * *Suppression des données utilisateur* : une URL d'instructions → `https://www.dzair-pharma.net/privacy#training`
     (la section décrit la suppression en libre-service et sur demande) ;
   * catégorie : Éducation.
4. **Produits → Facebook Login → Paramètres** :
   * *Connexion OAuth client* : **Oui** ; *Connexion OAuth web* : **Oui** ;
   * *Forcer HTTPS* : **Oui** ;
   * *URI de redirection OAuth valides* : exactement
     `https://www.dzair-pharma.net/api/training/auth/facebook/callback`
     (et la même sur le domaine nu `https://dzair-pharma.net/...` si vous l'utilisez ;
     l'URI doit correspondre **au caractère près** à `NEXT_PUBLIC_APP_URL` + ce chemin).
5. Autorisations : `public_profile` et `email` sont disponibles en accès standard,
   **sans examen Meta**. En mode *Développement*, seuls les administrateurs, développeurs
   et testeurs de l'application peuvent se connecter (Rôles → Rôles) : ajoutez-vous pour tester.
6. Pour ouvrir au public : basculez l'application en mode **Actif (Live)** (interrupteur en haut
   du tableau de bord ; exige l'URL de confidentialité et celle de suppression des données).
7. Variables Vercel (Production **et** Preview) puis redéploiement :
   `TRAINING_FACEBOOK_APP_ID` (identifiant de l'app) et `TRAINING_FACEBOOK_APP_SECRET`
   (Paramètres → Général → Clé secrète). Sans elles, le bouton reste désactivé.
8. Version du Graph API : `v23.0` par défaut. Meta retire les versions après ~2 ans :
   vérifiez dans le tableau de bord et ajustez `TRAINING_FACEBOOK_GRAPH_VERSION` si besoin.

Notes : la page Facebook (id 61584995326062) n'a aucun lien technique avec l'application ;
suivre la page ne s'exige ni ne se vérifie. L'interface Meta change souvent : en cas d'écart
avec les libellés ci-dessus, cherchez « Facebook Login » et « URI de redirection OAuth valides ».

### Limites connues

* Le test de bout en bout de Facebook (échange réel avec Meta) n'a pas pu être fait ici :
  il demande une vraie application Meta. Le code est testé avec un `fetch` simulé
  (réponses d'échange, profil, e-mail absent, panne réseau) et les routes ont été
  exercées sur le serveur local (état invalide, refus, cookie falsifié, rôle invalide).
* L'alignement du temps de réponse de « Recevoir un lien » (≈ 2 s) limite le sondage
  des adresses ; un envoi d'e-mail plus lent que 1,9 s peut être interrompu sur
  une plateforme serverless : l'utilisateur redemande un lien.
* `purgeExpired()` (jetons et sessions périmés) existe mais n'est pas encore branchée sur un cron.

## Phase 4 — moteur d'examen, correction, relecture des questions

Migration à appliquer : `psql "$DATABASE_URL" -f sql/25_training_exam.sql`
(après 23 et 24). Elle ajoute `training_questions.manually_edited` et `training_flashcards`.

### Routes

| Route | Rôle |
|---|---|
| `/training/espace` | Démarrer une série (mode tuteur / examen, 10 à 100 questions), 2 examens blancs, dernières séries |
| `/training/examen/<id>` | Interface d'examen (id = tentative) : barre du haut, navigateur, énoncé, A à E, Marquer, rayage, Précédente/Suivante, chrono |
| `/training/resultats/<id>` | Score, détail par type et par question (après la fin seulement) |
| `/training/correction/<question>?attempt=<id>` | Bandeau, énoncé, justification de chaque proposition, contexte, points clés, références, encart résultat |
| `/admin/training/questions` | Relecture : filtres, édition, « Marquer relues », **Publier** (relecteur obligatoire) |
| `/api/training/attempts…` | API de la tentative (voir `app/api/training/`) |

### Sécurité : aucune bonne réponse avant la fin (mode examen)

* Les vues du moteur (`lib/training/exam.ts`) n'ont pas de champ `correct_index`,
  `explanation` ni `is_correct` : `review` n'est ajouté que si la tentative est
  terminée, ou (tuteur) si la question vient d'être validée.
* En base, `answers.is_correct` reste `NULL` jusqu'à la clôture.
* Une correction (`/training/correction/<q>`) n'est lisible que pour une question
  que **l'utilisateur lui-même** a déjà corrigée (tuteur : validée ; examen : tentative
  terminée). Sinon 404, sans distinction avec « n'existe pas ».
* Toutes les lectures et écritures filtrent par `user_id` (pas d'accès à la tentative d'autrui).
* Chrono : l'horloge est celle du serveur (`started_at + time_limit_s`, 72 s par question) ;
  une réponse tardive est refusée (409) et la tentative est clôturée à la prochaine lecture.
* Tests : 21 tests du moteur dont « aucune fuite » (scan de toutes les réponses des vues
  pour `correct_index`, `rationales`, texte des justifications…), isolation entre utilisateurs,
  expiration, verrouillage tuteur. Vérifié aussi sur HTTP (serveur local) : 0 occurrence
  des champs sensibles dans 30 réponses d'API avant la fin.
* Un utilisateur sans session, en attente, refusé ou remis en attente reçoit 401 (API) ou
  une redirection vers `/training/connexion` (pages).

### Modes

* **Tuteur** : choisir une proposition puis « Valider ma réponse » → page de correction
  immédiate ; la réponse est ensuite verrouillée. Pas de chrono.
* **Examen** : chronométré ; réponses modifiables, rayables, marquables ; correction et score
  à la fin (« Terminer la section » avec confirmation, ou expiration du temps).
* **Examens blancs** (`blanc-1`, `blanc-2`) : toujours en mode examen ; composition obtenue par un
  mélange déterministe de la banque publiée (même ordre pour tous tant que la banque ne change
  pas), jusqu'à 100 questions. Une tentative en cours garde sa liste figée.

### Relecture et publication

1. Générer : `python scripts/generate_questions.py sync --full`.
2. `/admin/training/questions` : filtrer (brouillons, type, « à relire »), ouvrir, corriger
   (énoncé, propositions, bonne réponse, contexte, justifications, points clés), puis
   **Marquer relues** ou **Publier** en saisissant votre nom (stocké dans `relu_par`).
3. Seules les questions `published` et non `stale` sont servies aux étudiants.
4. Une question retouchée à la main porte `manually_edited` : la régénération ne l'écrase plus
   jamais ; si la nomenclature change, elle est seulement marquée « à relire ».

### Limites connues

* Le contenu des questions est en français ; seule l'interface est bilingue (arabe à valider).
* `Ajouter aux flashcards` fonctionne ; l'écran de révision des flashcards est en phase 5.
* La composition des examens blancs dépend de la banque publiée : elle évolue quand on publie.
* Un envoi de réponse échoué (réseau) est signalé et la sélection annulée ; il n'y a pas de file
  hors ligne.
* Le build complet (`next build`) de ce dépôt exige la base de production (pages de garde
  prérendues) : ici seuls la compilation et le contrôle de types ont pu être vérifiés.

## Phase 5 — suivi, exports, confidentialité, quiz mobile, flashcards

Aucune nouvelle migration. Variables : `CRON_SECRET` (déjà utilisée par les autres crons) protège
`/api/cron/training-purge`.

### Écrans et routes

| Route | Rôle |
|---|---|
| `/admin/training/stats` | Utilisateurs actifs (7/30/90 j), tentatives, score moyen, par mode, questions / types / classes ATC les plus manquées, exports CSV |
| `/api/admin/training/export?kind=users\|attempts` | Export CSV (admin uniquement) : utilisateurs avec agrégats, tentatives |
| `/training/quiz` | Quiz rapide (10 questions), une par écran, un appui valide et corrige sur place ; enregistré comme série en mode tuteur |
| `/training/flashcards` | Révision : question, « Afficher la réponse », précédente / suivante, mélanger, retirer |
| `/training/espace` | Liens quiz et flashcards, « Supprimer mon compte et mes données » (confirmation) |
| `DELETE /api/training/account` | Suppression en libre-service (cascade : jetons, sessions, tentatives, réponses, flashcards) |
| `/privacy#training` | Section « Dzair-Pharma Training » de la politique de confidentialité |
| `/api/cron/training-purge` | Cron quotidien (03:30 UTC) : conservation limitée, jetons et sessions expirés |

Dans `/admin/training` : bouton **Supprimer** par utilisateur (droit à l'effacement), liens vers le suivi et la relecture.

### Suivi : ce qui est mesuré, et ce qui ne l'est pas

* Taux d'erreur calculés sur les réponses **données et corrigées** (les questions laissées sans réponse
  ne comptent pas). Classements de questions et de classes ATC : **au moins 5 réponses**.
* « Actifs » = utilisateurs ayant un événement de connexion, de début ou fin de série ou de réponse sur la période.
* Les événements ne contiennent jamais d'e-mail ni le contenu des réponses ; en examen ils ne révèlent pas la justesse.

### Confidentialité et conservation

Durées appliquées par le cron et annoncées dans `/privacy#training` (**propositions à confirmer** ;
à modifier ensemble dans `DEFAULT_RETENTION` de `lib/training/service.ts` et dans la page) :

| Donnée | Durée |
|---|---|
| Demandes non validées ou refusées | 12 mois |
| Comptes validés sans connexion | 24 mois |
| Événements d'usage | 24 mois |
| Jetons de connexion / sessions expirés | supprimés quotidiennement |

Suppression : en libre-service (espace) ou par l'admin ; événements conservés mais détachés de la personne
(`user_id` NULL, événement `account_deleted` sans donnée personnelle).

**À vérifier juridiquement (non fait ici)** : conformité à la loi algérienne n° 18-07 sur la protection des
personnes physiques dans le traitement des données à caractère personnel — notamment le régime de
déclaration / autorisation auprès de l'autorité nationale (ANPDP), le consentement, la base légale du
traitement, l'hébergement et le transfert des données hors d'Algérie (hébergeur, fournisseur d'e-mail,
Facebook), le délai de conservation et les mentions d'information. Les textes ci-dessus décrivent le
fonctionnement réel du module ; ils ne valent pas avis juridique.

### PWA

* `public/sw.js` : le cache passe en `pharmaveille-v2` (purge d'éventuelles pages `/training` déjà mises en
  cache) et **les pages `/training` ne sont jamais mises en cache** (corrections, examens, session).
  Observation hors périmètre : ce service worker met en cache toute page HTML visitée, **y compris `/admin`** ;
  à envisager séparément.
* `public/manifest.json` : raccourcis « Training : quiz rapide » et « Training : flashcards ».

### Non-régression du site existant

`npm run test:regression` compare, URL par URL (API de recherche avec plusieurs paramètres, `/recherche`,
`/alertes`, `/retraits`, `/medicaments`, `/substitution`, `/classes-therapeutiques`, `/outils`, `/a-propos`,
`/contact`, 404), un serveur **avec** le module à un serveur de **référence** (le commit `90eff2f`, avant
tout le module) lancés sur la même base : statut identique, JSON identique, HTML identique (hors build id
et menu), et le menu ne gagne que le lien Training. Résultat sur la base de test : 17/17.

```bash
# référence : git worktree add ../baseline 90eff2f && ln -s $PWD/node_modules ../baseline/ && (cd ../baseline && PORT=3001 npx next dev -p 3001)
SITE_URL=http://localhost:3000 BASELINE_URL=http://localhost:3001 REGRESSION_QUERY=PARACETAMOL npm run test:regression
```

### Fichiers existants modifiés par tout le module (depuis `90eff2f`)

`components/layout/Nav.tsx` (lien), `app/admin/AdminClient.tsx` (liens), `app/privacy/page.tsx` (section 10 et mise à jour),
`public/sw.js`, `public/manifest.json`, `vercel.json` (1 cron), `package.json` (scripts de test),
`tsconfig.json` (`allowImportingTsExtensions`), `env.local.example`, `.gitignore`.

### Limites connues

* Quiz et flashcards nécessitent une connexion (pas de mode hors ligne) ; la révision n'a pas de répétition espacée.
* Les pages d'administration existantes sont rendues dans un `<html>` imbriqué (layout admin) : avertissement
  d'hydratation en développement, antérieur au module.


## Phase 6 — questions « outils du site » : interactions, comparaison, codage ATC, substitution

Migration à appliquer : `psql "$DATABASE_URL" -f sql/34_training_v2.sql` (après 23 à 25 ; ne change que la contrainte
sur `training_questions.type`). Puis `python scripts/generate_questions.py sync --full`.

### Principe

**Toute question (ancienne ou nouvelle) se résout avec les outils du site** : recherche (nom, code, DCI, laboratoire),
fiche du médicament, comparateur de deux médicaments (interactions ANSM), classes ATC, substitution, produits retirés.
Chaque question porte `explanation.outils` — des gabarits de navigation (outil, lien, étapes) affichés dans la correction
sous « Comment le retrouver sur le site ». Ils n'ajoutent aucune connaissance médicale.

* `outils` **n'entre pas dans `content_hash`** : un lien du site qui évolue ne rend pas « à relire » une question publiée.
  `sync` met à jour seulement `explanation.outils` des questions dont le contenu n'a pas changé (`outils_updated`).
* `/training/methode` : pour chaque type, l'outil, la marche à suivre et **un exemple réel** (la 1ʳᵉ question publiée du
  type, correction repliée). Sans question publiée du type, seule la marche à suivre est affichée.

### Six nouveaux types

| Type | Question | Outil du site |
|---|---|---|
| `interaction_niveau` | Niveau de l'association X + Y (Thesaurus ANSM) : 4 niveaux + « aucune interaction répertoriée » | Comparateur de deux médicaments / fiche, rubrique Interactions |
| `interaction_contre_indication` | Avec laquelle de ces substances X est-il contre-indiqué ? | idem |
| `compare_specialites` | Comparer deux spécialités : laquelle des 5 affirmations (DCI, forme, dosage, laboratoire, ATC) est exacte ? | Comparateur, recherche, page DCI |
| `substitution` | Quelle spécialité a la même DCI, forme et dosage que X ? | `/substitution/<dci>` |
| `atc_code` | Code ATC complet (niveau 5) d'une DCI | Page DCI, classes ATC |
| `atc_inverse` | Quelle DCI est classée dans le sous-groupe ATC `N02B` ? | `/classes-therapeutiques/<code>` |

Règles de prudence (une seule bonne réponse, jamais d'ambiguïté) :
* **Interactions** : seulement les DCI simples dont le nom est tel quel un titre du thésaurus ; une association n'est posée que
  si une ligne directe existe **et** que toutes les lignes applicables (sens inverse, classes) donnent le même niveau unique
  (une ligne composée « CI - ASDEC » est écartée). Les distracteurs d'une contre-indication sont des substances connues du
  thésaurus pour lesquelles aucune ligne applicable n'est une contre-indication. Si `interactions_ansm` n'existe pas, ces types
  sont simplement sautés.
* **Comparaison** : spécialités à une seule ligne dans la nomenclature, profil complet ; chaque question compare les 5 mêmes attributs,
  une affirmation seulement est vraie (la phrase « même » / « différent » est choisie en conséquence).
* **Contrôle qualité** (`verify_question`) : relit les lignes brutes du thésaurus et de la nomenclature, sans l'index de génération ;
  une question à zéro ou deux bonnes réponses n'est jamais écrite.

### Interface

* Espace : choix d'un **thème** pour la série (nomenclature, interactions, comparaison/substitution, classification/codage ATC,
  retraits) et lien vers la méthode.
* Tirage **équilibré entre types** (`balancedPick`) pour les séries et les examens blancs : un type abondant ne noie plus les autres.
* **Profil « enseignant » supprimé** du formulaire, de Facebook, de la confidentialité et des textes. La base accepte encore la valeur
  pour d'éventuels comptes existants (aucune donnée n'est modifiée) ; les comptes admin ouverts automatiquement sont créés « pharmacien ».

### Limites connues

* Le thésaurus raisonne par substance : les associations de plusieurs substances (« A + B ») ne donnent pas de questions d'interaction.
* « Codage en DC » a été compris comme le **codage ATC d'une DCI** (code complet, sous-groupe, DCI d'un sous-groupe) ; à ajuster si un
  autre codage était visé.
* Traductions arabes des nouveaux textes (`copy.ts`) : à faire relire (`AR_VALIDATED = false`).
* Test e2e visuel des nouvelles pages non fait ici (pas de serveur Next avec la base de production) : typage `tsc` et tests unitaires/PostgreSQL seulement.
