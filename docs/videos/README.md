# DwaDZ — Vidéos pédagogiques en arabe standard (sous-titres français)

Série courte (45–75 s) pour Reels / TikTok / Shorts / Facebook : **« C'est quoi ce médicament ? Et attention à… »**.
Chaque épisode part d'une fiche de l'outil (nom de marque → DCI → interactions ANSM) et se termine sur
`dzair-pharma.net`. **Voix et texte en arabe standard simple, traduction française toujours en sous-titre** (le darija a été essayé : un clone de
voix le lit comme de l'arabe littéraire).

## Structure d'un épisode (6 blocs)

| # | Bloc | Durée | Contenu |
|---|------|-------|---------|
| 1 | **Hook** | 0–4 s | Une question ou une erreur courante (« Doliprane + Efferalgan = ? ») |
| 2 | **C'est quoi** | 4–15 s | Marque → DCI → à quoi ça sert, en une phrase |
| 3 | **Comment** | 15–30 s | Règle de dose/durée *telle qu'écrite dans la notice* (jamais inventée) |
| 4 | **Attention** | 30–50 s | 2–3 contre-indications / interactions, gravité ANSM d'abord |
| 5 | **Réflexe** | 50–60 s | Quoi faire : demander au pharmacien / médecin, ne pas arrêter seul |
| 6 | **Appel** | 60–70 s | « Tape le nom sur DwaDZ » + rappel : ne remplace pas un avis médical |

Colonne de gauche = ce que la voix dit. Colonne de droite = **capture de l'outil** à montrer (fiche, onglet
*Interactions*, `/substitution`, comparateur). Chaque script indique la capture exacte.

## Règles éditoriales (non négociables)

1. **Pas de diagnostic, pas de posologie personnalisée.** On énonce la règle générale de la notice/du RCP et on renvoie au pharmacien.
2. **Chaque affirmation médicale a une source** (RCP ANPP, Thesaurus ANSM sept. 2023, monographie relue). Elle figure dans le champ `Sources` de l'épisode.
3. **Relecture par un pharmacien/médecin avant tournage** (champ `Relu par` + date). Un épisode sans relecteur n'est pas publié, comme les monographies de l'outil.
4. **Jamais** de psychotropes, stupéfiants, ni de médicaments recherchés/ruptures (même garde-fou que `lib/demandes-core.ts`).
5. **Pas de promotion de marque** : on nomme la marque pour être compris, on explique la DCI, on rappelle l'existence de génériques.
6. **Gravités ANSM** : on emploie les 4 niveaux du site (contre-indication, association déconseillée, précaution d'emploi, à prendre en compte). La traduction arabe du thésaurus est « brouillon à relire » : ne pas la lire telle quelle à l'écran sans relecture.
7. Phrase de fin obligatoire, à l'oral et en sous-titre : *« هادي معلومة عامة، ما تعوضش رأي الطبيب ولا الصيدلي »*.

## Chaîne de fabrication

```text
fiche DwaDZ ──► scripts/video_brief.py ──► brouillon d'épisode (.md)
      │                                            │
      └─ captures d'écran (Playwright)             ▼
                                         rédaction arabe standard + traduction FR + relecture pharmacien
                                                   │
                                         voix off (toi ou enregistrement) ──► montage + sous-titres FR/AR
                                                   │
                                         publication (file Facebook /admin/social, Reels, TikTok, Shorts)
```

- **Brouillon automatique** : `python3 scripts/video_brief.py PARACETAMOL` génère l'ossature (interactions classées par
  gravité, avec page du PDF ANSM) à compléter. `--classe "ANTI-INFLAMMATOIRES NON STÉROÏDIENS"` pour une classe.
- **Captures** : `scripts/capture_graphes.mjs` montre comment piloter Playwright sur le site ; même principe pour une fiche.
- **Voix** : ta voix clonée (voir `animation/voice.py`) ou un enregistrement humain ; une voix synthétique générique sonne faux et fait perdre la confiance.
- **Sous-titres** : un fichier `.srt` par langue, produit par `animation/render.mjs` à partir du texte de l'épisode (AR en arabe standard, FR en traduction).

## Calendrier de lancement (12 épisodes, 2/semaine)

| Sem. | Épisode | Idée centrale |
|------|---------|---------------|
| 1 | 01 Doliprane | Paracétamol : la dose, le foie, et les warfarine/fluclox. |
| 1 | 02 Ibuprofène | AINS : estomac, reins, grossesse, quand éviter |
| 2 | 03 Même DCI, noms différents | Doliprane/Efferalgan/Dafalgan + sirop rhume = surdosage |
| 2 | 04 Metformine | Pourquoi suspendre avant un examen avec produit de contraste |
| 3 | 05 Amoxicilline | Finir la cure ? Antibiotique ≠ grippe |
| 3 | 06 Aspirine + AINS | Pourquoi ne pas les cumuler |
| 4 | 07 Générique ou princeps ? | Utiliser `/substitution` |
| 4 | 08 Lire une notice | DCI, dosage, forme, voie |
| 5 | 09 Alcool et médicaments | Metformine, insuline/sulfamides, sédatifs (ANSM) |
| 5 | 10 Grossesse | AINS interdits dès 24 SA, ce qu'on peut demander |
| 6 | 11 Pharmacie de garde | Utiliser `/pharmacie-de-garde` la nuit |
| 6 | 12 Médicament retiré | `/retraits` : vérifier son armoire |

Les 12 épisodes sont écrits dans `episodes/`. Tous attendent la relecture pharmacien (champ `Relu par`) ; les marqueurs `[A]` signalent un fait à vérifier avant tournage.

## Mesure

Rétention à 3 s et à 15 s, partages, clics vers le site (UTM `utm_source=video&utm_campaign=epXX`). Garder les 3 épisodes
qui retiennent le mieux et refaire des variantes (autre médicament, même gabarit).

## Vidéos animées « dessin animé » (`animation/`)

Pour expliquer un concept (DCI, ATC, interaction) avec des personnages et des schémas animés, sans logiciel de montage :
chaque épisode est un petit fichier JS (`animation/episodes/<nom>.js`) qui décrit les scènes, les timings et les sous-titres
(arabe standard + français). Le rendu est **déterministe** (image par image, 25 i/s) via Playwright + ffmpeg.

```bash
node docs/videos/animation/render.mjs dci                 # → out/dci.mp4 (sous-titres incrustés) + dci.ar.srt + dci.fr.srt
node docs/videos/animation/render.mjs dci --no-burn       # → MP4 sans sous-titres (à utiliser avec les .srt)
node docs/videos/animation/render.mjs dci --scale 1       # 1080×1920 (défaut 0,667 = 720×1280)
node docs/videos/animation/render.mjs dci --stills 3,15   # images fixes pour contrôler une scène
```

- **Épisodes animés** : `dci` (C'est quoi une DCI ?, 42 s), `atc` (C'est quoi l'ATC ?, 56 s), `interaction` (C'est quoi une interaction médicamenteuse ?, 57 s). Pour un nouvel épisode (ATC, interaction…), copier ce fichier et changer scènes + `subs`.
- **Voix off** (`animation/voice.py`) : trois modes. Chaque sous-titre est lu à son moment ; le champ `say` donne un texte parlé plus complet.
  1. **Ta voix clonée** (recommandé) : enregistre 2–5 min en suivant `animation/voix/ENREGISTREMENT.md`, puis
     ```bash
     export ELEVENLABS_API_KEY=...        # jamais dans le dépôt
     python3 docs/videos/animation/clone_voice.py "Voix DwaDZ" docs/videos/animation/voix/echantillon1.m4a
     node docs/videos/animation/render.mjs interaction
     python3 docs/videos/animation/voice.py interaction --provider elevenlabs   # → out/interaction.clone.mp4
     ```
     Réglages : `--stability`, `--similarity`, `--speed`. Les phrases sont mises en cache (`out/cache`) : relancer ne repaie rien.
  2. **Ton enregistrement tel quel** : `voice.py interaction --audio mon_enregistrement.m4a` (un fichier couvrant toute la vidéo).
  3. **Voix Microsoft ar-DZ** (`voice.py interaction`) : arabe standard, peu naturelle ; seulement pour tester le calage.
  **Parti pris : tout en arabe standard simple (texte affiché et voix), avec la traduction française toujours en sous-titre.** Le texte arabe
  d'un sous-titre est exactement ce que la voix lit ; `fr` en est la traduction. (Le darija a été essayé : un clone de voix et les voix
  synthétiques le lisent comme de l'arabe littéraire. Pistes de vrai darija étudiées : modèles Natiq-dz-ARG / Habibi, pas retenues.)
  Les sigles latins sont épelés (ANSM, ATC, N02BE01…), les chiffres en arabe standard, `DwaDZ` devient « دوا دي زاد ».
  **Limites** : un clone reproduit ta voix mais lit un texte arabe ; un mot dialectal (تاع, زوج…) peut sortir trop « standard » → l'écrire
  comme tu le prononces dans `say`. Les échantillons et les textes sont envoyés au service choisi (ElevenLabs, ou Microsoft pour le mode 3) :
  ne cloner que sa propre voix, et ne mettre que du contenu destiné à être public. Les fichiers audio de `voix/` ne sont pas versionnés.
- **Épisodes « par spécification »** (les 11 vidéos 4 à 14) : un fichier `animation/episodes/<nom>.js` ne contient que des données : pour chaque phrase, le texte arabe
  (= texte lu), sa traduction française, l'illustration (`card`, `warn`, `list`, `steps`, `compare`, `search`, `logo`) et l'humeur de la mascotte, plus les métadonnées du site
  (`meta`) et la couverture (`cover`). Les durées se déduisent du texte (≈ 11 caractères par seconde). Moteur : `animation/lib/build.js` ; pour un nouvel épisode, copier un fichier existant.
  `node animation/render.mjs <nom>` rend la vidéo ; `node animation/meta.mjs > metadonnees-episodes.md` régénère les métadonnées à saisir dans l'admin.
- **Toutes les voix d'un coup** : `animation/generer_voix.sh` (ElevenLabs) génère `out/<épisode>.clone.mp4` pour chaque épisode qui n'en a pas encore.
- **Couverture** : `node docs/videos/animation/cover.mjs` produit `out/couverture-dci-verticale.jpg` (image d'aperçu du site, zone utile centrale) et `out/couverture-dci-partage.jpg` (1200×630, Facebook). Pour une autre vidéo, adapter les textes et l'illustration dans `cover.html`.
- **Police** : Cairo 800 (SIL OFL), incluse dans `animation/fonts/`. Le rendu arabe a été vérifié.
- Les marques utilisées dans les dessins sont à valider `[A]` avant publication.


## Mettre les vidéos sur le site et les gérer depuis l'admin

Le site a une page publique `/videos` (liste) et `/videos/<identifiant>` (lecteur, sous-titres, partage, données Google), et un écran
**Admin → Communication → Vidéos** pour les gérer. Code : `app/videos/`, `app/admin/videos/`, `app/api/admin/videos/`, `lib/videos*.ts`.

**Mise en route (une seule fois)**
1. Fusionner la branche, laisser Vercel déployer.
2. Appliquer la migration : `psql "$DATABASE_URL" -f sql/37_videos.sql`
3. Stockage des fichiers (recommandé) : dans Vercel, **Storage → Create → Blob**, puis « Connect to project » : `BLOB_READ_WRITE_TOKEN` est
   ajouté tout seul ; redéployer. Sans cela, l'admin accepte quand même l'**adresse https** d'un MP4 déjà hébergé.
4. Facebook (facultatif) : les variables `FACEBOOK_PAGE_ID` et `FACEBOOK_PAGE_ACCESS_TOKEN` déjà utilisées pour les publications suffisent.

**Pour chaque vidéo** (Admin → Vidéos → « + Nouvelle ») : titres français/arabe, description, fichier MP4 (envoi direct, jusqu'à 200 Mo),
image d'aperçu facultative, sous-titres (case « incrustés » cochée pour les vidéos DwaDZ, sinon fichiers SRT/VTT), relecteur et sources
(**obligatoires pour publier**, contrôlés par l'API et par la base), puis statut « Publiée ». Un bouton « Publier sur Facebook » envoie la vidéo
à la Page (une seule fois, avec légende et lien prêts). Tests : `npm run test:videos`.

**Limites connues** : l'envoi vers Vercel Blob et la publication Facebook n'ont pas pu être testés de bout en bout hors production
(jeton Blob et Page Facebook requis) ; Facebook traite la vidéo de façon asynchrone ; l'ancienne structure d'admin affiche aussi le pied de page du site.
