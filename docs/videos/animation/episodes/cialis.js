// « الفرق بين Cialis و Tadalafil ؟ » : nom de marque vs DCI. Capture du VRAI site (assets/cialis/cialis.jpg : fiche CIALIS en mode recherche DCI).
const { card, warn, list, steps, it, cmp, search, cform, logo, hook, shot, link } = V
const fiche = (to, hl, from, fh) => shot("assets/cialis/cialis.jpg", 2000, 826, to, hl, from, fh || 420)
window.SPEC = {
  meta: { slug: "cialis-ou-tadalafil-marque-et-dci", n: 17, titreFr: "Cialis ou Tadalafil ? Nom de marque et DCI", titreAr: "الفرق بين Cialis و Tadalafil؟",
    descFr: "Cialis et Tadalafil, est-ce le même médicament ? Cialis est un nom commercial choisi par le laboratoire ; Tadalafil est la DCI, la dénomination commune internationale de la substance active. Sur DwaDZ, la fiche affiche la DCI au-dessus du nom commercial, avec le code ATC (G04BE08). Cherche par DCI pour retrouver tous les médicaments contenant la même substance : https://www.dzair-pharma.net/recherche?q=TADALAFIL&mode=dci . Vidéo en arabe, sous-titrée en français.",
    descAr: "هل Cialis وTadalafil دواء واحد؟ Cialis اسم تجاري يختاره المخبر، أما Tadalafil فهو الاسم الدولي المشترك (DCI) للمادة الفعالة. في DwaDZ تظهر المادة الفعالة فوق الاسم التجاري مع رمز ATC. ابحث بالمادة الفعالة لتجد كل الأدوية التي تحتوي عليها. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "DCI", "الاسم_التجاري", "TADALAFIL"],
    cta: { url: "https://www.dzair-pharma.net/recherche?q=TADALAFIL&mode=dci", fr: "Chercher TADALAFIL par DCI", ar: "ابحث عن TADALAFIL بالمادة الفعالة" },
    sources: ["Fiche CIALIS sur DwaDZ (nomenclature nationale, MIPH) : DCI TADALAFIL, ATC G04BE08", "OMS : dénominations communes internationales (DCI)", "Classification ATC (OMS)"],
    verifier: "La capture montre CIALIS avec le statut « retiré » (MSPRH, interdiction d'importation, 2011-05-08) : la vidéo ne parle pas de disponibilité ; vérifier le statut actuel sur la fiche avant publication. Relecture par un pharmacien." },
  cover: { ar: "Cialis أم Tadalafil؟", fr: ["Cialis ou Tadalafil ?", "Marque et DCI"], subAr: "الاسم التجاري والمادة الفعالة", subFr: "Nom commercial et substance active", icons: ["💊", "🔬"], c: "#4dabf7" },
  segments: [
    seg("Cialis أم Tadalafil؟|هل هما دواء واحد؟", "Cialis ou Tadalafil ?|Est-ce le même médicament ?", hook("💊", "Cialis = Tadalafil ؟", "Marque ou DCI ?"), "think",
      "Cialis أم Tadalafil؟ هل هما دواء واحد؟"),
    seg("Cialis هو الاسم التجاري|الذي يختاره المخبر لدوائه", "Cialis est le nom commercial|choisi par le laboratoire pour son médicament", fiche([440, 530, 860, 400], [[470, 600, 230, 50]], [372, 500, 1250, 326]), "happy",
      "Cialis هو الاسم التجاري الذي يختاره المخبر لدوائه"),
    seg("أما Tadalafil فهو المادة الفعالة|واسمها الدولي المشترك DCI", "Tadalafil est la substance active,|sa dénomination commune internationale (DCI)", fiche([440, 530, 860, 400], [[470, 560, 200, 40]], [440, 530, 860, 400]),
      "happy", "أما Tadalafil فهو المادة الفعالة، واسمها الدولي المشترك DCI"),
    Object.assign(seg("في DwaDZ تظهر الـ DCI فوق الاسم التجاري|ومعها رمز ATC: G04BE08", "Sur DwaDZ, la DCI est au-dessus du nom commercial,|avec le code ATC : G04BE08", fiche([900, 520, 740, 346], [[1322, 552, 138, 38]], [440, 530, 860, 400]),
      "happy", "في DwaDZ تظهر الـ DCI فوق الاسم التجاري، ومعها رمز ATC: G04BE08"), { d: 8.5 }),
    seg("الدواء الواحد قد تكون له أسماء تجارية كثيرة،|لكن المادة الفعالة واحدة", "Un même médicament peut avoir de nombreux noms commerciaux,|mais la substance active reste la même", card("🏷️", "عدة أسماء تجارية", "Une seule substance : TADALAFIL", COL.ok), "think",
      "الدواء الواحد قد تكون له أسماء تجارية كثيرة، لكن المادة الفعالة واحدة"),
    seg("لذلك ابحث بالـ DCI|لتجد كل الأدوية التي تحتوي عليها", "Cherche donc par DCI|pour trouver tous les médicaments qui la contiennent", search("TADALAFIL", "Mode : DCI"), "happy",
      "لذلك ابحث بالـ DCI لتجد كل الأدوية التي تحتوي عليها"),
    Object.assign(seg("جرّب الآن: البحث عن TADALAFIL|بالمادة الفعالة", "Essaie maintenant : TADALAFIL|en recherche par DCI", link("dzair-pharma.net/recherche", "الرابط في وصف الفيديو", "Lien dans la description"), "happy",
      "جرب الآن البحث عن Tadalafil بالمادة الفعالة. الرابط في وصف الفيديو"), { d: 6 }),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
