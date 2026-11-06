# Enregistrer ta voix pour le clonage

Objectif : 2 à 5 minutes de ta voix, propre et naturelle, en darija comme tu le parles. Le clone **copie ton accent, ton rythme
et ton énergie** : plus l'échantillon ressemble à ce que tu diras dans les vidéos, meilleur sera le résultat.

## Conditions d'enregistrement
- **Téléphone** (mémo vocal ou Dictaphone), à ~20 cm de la bouche, **pièce silencieuse et peu résonnante** (placard, chambre avec rideaux ; évite salle de bain et cuisine).
- Pas de musique, pas de ventilateur ; active le mode avion pour éviter notifications et sonneries.
- Format `.m4a` ou `.wav`. 1 à 3 fichiers de 1 à 2 minutes. Parle **comme dans la vidéo** : posé, souriant, clair (ni chuchoté, ni crié).
- Si tu te trompes, reprends la phrase depuis son début sans couper le fichier ; on nettoiera. Garde ta voix **constante** d'un fichier à l'autre.
- Ne dépasse pas 5 minutes : plus long n'améliore pas le clone instantané.

## Texte à lire (adapte avec tes mots si une phrase ne sonne pas comme toi)

**1. Explication, ton calme**

السلام عليكم، مرحبا بيكم في DwaDZ. اليوم راح نفهمو مع بعض كيفاش نقراو علبة الدوا. كل دوا عندو اسم تجاري، وعندو كذلك مادة فعالة، وهي اللي تهمنا بزاف. كي تشري الدوا، شوف الدوز، والشكل، والمخبر. وكاين أدوية تتشرى بالوصفة تاع الطبيب، وكاين أدوية بلا وصفة، لكن لازم تحذر.

**2. Avertissement, ton plus appuyé**

انتبه! ما تخلطش زوج أدوية عندهم نفس المادة الفعالة. هادي حاجة خطيرة، خاصة عند الصغار وعند الناس الكبار. وإذا كنت تتعالج بدوا من الضغط ولا السكر، ما توقفش دواك وحدك. سقسي الطبيب ولا الصيدلي، راه أحسن.

**3. Chiffres et mots français, ton naturel**

شحال من مرة في النهار؟ مرة، زوج، ولا تلاتة؟ كل دوا عندو la dose تاعو، واللي مكتوبة في l'ordonnance. ما تزيدش وما تنقصش. ساعات الصيدلي يقولك الجنريك، يعني نفس الدوا بسمية أخرى، وغالباً يكون أرخص.

**4. Questions, rythme plus vif**

وين نلقاو الصيدلية المناوبة في الليل؟ واش معنى ATC؟ علاش الدوا عندو بزاف سميات؟ كيفاش نعرف إذا كاين تفاعل بين زوج أدوية؟ كل هادشي تلقاه في DwaDZ.

**5. Conclusion, ton chaleureux**

كتب اسم الدوا في DwaDZ، وشوف الفيش، والتفاعلات، والعائلة العلاجية. هادي معلومة عامة، ما تعوضش رأي الطبيب ولا الصيدلي. بصحتكم، وبالشفا لكل مريض!

## Ensuite
1. Crée un compte ElevenLabs avec un plan payant qui inclut le **clonage instantané** (vérifie sur leur page de tarifs) et génère une clé API.
2. Mets tes fichiers dans ce dossier (`voix/`) : ils sont ignorés par git, ta voix ne sera pas publiée dans le dépôt.
3. `export ELEVENLABS_API_KEY=...` puis `python3 clone_voice.py "Voix DwaDZ" voix/echantillon1.m4a`.
4. **Teste une seule phrase avant tout** : `python3 voice.py dci --provider elevenlabs` et écoute `out/dci.clone.mp4`. Ajuste
   `--stability` (plus bas = plus expressif) et `--similarity` (plus haut = plus fidèle) ; relance (le cache évite de repayer les phrases inchangées).

## Limites honnêtes
- Le clone reproduit ta voix, mais le **modèle lit un texte arabe** : certains mots dialectaux (تاع, زوج, كاين…) peuvent encore sortir avec une
  prononciation proche de l'arabe standard. Si un mot sonne faux, **écris-le comme tu le prononces** dans le champ `say` de l'épisode.
- Si le résultat reste insuffisant : enregistre directement chaque épisode (texte à lire = champ `say`) et utilise `voice.py <ep> --audio mon_enregistrement.m4a`.
- Tes échantillons sont envoyés à ElevenLabs. Ne clone que **ta propre voix** (ou avec accord écrit de la personne).
