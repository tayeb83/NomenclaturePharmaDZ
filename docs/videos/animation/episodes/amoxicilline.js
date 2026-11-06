// « Amoxicilline : l'antibiotique ne soigne pas tous les rhumes ». Source : ep05-amoxicilline.md (aucune ligne ANSM pour l'amoxicilline : ne pas dire « pas d'interactions »).
const { card, warn, list, it, cmp, search, logo, hook } = V
window.SPEC = {
  meta: { slug: "amoxicilline-antibiotique", n: 7, titreFr: "Amoxicilline : l'antibiotique ne soigne pas tous les rhumes", titreAr: "الأموكسيسيلين: المضاد الحيوي لا يعالج كل زكام",
    descFr: "Rhume, toux, fièvre : un antibiotique soigne-t-il tout ? Non. En une minute : l'amoxicilline tue les bactéries, pas les virus ; elle se prend sur ordonnance, pendant la durée prescrite ; ne la partage pas, ne réutilise pas les restes, et signale toute allergie à la pénicilline. Vidéo en arabe, sous-titrée en français.",
    descAr: "زكام وسعال وحمى: هل يعالجها المضاد الحيوي؟ لا. في دقيقة واحدة: الأموكسيسيلين يقتل البكتيريا لا الفيروسات، ويُؤخذ بوصفة طبية وللمدة المحددة، ولا يُعطى لشخص آخر، ولا تُستعمل بقايا العلبة، مع الإبلاغ عن أي حساسية من البنسلين. فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "الأموكسيسيلين", "المضاد_الحيوي", "الدواء"],
    sources: ["Notice / RCP de la spécialité (ANPP)", "Message général de santé publique : les antibiotiques sont inefficaces sur les virus", "Classification ATC 2026 : amoxicilline J01CA04"],
    verifier: "Le thésaurus ANSM n'a aucune ligne amoxicilline : ne jamais dire « pas d'interactions », renvoyer au pharmacien. Aucune dose chiffrée." },
  cover: { ar: "الأموكسيسيلين", fr: ["Amoxicilline :", "pas pour tous les rhumes"], subAr: "المضاد الحيوي يقتل البكتيريا فقط", subFr: "L'antibiotique ne tue que les bactéries", icons: ["💊", "🦠"], c: "#51cf66" },
  segments: [
    seg("زكام وسعال وحمى…|فهل يعالجها المضاد الحيوي؟", "Rhume, toux, fièvre…|un antibiotique les soigne-t-il ?", hook("🤧", "المضاد الحيوي", "Soigne-t-il tout ? Non"), "think"),
    seg("الأموكسيسيلين يقتل البكتيريا|لا الفيروسات", "L'amoxicilline tue les bactéries,|pas les virus", cmp(it("🦠", "بكتيريا", "Bactéries : oui", COL.ok), it("🤧", "فيروسات", "Virus : non", COL.ci), "≠")),
    seg("والزكام والإنفلونزا فيروسية|في أغلب الحالات", "Or le rhume et la grippe sont|le plus souvent d'origine virale", card("🤧", "الزكام والإنفلونزا", "Le plus souvent des virus", COL.info)),
    seg("المضاد الحيوي يُوصف بوصفة طبية:|التزم بالأوقات والمدة التي حددها الطبيب", "Un antibiotique se prend sur ordonnance :|respecte les horaires et la durée fixés par le médecin", card("📝", "بوصفة طبية", "Durée = celle de l'ordonnance", COL.ok)),
    seg("ولا تغيّر المدة بنفسك", "Et ne modifie pas la durée toi-même", warn("🚫", "لا تغيّر المدة بنفسك", "Suis l'ordonnance", COL.ci), "worried"),
    seg("حساسية من البنسلين؟ طفح جلدي أو تورّم|أو ضيق تنفس: أخبر الطبيب والصيدلي", "Allergie à la pénicilline ? Éruption, gonflement|ou gêne respiratoire : dis-le au médecin et au pharmacien", warn("⚠️", "حساسية البنسلين", "Allergie pénicilline", COL.ci), "worried"),
    seg("لا تعطِ مضادك الحيوي لشخص آخر|ولا تستعمل بقايا العلبة لاحقًا", "Ne donne pas ton antibiotique à quelqu'un d'autre|et ne réutilise pas les restes de la boîte", list([it("🚫", "لا تعطه لغيرك", "Ne pas partager", COL.ci), it("📦", "لا تستعمل البقايا", "Pas de restes de boîte", COL.ci)], COL.ci)),
    seg("إسهال شديد أو طفح جلدي:|أوقف الدواء واستشر الطبيب", "Diarrhée sévère ou éruption cutanée :|arrête et consulte", warn("🚨", "إسهال شديد أو طفح", "Arrête et consulte", COL.ci), "worried"),
    seg("تتناول أدوية أخرى؟|اسأل الصيدلي عن الجمع بينها", "Tu prends d'autres médicaments ?|Demande au pharmacien s'ils vont ensemble", card("👩‍⚕️", "اسأل الصيدلي", "Sur les associations", COL.ok)),
    seg("اكتب اسم الدواء في DwaDZ|وشاهد الـ DCI والبطاقة", "Tape le nom du médicament sur DwaDZ|et consulte la DCI et la fiche", search("AMOXICILLINE", "ATC : J01CA04")),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
