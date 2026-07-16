# PharmaVeille DZ — Guide de déploiement (Recherche • Alertes • Substitution)

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

Copie `.env.local.example` → `.env.local` et remplis :

```bash
cp .env.local.example .env.local
```

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

## Prix officiel / remboursement CNAS — état de l'investigation

Aucune donnée de prix ni de remboursement n'est disponible dans ce projet à ce jour. Deux pistes officielles distinctes ont été identifiées, ni l'une ni l'autre encore intégrée :

1. **Fichier nomenclature MIPH actuel** (`scripts/ingest_to_supabase.py`) : les colonnes lues sont n° enregistrement, code, DCI, nom de marque, forme, dosage, conditionnement, liste, prescription, obs, labo, pays, dates, type, statut, stabilité — **pas de prix ni de remboursement**. Une ancienne version du fichier source (2019, `sante.gov.dz`) semble en avoir contenu par le passé d'après un projet tiers ([mahmoudBens/Nomenclature-des-medicaments-en-algerie](https://github.com/mahmoudBens/Nomenclature-des-medicaments-en-algerie)), mais ce n'est pas le cas du fichier actuellement utilisé ici. À vérifier à chaque nouvelle version MIPH reçue : si ces colonnes réapparaissent, l'ajout au schéma est peu coûteux (2 colonnes sur `enregistrements`).
2. **Liste CNAS des médicaments remboursables** — document officiel distinct, publié en PDF (voir [version 2023 relayée par l'OMS](https://www.who.int/publications/m/item/algeria--la-liste-des-m-dicaments-remboursables-par-la-s-curit--sociale-2023-(french))), avec conditions de remboursement et prix de référence. Pas de format structuré public connu : nécessiterait un parsing PDF + un rapprochement DCI/forme/dosage avec la nomenclature, avec un risque d'erreurs de correspondance à valider manuellement avant tout affichage (donnée sensible pour le patient).

Recommandation : ne pas afficher de prix tant que l'une de ces deux sources n'est pas confirmée et vérifiée manuellement — un prix erroné dans une app médicale est pire que l'absence de prix.
