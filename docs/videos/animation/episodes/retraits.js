// « Médicament retiré du marché : vérifie en 10 secondes ». Source : ep12-retraits.md (retraits MIPH ; citer le motif tel que publié, sans dramatiser).
const { card, warn, list, steps, it, cmp, search, logo, hook } = V
window.SPEC = {
  meta: { slug: "medicaments-retires", n: 14, titreFr: "Médicament retiré du marché : vérifie en 10 secondes", titreAr: "هل سُحب دواؤك من السوق؟ تحقق في عشر ثوانٍ",
    descFr: "Tu gardes une vieille boîte de médicament à la maison : peut-on encore l'utiliser ? Parfois un médicament est retiré du marché (qualité, sécurité ou décision réglementaire). Sur DwaDZ, tape son nom pour voir s'il fait l'objet d'une alerte ou d'un retrait, et consulte la liste des retraits par année. N'arrête jamais seul un traitement chronique. Vidéo en arabe, sous-titrée en français.",
    descAr: "في بيتك علبة دواء قديمة: هل يمكن استعمالها؟ أحيانًا يُسحب الدواء من السوق (لأسباب تتعلق بالجودة أو السلامة أو بقرار تنظيمي). في DwaDZ اكتب اسمه لتعرف إن كان عليه تنبيه أو مسحوبًا، وتصفح قائمة المسحوبات حسب السنة. لا تتوقف عن علاج مزمن بمفردك. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "سحب_الأدوية", "الجزائر", "الصحة"],
    sources: ["Retraits de médicaments publiés par le MIPH, suivis sur DwaDZ (pages Retraits et Alertes)"],
    verifier: "Choisir un retrait réel et récent, citer son motif tel que publié. La consigne « rapporte le médicament au pharmacien » est à confirmer avec le relecteur." },
  cover: { ar: "هل سُحب دواؤك؟", fr: ["Médicament retiré", "du marché ?"], subAr: "تحقق في عشر ثوانٍ", subFr: "Vérifie en 10 secondes", icons: ["🗄️", "⚠️"], c: "#f2b705" },
  segments: [
    seg("في بيتك علبة دواء قديمة.|فهل ما زال استعمالها مسموحًا؟", "Tu as une vieille boîte de médicament chez toi.|Peut-on encore l'utiliser ?", hook("🗄️", "علبة دواء قديمة", "Encore utilisable ?"), "think"),
    seg("أحيانًا يُسحب الدواء من السوق:|جودة أو سلامة أو قرار تنظيمي", "Parfois un médicament est retiré du marché :|qualité, sécurité ou décision réglementaire", card("🚫", "الدواء قد يُسحب", "Qualité · sécurité · réglementation", COL.pr)),
    seg("في DwaDZ اكتب اسم الدواء|لتعرف إن كان عليه تنبيه أو مسحوبًا", "Sur DwaDZ, tape le nom du médicament pour savoir|s'il fait l'objet d'une alerte ou d'un retrait", search("NOM DU MÉDICAMENT", "⚠️ Alerte · Retrait")),
    seg("وتعرض صفحة المسحوبات|السنة والسبب كما نُشر", "La page Retraits présente l'année|et le motif tel que publié", card("📅", "المسحوبات حسب السنة", "Motif tel que publié", COL.info)),
    seg("إن سُحب دواؤك: لا تتوقف عن دواء مزمن|(السكري، الضغط، القلب) بمفردك: استشر الطبيب", "Si ton médicament est retiré : n'arrête pas seul un traitement|chronique (diabète, tension, cœur) : consulte le médecin", warn("⚠️", "علاج مزمن؟ لا تتوقف", "Consulte le médecin", COL.ci), "worried"),
    seg("لا تُلقِ الدواء في المجاري:|أعده إلى الصيدلي", "Ne jette pas le médicament à l'évier :|rapporte-le au pharmacien", card("🏪", "أعده إلى الصيدلي", "(à confirmer avec le relecteur)", COL.ok)),
    seg("تفقّد أدويتك في DwaDZ", "Vérifie tes médicaments sur DwaDZ", logo()),
  ],
}
