# Nouvel échantillon de voix en arabe standard (pour corriger l'accent)

## Pourquoi
Ton clone actuel a été créé à partir d'un texte en **darija**. Les vidéos, elles, sont en **arabe standard** : quand le modèle doit lire de l'arabe standard, il ne retrouve pas dans ton échantillon comment *toi* tu prononces cette langue, et retombe sur son accent par défaut (souvent perçu comme « du Golfe »). Le clonage copie la manière de parler **de l'échantillon** : pour avoir un arabe standard à ton accent, il faut un échantillon en arabe standard, lu avec ta prononciation naturelle.

## Comment enregistrer
- Même conditions qu'avant (téléphone, pièce calme, 20 cm de la bouche, pas de musique), **2 à 5 minutes**, `.m4a` ou `.wav`.
- Lis le texte ci-dessous **en arabe standard avec ta prononciation naturelle d'Algérien** : ne cherche pas à imiter un accent du Golfe ou égyptien. Dis ق, ج, ث, ذ, ض comme tu les dis d'habitude en lisant un texte formel.
- Les noms de médicaments entre parenthèses en lettres latines : **prononce-les comme tu les dis dans la vie, à la française** (paracétamol avec un vrai P, Doliprane, aspirine…). C'est ce qui apprendra au clone à dire le P.
- Ton posé, souriant, sans chuchoter. Reprends une phrase si tu te trompes, sans couper le fichier.

## Texte à lire

**1.** مرحبًا بكم في DwaDZ. في هذه الحلقة نتعرف على طريقة قراءة نشرة الدواء. لكل دواء اسم تجاري، وله مادة فعالة هي الأهم. عندما تشتري الدواء، انظر إلى الجرعة والشكل والمخبر، واسأل الصيدلي دائمًا.

**2.** الدوليبران (Doliprane) اسمٌ تجاري، والمادة الفعالة فيه هي الباراسيتامول (paracétamol). ومن الأدوية الأخرى الإيبوبروفين (ibuprofène) والأسبرين (aspirine). لا تتجاوز الجرعة المكتوبة في النشرة.

**3.** تنبيه: الإفراط في الباراسيتامول يضر الكبد، والكحول يزيد الخطر. ولا تجمع دواءين يحتويان المادة نفسها. وإذا ظهرت أعراض غير معتادة، فأوقف الدواء واستشر الطبيب.

**4.** تقول الوكالة الفرنسية ANSM إن بعض الأدوية لا يجوز الجمع بينها، وبعضها غير موصى به، وبعضها يتطلب مراقبة، وبعضها يؤخذ بعين الاعتبار. مثال: الميتفورمين (metformine) مع مواد التباين اليودية: ممنوع.

**5.** رمز ATC يتكوّن من سبع خانات: N، صفر اثنان، B، E، صفر واحد. وهو يصنّف الدواء في عائلته. أما الـ DCI فهي المادة الفعالة نفسها مهما اختلف المخبر.

**6.** أين أجد الصيدلية المناوبة هذه الليلة؟ كيف أعرف إن كان الدواء مسحوبًا من السوق؟ كل هذا تجده في DwaDZ.

**7.** اكتب اسم الدواء في DwaDZ وشاهد البطاقة والتفاعلات. هذه معلومة عامة، ولا تغني عن رأي الطبيب أو الصيدلي.

## Ensuite
```bash
export ELEVENLABS_API_KEY=ta_clé
python3 clone_voice.py "Voix DwaDZ fusha" voix/echantillon_fusha.m4a   # crée une NOUVELLE voix ; l'ancien identifiant est conservé dans voix/
python3 tester_accent.py                                               # compare 5 réglages sur une phrase (≈ 500 caractères)
```
Quand tu as choisi, génère les vidéos avec le lexique retenu :
```bash
python3 voice.py paracetamol --provider elevenlabs --lexique p        # ou : --lexique complet
```
Les voix déjà générées avec l'ancienne voix restent en cache ; la nouvelle voix produit de nouveaux fichiers (≈ 6 000 caractères pour toutes les vidéos).

## Limites honnêtes
- Aucun réglage ne permet de choisir « accent algérien » : ElevenLabs ne propose pas de choix de dialecte pour l'arabe. Un échantillon en arabe standard à ton accent est le meilleur levier ; le lexique règle le cas précis du P.
- Si le résultat te déçoit encore : le clonage **professionnel** (30 minutes d'audio ou plus) capte mieux les accents, mais il n'est pas inclus dans ton plan actuel ; l'autre option sûre est d'enregistrer toi-même chaque vidéo (`voice.py <épisode> --audio ton_fichier.m4a`).
