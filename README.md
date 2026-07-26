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

### Pharmacies de garde — publication Facebook quotidienne

Chaque jour à **8h (heure d'Alger)**, le cron `/api/cron/garde-daily`
publie sur la Page Facebook, **pour chaque wilaya couverte en base**, une
image générée automatiquement (liste des officines de garde du jour,
rendu `next/og`) accompagnée de la liste détaillée en légende
(commune, adresse, téléphone, vacation jour/nuit) et du lien vers
`/pharmacie-de-garde`.

- **Bilingue** : par défaut deux posts distincts par wilaya — un en
  français (image LTR, lien `/pharmacie-de-garde`) et un en arabe
  (« صيدليات المناوبة », image RTL, lien `/ar/pharmacie-de-garde`).
  Réglable via `GARDE_PUBLISH_LOCALES` (`fr`, `ar`, `fr,ar`…).
- Configuration : mêmes variables `FACEBOOK_PAGE_ID` +
  `FACEBOOK_PAGE_ACCESS_TOKEN` que les alertes (token de Page longue durée
  avec `pages_manage_posts`).
- Le lien en légende pointe vers la page directe de la commune quand la
  wilaya n'en a qu'une, sinon vers le hub ancré sur la wilaya.
- Idempotent : chaque publication (par langue) est journalisée dans
  `social_posts` (`type='garde'`) ; relancer le cron le même jour ne crée
  pas de doublon.
- **Publications espacées** : par défaut 8 s entre chaque post (réglable
  via `GARDE_POST_DELAY_MS`) pour ne pas saturer le fil ni l'API Graph.
  Un budget de temps interne (`GARDE_TIME_BUDGET_MS`, ~50 s) borne la durée
  totale sous la limite d'exécution Vercel : au-delà, les posts restants
  sont publiés sans attente plutôt que coupés.
- Aperçu du visuel sans publier (ajouter `&lang=ar` pour l'arabe) :
  `GET /api/garde/social-image?wilaya=16&date=2026-07-22`
- Test à blanc (aucune publication) :
  `curl -H "Authorization: Bearer $CRON_SECRET" "https://www.dzair-pharma.net/api/cron/garde-daily?dry=1"`
- Déclenchement manuel ciblé :
  `POST /api/publish` avec `{"type": "garde_daily", "wilaya": "16"}`
  (header `x-api-secret`).

> ⚠️ Vercel plan Hobby : 2 cron jobs max — `weekly` + `garde-daily`
> atteignent cette limite. Le domaine apex (`dzair-pharma.net`) redirige
> vers `www` : pour les tests `curl` manuels, viser `www.dzair-pharma.net`
> ou ajouter `--location-trusted` (le cron interne Vercel n'est pas
> concerné).

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
