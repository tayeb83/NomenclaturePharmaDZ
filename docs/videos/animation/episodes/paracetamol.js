// « Doliprane : le paracétamol et le foie ». Texte arabe = texte lu ; fr = traduction. Source : docs/videos/episodes/ep01-doliprane.md
const { card, warn, list, it, cmp, search, logo, hook } = V
window.SPEC = {
  meta: { slug: "paracetamol-doliprane", n: 4, titreFr: "Doliprane : le paracétamol et le foie", titreAr: "الدوليبران: الباراسيتامول والكبد",
    descFr: "Le Doliprane est un nom de marque ; la substance active est le paracétamol. En un peu plus d'une minute : comment le prendre en respectant la notice, pourquoi un excès abîme le foie, comment éviter de doubler la dose avec un autre médicament de même substance, et deux interactions à connaître (antivitamines K, flucloxacilline). Vidéo en arabe, sous-titrée en français.",
    descAr: "الدوليبران اسمٌ تجاري، والمادة الفعالة فيه هي الباراسيتامول. في دقيقة وبضع ثوانٍ: كيف نستعمله وفق النشرة، ولماذا يضر الإفراط فيه بالكبد، وكيف نتجنب مضاعفة الجرعة مع دواء آخر يحمل المادة نفسها، وتداخلان يجب معرفتهما (مضادات فيتامين ك والفلوكلوكساسيلين). فيديو بالعربية مع ترجمة فرنسية.",
    tags: ["DwaDZ", "الباراسيتامول", "الكبد", "الدواء"],
    sources: ["Thesaurus des interactions médicamenteuses de l'ANSM, septembre 2023 : paracétamol + antivitamines K (précaution d'emploi) et paracétamol + flucloxacilline (association déconseillée), p. 191", "Notice / RCP de la spécialité (ANPP) : dose maximale et intervalle entre les prises"],
    verifier: "Dose max et intervalle : à lire sur la notice de la marque montrée ; vérifier que Doliprane figure dans la nomenclature algérienne." },
  cover: { ar: "الدوليبران والكبد", fr: ["Doliprane :", "le paracétamol et le foie"], subAr: "دواء شائع… لكن احذر الجرعة", subFr: "Un médicament courant… mais attention à la dose", icons: ["💊", "⚠️"], c: "#ff9f1c" },
  segments: [
    seg("الدوليبران… دواءٌ نشتريه جميعًا|دون أن نسأل", "Le Doliprane… un médicament que tout le monde|achète sans poser de question", hook("💊", "الدوليبران", "Bénin ? pas toujours"), "think"),
    seg("الدوليبران اسمٌ تجاري،|والمادة الفعالة فيه الباراسيتامول", "Doliprane est un nom de marque ;|la substance active est le paracétamol", cmp(it("🏷️", "الدوليبران", "nom de marque", COL.bad), it("💊", "الباراسيتامول", "substance active", COL.ok), "←")),
    seg("يخفض الحرارة ويخفف الألم|كالصداع وألم الأسنان", "Il fait baisser la fièvre et soulage la douleur :|maux de tête, dents", list([it("🌡️", "يخفض الحرارة", "Fièvre"), it("🤕", "الصداع", "Maux de tête"), it("🦷", "ألم الأسنان", "Dents")], COL.info)),
    seg("اقرأ النشرة داخل العلبة:|الجرعة القصوى والمدة بين جرعتين", "Lis la notice : dose maximale|et délai entre deux prises", card("📄", "اقرأ النشرة", "Dose max par jour · intervalle entre les prises", COL.info)),
    seg("لا تتجاوز الجرعة المكتوبة|ولا تزدها ليزول الألم أسرع", "Ne dépasse pas la dose indiquée|et ne l'augmente pas pour que ça passe plus vite", warn("🚫", "لا تزد الجرعة", "Respecte la notice", COL.ci), "worried"),
    seg("الخطر الأول: الكبد.|الإفراط في الباراسيتامول يضره", "Premier risque : le foie.|Trop de paracétamol l'abîme", warn("⚠️", "الخطر الأول: الكبد", "Surdosage = foie", COL.ci), "worried"),
    seg("وقد لا تشعر بذلك في البداية،|والكحول والصيام الطويل يزيدان الخطر", "On ne le sent pas au début ;|l'alcool et le jeûne prolongé aggravent le risque", list([it("😶", "لا أعراض في البداية", "Aucun signe au début"), it("🍷", "الكحول", "Alcool"), it("🍽️", "الصيام الطويل", "Jeûne prolongé")], COL.de), "worried"),
    seg("الخطر الثاني: دواء آخر يحتوي المادة نفسها|فتتضاعف الجرعة دون أن تدري", "Second risque : un autre médicament contenant la même|substance, et la dose double sans que tu le saches", cmp(it("🌡️", "دواء الحمى", "Fièvre", COL.bad), it("🤧", "دواء الزكام", "Rhume", COL.info), "×2"), "surprised"),
    seg("تحقق دائمًا من الـ DCI", "Vérifie toujours la DCI", card("🔍", "تحقق من الـ DCI", "Même DCI = même substance", COL.gold)),
    seg("مع مضادات فيتامين ك: مراقبة INR|عند الجرعة القصوى لعدة أيام", "Avec les antivitamines K : suivi de l'INR|à dose maximale plusieurs jours", card("🩸", "مضادات فيتامين ك", "Précaution d'emploi (ANSM)", COL.pr)),
    seg("ومع المضاد الحيوي فلوكلوكساسيلين:|تنصح ANSM بتجنب الجمع", "Avec l'antibiotique flucloxacilline :|l'ANSM déconseille l'association", card("💉", "فلوكلوكساسيلين", "Association déconseillée (ANSM)", COL.de)),
    seg("مرض في الكبد؟ حمل؟ دواء مماثل؟|اسأل الصيدلي قبل الاستعمال", "Maladie du foie ? Grossesse ? Médicament semblable ?|Demande au pharmacien avant de le prendre", card("👩‍⚕️", "اسأل الصيدلي", "Avant de le prendre", COL.ok)),
    seg("اكتب اسم الدواء في DwaDZ|وشاهد الـ DCI والتفاعلات", "Tape le nom du médicament sur DwaDZ|et regarde la DCI et les interactions", search("DOLIPRANE", "DCI : PARACETAMOL")),
    seg("معلومة عامة، ولا تغني عن|رأي الطبيب أو الصيدلي", "Information générale : elle ne remplace pas|l'avis du médecin ou du pharmacien", logo()),
  ],
}
