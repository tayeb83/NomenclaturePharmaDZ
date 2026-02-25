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
