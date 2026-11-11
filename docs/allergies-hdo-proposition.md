# Allergies HDO : proposition d'alignement et d'intégration

Statut : **B (onglet Allergies de la fiche) et C (filtre « Allergie connue ») sont réalisés** ; A et D restent des maquettes. Voir le README, section « Allergies documentées ».
Écart avec §3 : aucune table SQL n'a été créée. Les données sont générées dans `lib/allergies-data.ts` et `lib/allergies-choix.ts` (même principe que `lib/edqm-data.ts`), et la fiche s'appuie sur le code ATC déjà en base. Le schéma du §3 reste valable si l'on veut un jour des corrections manuelles ou des traductions relues en base.
Maquettes : `docs/maquettes/allergies-hdo.html` · Alignement : `data/hdo/hdo_allergies_alignement.{csv,xlsx,json}`
Génération : `python3 -I scripts/build_hdo_alignement.py`

## 1. Ce que contient l'extraction HDO

127 lignes (allergie × agent) pour **122 allergies**. Cinq allergies ont plusieurs agents (poisson, saumon, truite, mollusques…).

| Agent (ontologie) | Lignes | Nature |
|---|---|---|
| ChEBI | 84 | substances chimiques : médicaments, classes, métaux, chimie industrielle |
| FoodOn | 24 | produits alimentaires |
| NCBITaxon | 15 | taxons : poissons, crustacés, latex (*Hevea*), *Aspergillus* |
| COMPLEX | 4 | pas d'agent simple : « drug allergy », « metal allergy » (racines) et deux allergies dont l'agent est dans l'expression OWL (néomycine, kétoprofène) |

**Tous les agents ne sont pas des substances de médicament.** Seules 51 lignes (51 allergies) peuvent se rattacher à la DCI d'une fiche.

| Périmètre proposé | Lignes | Contenu |
|---|---|---|
| `fiche` | 51 | allergies médicamenteuses : 44 exactes, 6 par classe, 1 proche |
| `excipient` | 8 | lait, œuf, poisson, légumineuses, benzoate, benzisothiazolinone : pertinent, mais la nomenclature ne porte pas les excipients |
| `conditionnement` | 1 | latex (bouchons, seringues) |
| `hors_perimetre` | 64 | aliments, métaux, chimie professionnelle (isocyanates, anhydrides, colorants) |
| `racine` | 2 | « drug allergy », « metal allergy » : regroupements |
| `non_allergie` | 1 | aspergillose |

## 2. Principe d'alignement

Même grammaire que l'EDQM (`lib/edqm.ts`) : chaque rattachement porte sa **relation**, jamais un code inventé.

- `exact` : l'agent est la substance (même fraction active ; un sel ne change pas la relation, la note le dit) ;
- `classe` : l'agent est une classe, portée par des codes ATC (`penicillin` → J01C) ;
- `proche` : meilleur rattachement, à confirmer (`phthalyl group` → phtalylsulfathiazole) ;
- `aucun`.

Pont avec la nomenclature : **l'ATC déjà dans le dépôt**. 35 des 84 agents ChEBI ont un libellé identique à un libellé ATC (niveau 5, plus la classe des carbapénèmes) ; une quinzaine d'autres ont été décidés à la main (synonymes : succinylcholine = suxaméthonium, isoniazide = isoniazid ; sels ; classes). Le reste n'a pas d'équivalent médicament.

La fiche raisonne comme pour les interactions ANSM : par **substance** (les substances de la DCI composée, via `normaliserDci`), puis par **classe ATC** en remontant la hiérarchie. Cela corrige deux défauts de la hiérarchie HDO : l'amoxicilline n'est reliée qu'aux bêta-lactamines (pas aux pénicillines), et les céphalosporines comme les carbapénèmes ne sont pas sous « beta-lactam allergy ».

## 3. Schéma de base proposé (à numéroter à l'application, après `39`)

```sql
-- Allergies HDO : code, libellés, rattachement à une substance ou à une classe ATC
CREATE TABLE IF NOT EXISTS allergies_hdo (
  code          TEXT PRIMARY KEY,               -- DOID sans préfixe : 0040004
  label_en      TEXT NOT NULL,
  label_fr      TEXT,                           -- brouillon tant que ar/fr_statut n'est pas 'relu'
  label_ar      TEXT,
  fr_statut     TEXT NOT NULL DEFAULT 'absent' CHECK (fr_statut IN ('absent','brouillon','relu')),
  ar_statut     TEXT NOT NULL DEFAULT 'absent' CHECK (ar_statut IN ('absent','brouillon','relu')),
  nature        TEXT NOT NULL,                  -- medicament | contact | respiratoire | aliment | latex | racine | non_allergie
  perimetre     TEXT NOT NULL,                  -- fiche | excipient | conditionnement | hors_perimetre | racine | non_allergie
  parents_hdo   TEXT[] NOT NULL DEFAULT '{}',
  snomed_ct     TEXT,                           -- stocké, non affiché par défaut (voir §5)
  umls_cui      TEXT,
  source        TEXT,                           -- version HDO
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rattachement : une allergie peut viser une substance (plusieurs codes ATC) ou une classe
CREATE TABLE IF NOT EXISTS allergie_hdo_agent (
  code_allergie TEXT NOT NULL REFERENCES allergies_hdo(code),
  agent_id      TEXT,                           -- CHEBI:2676, FOODON:…, NCBITaxon:…
  relation      TEXT NOT NULL CHECK (relation IN ('exact','classe','proche','aucun')),
  atc_codes     TEXT[] NOT NULL DEFAULT '{}',   -- niveau 5 (substance) ou niveaux 2 à 4 (classe)
  source        VARCHAR(10) NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','manual')),  -- 'manual' jamais écrasé
  PRIMARY KEY (code_allergie, agent_id)
);
CREATE INDEX IF NOT EXISTS idx_allergie_hdo_atc ON allergie_hdo_agent USING gin(atc_codes);
```

Lecture à la fiche : la fiche a déjà `code_atc` (`dci_atc_mapping`) ; on retient les allergies dont `atc_codes` contient ce code, **ou un préfixe de ce code** (classe). Pour les DCI composées, on prend chaque substance, comme pour les interactions.

## 4. Maquettes

| | Où | Idée |
|---|---|---|
| A | fiche, encadré | code HDO **devant** chaque allergie (bascule « derrière » pour comparer avec l'EDQM), FR / AR |
| B | fiche, onglet à côté d'« Interactions » | trois niveaux : substance, classes héritées, excipients grisés |
| C | recherche, filtre « Allergie connue » | **signale** (ou masque) les présentations de la classe ; n'étend pas aux allergies croisées |
| D | `/terminologies`, onglet « Allergies (HDO) » | les 122 allergies avec code, agent, rattachement et périmètre (données réelles) |

## 5. Points à décider

1. **Place du code** : devant (demandé) ou derrière comme l'EDQM. Un code devant se lit comme une étiquette, et se trie mieux ; derrière, il reste discret.
2. **Libellés français** : brouillon généré (`Allergie — amoxicilline`, forme sans article pour éviter les accords), le nom venant de l'ATC FR quand il existe. 75 libellés sont sans traduction de l'agent (`absent`). Même cycle absent / brouillon / relu que l'arabe EDQM.
3. **Ton** : HDO recense des allergies décrites dans la littérature. Ce n'est ni une contre-indication ni une conduite à tenir ; la mention figure sur les maquettes. Pas d'allergie croisée déduite.
4. **Licences à vérifier avant publication** : HDO est diffusée en CC0 d'après son dépôt ; ChEBI et FoodOn sont sous CC BY (attribution). Les codes **SNOMED CT** de l'extraction (42 lignes) relèvent d'une licence : à stocker, pas à afficher tant qu'elle n'est pas vérifiée.
5. **Excipients** : 8 allergies pertinentes ne servent à rien sans composition. Une source (RCP) serait un autre chantier.
6. **Couverture réelle** : non mesurée, car la base de la nomenclature n'est pas dans le dépôt. Un script `check_hdo_couverture.mts`, sur le modèle de `check_ansm_couverture.mts`, donnerait le nombre de fiches touchées.

## 6. Anomalies de la source

Listées dans l'onglet « Anomalies » du fichier xlsx (8). Les principales :

- `DOID:0040038` méropénème : étiquetée « allergy » mais définie comme sous-classe d'asthme allergique ;
- `DOID:13564` aspergillose : une infection, pas une allergie ;
- `DOID:0040082` oxirane : rangée en allergie médicamenteuse, c'est un stérilisant de dispositifs ;
- hiérarchie bêta-lactamines / pénicillines / céphalosporines incomplète (§2).
