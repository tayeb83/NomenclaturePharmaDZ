// « Générique ou princeps ? ». Source : ep07-generique-princeps.md. Ne pas affirmer d'équivalence thérapeutique ni de prix sans les montrer dans l'outil.
const { card, warn, list, steps, it, cmp, search, logo, hook } = V
window.SPEC = {
  meta: { slug: "generique-princeps", n: 9, titreFr: "Générique ou princeps : quelle différence ?", titreAr: "الدواء الجنيس أم الأصلي؟",
    descFr: "Le pharmacien te propose un générique : est-ce le même médicament ? En une minute : un générique contient la même substance active (DCI), au même dosage et sous la même forme que le médicament d'origine ; comment les retrouver et les comparer sur DwaDZ ; et pourquoi demander conseil avant de changer un traitement chronique. Vidéo en arabe, sous-titrée en français.",
    descAr: "يقترح عليك الصيدلي دواءً جنيسًا: هل هو الدواء نفسه؟ في دقيقة واحدة: الدواء الجنيس يحتوي المادة الفعالة نفسها (DCI) وبالجرعة والشكل نفسيهما كالدواء الأصلي، وكيف تجد الأدوية وتقارنها في DwaDZ، ولماذا تسأل قبل تغيير علاج مزمن. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "الدواء_الجنيس", "DCI", "الدواء"],
    sources: ["Nomenclature nationale des produits pharmaceutiques (MIPH), consultée via DwaDZ : DCI, dosage, forme, laboratoire", "Pages « Substitution » et « Comparateur » de DwaDZ"],
    verifier: "Ne pas affirmer que le générique est « moins cher » sans l'avoir vérifié dans l'outil (prix PPA)." },
  cover: { ar: "الدواء الجنيس أم الأصلي؟", fr: ["Générique", "ou princeps ?"], subAr: "المادة الفعالة هي التي تهم", subFr: "C'est la substance active qui compte", icons: ["💊", "🔄"], c: "#51cf66" },
  segments: [
    seg("يقول لك الصيدلي: لديّ دواء جنيس.|فهل هو الدواء نفسه؟", "Le pharmacien te dit : « j'ai un générique ».|Est-ce le même médicament ?", hook("🤔", "جنيس أم أصلي؟", "Générique ou princeps ?"), "think"),
    seg("الجنيس يحتوي المادة الفعالة نفسها (DCI)|وبالجرعة والشكل نفسيهما", "Le générique contient la même substance active (DCI),|au même dosage et sous la même forme", cmp(it("🏷️", "الدواء الأصلي", "Princeps", COL.bad), it("💊", "الدواء الجنيس", "Générique", COL.ok), "=")),
    seg("ثلاثة أمور يجب أن تتطابق:|الـ DCI والجرعة والشكل", "Trois choses doivent correspondre :|la DCI, le dosage et la forme", steps([it("", "المادة الفعالة (DCI)", "Substance active"), it("", "الجرعة", "Dosage"), it("", "الشكل", "Forme : comprimé, sirop…")], COL.info)),
    seg("في DwaDZ نكتب اسم الدواء|ثم نفتح صفحة الاستبدال", "Sur DwaDZ, on tape le nom du médicament|puis on ouvre la page Substitution", card("🔄", "صفحة الاستبدال", "Même DCI · même dosage · même forme", COL.info)),
    seg("انظر إلى المخبر والبلد|(محلي أم مستورد) والسعر إن وُجد", "Regarde le laboratoire, le pays|(local ou importé) et le prix s'il est indiqué", list([it("🏭", "المخبر", "Laboratoire"), it("🌍", "محلي أم مستورد", "Local ou importé"), it("💰", "السعر إن وُجد", "Prix si indiqué")], COL.info)),
    seg("وقارن بين دواءين في المقارن", "Et compare deux médicaments dans le comparateur", card("⚖️", "قارن بين دواءين", "Page Comparateur", COL.ok)),
    seg("الأفضل أن تسأل الصيدلي، خاصة في الأدوية|الحساسة: لا تبدّله بنفسك", "Mieux vaut demander au pharmacien, surtout pour les|médicaments sensibles : ne le change pas toi-même", warn("🛑", "علاج مزمن؟ اسأل أولًا", "Ne change pas seul", COL.ci), "worried"),
    seg("اقرأ الـ DCI والجرعة والشكل،|ثم اسأل عن الدواء الجنيس", "Lis la DCI, le dosage et la forme,|puis renseigne-toi sur le générique", search("NOM DU MÉDICAMENT", "Substitution : même DCI")),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
