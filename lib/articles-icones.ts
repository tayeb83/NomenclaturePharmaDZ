import type { Article } from './articles'

/**
 * Article de présentation des icônes de forme galénique et de voie d'administration (FR + AR).
 * À garder aligné sur lib/dwadz-icons (règles, libellés, nombre d'icônes) et sur les écrans qui les affichent :
 * components/ui/FormeIcon.tsx, fiche médicament, cartes et filtres de recherche, /forme, /terminologies.
 * Visuels : public/articles/icones/ (images de l'article) et assets/articles/icones-formes.png (vignette de partage).
 */
export const ARTICLES_ICONES: Article[] = [
  {
    slug: 'icones-forme-voie-administration-medicament-algerie',
    lang: 'fr',
    audience: 'professionnel',
    title: 'Nouveau sur DwaDZ : des icônes pour lire d’un coup d’œil la forme et la voie d’administration',
    subtitle: 'Un contenant, une pastille de couleur pour la voie, un petit signe pour les particularités : ce que les icônes montrent, où les trouver, et leurs limites',
    description:
      'DwaDZ affiche désormais une icône devant chaque forme galénique : le contenant (comprimé, gélule, sirop, seringue…), une pastille pour la voie d’administration et des signes pour la libération prolongée, la forme sécable ou à reconstituer. Où les voir, comment les lire, d’où vient la voie, et ce qu’elles ne disent pas.',
    seoTitle: 'Icônes de forme galénique et de voie d’administration : la nouveauté de DwaDZ',
    seoKeywords: ['icône forme galénique', 'voie d’administration icône', 'forme pharmaceutique médicament Algérie', 'nomenclature pharmaceutique algérienne', 'EDQM forme voie', 'fiche médicament Algérie', 'comprimé gélule sirop injectable'],
    date: '2026-11-13',
    readingTime: 6,
    image: 'icones-formes.png',
    tags: ['Nouveauté', 'Forme galénique', 'Voie d’administration', 'EDQM', 'Nomenclature', 'Outils'],
    faq: [
      {
        question: 'L’icône remplace-t-elle le libellé de la forme ?',
        answer: 'Non. Le libellé de la nomenclature reste toujours affiché à côté. L’icône le complète pour qu’on repère la forme et la voie sans lire, notamment dans une longue liste.',
      },
      {
        question: 'D’où vient la voie d’administration affichée sur l’icône ?',
        answer: 'Sur la fiche d’un médicament, elle vient du code EDQM de la fiche. Dans les listes (cartes de recherche, filtres, tableaux des présentations d’une marque), elle est déduite du libellé de la forme : un collyre donne la voie ophtalmique, un suppositoire la voie rectale. La nomenclature officielle ne comporte pas de colonne « voie » : celle-ci est toujours une indication de lecture, à confirmer sur la fiche et sur le résumé des caractéristiques du produit.',
      },
      {
        question: 'Pourquoi certaines formes ont-elles une icône générique ?',
        answer: 'Parce que le jeu d’icônes est un premier jet : 29 formes, 15 voies et 6 signes particuliers. Quelques formes rares (solutions d’irrigation, instillation endotrachéale…) et quelques voies (péridurale, intrathécale, intravitréenne…) n’ont pas encore de dessin propre. Elles reçoivent une icône générique, ou la pastille « autre voie », et le libellé complet reste visible.',
      },
      {
        question: 'Que signifient les couleurs des pastilles ?',
        answer: 'La couleur indique la famille de voie (voie orale en vert, injectable en rouge, œil et oreille en bleu, peau en brun, voies rectale et vaginale en rose-violet) et le dessin précise la voie. Passez le curseur sur l’icône ou lisez son texte alternatif : la forme, la voie et les particularités y sont écrites en toutes lettres, en français ou en arabe selon la langue du site.',
      },
      {
        question: 'Les icônes donnent-elles une information sur la posologie ou l’utilisation ?',
        answer: 'Non. Elles décrivent la présentation (forme, voie, particularités de libération ou de préparation). Elles ne donnent ni indication, ni posologie, ni conseil médical : la fiche officielle, le résumé des caractéristiques du produit et l’avis du médecin ou du pharmacien font foi.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Une liste de médicaments, c’est vite une colonne de formes écrites en majuscules : « COMPRIME PELLICULE SECABLE », « POUDRE POUR SUSPENSION BUVABLE », « SOLUTION INJECTABLE ». DwaDZ ajoute désormais devant chaque forme une icône qui montre, en un coup d’œil, ce dont il s’agit et par où le médicament s’administre. Le libellé reste là : l’icône le complète, elle ne le remplace pas.',
      },
      { type: 'h2', title: '1. Comment lire une icône' },
      {
        type: 'paragraph',
        text: 'Chaque icône se compose de trois niveaux. Le **contenant** dessine la forme galénique : comprimé, gélule, flacon de sirop, seringue, tube, suppositoire… La **pastille de voie**, en bas, donne la voie d’administration : sa couleur indique la famille (orale, injectable, œil et oreille, peau, voies rectale et vaginale) et son dessin précise la voie. Enfin de petits **signes** en haut signalent une particularité : libération prolongée ou modifiée, gastro-résistant, sécable, à reconstituer, à diluer, destiné à l’enfant.',
      },
      {
        type: 'image',
        src: '/articles/icones/anatomie-icone.png',
        width: 1428,
        height: 480,
        alt: 'Une icône de comprimé à libération prolongée, avec une pastille verte de voie orale en bas à droite et un petit signe horloge en haut, accompagnée de l’explication des trois niveaux : contenant, pastille de voie, modificateur',
        caption: 'Les trois niveaux d’une icône : le contenant (la forme), la pastille de voie et le signe de particularité.',
      },
      {
        type: 'paragraph',
        text: 'Le jeu comprend 29 dessins de formes, 15 pastilles de voie et 6 signes. Les formes courantes y sont : comprimé (simple, à dissoudre, à croquer ou orodispersible), gélule, capsule molle, sachet, poudre à reconstituer, liquide buvable, collyre ou gouttes, spray, inhalateur, seringue, stylo, flacon injectable, perfusion, crème ou pommade, suppositoire, ovule, patch, solution de dialyse.',
      },
      {
        type: 'image',
        src: '/articles/icones/galerie-formes.png',
        width: 1428,
        height: 522,
        alt: 'Neuf exemples d’icônes avec leur libellé : comprimé pelliculé, gélule et sirop en voie orale, collyre en voie ophtalmique, solution injectable en voie sous-cutanée, suppositoire en voie rectale, crème en voie cutanée, ovule en voie vaginale et comprimé sécable',
        caption: 'Quelques formes de la nomenclature avec leur pastille de voie. Le libellé reste toujours affiché à côté de l’icône.',
      },
      { type: 'h2', title: '2. Où les trouver' },
      {
        type: 'list',
        items: [
          '**Fiche d’un médicament** : à côté du titre (grande icône complète), sur la ligne « Forme pharmaceutique » du tableau de conditionnement, devant chaque voie d’administration, et dans le bandeau latéral « Forme / dosage ».',
          '**Résultats de recherche** : sur chaque carte de médicament, à la place de l’ancien pictogramme générique.',
          '**Filtres de la recherche** : devant chaque forme et chaque voie proposées, ce qui permet de repérer « injectable » ou « collyre » sans lire toute la liste.',
          '**Pages de marque** : dans le tableau des présentations (forme, dosage, laboratoire).',
          '**Pages « Forme »** : une grande icône en tête de page, pour la forme choisie.',
          '**Terminologies** : devant les formes et les voies EDQM du référentiel.',
        ],
      },
      { type: 'h2', title: '3. D’où vient la voie d’administration' },
      {
        type: 'paragraph',
        text: 'C’est le point à connaître pour bien interpréter la pastille. La nomenclature nationale ne comporte pas de colonne « voie d’administration » : DwaDZ la rattache à la forme grâce à la terminologie EDQM (Standard Terms de la Direction européenne de la qualité du médicament), la même qui fournit les codes affichés sur les fiches.',
      },
      {
        type: 'table',
        headers: ['Où', 'Origine de la pastille de voie'],
        rows: [
          { cells: ['Fiche d’un médicament', 'Le code EDQM de la fiche : si la fiche porte plusieurs voies, chacune apparaît.'] },
          { cells: ['Cartes de recherche, filtres, tableaux d’une marque', 'Le libellé de la forme : un collyre donne la voie ophtalmique, un suppositoire la voie rectale, un sirop la voie orale.'] },
          { cells: ['Forme sans voie reconnue', 'Aucune pastille, ou la pastille « autre voie » : voir la fiche.'] },
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Quand le libellé ne suffit pas (une « solution injectable » peut être administrée par voie intraveineuse, intramusculaire ou sous-cutanée), la liste ne tranche pas : seule la fiche, avec son code EDQM, précise la voie. Dans le filtre de voie, le groupe « injectable » est représenté par une seringue plutôt que par une voie précise.',
      },
      { type: 'h2', title: '4. Les signes de particularité' },
      {
        type: 'table',
        headers: ['Signe', 'Ce qu’il indique', 'Exemple de libellé'],
        rows: [
          { cells: ['Horloge', 'Libération prolongée ou modifiée', 'COMPRIME PELLICULE A LIBERATION PROLONGEE'] },
          { cells: ['Gastro-résistant', 'Enrobage résistant à l’acidité de l’estomac', 'COMPRIME GASTRO-RESISTANT'] },
          { cells: ['Sécable', 'Comprimé qui peut être divisé selon sa barre de cassure', 'COMPRIME SECABLE'] },
          { cells: ['À reconstituer', 'Poudre ou lyophilisat à préparer avant emploi', 'POUDRE POUR SUSPENSION BUVABLE'] },
          { cells: ['À diluer', 'Solution concentrée à diluer', 'SOLUTION A DILUER POUR PERFUSION'] },
          { cells: ['Enfant', 'Forme destinée à l’enfant ou au nourrisson', 'SIROP NOURRISSON'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Ces signes sont détectés dans le libellé de la forme. Sous 28 pixels de côté, ils ne sont plus lisibles : on n’affiche alors que le contenant et la voie.',
      },
      { type: 'h2', title: '5. Accessibilité et langues' },
      {
        type: 'paragraph',
        text: 'Chaque icône porte un texte alternatif : « Comprimé, Voie orale, Libération prolongée ou modifiée » en français, l’équivalent en arabe quand le site est en arabe. Les lecteurs d’écran le lisent, et il s’affiche en infobulle au survol. La couleur n’est jamais le seul porteur de sens : chaque pastille a son dessin, et le libellé complet de la forme reste visible.',
      },
      { type: 'h2', title: '6. Ce que les icônes ne disent pas' },
      {
        type: 'list',
        items: [
          'Elles ne remplacent pas la fiche officielle ni le résumé des caractéristiques du produit : la voie réellement autorisée y est précisée.',
          'Elles ne donnent aucune posologie ni indication.',
          'C’est un premier jet : le trait est à harmoniser par un graphiste, les pastilles des voies rectale et vaginale sont à tester auprès des utilisateurs, et quelques voies rares (péridurale, intrathécale…) partagent encore la pastille « autre voie ».',
          'Les textes alternatifs en arabe attendent la relecture d’un pharmacien arabophone.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Une forme mal reconnue, une icône qui vous paraît inexacte, une voie à ajouter ? Signalez-le depuis la page de contact : les règles de reconnaissance reposent sur les libellés réels de la nomenclature et s’améliorent avec les retours des professionnels.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Les icônes aident à repérer une présentation. Elles ne remplacent ni l’ordonnance, ni l’avis du médecin ou du pharmacien.',
      },
    ],
  },
  {
    slug: 'icones-forme-voie-administration-medicament-algerie-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'جديد DwaDZ: أيقونات تُظهر الشكل الصيدلاني وطريقة الإعطاء من النظرة الأولى',
    subtitle: 'وعاء يرسم الشكل، وشارة ملوّنة لطريقة الإعطاء، وعلامة صغيرة للخصوصيات: ماذا تُظهر الأيقونات، وأين تجدها، وما حدودها',
    description:
      'يعرض DwaDZ الآن أيقونة أمام كل شكل صيدلاني: الوعاء (قرص، كبسولة، شراب، حقنة…)، وشارة لطريقة الإعطاء، وعلامات للتحرير الممتد أو القابل للقسمة أو الذي يُحضَّر قبل الاستعمال. أين تراها، وكيف تقرؤها، ومن أين تأتي طريقة الإعطاء، وما الذي لا تقوله.',
    seoTitle: 'أيقونات الشكل الصيدلاني وطريقة الإعطاء: جديد DwaDZ',
    seoKeywords: ['أيقونة الشكل الصيدلاني', 'طريقة الإعطاء', 'الشكل الصيدلاني الدواء الجزائر', 'المدونة الصيدلانية الجزائرية', 'EDQM الشكل الطريقة', 'بطاقة الدواء الجزائر', 'قرص كبسولة شراب حقنة'],
    date: '2026-11-13',
    readingTime: 6,
    image: 'icones-formes.png',
    tags: ['جديد', 'الشكل الصيدلاني', 'طريقة الإعطاء', 'EDQM', 'المدونة', 'أدوات'],
    faq: [
      {
        question: 'هل تحلّ الأيقونة محل تسمية الشكل؟',
        answer: 'لا. تبقى تسمية المدونة ظاهرة دائمًا بجانبها. الأيقونة تكمّلها لتتعرّف على الشكل وطريقة الإعطاء دون قراءة، خاصة في القوائم الطويلة.',
      },
      {
        question: 'من أين تأتي طريقة الإعطاء المعروضة على الأيقونة؟',
        answer: 'في بطاقة الدواء تأتي من رمز EDQM الخاص بالبطاقة. أما في القوائم (بطاقات البحث، والمرشحات، وجداول عروض العلامة التجارية) فتُستنتج من تسمية الشكل: قطرة العين تعني الاستعمال في العين، والتحميلة تعني الشرج. ولا تتضمن المدونة الرسمية عمودًا لـ«طريقة الإعطاء»، لذلك تبقى الشارة إشارة للقراءة تُؤكَّد في البطاقة وفي ملخص خصائص المنتج.',
      },
      {
        question: 'لماذا تحمل بعض الأشكال أيقونة عامة؟',
        answer: 'لأن مجموعة الأيقونات مسودة أولى: 29 شكلًا و15 طريقة و6 علامات خاصة. بعض الأشكال النادرة (محاليل الغسيل، التقطير داخل القصبة الهوائية…) وبعض الطرق (فوق الجافية، داخل القراب، داخل الجسم الزجاجي…) ليس لها رسم خاص بعد، فتأخذ أيقونة عامة أو شارة «طريق آخر»، وتبقى التسمية الكاملة ظاهرة.',
      },
      {
        question: 'ماذا تعني ألوان الشارات؟',
        answer: 'اللون يدل على عائلة الطريقة (الفم بالأخضر، والحقن بالأحمر، والعين والأذن بالأزرق، والجلد بالبني، والشرج والمهبل بالبنفسجي المحمرّ) والرسم يحدد الطريقة. مرّر المؤشر على الأيقونة أو اقرأ نصها البديل: الشكل والطريقة والخصوصيات مكتوبة صراحة بالفرنسية أو بالعربية حسب لغة الموقع.',
      },
      {
        question: 'هل تعطي الأيقونات معلومة عن الجرعة أو الاستعمال؟',
        answer: 'لا. إنها تصف العرض (الشكل، والطريقة، وخصوصيات التحرير أو التحضير). ولا تعطي أي إشارة علاجية ولا جرعة ولا نصيحة طبية: المرجع هو البطاقة الرسمية وملخص خصائص المنتج ورأي الطبيب أو الصيدلي.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'قائمة الأدوية سرعان ما تصبح عمودًا من الأشكال المكتوبة بأحرف كبيرة: «COMPRIME PELLICULE SECABLE» و«POUDRE POUR SUSPENSION BUVABLE» و«SOLUTION INJECTABLE». يضيف DwaDZ الآن أمام كل شكل أيقونة تبيّن من النظرة الأولى ما هو الشكل وكيف يُعطى الدواء. وتبقى التسمية موجودة: الأيقونة تكمّلها ولا تحلّ محلها.',
      },
      { type: 'h2', title: '1. كيف تقرأ الأيقونة' },
      {
        type: 'paragraph',
        text: 'تتكوّن كل أيقونة من ثلاثة مستويات. **الوعاء** يرسم الشكل الصيدلاني: قرص، كبسولة، قارورة شراب، حقنة، أنبوب، تحميلة… و**شارة الطريقة** في الأسفل تبيّن طريقة الإعطاء: لونها يدل على العائلة (الفم، الحقن، العين والأذن، الجلد، الشرج والمهبل) ورسمها يحدد الطريقة. وأخيرًا **علامات صغيرة** في الأعلى تشير إلى خصوصية: تحرير ممتد أو معدّل، مقاوم للحموضة المعدية، قابل للقسمة، يُحضَّر قبل الاستعمال، يُخفَّف، موجّه للأطفال.',
      },
      {
        type: 'image',
        src: '/articles/icones/anatomie-icone.png',
        width: 1428,
        height: 480,
        alt: 'أيقونة قرص ذي تحرير ممتد، مع شارة خضراء لطريقة الفم في الأسفل وعلامة ساعة صغيرة في الأعلى، مع شرح المستويات الثلاثة: الوعاء وشارة الطريقة وعلامة الخصوصية',
        caption: 'المستويات الثلاثة للأيقونة: الوعاء (الشكل)، وشارة الطريقة، وعلامة الخصوصية.',
      },
      {
        type: 'paragraph',
        text: 'تضم المجموعة 29 رسمًا للأشكال و15 شارة للطرق و6 علامات. ومن الأشكال الشائعة: القرص (العادي، أو الذي يُذاب أو يُمضغ أو سريع الذوبان)، والكبسولة، والكبسولة الهلامية اللينة، والكيس، والمسحوق الذي يُحضَّر قبل الاستعمال، والسائل للشرب، والقطرات، والبخاخ، وجهاز الاستنشاق، والحقنة، والقلم، وقارورة الحقن، والتسريب، والكريم أو المرهم، والتحميلة، والبويضة المهبلية، واللصقة، ومحلول الغسيل.',
      },
      {
        type: 'image',
        src: '/articles/icones/galerie-formes.png',
        width: 1428,
        height: 522,
        alt: 'تسعة أمثلة لأيقونات مع تسمياتها: قرص مغلّف وكبسولة وشراب عن طريق الفم، وقطرة عين، ومحلول للحقن تحت الجلد، وتحميلة، وكريم للجلد، وبويضة مهبلية، وقرص قابل للقسمة',
        caption: 'بعض أشكال المدونة مع شارة طريقة الإعطاء. تبقى التسمية ظاهرة دائمًا بجانب الأيقونة.',
      },
      { type: 'h2', title: '2. أين تجدها' },
      {
        type: 'list',
        items: [
          '**بطاقة الدواء**: بجانب العنوان (أيقونة كبيرة كاملة)، وفي سطر «الشكل الصيدلاني» من جدول الخصائص، وأمام كل طريقة إعطاء، وفي الشريط الجانبي «الشكل / الجرعة».',
          '**نتائج البحث**: على كل بطاقة دواء، بدل الرمز العام القديم.',
          '**مرشحات البحث**: أمام كل شكل وكل طريقة مقترحة، فيسهل التعرّف على «الحقن» أو «قطرة العين» دون قراءة القائمة كلها.',
          '**صفحات العلامة التجارية**: في جدول العروض (الشكل والجرعة والمخبر).',
          '**صفحات «الشكل»**: أيقونة كبيرة في رأس الصفحة للشكل المختار.',
          '**المصطلحات**: أمام أشكال وطرق EDQM في المرجع.',
        ],
      },
      { type: 'h2', title: '3. من أين تأتي طريقة الإعطاء' },
      {
        type: 'paragraph',
        text: 'هذه هي النقطة التي ينبغي معرفتها لتفسير الشارة تفسيرًا صحيحًا. لا تتضمن المدونة الوطنية عمودًا لـ«طريقة الإعطاء»: يربطها DwaDZ بالشكل بفضل مصطلحات EDQM (Standard Terms الصادرة عن المديرية الأوروبية لجودة الأدوية)، وهي نفسها التي تأتي منها الرموز المعروضة في البطاقات.',
      },
      {
        type: 'table',
        headers: ['المكان', 'مصدر شارة الطريقة'],
        rows: [
          { cells: ['بطاقة الدواء', 'رمز EDQM الخاص بالبطاقة: إذا حملت البطاقة عدة طرق ظهرت كلها.'] },
          { cells: ['بطاقات البحث والمرشحات وجداول العلامة التجارية', 'تسمية الشكل: قطرة العين تعني العين، والتحميلة تعني الشرج، والشراب يعني الفم.'] },
          { cells: ['شكل بلا طريقة معروفة', 'لا شارة، أو شارة «طريق آخر»: انظر البطاقة.'] },
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'حين لا تكفي التسمية (فـ«المحلول للحقن» قد يُعطى في الوريد أو العضل أو تحت الجلد) لا تحسم القائمة الأمر: البطاقة وحدها، برمز EDQM الخاص بها، تحدد الطريقة. وفي مرشح الطرق تُمثَّل مجموعة «الحقن» بحقنة بدل طريقة محددة.',
      },
      { type: 'h2', title: '4. علامات الخصوصية' },
      {
        type: 'table',
        headers: ['العلامة', 'ما تدل عليه', 'مثال على التسمية'],
        rows: [
          { cells: ['ساعة', 'تحرير ممتد أو معدّل', 'COMPRIME PELLICULE A LIBERATION PROLONGEE'] },
          { cells: ['مقاوم للحموضة', 'طلاء يقاوم حموضة المعدة', 'COMPRIME GASTRO-RESISTANT'] },
          { cells: ['قابل للقسمة', 'قرص يمكن تقسيمه عند خط القسمة', 'COMPRIME SECABLE'] },
          { cells: ['يُحضَّر قبل الاستعمال', 'مسحوق أو مجفف بالتجميد يُحضَّر قبل الاستعمال', 'POUDRE POUR SUSPENSION BUVABLE'] },
          { cells: ['يُخفَّف', 'محلول مركّز يُخفَّف', 'SOLUTION A DILUER POUR PERFUSION'] },
          { cells: ['طفل', 'شكل موجّه للطفل أو الرضيع', 'SIROP NOURRISSON'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'تُكتشف هذه العلامات من تسمية الشكل. وتحت 28 بكسل لا تعود مقروءة، فلا يُعرض حينئذ إلا الوعاء وطريقة الإعطاء.',
      },
      { type: 'h2', title: '5. إمكانية الوصول واللغات' },
      {
        type: 'paragraph',
        text: 'تحمل كل أيقونة نصًا بديلًا: «قرص، عن طريق الفم، تحرير ممتد أو معدّل» بالعربية حين يكون الموقع بالعربية، ويقابله بالفرنسية. تقرؤه قارئات الشاشة، ويظهر في إطار منبثق عند المرور بالمؤشر. ولا يكون اللون وحده حاملًا للمعنى: لكل شارة رسمها، وتبقى تسمية الشكل كاملة ظاهرة.',
      },
      { type: 'h2', title: '6. ما لا تقوله الأيقونات' },
      {
        type: 'list',
        items: [
          'لا تحل محل البطاقة الرسمية ولا ملخص خصائص المنتج: فيهما تُحدَّد الطريقة المرخّص بها فعلًا.',
          'لا تعطي أي جرعة ولا إشارة علاجية.',
          'هي مسودة أولى: الخط يحتاج إلى تنسيق من مصمم، وشارتا الشرج والمهبل بحاجة إلى اختبار مع المستخدمين، وبعض الطرق النادرة (فوق الجافية، داخل القراب…) ما زالت تشترك في شارة «طريق آخر».',
          'النصوص البديلة بالعربية تنتظر مراجعة صيدلاني ناطق بالعربية.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'شكل لم يُتعرَّف عليه جيدًا، أو أيقونة تبدو لك غير دقيقة، أو طريقة ينبغي إضافتها؟ أبلغنا عبر صفحة الاتصال: تقوم قواعد التعرّف على تسميات المدونة الفعلية وتتحسن بملاحظات المهنيين.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'تساعد الأيقونات على تمييز العرض. ولا تغني عن الوصفة ولا عن رأي الطبيب أو الصيدلي.',
      },
    ],
  },
]
