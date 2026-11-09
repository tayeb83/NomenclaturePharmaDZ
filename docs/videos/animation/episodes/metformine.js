// « Metformine : pourquoi la suspendre avant un scanner ». Source : ep04-metformine.md (ANSM p. 164).
const { card, warn, list, it, cmp, search, logo, hook } = V
window.SPEC = {
  meta: { slug: "metformine-scanner", n: 6, titreFr: "Metformine : pourquoi la suspendre avant un scanner ?", titreAr: "الميتفورمين: لماذا يُوقَف قبل الفحص بالأشعة؟",
    descFr: "Tu es diabétique et tu passes un scanner avec produit de contraste ? Selon l'ANSM, l'association de la metformine avec les produits de contraste iodés est contre-indiquée (risque d'acidose lactique) : c'est le médecin qui décide d'une suspension. En une minute, retiens aussi l'alcool et certains diurétiques. Vidéo en arabe, sous-titrée en français.",
    descAr: "لديك السكري وستجري فحصًا بالسكانير مع مادة التباين؟ حسب الوكالة الفرنسية ANSM، الجمع بين الميتفورمين ومواد التباين اليودية ممنوع (خطر الحماض اللبني)، والطبيب هو من يقرر إيقاف الدواء. وفي دقيقة، تعرّف أيضًا على الكحول وبعض مدرّات البول. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "الميتفورمين", "السكري", "الدواء"],
    sources: ["Thesaurus des interactions médicamenteuses de l'ANSM, septembre 2023, p. 164 : metformine + produits de contraste iodés (contre-indication), + alcool (association déconseillée), + diurétiques de l'anse (précaution d'emploi)"],
    verifier: "Aucune durée d'arrêt chiffrée : elle dépend de la fonction rénale et du service de radiologie." },
  cover: { ar: "الميتفورمين والسكانير", fr: ["Metformine :", "attention au scanner"], subAr: "الطبيب هو من يقرر الإيقاف", subFr: "C'est le médecin qui décide de la suspension", icons: ["🩻", "💊"], c: "#e03131" },
  segments: [
    seg("لديك السكري وستجري فحصًا بالسكانير|مع مادة التباين؟ انتبه", "Tu es diabétique et tu passes un scanner|avec produit de contraste ? Attention", hook("🏥", "الميتفورمين والسكانير", "Pourquoi suspendre ?"), "think"),
    seg("الميتفورمين دواءٌ لداء السكري|من النوع الثاني", "La metformine est un médicament|du diabète de type 2", card("🩸", "دواء السكري", "Diabète de type 2", COL.info)),
    seg("تقول ANSM: مع مواد التباين اليودية|التي تُحقن في السكانير، الجمع ممنوع", "L'ANSM indique : avec les produits de contraste iodés|injectés au scanner, l'association est contre-indiquée", warn("⛔", "ممنوع: مواد التباين اليودية", "Contre-indication (ANSM)", COL.ci), "worried"),
    seg("والسبب: خطر الحماض اللبني|إذا تأثرت الكلى", "La raison : un risque d'acidose lactique|si les reins sont atteints", card("🧪", "الحماض اللبني", "Acidose lactique", COL.ci)),
    seg("الطبيب هو من يقرر: غالبًا يُوقَف الدواء|وقت الفحص ويُستأنف بعد التحاليل", "C'est le médecin qui décide : en général on suspend|au moment de l'examen et on reprend après les analyses", card("👨‍⚕️", "الطبيب يقرر", "Suspension puis reprise", COL.ok)),
    seg("لا توقفه بمفردك", "Ne l'arrête pas seul", warn("🚫", "لا توقفه بمفردك", "Décision du médecin", COL.ci), "worried"),
    seg("والكحول: غير موصى به،|خاصة مع الصيام أو الجفاف", "L'alcool : déconseillé,|surtout en cas de jeûne ou de déshydratation", card("🍷", "الكحول", "Association déconseillée", COL.de)),
    seg("ومع بعض مدرّات البول (من نوع العروة):|يلزم مراقبة الكلى", "Avec certains diurétiques de l'anse :|il faut surveiller les reins", card("💧", "مدرّات البول", "Précaution d'emploi", COL.pr)),
    seg("قبل أي فحص بالأشعة قل للطبيب:|«أنا أتناول الميتفورمين»", "Avant tout examen d'imagerie, dis au médecin :|« je prends de la metformine »", card("🗣️", "قل للطبيب", "« Je prends de la metformine »", COL.ok)),
    seg("اكتشف تفاعلات دوائك في DwaDZ", "Découvre les interactions de ton médicament sur DwaDZ", search("METFORMINE", "ATC : A10BA02")),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
