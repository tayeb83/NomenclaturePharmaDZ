// « Comment lire la notice d'un médicament : 4 repères ». Source : ep08-lire-notice.md.
const { card, warn, list, steps, it, cmp, search, logo, hook } = V
window.SPEC = {
  meta: { slug: "lire-notice-medicament", n: 10, titreFr: "Comment lire la notice d'un médicament : 4 repères", titreAr: "كيف تقرأ نشرة الدواء؟ أربعة أمور",
    descFr: "Tu ranges la notice sans la lire ? Voici quatre repères : la substance active (DCI), le dosage et la forme, les contre-indications (« ne prends pas ce médicament si… ») et les interactions (« ne l'associe pas à… »). Et si tu ne comprends pas, demande au pharmacien. Vidéo en arabe, sous-titrée en français.",
    descAr: "هل تضع النشرة في جيبك دون أن تقرأها؟ إليك أربعة أمور: المادة الفعالة (DCI)، والجرعة والشكل، وموانع الاستعمال («لا تتناول الدواء إذا…»)، والتفاعلات («لا تجمعه مع…»). وإن لم تفهم فاسأل الصيدلي. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "نشرة_الدواء", "DCI", "الدواء"],
    sources: ["Structure standard d'une notice / RCP de médicament", "Fiche médicament DwaDZ : DCI, forme, dosage, laboratoire, ATC, interactions"],
    verifier: "Vérifier sur une vraie notice algérienne l'intitulé exact des rubriques." },
  cover: { ar: "كيف تقرأ نشرة الدواء؟", fr: ["Lire la notice", "en 4 repères"], subAr: "أربعة أمور لا تتجاهلها", subFr: "Quatre repères à ne pas ignorer", icons: ["📄", "🔍"], c: "#4dabf7" },
  segments: [
    seg("تشتري الدواء وتضع النشرة في جيبك…|دون أن تقرأها", "Tu achètes le médicament et tu ranges la notice|dans ta poche… sans la lire", hook("📄", "النشرة", "À lire avant de prendre"), "think"),
    seg("أربعة أمور يجب أن تنتبه إليها", "Quatre choses à regarder", steps([it("", "المادة الفعالة (DCI)", "Substance active"), it("", "الجرعة والشكل", "Dosage et forme"), it("", "لا تتناوله إذا…", "Contre-indications"), it("", "لا تجمعه مع…", "Interactions")], COL.info)),
    seg("أولًا: المادة الفعالة (DCI).|هي المهمة، لا الاسم التجاري", "1. La substance active (DCI).|C'est elle qui compte, pas le nom de marque", card("🔬", "المادة الفعالة (DCI)", "Pas le nom de marque", COL.ok)),
    seg("ثانيًا: الجرعة (مثل 500 ملغ)|والشكل: قرص أو شراب أو حقنة", "2. Le dosage (500 mg…) et la forme :|comprimé, sirop ou injection", card("💊", "الجرعة والشكل", "Un même nom, plusieurs dosages", COL.info)),
    seg("ثالثًا: لا تتناول الدواء إذا…|حساسية أو حمل أو مرض معين", "3. Ne prends pas le médicament si…|allergie, grossesse ou maladie", warn("⛔", "لا تتناوله إذا…", "Rubrique essentielle : contre-indications", COL.ci), "worried"),
    seg("رابعًا: لا تجمعه مع…|إن كنت تتناول دواءً آخر", "4. Ne l'associe pas à…|si tu prends un autre médicament", card("🔄", "لا تجمعه مع…", "Interactions", COL.de)),
    seg("وفي DwaDZ تجد التفاعلات|في تبويب واحد", "Sur DwaDZ, les interactions sont réunies|dans un seul onglet", search("NOM DU MÉDICAMENT", "Onglet Interactions")),
    seg("لم تفهم؟ لا تخمّن.|اسأل الصيدلي", "Tu n'as pas compris ? Ne devine pas.|Demande au pharmacien", card("🙋", "لم تفهم؟ اسأل", "Demande au pharmacien", COL.ok)),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
