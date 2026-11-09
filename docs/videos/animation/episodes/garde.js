// « Pharmacie de garde : trouver une pharmacie ouverte la nuit ». Source : ep11-pharmacie-garde.md (plannings officiels ; ne pas promettre qu'une officine est ouverte).
const { card, warn, list, steps, it, cmp, search, logo, hook } = V
window.SPEC = {
  meta: { slug: "pharmacie-de-garde", n: 13, titreFr: "Pharmacie de garde : trouver une pharmacie ouverte la nuit", titreAr: "الصيدلية المناوبة: كيف تجد صيدلية مفتوحة ليلًا؟",
    descFr: "Il est 23 h, ton enfant a de la fièvre et les pharmacies sont fermées : où aller ? Sur DwaDZ, choisis la wilaya puis la commune, puis « Maintenant » ou « Cette nuit », active la localisation pour voir la plus proche et ouvre l'itinéraire. Appelle toujours avant de te déplacer : un planning peut changer. Vidéo en arabe, sous-titrée en français.",
    descAr: "الساعة الحادية عشرة ليلًا، طفلك محموم والصيدليات مغلقة: إلى أين تذهب؟ في DwaDZ اختر الولاية ثم البلدية، ثم «الآن» أو «هذه الليلة»، وفعّل الموقع لترى الأقرب وافتح الطريق. اتصل دائمًا قبل الذهاب، فالجدول قد يتغير. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "الصيدلية_المناوبة", "الجزائر", "الصحة"],
    sources: ["Plannings de garde officiels publiés sur DwaDZ, par wilaya et par commune"],
    verifier: "Tourner avec une wilaya dont le planning du jour est à jour. Ne jamais promettre qu'une pharmacie est ouverte ; ne pas montrer un vrai numéro d'officine sans accord." },
  cover: { ar: "الصيدلية المناوبة", fr: ["Pharmacie de garde :", "ouverte la nuit"], subAr: "ابحث بالولاية والبلدية", subFr: "Cherche par wilaya et commune", icons: ["🌙", "🏪"], c: "#51cf66" },
  segments: [
    seg("الساعة الحادية عشرة ليلًا. طفلك محموم|والصيدليات مغلقة. إلى أين؟", "Il est 23 h. Ton enfant a de la fièvre|et les pharmacies sont fermées. Où aller ?", hook("🌙", "الصيدلية المناوبة", "Où aller la nuit ?"), "worried"),
    seg("الصيدلية المناوبة تبقى مفتوحة|وفق جدول رسمي في كل ولاية وبلدية", "La pharmacie de garde reste ouverte selon un|planning officiel dans chaque wilaya et commune", card("🏪", "الصيدلية المناوبة", "Planning officiel", COL.ok)),
    seg("في DwaDZ: اختر الولاية ثم البلدية|ثم «الآن» أو «هذه الليلة»", "Sur DwaDZ : choisis la wilaya puis la commune,|puis « Maintenant » ou « Cette nuit »", steps([it("", "اختر الولاية", "La wilaya"), it("", "ثم البلدية", "Puis la commune"), it("", "«الآن» أو «هذه الليلة»", "Maintenant · Cette nuit")], COL.info)),
    seg("فعّل الموقع لترى الأقرب،|واتصل بها، وافتح الطريق في الخرائط", "Active la localisation pour voir la plus proche,|appelle-la et ouvre l'itinéraire dans la carte", list([it("📍", "الأقرب إليك", "La plus proche"), it("📞", "اتصل بالصيدلية", "Appelle"), it("🗺️", "افتح الطريق", "Itinéraire")], COL.info)),
    seg("الجدول قد يتغير:|اتصل قبل الذهاب", "Le planning peut changer :|appelle avant de te déplacer", warn("☎️", "اتصل قبل الذهاب", "Appelle d'abord", COL.pr), "think"),
    seg("احفظ الرابط في هاتفك|ليكون جاهزًا وقت الحاجة", "Garde le lien sur ton téléphone|pour l'avoir sous la main au moment voulu", card("📲", "احفظ الرابط", "Ajoute-le à l'écran d'accueil", COL.info)),
    seg("ابحث الآن في DwaDZ", "Cherche maintenant sur DwaDZ", search("PHARMACIE DE GARDE", "Maintenant · Cette nuit")),
    seg("DwaDZ… كل شيء عن دواء البلاد", "DwaDZ… tout sur le médicament en Algérie", logo()),
  ],
}
