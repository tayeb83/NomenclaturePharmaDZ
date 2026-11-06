# Ép. 01 — الدوليبران (Doliprane) : باراسيتامول و الكبد

- **Durée cible** : 60 s · **Format** : vertical 9:16
- **Source des faits** : Thesaurus ANSM sept. 2023 (PARACETAMOL : p. voir `video_brief.py PARACETAMOL`), notice/RCP de la spécialité (ANPP), monographie DwaDZ relue
- **Relu par** : ________ · **Date** : ________  ← *ne pas tourner sans*
- **Champs à vérifier avant tournage** : [A] dose max/jour et intervalle de la notice de la marque montrée à l'écran

| Bloc | Voix (darija) | Écran / capture |
|------|---------------|------------------|
| Hook | **« الدوليبران… الدوا اللي كلنا نشريوه بلا ما نسقسيو. واش تعرف علاش لازم تحذر؟ »** | Gros plan boîte de Doliprane, texte : « Bénin ? pas toujours » |
| C'est quoi | « الدوليبران هو اسم تجاري. المادة الفعالة اللي فيه اسمها **باراسيتامول**. يهبّط السخانة و يهدّي الوجع — الراس، السنّ، الجسم. » | Recherche « DOLIPRANE » dans DwaDZ → fiche → champ **DCI = PARACETAMOL** surligné |
| Comment | « كيفاش نديرو؟ اقرا الورقة اللي في العلبة. فيها الدوز القصوى في النهار، و المدة اللي لازم تخليها بين جرعة و جرعة. ما تزيدش، و ما تقولش "نزيد باش يزول بكري". » **[A]** | Zoom sur la notice : dose max / intervalle |
| Attention 1 | « الخطر الأول: **الكبد**. الباراسيتامول بزاف يتعب الكبد، و ما تحسش بيه في الأول. و الكحول و الصيام الطويل يزيدو الخطر. » | Pictogramme foie + « Surdosage = foie » |
| Attention 2 | « و الخطر التاني: تاخذ دوا آخر فيه **نفس المادة** — نزلة، سخانة، أدوية "كولد" — و تتجاوز الدوز بلا ما تدري. شوف دايما الـ DCI. » | Fiche DCI → liste des marques contenant PARACETAMOL |
| Attention 3 | « و كاين تفاعلات. مع **مضادات الفيتامين K** (الدوا اللي يرقّق الدم): إذا خديتي الباراسيتامول بالدوز القصوى لعدة أيام، لازم مراقبة أكثر لتحليل INR. و مع مضاد حيوي اسمو **فلوكلوكساسيلين**: الـ ANSM تقول الأحسن تتجنب الخلط. » | Onglet **Interactions** (ANSM p. 191) : « Précaution d'emploi » (ANTIVITAMINES K) et « Association déconseillée » (FLUCLOXACILLINE) |
| Réflexe | « إذا كنت تاخذ دوا من هاد النوع، أو عندك مرض في الكبد، أو حامل — قبل ما تاخذ، **سقسي الصيدلي**. » | Texte plein écran : « Demande au pharmacien » |
| Appel | « كتب اسم الدوا في **DwaDZ** و شوف الـ DCI و التفاعلات. هادي معلومة عامة، ما تعوضش رأي الطبيب ولا الصيدلي. » | Logo + `dzair-pharma.net` + mention légale |

## Notes de production
- Les deux interactions viennent du thésaurus ANSM du dépôt, p. 191. AVK : seulement à 4 g/j pendant ≥ 4 jours → contrôle plus fréquent de l'INR (ne pas dire « ne jamais associer »). Flucloxacilline : risque d'acidose métabolique, surtout en cas de malnutrition/alcoolisme chronique ou doses max → déconseillée. Ne pas ajouter d'autres associations sans source.
- Si la marque à l'écran est un dosage enfant, le script change : renvoyer à la notice (dose au poids) et ne rien chiffrer.
