# Ép. 20 — ما هو EDQM؟ التعريف والفائدة وكيف يظهر في DwaDZ (C'est quoi l'EDQM ? Définition, utilité et affichage sur DwaDZ)

- **Durée** : 89 s · **Langue** : arabe standard (voix clonée, eleven_v3 + lexique complet), traduction française en sous-titre
- **Lien cliquable** : https://www.dzair-pharma.net/lab/guide (bouton site + légende Facebook ; l'adresse est affichée en fin de vidéo)
- **Relu par** : ________ · **Date** : ________

## Script de voix (texte exactement lu)

| Temps | Voix (arabe standard) | Sous-titre FR |
|---|---|---|
| 0:00–0:05 | EDQM: ماذا تعني هذه الحروف؟ وما علاقتها بالدواء؟ | EDQM : que signifient ces lettres ? Quel rapport avec le médicament ? |
| 0:05–0:13 | هي المديرية الأوروبية لجودة الأدوية والرعاية الصحية، التابعة لمجلس أوروبا | La Direction européenne de la qualité du médicament et des soins de santé, du Conseil de l'Europe |
| 0:13–0:21 | تنشر مصطلحات قياسية Standard Terms: للأشكال الصيدلانية وطرق الإعطاء والتعبئة | Elle publie des termes normalisés (Standard Terms) : formes pharmaceutiques, voies d'administration, conditionnements |
| 0:21–0:27 | لكل مصطلح رمز رقمي. وبذلك يوحد ما يكتب بطرق مختلفة | Chaque terme a un code numérique : on unifie ce qui s'écrit de plusieurs façons |
| 0:27–0:35 | فائدته: تبادل المعطيات بين الأنظمة وقواعد البيانات بلغة واحدة يفهمها الجميع | Son intérêt : échanger des données entre systèmes et bases de données dans une langue commune |
| 0:35–0:42 | وكيف يظهر في DwaDZ؟ في البحث الموجه، تحمل كل بطاقة طريقة رمز EDQM | Et sur DwaDZ ? Dans la recherche guidée, chaque carte de voie porte son code EDQM |
| 0:42–0:48 | مثلا: الطريقة الفموية Oral use رمزها 20053000 | Par exemple : la voie orale (« Oral use ») a le code 20053000 |
| 0:48–0:55 | وفي كل نتيجة: رمز EDQM للشكل، ورمز UCUM لوحدة الجرعة | Et dans chaque résultat : le code EDQM de la forme, et le code UCUM de l'unité du dosage |
| 0:55–1:02 | وتظهر هذه الرموز أيضا في بطاقة الدواء بجانب الشكل والطريقة والجرعة | Ces codes figurent aussi sur la fiche du médicament, à côté de la forme, de la voie et du dosage |
| 1:02–1:10 | وتشير العلامات إلى درجة التطابق: بلا علامة تطابق تام، ثم للأوسع، ثم للقريب | Les signes indiquent la correspondance : aucun signe = exact, ⊂ = plus large, ≈ = proche à confirmer |
| 1:10–1:17 | هذه الرموز مراجع مصطلحية للمهنيين، والمرجع الرسمي يبقى المدونة الوطنية | Ce sont des repères de terminologie pour les professionnels ; la fiche officielle reste la nomenclature nationale |
| 1:17–1:24 | جرب البحث الموجه وشاهد الرموز بنفسك. الرابط في وصف الفيديو | Essaie la recherche guidée et vois les codes toi-même. Lien dans la description |
| 1:24–1:29 | معلومة عامة، ولا تغني عن رأي الطبيب أو الصيدلي | Information générale : elle ne remplace pas l'avis du médecin ou du pharmacien |

## Génération de la voix (dans ton terminal)

```bash
export ELEVENLABS_API_KEY=ta_clé
./generer_voix.sh edqm
```

Résultat : `out/edqm.clone.mp4`. Les noms de médicaments sont écrits en lettres latines dans la voix pour que le P soit prononcé.

