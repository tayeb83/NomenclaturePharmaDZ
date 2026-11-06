// « Alcool et médicaments ». Source : ep09-alcool.md (ANSM, partenaire « ALCOOL » : metformine p. 164, sédatifs p. 163, insuline p. 144, sulfamides p. 232).
const { card, warn, list, steps, it, cmp, search, logo, hook } = V
window.SPEC = {
  meta: { slug: "alcool-et-medicaments", n: 11, titreFr: "Alcool et médicaments : un mélange à éviter", titreAr: "الكحول والأدوية: خلطة لا تنفع",
    descFr: "Médicament + alcool : où est le problème ? L'alcool modifie l'action de nombreux médicaments. Selon l'ANSM, il est déconseillé avec la metformine (acidose lactique), l'insuline et certains antidiabétiques (hypoglycémie) et les médicaments sédatifs (vigilance). En une minute, retiens aussi que l'alcool peut se cacher dans certains sirops. Vidéo en arabe, sous-titrée en français.",
    descAr: "دواء مع كحول: ما المشكلة؟ الكحول يغيّر عمل أدوية كثيرة. حسب الوكالة الفرنسية ANSM، هو غير موصى به مع الميتفورمين (الحماض اللبني)، ومع الأنسولين وبعض أدوية السكري (انخفاض السكر)، ومع المهدّئات (اليقظة). وقد يوجد الكحول في بعض الأشربة. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "الكحول", "التفاعلات", "الدواء"],
    sources: ["Thesaurus des interactions médicamenteuses de l'ANSM, septembre 2023, partenaire « alcool (boisson ou excipient) » : metformine p. 164, médicaments sédatifs p. 163, insuline p. 144, sulfamides hypoglycémiants p. 232 (associations déconseillées)", "Paracétamol et foie : RCP de la spécialité (à confirmer avant publication)"],
    verifier: "Ligne paracétamol + alcool : à confirmer avec le RCP. Ton non moralisateur." },
  cover: { ar: "الكحول والأدوية", fr: ["Alcool et", "médicaments"], subAr: "خلطة قد تكون خطيرة", subFr: "Un mélange qui peut être dangereux", icons: ["🍷", "💊"], c: "#f76707" },
  segments: [
    seg("دواء مع كحول.|ما المشكلة؟", "Médicament + alcool.|Où est le problème ?", hook("🍷", "دواء + كحول", "Où est le problème ?"), "think"),
    seg("الكحول يغيّر طريقة عمل أدوية كثيرة|ويزيد من آثارها الجانبية", "L'alcool modifie l'action de nombreux médicaments|et augmente leurs effets indésirables", card("🧪", "الكحول يغيّر عمل الدواء", "Plus d'effets indésirables", COL.de), "worried"),
    seg("الميتفورمين: الكحول يزيد|خطر الحماض اللبني", "Metformine : l'alcool augmente|le risque d'acidose lactique", card("🩸", "الميتفورمين", "Déconseillée (ANSM p. 164)", COL.de)),
    seg("الأنسولين وبعض أدوية السكري:|الكحول يزيد خطر انخفاض السكر", "Insuline et certains antidiabétiques :|l'alcool augmente le risque d'hypoglycémie", card("💉", "الأنسولين وأدوية السكري", "Déconseillée (ANSM p. 144 et 232)", COL.de)),
    seg("المهدّئات: الكحول يزيد تأثيرها|ويُضعف اليقظة، والقيادة خطر", "Médicaments sédatifs : l'alcool renforce leur effet|et diminue la vigilance, conduire est dangereux", card("😴", "المهدّئات", "Déconseillée (ANSM p. 163)", COL.de), "worried"),
    seg("والباراسيتامول مع الكحول:|يتعب الكبد أكثر", "Paracétamol + alcool :|le foie est davantage sollicité", card("💊", "الباراسيتامول والكحول", "Le foie souffre davantage (RCP)", COL.pr)),
    seg("الكحول قد يوجد في الدواء نفسه|(بعض الأشربة): اقرأ المكوّنات", "L'alcool peut se trouver dans le médicament|lui-même (certains sirops) : lis la composition", card("🧴", "كحول في الدواء نفسه", "Excipients : lis la composition", COL.info)),
    seg("وإذا شربت أثناء العلاج|فأخبر الطبيب", "Et si tu as bu pendant ton traitement,|dis-le au médecin", card("🗣️", "أخبر الطبيب", "Sans gêne : c'est pour ta sécurité", COL.ok)),
    seg("اكتشف الدواء في DwaDZ", "Découvre le médicament sur DwaDZ", search("METFORMINE", "Alcool : déconseillée")),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
