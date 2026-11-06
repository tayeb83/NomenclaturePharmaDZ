// « Aspirine + anti-inflammatoire : pourquoi l'association est risquée ». Source : ep06-aspirine-ains.md (ANSM p. 4-5 ; gravité selon la dose).
const { card, warn, list, it, cmp, search, logo, hook } = V
window.SPEC = {
  meta: { slug: "aspirine-anti-inflammatoires", n: 8, titreFr: "Aspirine et anti-inflammatoires : pourquoi ne pas les associer ?", titreAr: "الأسبرين ومضادات الالتهاب: لماذا لا نجمع بينهما؟",
    descFr: "Aspirine puis ibuprofène : pourquoi l'estomac en souffre ? Selon l'ANSM, aspirine + AINS est déconseillé (risque d'ulcère et d'hémorragie digestive), et la gravité dépend de la dose. En une minute : la différence entre aspirine pour le cœur et aspirine antidouleur, et deux contre-indications à connaître. Vidéo en arabe, sous-titrée en français.",
    descAr: "الأسبرين ثم الإيبوبروفين: لماذا تتألم المعدة؟ حسب الوكالة الفرنسية ANSM، الجمع بين الأسبرين ومضادات الالتهاب غير موصى به (خطر القرحة والنزيف الهضمي)، والخطورة تتوقف على الجرعة. في دقيقة: الفرق بين أسبرين القلب وأسبرين تسكين الألم، وموانع يجب معرفتها. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "الأسبرين", "AINS", "الدواء"],
    sources: ["Thesaurus des interactions médicamenteuses de l'ANSM, septembre 2023, acide acétylsalicylique, p. 4-5 : + AINS (association déconseillée), + anticoagulants oraux et + méthotrexate (contre-indications selon la dose)"],
    verifier: "Ne jamais dire « aspirine = dangereux » : la dose et l'association comptent. Aucune dose chiffrée à l'écran." },
  cover: { ar: "الأسبرين ومضادات الالتهاب", fr: ["Aspirine + AINS :", "pourquoi c'est risqué"], subAr: "الجرعة والجمع بين الأدوية مهمان", subFr: "La dose et l'association comptent", icons: ["💊", "💊"], c: "#f76707" },
  segments: [
    seg("صداعٌ؟ أسبرين ثم إيبوبروفين…|فتبدأ المعدة بالألم", "Mal de tête ? Aspirine puis ibuprofène…|et l'estomac se met à faire mal", hook("🤕", "الأسبرين + الإيبوبروفين", "Pourquoi ?"), "think"),
    seg("كلاهما من مضادات الالتهاب أو قريب منها،|وكلٌّ منهما يؤثر في المعدة", "Tous deux sont des anti-inflammatoires ou apparentés,|et chacun agit sur l'estomac", cmp(it("💊", "الأسبرين", "Aspirine", COL.bad), it("💊", "الإيبوبروفين", "Ibuprofène", COL.info), "+")),
    seg("تقول ANSM: الأسبرين مع AINS غير موصى به:|خطر القرحة والنزيف الهضمي", "L'ANSM : aspirine + AINS déconseillé :|risque d'ulcère et d'hémorragie digestive", warn("⚠️", "غير موصى به", "Association déconseillée (ANSM)", COL.de), "worried"),
    seg("والجرعة مهمة: الأسبرين بجرعة صغيرة|للقلب ليس كجرعة تسكين الصداع", "Et la dose compte : l'aspirine à faible dose pour le cœur|n'est pas celle de l'antidouleur", list([it("❤️", "حماية القلب", "Faible dose : antiagrégant", COL.ok), it("🤕", "تسكين الألم", "Dose antidouleur", COL.pr), it("🔥", "مضاد التهاب", "Forte dose : anti-inflammatoire", COL.de)], COL.info)),
    seg("مع مضادات التخثر: قد يكون الأسبرين بجرعة|تسكين الصداع ممنوعًا عند وجود قرحة سابقة", "Avec les anticoagulants : l'aspirine à dose antidouleur peut être|contre-indiquée en cas d'antécédent d'ulcère", card("🩸", "مضادات التخثر", "Contre-indication selon la dose", COL.ci), "worried"),
    seg("ومع الميتوتريكسات بجرعاته العالية:|ممنوع", "Avec le méthotrexate à fortes doses :|contre-indiqué", card("🧬", "الميتوتريكسات", "Contre-indication (fortes doses)", COL.ci), "worried"),
    seg("تتناول الأسبرين لحماية القلب؟|لا توقفه بمفردك", "Tu prends de l'aspirine pour le cœur ?|Ne l'arrête pas seul", warn("❤️", "لا توقفه بمفردك", "Aspirine du cœur", COL.ci)),
    seg("وقبل إضافة أي مسكّن|اسأل الصيدلي", "Et avant d'ajouter un antidouleur,|demande au pharmacien", card("👩‍⚕️", "اسأل الصيدلي", "Avant tout nouvel antidouleur", COL.ok)),
    seg("اكتشف تفاعلات دوائك في DwaDZ", "Découvre les interactions de ton médicament sur DwaDZ", search("ACIDE ACETYLSALICYLIQUE", "Onglet Interactions")),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
