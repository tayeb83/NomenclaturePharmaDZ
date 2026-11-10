# Ép. 19 — البحث الموجَّه: اعثر على دوائك خطوة بخطوة مع DwaDZ (Recherche guidée : trouver un médicament pas à pas avec DwaDZ)

- **Durée** : 81 s · **Langue** : arabe standard (voix clonée, eleven_v3 + lexique complet), traduction française en sous-titre
- **Lien cliquable** : https://www.dzair-pharma.net/lab/guide (bouton site + légende Facebook ; l'adresse est affichée en fin de vidéo)
- **Relu par** : ________ · **Date** : ________

## Script de voix (texte exactement lu)

| Temps | Voix (arabe standard) | Sous-titre FR |
|---|---|---|
| 0:00–0:05 | لا تعرف الاسم الدقيق للدواء؟ جرب البحث الموجه | Tu ne connais pas le nom exact ? Essaie la recherche guidée |
| 0:05–0:11 | في الصفحة الرئيسية اختر بحث موجه من بين ثلاثة أنماط | Sur l'accueil, choisis « Recherche guidée » parmi trois modes |
| 0:11–0:18 | أربع خطوات: المادة الفعالة، ثم طريقة الاستعمال، ثم الشكل، ثم الجرعة | Quatre étapes : substance, voie, forme, puis dosage |
| 0:18–0:24 | الخطوة الأولى: اكتب جزءا من اسم المادة أو الاسم التجاري | Étape 1 : tape une partie du nom de la substance ou de la marque |
| 0:24–0:29 | تظهر المواد المطابقة، وبجانب كل مادة عدد عروضها | Les substances correspondantes apparaissent, avec leur nombre de présentations |
| 0:29–0:35 | الخطوة الثانية: كيف يستعمل؟ للبلع، أو للشرب، أو حقنة | Étape 2 : comment se prend-il ? à avaler, à boire, injection… |
| 0:35–0:41 | الخطوة الثالثة: الشكل الصيدلاني، مثل مسحوق لمعلق للشرب | Étape 3 : la forme pharmaceutique, par exemple poudre pour suspension buvable |
| 0:41–0:47 | الخطوة الرابعة: الجرعة، وتظهر الجرعات الموجودة فعلا فقط | Étape 4 : le dosage, uniquement ceux qui existent vraiment |
| 0:47–0:55 | وتتقلص القائمة مع كل اختيار، وتظهر رموز EDQM وUCUM لكل عرض | La liste se réduit à chaque choix, avec les codes EDQM et UCUM pour chaque présentation |
| 0:55–1:01 | وإذا وجد خيار واحد فقط، تملأ الخطوة تلقائيا بإطار ذهبي | S'il n'y a qu'un seul choix, l'étape est remplie d'office (liseré doré) |
| 1:01–1:10 | هذه الأداة تساعدك على إيجاد العرض المطلوب، ولا تعطي جرعة، ولا تغني عن الطبيب أو الصيدلي | L'outil aide à retrouver une présentation ; il ne donne aucune posologie |
| 1:10–1:16 | جرب البحث الموجه الآن على DwaDZ. الرابط في وصف الفيديو | Essaie la recherche guidée sur DwaDZ. Lien dans la description |
| 1:16–1:21 | معلومة عامة، ولا تغني عن رأي الطبيب أو الصيدلي | Information générale : elle ne remplace pas l'avis du médecin ou du pharmacien |

## Génération de la voix (dans ton terminal)

```bash
export ELEVENLABS_API_KEY=ta_clé
./generer_voix.sh guidee
```

Résultat : `out/guidee.clone.mp4`. Les noms de médicaments sont écrits en lettres latines dans la voix pour que le P soit prononcé.

