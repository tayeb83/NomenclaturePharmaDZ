// « Grossesse et médicaments ». Source : ep10-grossesse.md (sujet sensible : relecture médicale renforcée ; un seul exemple chiffré).
const { card, warn, list, steps, it, cmp, search, logo, hook } = V
window.SPEC = {
  meta: { slug: "grossesse-et-medicaments", n: 12, titreFr: "Grossesse et médicaments : demander avant de prendre", titreAr: "الحمل والأدوية: اسألي قبل أن تتناولي",
    descFr: "Enceinte et mal à la tête ? Ne prends aucun médicament sans avis : certains atteignent le fœtus et les risques varient selon le mois de grossesse. Exemple : l'ibuprofène et les autres AINS sont interdits à partir de la 24e semaine, même en prise unique. Demande au médecin ou au pharmacien quel antidouleur convient. Vidéo en arabe, sous-titrée en français.",
    descAr: "حامل ويؤلمك رأسك؟ لا تتناولي أي دواء دون استشارة: بعض الأدوية تصل إلى الجنين وتختلف المخاطر باختلاف شهر الحمل. مثال: الإيبوبروفين ومضادات الالتهاب الأخرى ممنوعة ابتداءً من الأسبوع 24، حتى بجرعة واحدة. اسألي الطبيب أو الصيدلي عن المسكّن المناسب. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "الحمل", "الأدوية", "الصحة"],
    sources: ["Monographie IBUPROFENE de DwaDZ, rubrique grossesse : AINS contre-indiqués à partir de 24 semaines d'aménorrhée (brouillon : à relire avant publication)"],
    verifier: "Sujet sensible : relecture médicale renforcée. Ne jamais nommer d'alternative (« prends du paracétamol ») : ce serait un conseil médical." },
  cover: { ar: "الحمل والأدوية", fr: ["Grossesse et", "médicaments"], subAr: "اسألي قبل أن تتناولي أي دواء", subFr: "Demande avant de prendre un médicament", icons: ["🤰", "💊"], c: "#ff6b6b" },
  segments: [
    seg("حامل ويؤلمك رأسك؟|لا تتناولي أي دواء قبل أن تسألي", "Enceinte et mal à la tête ?|Ne prends aucun médicament avant d'avoir demandé", hook("🤰", "الحمل والأدوية", "Demande avant de prendre"), "think"),
    seg("بعض الأدوية تصل إلى الجنين،|وتختلف المخاطر باختلاف شهر الحمل", "Certains médicaments atteignent le fœtus,|et les risques varient selon le mois de grossesse", card("🧬", "الدواء قد يصل إلى الجنين", "Risque variable selon le mois", COL.pr), "worried"),
    seg("مثلًا الإيبوبروفين وعائلته (AINS):|ابتداءً من الأسبوع 24 يُمنع حتى بجرعة واحدة", "Par exemple l'ibuprofène et sa famille (AINS) :|dès la 24e semaine, interdit même en prise unique", warn("🚫", "من الأسبوع 24: ممنوع", "AINS · même en prise unique", COL.ci), "worried"),
    seg("لأنه قد يضر كليتي الجنين", "Car il peut atteindre les reins du fœtus", card("⚠️", "قد يضر كليتي الجنين", "Atteinte rénale du fœtus", COL.ci), "worried"),
    seg("لا تعتمدي على الإنترنت وحده:|الطبيب أو الصيدلي يحدد المسكّن المناسب", "Ne décide pas à partir d'Internet seul :|le médecin ou le pharmacien choisit l'antidouleur adapté", card("👩‍⚕️", "اسألي الطبيب أو الصيدلي", "Pour ta situation", COL.ok)),
    seg("احملي معك جميع أدويتك|(حتى الأعشاب) إلى الموعد", "Apporte tous tes médicaments|(même les plantes) à ton rendez-vous", card("🎒", "احملي أدويتك", "Y compris les plantes", COL.info)),
    seg("في DwaDZ يمكنك الاطلاع على المادة الفعالة|والتفاعلات قبل أن تسألي", "Sur DwaDZ, tu peux voir la substance active|et les interactions avant de demander", search("IBUPROFENE", "Fiche · grossesse")),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
