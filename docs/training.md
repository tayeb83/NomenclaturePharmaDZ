# Dzair-Pharma Training — documentation du module

Module d'entraînement aux QCM (étudiants, enseignants, pharmaciens) construit à
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

* Sept types : DCI à partir de la marque, référence/générique, forme et
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
