// « Les alertes de retrait : c'est quoi, motifs, années ». Capture du VRAI site (assets/alertes/alertes.jpg : page /alertes).
const { card, warn, list, steps, it, cmp, search, cform, logo, hook, shot, link } = V
const al = (to, hl, from, fh) => shot("assets/alertes/alertes.jpg", 2000, 1118, to, hl, from, fh)
window.SPEC = {
  meta: { slug: "alertes-retraits-medicaments-dwadz", n: 18, titreFr: "Alertes : médicaments retirés, motifs et années", titreAr: "التنبيهات: الأدوية المسحوبة وأسباب السحب والسنوات",
    descFr: "La page Alertes de DwaDZ liste les médicaments retirés du marché algérien, du plus récent au plus ancien, d'après les sources officielles du MIPH. Chaque fiche indique le motif (par exemple : retrait par le MSPRH pour interdiction d'importation, retrait par le détenteur pour motif commercial, produit non commercialisé et décision non renouvelée) et la date. Filtre par année, par motif, ou cherche un nom ou une DCI : https://www.dzair-pharma.net/alertes . Un retrait n'est pas forcément lié à la sécurité du médicament : ne jamais délivrer un médicament de cette liste, en cas de doute consulte les sources officielles. Vidéo en arabe, sous-titrée en français.",
    descAr: "صفحة التنبيهات في DwaDZ تعرض الأدوية المسحوبة من السوق الجزائرية، من الأحدث إلى الأقدم، حسب المصادر الرسمية لوزارة الصناعة الصيدلانية. كل بطاقة تبين سبب السحب وتاريخه، مثل: سحب من وزارة الصحة بسبب منع الاستيراد، أو سحب من حائز القرار لأسباب تجارية، أو منتج غير مسوّق وقرار غير مجدد. يمكنك التصفية حسب السنة أو السبب، أو البحث باسم الدواء أو المادة الفعالة. ليس كل سحب مرتبطًا بسلامة الدواء. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "تنبيهات", "الأدوية_المسحوبة"],
    cta: { url: "https://www.dzair-pharma.net/alertes", fr: "Voir les alertes sur DwaDZ", ar: "شاهد التنبيهات في DwaDZ" },
    sources: ["Page Alertes de DwaDZ, données des médicaments retirés (nomenclature nationale, MIPH)", "Avertissement officiel de la page : ne pas délivrer un médicament de la liste ; en cas de doute consulter les sources officielles du MIPH"],
    verifier: "Les chiffres (824, 803, 501…) sont ceux de la capture à sa date (total 2679) : mettre à jour avant publication. Les 8 motifs affichés ne totalisent pas 2679 (les autres sont non listés). Les années ne sont visibles que dans le filtre : aucun chiffre par année n'est cité. Un retrait n'est pas forcément un problème de sécurité. Relecture par un pharmacien." },
  cover: { ar: "الأدوية المسحوبة", fr: ["Alertes :", "médicaments retirés"], subAr: "الأسباب والسنوات", subFr: "Motifs et années", icons: ["🚫", "⚠️"], c: "#e5484d" },
  segments: [
    seg("هل دواؤك مسحوب من السوق؟|تعرف على التنبيهات في DwaDZ", "Ton médicament est-il retiré du marché ?|Découvre les alertes sur DwaDZ", hook("🚫", "الأدوية المسحوبة", "Alertes DwaDZ"), "think",
      "هل دواؤك مسحوب من السوق؟ تعرف على التنبيهات في DwaDZ"),
    seg("صفحة التنبيهات تعرض الأدوية المسحوبة،|من الأحدث إلى الأقدم", "La page Alertes liste les médicaments retirés,|du plus récent au plus ancien", al([1300, 300, 700, 120], [[1664, 320, 296, 56]], [0, 0, 2000, 1118], 400), "happy",
      "صفحة التنبيهات تعرض الأدوية المسحوبة، من الأحدث إلى الأقدم"),
    seg("وفي كل بطاقة: اسم الدواء والمادة الفعالة،|والمخبر، وسبب السحب وتاريخه", "Chaque fiche : nom, substance active,|laboratoire, motif du retrait et date", al([700, 590, 1260, 330], [[1000, 770, 940, 64]], [1300, 300, 700, 120]), "happy",
      "وفي كل بطاقة: اسم الدواء والمادة الفعالة، والمخبر، وسبب السحب وتاريخه"),
    seg("وهذه أكثر الأسباب شيوعًا:|منع الاستيراد من وزارة الصحة، ثم الأسباب التجارية", "Motifs les plus fréquents :|interdiction d'importation par le ministère, puis motifs commerciaux", al([20, 440, 650, 330], [[28, 458, 624, 112], [28, 546, 624, 112]], [700, 590, 1260, 330]), "happy",
      "وهذه أكثر الأسباب شيوعا: منع الاستيراد من وزارة الصحة، ثم الأسباب التجارية"),
    seg("ومنها أيضًا: منتج غير مسوّق|وقرار تسجيل غير مجدد", "Aussi : produit non commercialisé|et décision d'enregistrement non renouvelée", al([20, 640, 650, 330], [[28, 654, 624, 112]], [20, 440, 650, 330]), "think",
      "ومنها أيضا: منتج غير مسوّق وقرار تسجيل غير مجدد"),
    seg("وليس كل سحب مرتبطًا|بسلامة الدواء", "Un retrait n'est pas forcément lié|à la sécurité du médicament", card("ℹ️", "السحب ليس دائمًا لسبب أمني", "Souvent un motif réglementaire ou commercial", COL.de), "think",
      "وليس كل سحب مرتبطا بسلامة الدواء"),
    seg("وللبحث: اختر السنة أو السبب،|أو اكتب اسم الدواء أو المادة الفعالة", "Pour chercher : choisis l'année ou le motif,|ou tape un nom ou une DCI", al([700, 420, 1300, 130], [[856, 444, 138, 56], [706, 444, 138, 56]], [20, 640, 650, 330]), "happy",
      "وللبحث: اختر السنة أو السبب، أو اكتب اسم الدواء أو المادة الفعالة"),
    seg("لا تصرف أي دواء من هذه القائمة،|وعند الشك راجع المصادر الرسمية", "Ne délivre aucun médicament de cette liste ;|en cas de doute, consulte les sources officielles", card("⛔", "لا تصرف دواءً مسحوبًا", "En cas de doute : sources officielles", COL.bad), "think",
      "لا تصرف أي دواء من هذه القائمة، وعند الشك راجع المصادر الرسمية"),
    seg("تصفح التنبيهات الآن على DwaDZ.|الرابط في وصف الفيديو", "Consulte les alertes sur DwaDZ.|Lien dans la description", link("dzair-pharma.net/alertes", "الرابط في وصف الفيديو", "Lien dans la description"), "happy",
      "تصفح التنبيهات الآن على DwaDZ. الرابط في وصف الفيديو"),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
