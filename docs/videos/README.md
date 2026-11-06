# DwaDZ — Vidéos pédagogiques en darija

Série courte (45–75 s) pour Reels / TikTok / Shorts / Facebook : **« C'est quoi ce médicament ? Et attention à… »**.
Chaque épisode part d'une fiche de l'outil (nom de marque → DCI → interactions ANSM) et se termine sur
`dzair-pharma.net`. Voix en darija algérienne, termes techniques gardés en français comme on les dit en vrai
(« la dose », « l'ordonnance », « le foie »), sous-titres FR + AR.

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
                                         rédaction darija + relecture pharmacien
                                                   │
                                         voix off (toi ou enregistrement) ──► montage + sous-titres FR/AR
                                                   │
                                         publication (file Facebook /admin/social, Reels, TikTok, Shorts)
```

- **Brouillon automatique** : `python3 scripts/video_brief.py PARACETAMOL` génère l'ossature (interactions classées par
  gravité, avec page du PDF ANSM) à compléter. `--classe "ANTI-INFLAMMATOIRES NON STÉROÏDIENS"` pour une classe.
- **Captures** : `scripts/capture_graphes.mjs` montre comment piloter Playwright sur le site ; même principe pour une fiche.
- **Voix** : voix humaine fortement recommandée (le darija synthétique sonne faux et fait perdre la confiance).
- **Sous-titres** : un fichier `.srt` par langue, produit à partir de la colonne « voix » (FR en littéral, AR en darija écrite).

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
| 5 | 09 Alcool et médicaments | Metformine, paracétamol, métronidazole… |
| 5 | 10 Grossesse | AINS interdits dès 24 SA, ce qu'on peut demander |
| 6 | 11 Pharmacie de garde | Utiliser `/pharmacie-de-garde` la nuit |
| 6 | 12 Médicament retiré | `/retraits` : vérifier son armoire |

Épisodes 05–12 : à produire avec `video_brief.py` + monographie relue. Les épisodes 01–04 sont déjà écrits dans `episodes/`.

## Mesure

Rétention à 3 s et à 15 s, partages, clics vers le site (UTM `utm_source=video&utm_campaign=epXX`). Garder les 3 épisodes
qui retiennent le mieux et refaire des variantes (autre médicament, même gabarit).
