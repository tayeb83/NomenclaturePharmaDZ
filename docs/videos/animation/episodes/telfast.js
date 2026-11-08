// « Une ordonnance avec TELFAST : substance, famille, génériques avec DwaDZ ». Captures du VRAI site (assets/telfast/*.jpg, recadrées : sans barre du navigateur ni favoris).
// Scénario : on lit TELFAST CP sur une ordonnance → recherche DwaDZ → fiche → DCI, ATC, famille, génériques, alternatives, interactions.
const { card, warn, list, steps, it, cmp, search, cform, logo, hook, shot } = V
const IMG = (n, w, h) => (to, hl, from, fh) => shot(`assets/telfast/${n}.jpg`, w, h, to, hl, from, fh)
const recherche = IMG("recherche", 2000, 1478), fiche = IMG("fiche", 2000, 1170), atc = IMG("atc", 2000, 330), generiques = IMG("generiques", 2000, 1190), alternatives = IMG("alternatives", 2000, 1170)
window.SPEC = {
  meta: { slug: "ordonnance-telfast-dwadz", n: 16, titreFr: "Ordonnance avec TELFAST : substance, famille et génériques avec DwaDZ", titreAr: "وصفة فيها TELFAST: المادة الفعالة والعائلة والجنيسات مع DwaDZ",
    descFr: "Tu as une ordonnance avec TELFAST CP : quelle est la substance active, la famille du médicament, et quels sont ses génériques ? Suis le parcours sur DwaDZ : recherche du nom, fiche du médicament (substance active, code ATC, forme et dosage), classification ATC, autres médicaments de même substance (génériques), laboratoire, validité de l'enregistrement et interactions selon l'ANSM. Avant de remplacer un médicament par un générique, vérifie le dosage et la forme et demande au pharmacien. Vidéo en arabe, sous-titrée en français.",
    descAr: "أمامك وصفة فيها TELFAST CP: ما المادة الفعالة، وما العائلة الدوائية، وما الأدوية الجنيسة؟ اتبع المسار في DwaDZ: البحث عن الاسم، ثم بطاقة الدواء (المادة الفعالة ورمز ATC والشكل والجرعة)، والتصنيف ATC، والأدوية الأخرى بنفس المادة الفعالة (الجنيسة)، والمخبر وصلاحية التسجيل، والتداخلات حسب ANSM. وقبل أن تستبدل دواءً بجنيس تحقق من الجرعة والشكل واسأل الصيدلي. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "TELFAST", "الدواء_الجنيس", "ATC"],
    sources: ["Fiche du médicament TELFAST sur DwaDZ (nomenclature nationale des produits pharmaceutiques, MIPH) : substance active fexofénadine chlorhydrate, ATC R06AX26", "Classification ATC (OMS), version 2026 utilisée par DwaDZ", "Thesaurus des interactions médicamenteuses de l'ANSM, septembre 2023"],
    verifier: "Captures du site réel, au moment de la capture : la fiche indique une validité d'enregistrement échue (4 juin 2024) et la recherche signale « retiré (1) » : ne pas présenter TELFAST comme disponible sans vérifier son statut actuel avant publication. Exemple pédagogique, pas un conseil de substitution : relecture par un pharmacien." },
  cover: { ar: "وصفة فيها TELFAST", fr: ["Ordonnance avec TELFAST :", "substance, famille, génériques"], subAr: "كل الإجابات في بطاقة الدواء", subFr: "Toutes les réponses sont sur la fiche", icons: ["📝", "🔍"], c: "#4dabf7" },
  segments: [
    seg("أمامك وصفة طبية فيها TELFAST CP.|ما المادة الفعالة؟ وما عائلته؟ وما جنيساته؟", "Tu as une ordonnance avec TELFAST CP.|Quelle substance ? Quelle famille ? Quels génériques ?", hook("📝", "TELFAST CP", "Ordonnance : que faire ?"), "think",
      "أمامك وصفة طبية فيها Telfast سي بي. ما المادة الفعالة؟ وما عائلته؟ وما جنيساته؟"),
    seg("اذهب إلى البحث في DwaDZ|واكتب اسم الدواء: TELFAST", "Va sur la recherche DwaDZ|et tape le nom du médicament : TELFAST", recherche([230, 300, 1000, 560], [[256, 374, 1644, 98]]), "happy",
      "اذهب إلى البحث في DwaDZ واكتب اسم الدواء: Telfast"),
    seg("تظهر النتائج مع مرشحات:|المخبر، والتصنيف ATC، والمادة الفعالة", "Les résultats s'affichent avec des filtres :|laboratoire, classe ATC, substance active", recherche([236, 830, 1100, 648], [[404, 1316, 214, 68], [404, 1394, 880, 72]], [230, 300, 1000, 560])),
    seg("افتح بطاقة الدواء: المادة الفعالة (DCI)|هي فيكسوفينادين هيدروكلوريد", "Ouvre la fiche : la substance active (DCI)|est la fexofénadine chlorhydrate", fiche([800, 150, 1050, 500], [[676, 168, 1148, 62]])),
    Object.assign(seg("ورمز ATC هو R06AX26،|والشكل: قرص مغلف، الجرعة 120 ملغ", "Le code ATC est R06AX26 ;|forme : comprimé pelliculé, dosage 120 mg", fiche([800, 410, 1050, 460], [[676, 420, 1148, 62], [676, 698, 1148, 116]], [800, 150, 1050, 500])), { d: 8.5 }),
    seg("وتحت «التصنيف ATC» تجد العائلة الدوائية:|الجهاز التنفسي، ثم مضادات الهيستامين", "Sous « Classification ATC », la famille :|système respiratoire, puis antihistaminiques", atc([1100, 100, 780, 200], [[1166, 168, 260, 84], [1700, 168, 100, 84]], [140, 60, 1700, 240], 340)),
    seg("وفي «أدوية أخرى بنفس المادة الفعالة»|تجد الأدوية الجنيسة: عشرة أدوية مسجلة", "Dans « Autres médicaments de même substance »,|les génériques : dix médicaments enregistrés", generiques([900, 0, 960, 640], [[1000, 76, 830, 44], [1676, 328, 128, 54]], [0, 0, 2000, 1190])),
    seg("وتجد أيضًا البدائل في الجزائر ومخبر الدواء|وصلاحية التسجيل المعلنة، مع التحقق من التجديد", "Tu trouves aussi les alternatives en Algérie, le laboratoire|et la validité annoncée de l'enregistrement, à vérifier", alternatives([560, 200, 1300, 500], [[1010, 236, 810, 290], [270, 606, 1580, 44]], [0, 0, 2000, 1170])),
    Object.assign(seg("ومن البطاقة نفسها زر «عرض التداخلات»|لمعرفة تداخلاته حسب ANSM", "Depuis la même fiche, le bouton « Voir les interactions »|donne ses interactions selon l'ANSM", fiche([60, 620, 760, 300], [[166, 752, 456, 66]], [800, 410, 1050, 460])), { d: 7 }),
    seg("قبل أن تستبدل دواءً بجنيس:|تحقق من الجرعة والشكل، واسأل الصيدلي", "Avant de remplacer un médicament par un générique :|vérifie le dosage et la forme, et demande au pharmacien", card("👩‍⚕️", "الجرعة والشكل: اسأل الصيدلي", "TELFAST existe en 120 mg et 180 mg", COL.ok), "happy"),
    seg("ابحث عن أي دواء في DwaDZ|وستجد الإجابات كلها في بطاقته", "Cherche n'importe quel médicament sur DwaDZ :|toutes les réponses sont sur sa fiche", search("TELFAST", "DCI : FEXOFENADINE CHLORHYDRATE")),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
