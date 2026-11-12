# DwaDZ : icônes de forme galénique et de voie d'administration (premier jet)

Principe : **icône de base** (le contenant / le geste) + **pastille de voie** (couleur = famille, glyphe = voie)
+ **modificateurs** (libération prolongée, gastro-résistant, sécable, à reconstituer, à diluer, enfant).
L'icône complète le libellé, elle ne le remplace pas.

## Contenu
| Fichier | Rôle |
|---|---|
| `icons.svg` | sprite : 29 icônes de forme, 15 pastilles de voie, 6 modificateurs |
| `dwadz-icons.css` / `dwadz-icons.js` | mise en page et rendu côté navigateur (JS généré, sans dépendance) |
| `classify_forme.py` | même classement en Python (à lancer sur la base, ou à importer) |
| `rules_src.py` | **source unique des règles** ; `python3 rules_src.py` régénère `forme_rules.json` et `dwadz-icons.js` |
| `formes_mapping.csv` | résultat sur vos 681 libellés (icône, modificateurs, voie déduite du libellé, alertes) |
| `test_parity.js` | vérifie que JS et Python donnent le même résultat |

## Intégration
```html
<link rel="stylesheet" href="/dwadz-icons.css">
<script src="/dwadz-icons.js" defer></script>
<!-- coller le contenu de icons.svg juste après <body> -->
```
```js
// fiche = { forme: "COMPRIME PELLICULE", voies_edqm: ["20053000"] }
el.innerHTML = DwaIcons.html(fiche.forme, { codes: fiche.voies_edqm, lang: "fr", size: 40 });
```
Python (pré-calcul en base, par exemple une colonne `icone_forme`) :
```python
from classify_forme import classify
classify("SOL INJ S/C EN STYLO PREREMPLI", ["20066000"])
# {'base': 'pen', 'mods': [], 'routes': ['sc'], ...}
```
La voie vient en priorité du **code EDQM de la fiche** ; à défaut (312 fiches « non renseignée »), elle est déduite du libellé.

## Limites connues
- Les 9 voies rares (péridurale, intrathécale, intravitréenne, intra-utérine, intravésicale, intrapéritonéale,
  intralésionnelle…) utilisent une pastille générique « autre voie » : à dessiner en priorité pour l'intrathécale et la péridurale.
- Pastilles rectale et vaginale : glyphe à retravailler et à tester auprès d'utilisateurs.
- Traductions arabes des alt : à faire valider par un pharmacien arabophone.
- 15 fiches non illustrées (SOL. GLUCOSE, irrigation vésicale, instillation endotrachéale…) : icône générique.
- Les icônes sont un premier jet à reprendre par un graphiste (cohérence de trait, contrastes).
