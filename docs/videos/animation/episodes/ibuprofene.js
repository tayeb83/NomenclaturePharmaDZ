// « Ibuprofène : un anti-inflammatoire qui peut agresser l'estomac ». Source : ep02-ibuprofene.md (monographie en brouillon : relecture renforcée).
const { card, warn, list, it, cmp, search, logo, hook } = V
window.SPEC = {
  meta: { slug: "ibuprofene-ains", n: 5, titreFr: "Ibuprofène : un anti-inflammatoire à bien utiliser", titreAr: "الإيبوبروفين: مضاد التهاب يُستعمل بحذر",
    descFr: "L'ibuprofène est un anti-inflammatoire non stéroïdien (AINS). En un peu plus d'une minute : comment le prendre (pendant un repas, à la dose la plus faible), dans quels cas l'éviter (ulcère, allergie, grossesse à partir de 24 semaines) et avec quels médicaments ne pas l'associer. Vidéo en arabe, sous-titrée en français.",
    descAr: "الإيبوبروفين من مضادات الالتهاب غير الستيرويدية (AINS). في دقيقة وبضع ثوانٍ: كيف نتناوله (أثناء الأكل وبأقل جرعة)، ومتى نتجنبه (قرحة المعدة والحساسية والحمل ابتداءً من الأسبوع 24)، ومع أي أدوية لا نجمعه. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "الإيبوبروفين", "AINS", "الدواء"],
    sources: ["Monographie IBUPROFENE de DwaDZ (brouillon : à relire avant publication)", "Thesaurus des interactions médicamenteuses de l'ANSM, septembre 2023 : classe des anti-inflammatoires non stéroïdiens"],
    verifier: "La monographie ibuprofène est un brouillon : relecture médicale obligatoire. Varicelle volontairement non abordée." },
  cover: { ar: "الإيبوبروفين", fr: ["Ibuprofène :", "un AINS à bien utiliser"], subAr: "قبل أن تتناوله، اعرف المحاذير", subFr: "Avant de le prendre, connais les précautions", icons: ["💊", "🤕"], c: "#4dabf7" },
  segments: [
    seg("ألمٌ؟ تتناول الإيبوبروفين…|لكن احذر على معدتك", "Une douleur ? Tu prends de l'ibuprofène…|mais fais attention à ton estomac", hook("🤕", "الإيبوبروفين", "Un AINS : mode d'emploi"), "think"),
    seg("الإيبوبروفين من عائلة مضادات|الالتهاب غير الستيرويدية (AINS)", "L'ibuprofène fait partie des anti-inflammatoires|non stéroïdiens (AINS)", card("💊", "عائلة AINS", "Anti-inflammatoires non stéroïdiens", COL.info)),
    seg("يخفف الألم ويخفض الحرارة|ويقلل الالتهاب", "Il soulage la douleur, fait baisser la fièvre|et réduit l'inflammation", list([it("🤕", "يخفف الألم", "Douleur"), it("🌡️", "يخفض الحرارة", "Fièvre"), it("🔥", "يقلل الالتهاب", "Inflammation")], COL.info)),
    seg("يؤخذ أثناء الأكل أو بعده،|بأقل جرعة ولأقصر مدة", "À prendre pendant ou après un repas,|à la plus faible dose et le moins longtemps possible", card("🍽️", "أثناء الأكل أو بعده", "Dose la plus faible · durée la plus courte", COL.ok)),
    seg("والجرعات الكبيرة لا تُصرف|إلا بوصفة الطبيب", "Les fortes doses relèvent|d'une prescription médicale", card("📝", "الجرعات الكبيرة بوصفة", "Prescription médicale", COL.pr)),
    seg("لا تتناوله في حال قرحة المعدة،|أو الحساسية من الأسبرين،|أو مرض شديد في الكلى أو الكبد أو القلب", "Pas d'ibuprofène en cas d'ulcère, d'allergie à l'aspirine,|ou de maladie sévère des reins, du foie ou du cœur", list([it("🔥", "قرحة المعدة", "Ulcère de l'estomac", COL.ci), it("🤧", "حساسية من الأسبرين أو AINS", "Allergie à l'aspirine / AINS", COL.ci), it("🩺", "مرض شديد: الكلى أو الكبد أو القلب", "Reins · foie · cœur", COL.ci)], COL.ci), "worried"),
    seg("الحامل: ابتداءً من الأسبوع 24|يُمنع حتى بجرعة واحدة", "Femme enceinte : à partir de 24 semaines,|interdit, même en prise unique", warn("🤰", "من الأسبوع 24: ممنوع", "≥ 24 SA = interdit", COL.ci), "worried"),
    seg("وقبل ذلك لا يُستعمل|إلا بنصيحة الطبيب", "Avant, seulement|sur avis médical", card("🩺", "نصيحة الطبيب", "Avant 24 semaines : avis médical", COL.pr)),
    seg("لا تجمعه مع الأسبرين أو AINS آخر|أو مضادات التخثر أو الليثيوم|أو الميتوتريكسات: غير موصى به (ANSM)", "Ne l'associe pas à l'aspirine, à un autre AINS, aux anticoagulants,|au lithium ni au méthotrexate : déconseillé par l'ANSM", list([it("💊", "الأسبرين", "Aspirine", COL.de), it("💊", "AINS آخر", "Autre AINS", COL.de), it("🩸", "مضادات التخثر", "Anticoagulants", COL.de), it("🧪", "الليثيوم", "Lithium", COL.de), it("🧬", "الميتوتريكسات", "Méthotrexate", COL.de)], COL.de), "worried"),
    seg("غثيان أو براز أسود أو طفح جلدي:|أوقف الدواء واستشر الطبيب", "Nausées, selles noires ou éruption cutanée :|arrête le médicament et consulte", warn("🚨", "براز أسود = استشر فورًا", "Selles noires = urgence", COL.ci), "worried"),
    seg("اكتب الإيبوبروفين في DwaDZ|وشاهد البطاقة", "Tape ibuprofène sur DwaDZ|et consulte la fiche", search("IBUPROFENE", "ATC : M01AE01")),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
