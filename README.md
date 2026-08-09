# DwaDZ (PharmaVeille DZ) — Médicaments & pharmacies de garde en Algérie

**DwaDZ… كلش على دوا البلاد** — moteur de recherche indépendant sur la
Nomenclature Nationale des Produits Pharmaceutiques publiée par le Ministère
de l'Industrie Pharmaceutique (MIPH), et annuaire des **pharmacies de garde**
par wilaya et commune. Interface bilingue **français / arabe** (RTL).

## Ce que fait le site

### 🔍 Recherche de médicaments
- **Recherche globale** (`/recherche`) : par nom commercial (DOLIPRANE), DCI
  (PARACETAMOL), laboratoire, forme ou dosage. Tolère les fautes de frappe
  (`amoxiciline` → AMOXICILLINE), l'arabe (`دوليبران` → PARACETAMOL) et
  l'arabizi (3, 7, 9…).
- **Catalogue complet** (`/medicaments`) : liste paginée et filtrable
  (type, statut fabriqué/importé, année), nouveautés de version, retraits.
- **Fiches détaillées** (`/medicament/...`) : DCI, forme, dosage, labo, pays,
  statut réglementaire, classe ATC, badge 🚨 pour les médicaments critiques.
- **Substitution générique** (`/substitution`), **comparateur**
  (`/comparateur`), **classes thérapeutiques ATC**
  (`/classes-therapeutiques`), **laboratoires** (`/laboratoires`).
- **Alertes & retraits** (`/alertes`, `/retraits`), **veille réglementaire**
  (`/veille`), **médicaments critiques** (`/medicaments-critiques`).

### 🌙 Pharmacies de garde
- `/pharmacie-de-garde` : plannings de garde officiels par **wilaya puis
  commune**, avec vues « Maintenant », « Cette nuit », « Vendredi » et
  « Vue du mois ».
- Tri par distance et carte si l'utilisateur autorise la géolocalisation ;
  téléphone cliquable et itinéraire Google Maps.
- Version arabe indexable sur `/ar/pharmacie-de-garde`.
- Crowdsourcing : confirmation d'ouverture, signalement d'erreur,
  revendication de fiche par le pharmacien.
- Annuaire général : `/pharmacies`.

### 📲 Application web (PWA)
Le site s'installe comme une application (bannière « Installer DwaDZ », ou
« Ajouter à l'écran d'accueil ») et fonctionne hors-ligne. Guide
d'installation et documentation complète des pages : **`/help`**
(section « Installer l'application » : `/help#application`).

## Sécurité & anti-scraping

- **Secrets** : aucun secret dans le repo — copier `env.local.example` vers
  `.env.local` (jamais committé). En production, définir les variables dans
  Vercel. `ADMIN_PASSWORD` et `ADMIN_SESSION_SECRET` doivent être longs et
  aléatoires (`openssl rand -hex 32`).
- **Headers** (`vercel.json`) : HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options`, `Permissions-Policy`, `Referrer-Policy` ;
  CORS ouvert uniquement sur les endpoints de l'app mobile
  (`/api/actualites`, `/api/push/register`).
- **Anti-bots** (`middleware.ts`) : blocage par User-Agent des bots
  d'entraînement IA (GPTBot, CCBot, ClaudeBot…), aspirateurs SEO
  (Semrush, Ahrefs, MJ12…) et clients HTTP génériques (curl, wget,
  python-requests, Scrapy…) ; `robots.txt` les interdit aussi et exclut
  `/api/` de l'indexation. Les moteurs de recherche légitimes (Googlebot,
  Bingbot) restent autorisés sur les pages.
- **Rate limiting** : middleware edge (90 req/min sur les API, 300 pages/min
  par IP+UA) + limites dédiées sur le login admin (5 tentatives / 15 min)
  et la newsletter. Pour un rate limiting distribué plus strict, activer le
  pare-feu Vercel (WAF) en complément.

---

# Guide de déploiement (Recherche • Alertes • Substitution)

## Architecture

```
Next.js 14 (App Router) + TypeScript
       ↓
Supabase (PostgreSQL + API REST auto) 
       ↓
Vercel (hosting + cron jobs)
       ↓
Brevo  (newsletter)
Facebook Graph API  (posts auto)
Twitter/X API v2    (tweets auto)
```

---

## Étape 1 — Supabase (base de données)

### 1.1 Créer un projet
1. Va sur **https://supabase.com** → New Project
2. Nom : `pharmaveille-dz`, région : EU (West) ou EU Central
3. Note le **Project URL** et les **API Keys** (Settings > API)

### 1.2 Initialiser le schéma
1. Ouvre le **SQL Editor** dans Supabase
2. Copie-colle le contenu de `sql/01_schema.sql`
3. Clique **Run**

### 1.3 Ingérer les données
```bash
# Dans le terminal
cd pharmaveille
pip install psycopg2-binary pandas openpyxl

# Copier tes XLSX dans le dossier data/
mkdir data
cp /chemin/vers/nomenclature_decembre_2025.xlsx data/
cp /chemin/vers/nomenclature_aout_2025.xlsx data/

# Lancer l'ingestion (comparaison automatique vs version précédente)
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
python scripts/ingest_to_supabase.py \
  --current data/nomenclature_decembre_2025.xlsx \
  --previous data/nomenclature_aout_2025.xlsx
```

---

## Étape 2 — Variables d'environnement

Copie `env.local.example` → `.env.local` et remplis :

```bash
cp env.local.example .env.local
```

⚠️ Ne jamais committer `.env.local` / `env.local` (ignorés par `.gitignore`).
Si un secret a été committé par le passé, il doit être **révoqué et régénéré**
(mot de passe DB Supabase, clé API, mot de passe d'application Gmail…).

**Obligatoires :**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `API_SECRET_KEY` (une chaîne aléatoire de 64 caractères)

**Pour la newsletter (Brevo) :**
1. Créer un compte sur **https://brevo.com**
2. SMTP & API > API Keys > Créer une clé
3. Contacts > Listes > Créer une liste "PharmaVeille DZ"
4. Remplir `BREVO_API_KEY` et `BREVO_LIST_ID`

**Pour Facebook :**
1. **https://developers.facebook.com** → My Apps → Create App
2. Ajouter le produit "Facebook Login" et "Pages"
3. Récupérer le **Page Access Token** permanent
4. Remplir `FACEBOOK_PAGE_ACCESS_TOKEN` et `FACEBOOK_PAGE_ID`

**Pour Twitter/X :**
1. **https://developer.twitter.com** → Projects & Apps
2. Créer une app avec "Read and Write" permissions
3. User Authentication Settings → OAuth 1.0a
4. Récupérer les 4 tokens/secrets
5. Remplir les 4 variables `TWITTER_*`

---

## Étape 3 — Lancer en local

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Étape 4 — Déploiement Vercel

### 4.1 Pousser sur GitHub
```bash
git init
git add .
git commit -m "init PharmaVeille DZ"
git remote add origin https://github.com/TON_USER/pharmaveille-dz.git
git push -u origin main
```

### 4.2 Connecter Vercel
1. **https://vercel.com** → New Project → Import depuis GitHub
2. Framework : **Next.js** (auto-détecté)
3. Environment Variables → coller toutes les variables de `.env.local`
4. Deploy !

### 4.3 Domaine personnalisé (optionnel)
- Vercel Dashboard > Domains > Add `pharmaveille-dz.com`
- Chez ton registrar DNS : CNAME → `cname.vercel-dns.com`

---

## Étape 5 — Publication automatique

### Publier un retrait manuellement
```bash
curl -X POST https://ton-site.vercel.app/api/publish \
  -H "Content-Type: application/json" \
  -d '{
    "type": "retrait",
    "id": 42,
    "platforms": ["facebook", "twitter"],
    "sendNewsletter": true,
    "secret": "TON_API_SECRET_KEY"
  }'
```

### Publier une nouveauté
```bash
curl -X POST https://ton-site.vercel.app/api/publish \
  -H "Content-Type: application/json" \
  -d '{"type": "nouveaute", "id": 123, "secret": "TON_API_SECRET_KEY"}'
```

### Récap hebdomadaire (automatique via Vercel Cron)
Le fichier `vercel.json` configure l'envoi automatique **chaque lundi à 8h** :
```json
{ "path": "/api/cron/weekly", "schedule": "0 7 * * 1" }
```

### Publications thématiques Facebook (rubriques nomenclature)

Tous les 2-3 jours, un post thématique est publié sur la Page Facebook avec
un **lien vers le site** (l'aperçu du lien ramène le trafic — pas d'image à
générer). Quatre rubriques alimentées automatiquement depuis la base :

- **💊 Classe thérapeutique** : « Les antidépresseurs / antidiabétiques…
  disponibles en Algérie » (regroupement par code ATC niveau 3) → lien
  `/classes-therapeutiques/{code}`.
- **🇩🇿 Fabriqué en Algérie** : focus sur une classe où la production locale
  est forte, avec les laboratoires concernés.
- **⚠️ Retrait** : alerte sur le dernier retrait du marché (avec motif) →
  lien `/retraits`.
- **🆕 Nouveautés & chiffres** : nouveautés de la version en cours ou
  instantané chiffré de la nomenclature.

**Fonctionnement (« auto + validation ») :**

1. Le cron `/api/cron/social-prepare` (chaque nuit) maintient ~5 brouillons
   d'avance dans la table `social_content_queue`, avec des dates de
   publication échelonnées (`SOCIAL_POST_INTERVAL_DAYS`, défaut 3 jours).
2. L'admin relit / modifie / **approuve** les brouillons depuis
   `/admin/social` (ou publie immédiatement).
3. Le cron `/api/cron/social-publish` (chaque jour) publie le prochain post
   **approuvé** dont l'échéance est arrivée. Un brouillon non validé n'est
   **jamais** publié → contrôle éditorial garanti.

La rotation évite de reproposer un sujet déjà couvert (clé `dedup_key`).
Génération manuelle possible depuis l'admin (« Générer un brouillon »).

```json
{ "path": "/api/cron/social-prepare", "schedule": "0 3 * * *" }
{ "path": "/api/cron/social-publish", "schedule": "0 8 * * *" }
```

#### Jeton Facebook : diagnostic et erreur « on behalf of user »

L'erreur `Cannot call API for app <app_id> on behalf of user <user_id>`
signifie que `FACEBOOK_PAGE_ACCESS_TOKEN` contient un **jeton utilisateur**
(ou un jeton émis pour un compte qui n'autorise plus l'application) : l'API
Graph exige un **jeton de Page** pour publier.

- **Correction automatique** : avant chaque publication, l'application
  interroge `GET /{page-id}?fields=access_token` et publie avec le jeton de
  Page ainsi dérivé (résultat mis en cache 30 min). Un jeton utilisateur
  valide suffit donc désormais à publier.
- **Diagnostic** : bouton « Vérifier la configuration » sur `/admin/social`
  (route `GET /api/admin/social/diagnostic`) — type de jeton, application
  émettrice, autorisations, expiration, accès à la Page, et la marche à
  suivre en cas de blocage. Renseigner `FACEBOOK_APP_ID` et
  `FACEBOOK_APP_SECRET` active l'inspection complète du jeton
  (`debug_token`).
- Si la dérivation échoue, reconnectez la Page dans les Outils Graph API
  avec `pages_show_list`, `pages_manage_posts` et `pages_read_engagement`,
  puis copiez le champ `access_token` renvoyé par `/me/accounts`.
- Les erreurs de publication sont désormais enregistrées et affichées avec
  la piste de correction correspondante.

### Pharmacies de garde — publication Facebook (automatique + manuelle)

Pour chaque wilaya (et chaque commune) couverte en base, le site publie
sur la Page Facebook une image générée automatiquement (rendu `next/og`)
accompagnée de la liste détaillée en légende (adresse, téléphone,
vacation jour/nuit) et du lien vers `/pharmacie-de-garde`.

**Trois périodes**, servies par le même moteur (`lib/garde-social.tsx`) :

| Période  | Contenu                                | Cron Vercel                                  |
|----------|----------------------------------------|----------------------------------------------|
| `day`    | Les officines de garde du jour         | `/api/cron/garde-daily` — tous les jours 7h   |
| `friday` | Le **vendredi suivant**, posté en amont (badge « À venir ») | `…?period=friday` — jeudi 16h |
| `month`  | Le planning du mois, une ligne par jour, vendredis surlignés | `…?period=month` — le 1er du mois 6h |

**Publication manuelle** — `/admin/garde/publication` : on choisit la
wilaya, éventuellement la commune, les langues, puis on clique sur le
visuel à publier (aperçu réel, encadré aux couleurs du drapeau). Une case
« Simuler sans publier » permet de vérifier légende et visuel sans rien
envoyer. La page liste aussi les dernières publications et leur statut.

- **Wilaya ou commune** : `granularity` = `wilaya` (un post pour toute la
  wilaya, défaut, réglable via `GARDE_PUBLISH_GRANULARITY`) ou `commune`
  (un post par commune — recommandé pour les grandes wilayas). Le planning
  mensuel est toujours publié par commune, sinon le visuel est illisible.
- **Logo de la wilaya** : déposable depuis `/admin/garde/publication`
  (PNG/JPEG ≤ 400 Ko, stocké en base — `sql/16_garde_wilaya_logos.sql`).
  Il s'affiche en tête du visuel, à côté du logo DwaDZ ; sans logo
  enregistré, le visuel se rend simplement sans.
- **Bilingue** : par défaut deux posts distincts par cible — un en
  français (image LTR, lien `/pharmacie-de-garde`) et un en arabe
  (« صيدليات المناوبة », image RTL, lien `/ar/pharmacie-de-garde`).
  Réglable via `GARDE_PUBLISH_LOCALES` (`fr`, `ar`, `fr,ar`…).
- Configuration : mêmes variables `FACEBOOK_PAGE_ID` +
  `FACEBOOK_PAGE_ACCESS_TOKEN` que les alertes (token de Page longue durée
  avec `pages_manage_posts`).
- Le lien en légende pointe vers la page directe de la commune quand la
  publication ne concerne qu'elle, sinon vers le hub ancré sur la wilaya.
- Idempotent : chaque publication (par langue) est journalisée dans
  `social_posts` (`type='garde'`) ; relancer le cron ou recliquer sur
  « Publier » le même jour ne crée pas de doublon.
- **Publications espacées** : par défaut 8 s entre chaque post (réglable
  via `GARDE_POST_DELAY_MS`) pour ne pas saturer le fil ni l'API Graph.
  Un budget de temps interne (`GARDE_TIME_BUDGET_MS`, ~50 s) borne la durée
  totale sous la limite d'exécution Vercel : au-delà, les posts restants
  sont publiés sans attente plutôt que coupés.
- Aperçu du visuel sans publier (`&lang=ar` pour l'arabe) :
  `GET /api/garde/social-image?wilaya=16&period=day`
  `…?wilaya=20&commune=2001&period=month&month=2026-08`
- Test à blanc (aucune publication) :
  `curl -H "Authorization: Bearer $CRON_SECRET" "https://www.dzair-pharma.net/api/cron/garde-daily?dry=1"`
- Déclenchement manuel ciblé :
  `POST /api/publish` avec `{"type": "garde_daily", "wilaya": "16"}`
  (header `x-api-secret`), ou `POST /api/admin/garde/publish` avec
  `{"period":"friday","wilaya":"16","commune":"1601"}` (session admin).

> ⚠️ `vercel.json` déclare 6 crons (dont `period=friday` et `period=month`).
> Le plan Hobby en autorise 2, déclenchés une fois par jour : au-delà, les
> crons supplémentaires ne se déclenchent pas — le bouton « Publier » de
> `/admin/garde/publication` reste alors la voie manuelle, et le plan Pro
> lève la limite.
> Le domaine apex (`dzair-pharma.net`) redirige vers `www` : pour les tests
> `curl` manuels, viser `www.dzair-pharma.net` ou ajouter
> `--location-trusted` (le cron interne Vercel n'est pas concerné).

---

## Étape 6 — Mise à jour des données

Quand le MIPH publie un nouveau fichier nomenclature (3 feuilles : Nomenclature, Non Renouvelés, Retraits) :
```bash
python scripts/ingest_to_supabase.py \
  --current data/nomenclature_decembre_2025.xlsx \
  --previous data/nomenclature_version_precedente.xlsx
```
Le script calcule automatiquement les **nouveautés** par comparaison avec la version précédente.

---

## Modèles de posts réseaux sociaux

### Retrait urgent (Facebook)
```
🚨 ALERTE RETRAIT — Marché Pharmaceutique Algérien

📋 Médicament : VIRLIX®
🧪 DCI : Cétirizine dichlorhydrate
💊 Dosage : 10mg
🏭 Laboratoire : SANOFI SYNTHELABO (FRANCE)

💼 Motif : Retrait par le détenteur pour motif commercial

⚠️ Chers pharmaciens, ce produit ne doit plus être délivré.
🔗 www.pharmaveille-dz.com/alertes

#PharmaVeilleDZ #Pharmacie #Algérie #Retrait #MIPH
```

### Tweet (280 chars max)
```
🚨 RETRAIT | VIRLIX® (Cétirizine 10mg)
💼 Motif commercial — SANOFI SYNTHELABO
⚠️ Ne plus délivrer

🔗 pharmaveille-dz.com
#PharmaVeilleDZ #Pharmacie #Algérie
```

---

## Stack des coûts (estimation mensuelle)

| Service | Plan | Coût |
|---|---|---|
| Vercel | Hobby (Free) | 0€ |
| Supabase | Free tier (500MB, 50k req/mois) | 0€ |
| Brevo | Free (300 emails/jour) | 0€ |
| Domaine .com | — | ~10€/an |
| **Total** | | **~0€/mois** |

⚡ Tout est dans le free tier pour commencer !

---

## Checklist de lancement

- [ ] Schéma SQL créé dans Supabase
- [ ] Données ingérées (4 706 médicaments)
- [ ] Variables d'environnement configurées
- [ ] Tests en local OK (`npm run dev`)
- [ ] Déployé sur Vercel
- [ ] Domaine configuré
- [ ] Page Facebook créée + Token récupéré
- [ ] Compte Twitter créé + App developer configurée
- [ ] Compte Brevo + liste newsletter créée
- [ ] Premier post de lancement publié 🎉


### Dépannage ingestion

Si tu as l'erreur `value too long for type character varying(30)`, exécute la migration :

```bash
psql "$DATABASE_URL" -f sql/02_fix_varchar.sql
```

Puis relance l'ingestion.

---

## Médicaments critiques (DCI + forme + dosage)

1. Exécuter la migration:
```bash
psql "$DATABASE_URL" -f sql/06_critical_medicaments.sql
```

2. Exporter la feuille Google en CSV puis importer:
```bash
python scripts/import_critical_medicaments.py \
  --csv data/medicaments_critiques.csv \
  --published-at 2026-03-24
```

Après import:
- la page `/medicaments-critiques` affiche la liste complète,
- les résultats de recherche et fiches médicaments affichent un badge **🚨 Critique** si `DCI + forme + dosage` correspondent.

### Import direct depuis Vercel (sans terminal)

1. Ouvre `/admin` sur ton site déployé (ex: `https://ton-site.vercel.app/admin`).
2. Connecte-toi en admin.
3. Dans l’onglet **Importer un fichier**, utilise le bloc **Importer la liste des médicaments critiques (CSV/XLSX)**.
4. Sélectionne ton export Google Sheets (`.csv`), puis clique **Importer la liste critique**.

L’API `/api/admin/upload-critical` crée automatiquement la table `critical_medicaments` si nécessaire puis fait un upsert des lignes.

---

## Actualités & notifications push (app mobile DwaDZ)

L'app mobile (Capacitor, repo `dwadz-mobile`) a un écran "Actualités" qui consomme :

```
GET /api/actualites?type=<amm|retrait>&page=<n>&limit=<n>
```

Implémentation : `app/api/actualites/route.ts`. Le flux est construit directement à partir des tables existantes, sans nouvelle ingestion :
- `type=retrait` → table `retraits` (historique complet, déjà présent)
- `type=amm` → `enregistrements WHERE is_new_vs_previous = TRUE` (nouveautés de la dernière version ingérée), daté avec `reference_date` de `nomenclature_versions`

**`type=prix` renvoie toujours une liste vide** : le fichier nomenclature MIPH ingéré (`scripts/ingest_to_supabase.py`) ne contient aucune colonne prix ni remboursement CNAS — voir section dédiée ci-dessous.

### Notifications push

1. Exécuter la migration :
```bash
psql "$DATABASE_URL" -f sql/09_push_tokens.sql
```
2. Créer un projet Firebase (FCM), générer une clé de compte de service (Firebase Console → Paramètres du projet → Comptes de service → Générer une nouvelle clé privée), puis définir dans les variables d'environnement Vercel :
```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account", ...}   # le JSON complet, sur une seule ligne
```
3. Sans cette variable, `lib/push.ts` renvoie simplement `{ success: false }` (comme Facebook/Twitter dans `lib/social.ts`) — `/api/publish` continue de fonctionner normalement, juste sans envoi push.

Une fois configuré, `POST /api/publish` (`type: "retrait"` ou `"nouveaute"`) envoie automatiquement une notif push à tous les tokens actifs, en plus de Facebook/Twitter/newsletter. Un tap sur la notif ouvre l'app directement sur l'écran Actualités.

---

## Recherche tolérante et phonétique (fautes de frappe, arabe/darija, synonymes)

La recherche (`/api/search`, page `/recherche`, accueil) applique un repli intelligent quand la recherche stricte ne renvoie rien :

1. **Synonymie** (`search_synonyms`) : noms commerciaux étrangers, appellations populaires et graphies arabes → terme officiel de la nomenclature. Ex : `doliprane`, `دوليبران` → `PARACETAMOL`.
2. **Recherche floue trigram + phonétique** (`pg_trgm` + repli phonétique dans `lib/search-normalize.ts` / `lib/queries.ts`) : `amoxiciline` → AMOXICILLINE, `parasetamol` → PARACETAMOL, translittération arabe → latin, arabizi (`3`, `7`, `9`…).

Activation de la synonymie (facultative — le flou trigram fonctionne sans) :
```bash
psql "$DATABASE_URL" -f sql/11_search_synonyms.sql
```
Pour enrichir la synonymie, insérer dans `search_synonyms` (`term`, `term_norm` = forme latine normalisée, `target` = terme à rechercher). L'UI signale à l'utilisateur quand les résultats proviennent du repli (« résultats approchés » / substance résolue via synonyme).

⚠️ `foldPhonetic()` (lib/search-normalize.ts) et `phoneticFoldSql()` (lib/queries.ts) doivent rester strictement équivalents : toute nouvelle règle doit être ajoutée des deux côtés.

---

## Navigation par classe thérapeutique (ATC)

Pages `/classes-therapeutiques` (les 14 groupes anatomiques) et `/classes-therapeutiques/[code]` (drill-down niveau 1 → 5, avec fil d'Ariane, sous-classes et DCI de la nomenclature mappées). Les codes ATC des fiches médicaments sont cliquables vers ces pages.

Prérequis : la classification ATC et le mapping DCI doivent être chargés (tables `atc_codes` + `dci_atc_mapping`, migration `sql/04_atc_codes.sql`, import via `scripts/import_atc.py` / `scripts/restore_atc_dump.py`). Sans données, les pages affichent un message explicite.

---

## Import des plannings de garde (DSP)

Les listes de garde publiées par les DSP (photo Facebook → extraction
vision-LLM → JSON `garde_officines`) sont chargées avec :

```bash
# Toujours simuler d'abord : tout est joué puis annulé, le rapport est identique
python scripts/import_garde.py --json data/garde_saida_202608.json --dry-run
python scripts/import_garde.py --json data/garde_saida_202608.json
```

**Un fichier peut couvrir plusieurs communes.** Si `meta` ne porte pas de
commune, chaque pharmacie déclare la sienne (`commune_name_fr`, ou
simplement `commune`) et un roster `garde_rosters` est créé par commune,
avec la tranche correspondante du fichier en `raw_payload`. Les codes et
noms arabes peuvent être déclarés dans `meta.communes[]` :

```json
"communes": [
  { "code": "2001", "name_fr": "Saïda", "name_ar": "سعيدة" },
  { "code": "2002", "name_fr": "Aïn El Hadjar", "name_ar": "عين الحجر" }
]
```

Si une commune existe déjà en base sous un autre `commune_code`, c'est le
code existant qui est conservé (sinon la même commune apparaîtrait deux
fois dans la couverture) — `--no-reuse-commune-codes` pour forcer celui du
fichier. Cas particulier des imports anciens faits **sans** code : les
lignes de la commune (fiches, rosters, gardes, signalements,
revendications) sont reprises sous le code du fichier, sinon la page
publique — qui résout par `commune_code` — ne verrait que la moitié des
données.

**Les données saisies à la main sont préservées.** Adresses (FR/AR),
téléphones et points posés dans `/admin/garde`
(`geocode_status = 'manual'`) ne sont jamais écrasés par une nouvelle
extraction : celle-ci ne remplit que les champs vides.

Corriger une fiche se fait dans `/admin/garde` : le filtre **« Toutes »**
(au lieu de « À géocoder ») plus la recherche par nom/adresse/commune
donnent accès à n'importe quelle pharmacie, y compris déjà pointée. Tous
les champs y sont éditables (noms FR/AR, adresses FR/AR, téléphone,
commune, type), une fiche absente du document peut être **ajoutée** et une
fiche erronée **supprimée** — avec le nombre de gardes qui partiraient
avec elle en confirmation. Utile quand l'extraction du document DSP décale
une ligne et attribue à une pharmacie l'adresse de sa voisine.

Le téléphone se saisit comme sur le document (`07.91.90.96.97`) : le
format E.164 (`+213791909697`), seul utilisable pour un lien d'appel, en
est déduit — mobiles et fixes. Comme les `id`
d'extraction ne sont pas stables d'un mois à l'autre, une pharmacie non
retrouvée par son `external_id` est rapprochée par son nom normalisé
(casse, accents, préfixe « Pharmacie ») dans la même commune, et c'est la
fiche existante qui est mise à jour — adresse, géoloc, signalements et
revendication suivent. Le rapprochement par nom est refusé en cas
d'homonymes dans la commune : une nouvelle fiche est créée plutôt que de
recopier l'adresse d'une autre pharmacie. Beaucoup de fiches DSP n'ont
qu'un nom arabe (`name_fr` à `null`) : le rapprochement se fait alors sur
`name_ar`, et une extraction sans `name_fr` n'efface pas un nom français
saisi entre-temps.

Le rapport indique, avant chaque commune, le nombre de fiches déjà en base
pour ce `commune_code`. **Si tout ressort en « nouvelles » alors que le
mois précédent est chargé, c'est ce compteur qu'il faut lire** : à 0 sur
une commune déjà importée, le `commune_code` (ou le `wilaya_code`) a changé
d'une extraction à l'autre. Le script tente alors un rapprochement à
l'échelle de la wilaya, accepté seulement si le nom y est unique.

Pour laisser le fichier reprendre la main : `--overwrite-addresses`
(adresses + téléphones) et `--overwrite-geo` (points manuels).

Après import, géocoder les nouvelles fiches (`geocode_status = 'none'`) :
`python scripts/geocode_garde.py`.

---

## Crowdsourcing pharmacies de garde

```bash
psql "$DATABASE_URL" -f sql/12_garde_crowdsourcing.sql
```

Sur chaque pharmacie des pages `/pharmacie-de-garde/[wilaya]/[commune]` (FR + AR) :
- **✔ Ouverte, je confirme** — confirmation en un clic (`POST /api/garde/report`, type `confirme_ouverte`)
- **⚠ Signaler une erreur** — formulaire (horaire, adresse, téléphone, fermée…)
- **🏪 C'est ma pharmacie** — revendication de fiche par le pharmacien (`POST /api/garde/claim` : nom, téléphone, WhatsApp, email). Après vérification manuelle, il devient contributeur de sa fiche (et prospect naturel de la fiche premium).

Modération : `/admin/garde/signalements` (liste + changement de statut). Anti-abus : rate-limit par hash d'IP salé (pas d'IP en clair).

---

## Fiche Pharmacie Premium (offre `/pro`, 500 DZD/mois)

```bash
psql "$DATABASE_URL" -f sql/15_garde_premium.sql
```

Concrétise l'offre annoncée sur `/pro`. L'abonnement vit dans
`garde_pharmacy_premium`, **table séparée de `garde_pharmacies`** : les
fiches sont réécrites à chaque import DSP, l'abonnement ne doit dépendre
d'aucune colonne que l'import touche. Il est rattaché à l'`id` interne, pas
à l'`external_id` d'extraction — il survit donc à un réimport qui change
les identifiants.

Gestion dans `/admin/garde`, panneau **⭐ Fiche premium** d'une pharmacie :
activation, badge « Vérifiée », dates d'abonnement, WhatsApp, horaires
détaillés (FR/AR), accroche (FR/AR), jusqu'à 6 photos (URL https), note
interne jamais affichée, et le compteur de consultations.

Côté public (`/pharmacie-de-garde/…` FR et AR), une fiche premium active
affiche le badge « Vérifiée », son accroche, ses horaires, ses photos et un
bouton WhatsApp, sur une carte mise en avant. **La mise en avant ne joue
qu'à service égal** : une officine ouverte maintenant, ou plus proche du
visiteur, passe toujours devant une fiche premium — l'ordre d'affichage
n'est pas à vendre.

Les consultations (`garde_pharmacy_views`) sont comptées une fois par
session et par pharmacie, sans aucun identifiant visiteur : seulement un
compteur par jour. C'est la statistique remontée au pharmacien.

Tant que la migration n'est pas appliquée, tout continue de fonctionner :
les pages de garde s'affichent sans les extras, `/api/garde/view` ne compte
rien, et l'admin indique quelle migration lancer.

---

## Espace Pro (monétisation B2B) — page `/pro`

```bash
psql "$DATABASE_URL" -f sql/13_pro_leads.sql
```

Trois offres présentées avec capture de leads (`POST /api/pro/lead`, consultation admin via `GET /api/admin/pro/leads`) :
1. **Veille réglementaire Premium** (labos/importateurs) — alertes ciblées par classe ATC, retraits, AMM non renouvelées, exports. À partir de 8 000 DZD/mois.
2. **API Nomenclature structurée** (éditeurs logiciels d'officine, startups santé, assurances) — données nettoyées, versionnées, enrichies ATC + synonymie. À partir de 20 000 DZD/mois.
3. **Fiche Pharmacie Premium** — badge vérifié, WhatsApp cliquable, mise en avant locale dans les pages de garde. À partir de 500 DZD/mois.

Suivi commercial : statut du lead (`nouveau` → `contacte` → `converti`).

---

## Prix officiel / remboursement CNAS — état de l'investigation

Aucune donnée de prix ni de remboursement n'est disponible dans ce projet à ce jour. Deux pistes officielles distinctes ont été identifiées, ni l'une ni l'autre encore intégrée :

1. **Fichier nomenclature MIPH actuel** (`scripts/ingest_to_supabase.py`) : les colonnes lues sont n° enregistrement, code, DCI, nom de marque, forme, dosage, conditionnement, liste, prescription, obs, labo, pays, dates, type, statut, stabilité — **pas de prix ni de remboursement**. Une ancienne version du fichier source (2019, `sante.gov.dz`) semble en avoir contenu par le passé d'après un projet tiers ([mahmoudBens/Nomenclature-des-medicaments-en-algerie](https://github.com/mahmoudBens/Nomenclature-des-medicaments-en-algerie)), mais ce n'est pas le cas du fichier actuellement utilisé ici. À vérifier à chaque nouvelle version MIPH reçue : si ces colonnes réapparaissent, l'ajout au schéma est peu coûteux (2 colonnes sur `enregistrements`).
2. **Liste CNAS des médicaments remboursables** — document officiel distinct, publié en PDF (voir [version 2023 relayée par l'OMS](https://www.who.int/publications/m/item/algeria--la-liste-des-m-dicaments-remboursables-par-la-s-curit--sociale-2023-(french))), avec conditions de remboursement et prix de référence. Pas de format structuré public connu : nécessiterait un parsing PDF + un rapprochement DCI/forme/dosage avec la nomenclature, avec un risque d'erreurs de correspondance à valider manuellement avant tout affichage (donnée sensible pour le patient).

Recommandation : ne pas afficher de prix tant que l'une de ces deux sources n'est pas confirmée et vérifiée manuellement — un prix erroné dans une app médicale est pire que l'absence de prix.

---

## Analytics internes & top 10 des pages sur l'accueil

Le site enregistre son propre trafic, sans outil tiers, dans trois tables : `page_visit_events` (visites, alimentée par `components/analytics/PageVisitTracker.tsx`), `search_click_events` (clic sur un résultat de recherche) et `api_exec_events` (appels API). Elles alimentent deux surfaces :

- **`/admin` → onglet 📊 Analytics** — pages les plus visitées, requêtes et résultats les plus cliqués, appels API.
- **La page d'accueil** — section « 🔥 Top 10 des pages les plus recherchées » (classement sur 30 jours) et puces « Recherches populaires ».

### Créer les tables sur une base existante

Ces tables ne figuraient que dans `sql/01_schema.sql` : **une base créée avant leur ajout ne les possède pas**, et `sql/01_schema.sql` ne peut pas être rejoué tel quel (ses `CREATE INDEX` ne sont pas idempotents). D'où une migration dédiée :

```bash
psql "$DATABASE_URL" -f sql/16_analytics_events.sql
```

Elle est intégralement idempotente (`IF NOT EXISTS` partout) : sans risque même si les tables existent déjà.

### Si le classement n'apparaît pas sur l'accueil

La section est volontairement masquée quand il n'y a rien à classer — elle ne s'affiche jamais vide. Dans l'ordre :

1. **Les tables existent-elles ?**
   ```bash
   psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM page_visit_events"
   ```
   Erreur `relation ... does not exist` → lancer la migration ci-dessus. Le code teste la présence de chaque table avant de l'interroger (`hasTable`), donc leur absence ne remonte aucune erreur : le classement reste simplement vide.
2. **Y a-t-il des données ?** Même requête : `0` signifie qu'aucune visite n'a encore été enregistrée. Ouvrir une page du site (autre que l'accueil), puis vérifier à nouveau.
3. **Reste-t-il quelque chose après filtrage ?** Le classement exclut l'accueil (`/`, `/ar`), l'admin et les routes API :
   ```sql
   SELECT page_path, COUNT(*) FROM page_visit_events
   WHERE created_at >= NOW() - INTERVAL '30 days'
     AND page_path NOT IN ('/', '/ar', '/admin', '/ar/admin')
     AND page_path NOT LIKE '/admin/%' AND page_path NOT LIKE '/api/%'
   GROUP BY page_path ORDER BY 2 DESC LIMIT 10;
   ```
4. **Cache** : l'accueil est en ISR (`revalidate = 3600`), le classement peut mettre jusqu'à une heure à refléter les nouvelles données.
