import type { Article } from './articles'

/**
 * Sélection d'articles pédagogiques sur les terminologies (FR + AR) :
 *   1. définitions : terminologie, classification, nomenclature, thésaurus, ontologie ;
 *   2. l'ATC : qui la publie, comment elle est construite, à quoi elle sert (et à quoi non) ;
 *   3. EDQM et UCUM : le vocabulaire normalisé des formes, des voies et des unités.
 * À garder aligné sur : lib/edqm*.ts, lib/ucum.ts (codes cités), sql/04_atc_codes.sql et data/atc (niveaux, libellés),
 * app/classes-therapeutiques (pages de classe), components/ui/FormeIcon.tsx (icônes).
 * Visuels : public/articles/terminologies/ ; vignette de partage : assets/articles/atc-niveaux.png.
 * Les nombres de codes ATC sont ceux du fichier ATC 2026 chargé sur le site : à rafraîchir à chaque nouvelle version.
 */
export const ARTICLES_TERMINOLOGIES: Article[] = [
  // ─────────────────────────────── 1. DÉFINITIONS (FR) ───────────────────────────────
  {
    slug: 'terminologie-classification-nomenclature-definitions-medicament',
    lang: 'fr',
    audience: 'professionnel',
    title: 'Terminologie, classification, nomenclature : de quoi parle-t-on quand on parle de médicaments ?',
    subtitle: 'Des définitions simples, des exemples du monde du médicament, et la façon dont ces notions se combinent sur une fiche DwaDZ',
    description:
      'Qu’est-ce qu’une terminologie, une classification, une nomenclature, un thésaurus, une ontologie ? Définitions claires avec des exemples (ATC, EDQM, UCUM, MedDRA, CIM, Thesaurus ANSM, nomenclature nationale) et leur rôle concret dans une fiche de médicament.',
    seoTitle: 'Terminologie, classification, nomenclature : définitions et exemples en pharmacie',
    seoKeywords: ['définition terminologie', 'définition classification', 'nomenclature pharmaceutique', 'terminologie médicale', 'vocabulaire contrôlé', 'ATC EDQM UCUM', 'thésaurus ontologie différence'],
    date: '2026-11-13',
    readingTime: 7,
    tags: ['Terminologies', 'Définitions', 'Classification', 'Nomenclature', 'Pédagogie'],
    faq: [
      {
        question: 'Quelle différence entre une terminologie et une classification ?',
        answer: 'Une terminologie rassemble des termes qui désignent des concepts (« comprimé pelliculé », « voie orale ») ; chaque concept a un code et des libellés, éventuellement en plusieurs langues. Une classification range des éléments dans des classes selon un critère (ici : l’usage thérapeutique et la nature chimique pour l’ATC). La première sert à nommer sans ambiguïté, la seconde à regrouper pour compter, comparer et retrouver.',
      },
      {
        question: 'La nomenclature nationale est-elle une terminologie ou une classification ?',
        answer: 'Ni l’une ni l’autre au sens strict : c’est la liste officielle des produits pharmaceutiques enregistrés, avec leurs caractéristiques (DCI, nom, forme, dosage, laboratoire, statut). Les libellés y sont saisis en texte libre, ce qui explique les variantes d’écriture. C’est pourquoi on la relie à de vraies terminologies et à une classification (EDQM, UCUM, ATC).',
      },
      {
        question: 'Un code est-il la même chose qu’un terme ?',
        answer: 'Non. Le terme est le libellé que l’on lit, qui change avec la langue (« voie orale », « oral use », « عن طريق الفم »). Le code (par exemple 20053000) désigne le concept, il ne change pas d’une langue à l’autre. C’est le code qui permet à deux systèmes de se comprendre.',
      },
      {
        question: 'Faut-il connaître ces notions pour utiliser DwaDZ ?',
        answer: 'Non, tout fonctionne sans. Elles expliquent simplement pourquoi la fiche affiche des codes EDQM, UCUM ou ATC à côté des libellés, et comment les icônes, les filtres et les classes thérapeutiques s’appuient dessus.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Sur une fiche de médicament, on croise des mots qui se ressemblent : terminologie, classification, nomenclature, codes, référentiels. Ils ne désignent pas la même chose, et les confondre brouille la lecture de beaucoup d’outils pharmaceutiques. Cet article pose des définitions simples, avec des exemples tirés du médicament, et montre comment elles s’articulent sur une fiche DwaDZ.',
      },
      { type: 'h2', title: '1. Le point de départ : un concept, un terme, un code' },
      {
        type: 'paragraph',
        text: 'Un **concept** est une idée précise : par exemple « administré par la bouche ». Un **terme** est un mot ou une expression qui le désigne : « voie orale », « oral use », « عن طريق الفم ». Un **code** est l’identifiant stable du concept, indépendant de la langue : 20053000 dans la liste EDQM des voies d’administration. Un même concept peut avoir plusieurs termes (synonymes, langues), mais un seul code. Tout ce qui suit repose sur cette distinction.',
      },
      { type: 'h2', title: '2. Qu’est-ce qu’une terminologie ?' },
      {
        type: 'paragraph',
        text: 'Une terminologie est un ensemble structuré de termes qui désignent les concepts d’un domaine, avec leur définition et leur code. Elle répond à la question : **comment appelle-t-on cela, sans ambiguïté ?** Son but est que « comprimé pelliculé », « film-coated tablet » et « قرص مغلّف » renvoient à la même chose pour un pharmacien, un logiciel et une agence de régulation.',
      },
      {
        type: 'list',
        items: [
          '**EDQM Standard Terms** : formes pharmaceutiques, voies et méthodes d’administration, conditionnements (voir l’article dédié).',
          '**UCUM** : codes des unités de mesure (mg, mL, UI…), conçus pour être lus par les machines.',
          '**MedDRA** : terminologie des événements indésirables utilisée en pharmacovigilance.',
          '**SNOMED CT**, **LOINC** : terminologies cliniques et de biologie, pour le dossier patient.',
        ],
      },
      { type: 'h2', title: '3. Qu’est-ce qu’une classification ?' },
      {
        type: 'paragraph',
        text: 'Une classification range des éléments dans des classes, selon un ou plusieurs critères, en général sous forme de hiérarchie. Elle répond à la question : **dans quel groupe place-t-on cela, pour compter, comparer et retrouver ?** Une bonne classification suit des règles : chaque élément a une place, les classes d’un même niveau ne se chevauchent pas, et les niveaux s’emboîtent du général au précis.',
      },
      {
        type: 'list',
        items: [
          '**ATC** (OMS) : classe les substances actives selon l’organe ou le système visé, l’usage thérapeutique et la nature chimique (voir l’article dédié).',
          '**CIM-10 / CIM-11** (OMS) : classent les maladies et les causes de décès.',
          '**Classification des formes** : regrouper « comprimé », « comprimé pelliculé », « comprimé sécable » sous « comprimés » est aussi un classement.',
        ],
      },
      {
        type: 'table',
        headers: ['', 'Terminologie', 'Classification'],
        rows: [
          { cells: ['Question', 'Comment nomme-t-on ce concept ?', 'Dans quelle classe range-t-on cet élément ?'] },
          { cells: ['Unité de base', 'Le concept (code + termes)', 'La classe (code hiérarchique)'] },
          { cells: ['Structure', 'Liste, parfois avec des liens entre concepts', 'Hiérarchie de classes emboîtées'] },
          { cells: ['Usage', 'Écrire et échanger sans ambiguïté, traduire', 'Regrouper, compter, comparer, filtrer'] },
          { cells: ['Exemple', 'EDQM : « comprimé pelliculé » = 10221000', 'ATC : metformine = A10BA02'] },
        ],
      },
      { type: 'h2', title: '4. Et la nomenclature ?' },
      {
        type: 'paragraph',
        text: 'Dans le monde pharmaceutique algérien, « nomenclature » désigne la **liste officielle des produits pharmaceutiques enregistrés** publiée par le Ministère de l’Industrie Pharmaceutique : pour chaque produit, la DCI, le nom commercial, la forme, le dosage, le conditionnement, le laboratoire, le pays, le statut. C’est un registre de produits. Ce n’est ni une terminologie (les libellés y sont saisis à la main, avec des variantes : « COMPRIME PELLICULE », « COMP. PELL. »…), ni une classification (elle ne range pas les produits dans des classes thérapeutiques).',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'C’est précisément parce que la nomenclature est un registre en texte libre que l’on a besoin de la rattacher à de vraies terminologies et à une classification : on y retrouve alors le même produit quelle que soit l’écriture du libellé.',
      },
      { type: 'h2', title: '5. Les voisins : vocabulaire contrôlé, thésaurus, ontologie, référentiel' },
      {
        type: 'table',
        headers: ['Mot', 'Ce que c’est, en une phrase'],
        rows: [
          { cells: ['Vocabulaire contrôlé', 'Une liste fermée de termes autorisés : on choisit dedans, on n’invente pas. C’est le principe d’une terminologie utilisée en saisie.'] },
          { cells: ['Thésaurus', 'Un vocabulaire contrôlé organisé par des relations (plus large, plus étroit, synonyme), comme MeSH pour la littérature médicale. Au sens courant, le « Thesaurus des interactions médicamenteuses » de l’ANSM désigne autre chose : un catalogue de classes et de règles d’interaction.'] },
          { cells: ['Ontologie', 'Un modèle formel des concepts d’un domaine et des relations entre eux (« est un », « a pour substance »), que des logiciels peuvent interroger et raisonner dessus.'] },
          { cells: ['Référentiel', 'Terme générique : un ensemble de références communes à utiliser. Une terminologie ou une classification en est un.'] },
        ],
      },
      { type: 'h2', title: '6. Sur une fiche DwaDZ, tout se combine' },
      {
        type: 'paragraph',
        text: 'Prenons la fiche d’un comprimé pelliculé de metformine. La **nomenclature** fournit le registre : nom, DCI, forme écrite par le laboratoire, dosage, statut. La **terminologie EDQM** rattache la forme à un concept normalisé et donne la voie d’administration : c’est ce qui permet l’icône et le filtre « voie orale ». **UCUM** normalise l’unité du dosage. La **classification ATC** range la substance : A10BA02, dans les médicaments du diabète, ce qui ouvre la page de la classe et ses autres substances.',
      },
      {
        type: 'table',
        headers: ['Ce que l’on voit', 'Ce qui le fournit', 'Nature'],
        rows: [
          { cells: ['Nom, DCI, laboratoire, statut', 'Nomenclature nationale (MIPH)', 'Registre de produits'] },
          { cells: ['Forme et voie d’administration', 'EDQM Standard Terms', 'Terminologie'] },
          { cells: ['Unité du dosage (mg, mL…)', 'UCUM', 'Terminologie des unités'] },
          { cells: ['Classe thérapeutique', 'ATC (OMS)', 'Classification'] },
        ],
      },
      { type: 'h2', title: '7. À retenir' },
      {
        type: 'list',
        items: [
          'Une **terminologie** nomme les concepts de façon stable ; une **classification** les range pour regrouper et compter.',
          'Le **code** désigne le concept ; les **termes** changent avec la langue.',
          'La **nomenclature** est un registre de produits, pas une terminologie : on la complète par des référentiels.',
          'Un rattachement automatique à un code est une aide de lecture : en cas de doute, la fiche officielle fait foi.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Ces référentiels servent à retrouver et organiser l’information. Ils ne remplacent ni l’ordonnance, ni l’avis du médecin ou du pharmacien.',
      },
    ],
  },
  // ─────────────────────────────── 1. DÉFINITIONS (AR) ───────────────────────────────
  {
    slug: 'terminologie-classification-nomenclature-definitions-medicament-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'المصطلحات والتصنيف والمدونة: عن ماذا نتحدث حين نتحدث عن الأدوية؟',
    subtitle: 'تعريفات بسيطة، وأمثلة من عالم الدواء، وكيف تجتمع هذه المفاهيم في بطاقة DwaDZ',
    description:
      'ما هي المصطلحات (terminology)، والتصنيف (classification)، والمدونة (nomenclature)، والمكنز (thesaurus)، والأنطولوجيا؟ تعريفات واضحة بأمثلة (ATC وEDQM وUCUM وMedDRA وCIM ومكنز ANSM والمدونة الوطنية) ودورها الملموس في بطاقة الدواء.',
    seoTitle: 'المصطلحات والتصنيف والمدونة: تعريفات وأمثلة في الصيدلة',
    seoKeywords: ['تعريف المصطلحات', 'تعريف التصنيف', 'المدونة الصيدلانية', 'المصطلحات الطبية', 'المفردات المضبوطة', 'ATC EDQM UCUM', 'الفرق بين المكنز والأنطولوجيا'],
    date: '2026-11-13',
    readingTime: 7,
    tags: ['المصطلحات', 'تعريفات', 'التصنيف', 'المدونة', 'تبسيط'],
    faq: [
      {
        question: 'ما الفرق بين المصطلحات والتصنيف؟',
        answer: 'المصطلحات (terminology) مجموعة ألفاظ تدل على مفاهيم («قرص مغلّف»، «عن طريق الفم»)، ولكل مفهوم رمز وتسميات، وربما بعدة لغات. أما التصنيف فيضع العناصر في فئات وفق معيار (في ATC: الاستعمال العلاجي والطبيعة الكيميائية). الأولى للتسمية دون لبس، والثاني للتجميع والعدّ والمقارنة والبحث.',
      },
      {
        question: 'هل المدونة الوطنية مصطلحات أم تصنيف؟',
        answer: 'لا هذا ولا ذاك بالمعنى الدقيق: هي القائمة الرسمية للمنتجات الصيدلانية المسجلة بخصائصها (الاسم الدولي، الاسم التجاري، الشكل، الجرعة، المخبر، الحالة). وتُدخَل التسميات فيها نصًّا حرًّا، ولذلك تتعدد صيغ الكتابة. ومن ثَمَّ تُربط بمصطلحات حقيقية وبتصنيف (EDQM وUCUM وATC).',
      },
      {
        question: 'هل الرمز هو نفسه المصطلح؟',
        answer: 'لا. المصطلح هو التسمية التي نقرؤها وتتغير بتغير اللغة («voie orale» و«oral use» و«عن طريق الفم»). أما الرمز (مثل 20053000) فيدل على المفهوم ولا يتغير بين اللغات. والرمز هو ما يتيح لنظامين أن يتفاهما.',
      },
      {
        question: 'هل يلزم فهم هذه المفاهيم لاستعمال DwaDZ؟',
        answer: 'لا، فكل شيء يعمل بدونها. وهي تشرح فقط لماذا تعرض البطاقة رموز EDQM أو UCUM أو ATC بجانب التسميات، وكيف تعتمد الأيقونات والمرشحات والأصناف العلاجية عليها.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'في بطاقة الدواء نصادف ألفاظًا متشابهة: مصطلحات، تصنيف، مدونة، رموز، مراجع. وهي لا تعني الشيء نفسه، والخلط بينها يُربك قراءة كثير من الأدوات الصيدلانية. يضع هذا المقال تعريفات بسيطة بأمثلة من الدواء، ويبيّن كيف تتكامل في بطاقة DwaDZ.',
      },
      { type: 'h2', title: '1. نقطة الانطلاق: مفهوم، ومصطلح، ورمز' },
      {
        type: 'paragraph',
        text: '**المفهوم** فكرة محددة، مثل «يُعطى عن طريق الفم». و**المصطلح** لفظ أو عبارة تدل عليه: «voie orale» أو «oral use» أو «عن طريق الفم». و**الرمز** هو المعرّف الثابت للمفهوم بصرف النظر عن اللغة: 20053000 في قائمة EDQM لطرق الإعطاء. وقد يكون للمفهوم الواحد عدة مصطلحات (مرادفات، لغات) لكن له رمز واحد. وكل ما يلي مبني على هذا التمييز.',
      },
      { type: 'h2', title: '2. ما هي المصطلحات (terminology)؟' },
      {
        type: 'paragraph',
        text: 'المصطلحات مجموعة منظَّمة من الألفاظ التي تدل على مفاهيم مجال ما، مع تعريفها ورمزها. وهي تجيب عن سؤال: **كيف نسمّي هذا دون لبس؟** هدفها أن يدل «comprimé pelliculé» و«film-coated tablet» و«قرص مغلّف» على الشيء نفسه عند الصيدلاني والبرنامج والوكالة التنظيمية.',
      },
      {
        type: 'list',
        items: [
          '**EDQM Standard Terms**: الأشكال الصيدلانية وطرق الإعطاء وأساليبه والتعبئة (انظر المقال المخصص).',
          '**UCUM**: رموز وحدات القياس (mg وmL وUI…) المصمَّمة لتقرأها الآلات.',
          '**MedDRA**: مصطلحات الأحداث السلبية المستعملة في اليقظة الدوائية.',
          '**SNOMED CT** و**LOINC**: مصطلحات سريرية ومخبرية لملف المريض.',
        ],
      },
      { type: 'h2', title: '3. ما هو التصنيف (classification)؟' },
      {
        type: 'paragraph',
        text: 'يضع التصنيف العناصر في فئات وفق معيار أو أكثر، وغالبًا في شكل هرمي. وهو يجيب عن سؤال: **في أي مجموعة نضع هذا، لنعدّ ونقارن ونجد؟** والتصنيف الجيد له قواعد: لكل عنصر مكان، ولا تتداخل فئات المستوى الواحد، وتتدرج المستويات من العام إلى الدقيق.',
      },
      {
        type: 'list',
        items: [
          '**ATC** (منظمة الصحة العالمية): يصنّف المواد الفعالة بحسب العضو أو الجهاز المستهدف والاستعمال العلاجي والطبيعة الكيميائية (انظر المقال المخصص).',
          '**CIM-10 / CIM-11** (منظمة الصحة العالمية): تصنّف الأمراض وأسباب الوفاة.',
          '**تصنيف الأشكال**: جمع «قرص» و«قرص مغلّف» و«قرص قابل للقسمة» تحت «الأقراص» تصنيف أيضًا.',
        ],
      },
      {
        type: 'table',
        headers: ['', 'المصطلحات', 'التصنيف'],
        rows: [
          { cells: ['السؤال', 'كيف نسمّي هذا المفهوم؟', 'في أي فئة نضع هذا العنصر؟'] },
          { cells: ['الوحدة الأساسية', 'المفهوم (رمز + مصطلحات)', 'الفئة (رمز هرمي)'] },
          { cells: ['البنية', 'قائمة، وأحيانًا بعلاقات بين المفاهيم', 'هرم من الفئات المتداخلة'] },
          { cells: ['الاستعمال', 'الكتابة والتبادل دون لبس، والترجمة', 'التجميع والعدّ والمقارنة والتصفية'] },
          { cells: ['مثال', 'EDQM: «قرص مغلّف» = 10221000', 'ATC: الميتفورمين = A10BA02'] },
        ],
      },
      { type: 'h2', title: '4. وماذا عن المدونة (nomenclature)؟' },
      {
        type: 'paragraph',
        text: 'في العالم الصيدلاني الجزائري تعني «المدونة» **القائمة الرسمية للمنتجات الصيدلانية المسجلة** التي تنشرها وزارة الصناعة الصيدلانية: لكل منتج الاسم الدولي والاسم التجاري والشكل والجرعة والتعبئة والمخبر والبلد والحالة. إنها سجلّ منتجات. وليست مصطلحات (فالتسميات تُدخَل يدويًّا بصيغ متعددة: «COMPRIME PELLICULE» و«COMP. PELL.»…)، وليست تصنيفًا (فهي لا تضع المنتجات في أصناف علاجية).',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'لأن المدونة سجلّ بنص حر تحديدًا، نحتاج إلى ربطها بمصطلحات حقيقية وبتصنيف: فنجد المنتج نفسه مهما اختلفت كتابة التسمية.',
      },
      { type: 'h2', title: '5. الجيران: المفردات المضبوطة، والمكنز، والأنطولوجيا، والمرجع' },
      {
        type: 'table',
        headers: ['اللفظ', 'ما هو في جملة'],
        rows: [
          { cells: ['المفردات المضبوطة', 'قائمة مغلقة من الألفاظ المسموح بها: نختار منها ولا نبتكر. وهذا مبدأ المصطلحات حين تُستعمل في الإدخال.'] },
          { cells: ['المكنز (thesaurus)', 'مفردات مضبوطة منظَّمة بعلاقات (أعم، أخص، مرادف)، مثل MeSH للأدبيات الطبية. أما «Thesaurus des interactions médicamenteuses» الصادر عن ANSM فيدل في الاستعمال الشائع على شيء آخر: فهرس لأصناف وقواعد التداخل.'] },
          { cells: ['الأنطولوجيا', 'نموذج رسمي لمفاهيم مجال ما والعلاقات بينها («هو نوع من»، «مادته الفعالة»)، يمكن للبرامج أن تستعلم عنه وتستنتج منه.'] },
          { cells: ['المرجع', 'لفظ عام: مجموعة مراجع مشتركة يُعتمد عليها. والمصطلحات والتصنيف كلاهما مرجع.'] },
        ],
      },
      { type: 'h2', title: '6. في بطاقة DwaDZ كل شيء يجتمع' },
      {
        type: 'paragraph',
        text: 'لنأخذ بطاقة قرص مغلّف من الميتفورمين. **المدونة** تعطي السجل: الاسم والمادة الفعالة والشكل كما كتبه المخبر والجرعة والحالة. و**مصطلحات EDQM** تربط الشكل بمفهوم موحَّد وتعطي طريقة الإعطاء: وبذلك تُرسم الأيقونة ويعمل مرشح «عن طريق الفم». و**UCUM** يوحّد وحدة الجرعة. و**تصنيف ATC** يضع المادة في مكانها: A10BA02، ضمن أدوية السكري، فتُفتح صفحة الصنف وموادّه الأخرى.',
      },
      {
        type: 'table',
        headers: ['ما نراه', 'ما يوفّره', 'طبيعته'],
        rows: [
          { cells: ['الاسم والمادة الفعالة والمخبر والحالة', 'المدونة الوطنية (وزارة الصناعة الصيدلانية)', 'سجلّ منتجات'] },
          { cells: ['الشكل وطريقة الإعطاء', 'EDQM Standard Terms', 'مصطلحات'] },
          { cells: ['وحدة الجرعة (mg وmL…)', 'UCUM', 'مصطلحات الوحدات'] },
          { cells: ['الصنف العلاجي', 'ATC (منظمة الصحة العالمية)', 'تصنيف'] },
        ],
      },
      { type: 'h2', title: '7. للتذكير' },
      {
        type: 'list',
        items: [
          '**المصطلحات** تسمّي المفاهيم تسمية ثابتة؛ و**التصنيف** يضعها في فئات للتجميع والعدّ.',
          '**الرمز** يدل على المفهوم؛ و**المصطلحات** تتغير بتغير اللغة.',
          '**المدونة** سجلّ منتجات لا مصطلحات: وتُستكمل بمراجع.',
          'الربط التلقائي برمز ما عون على القراءة: وعند الشك تبقى البطاقة الرسمية هي المرجع.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'هذه المراجع تخدم البحث عن المعلومة وتنظيمها. ولا تغني عن الوصفة ولا عن رأي الطبيب أو الصيدلي.',
      },
    ],
  },
  // ─────────────────────────────── 2. ATC (FR) ───────────────────────────────
  {
    slug: 'atc-classification-anatomique-therapeutique-chimique-explication',
    lang: 'fr',
    audience: 'professionnel',
    title: 'C’est quoi l’ATC ? Qui la publie, comment la lire, à quoi elle sert (et à quoi elle ne sert pas)',
    subtitle: 'La classification Anatomique, Thérapeutique et Chimique de l’OMS expliquée pas à pas, avec la metformine comme fil rouge',
    description:
      'L’ATC range chaque substance dans un code de 7 caractères en cinq niveaux. Qui la publie (le centre collaborateur OMS d’Oslo), comment lire un code, ce que sont les DDD, à quoi sert l’ATC (statistiques, pharmacovigilance, classes thérapeutiques, interactions, allergies) et ses limites, avec les usages sur DwaDZ.',
    seoTitle: 'C’est quoi l’ATC ? Classification anatomique, thérapeutique et chimique : mode d’emploi',
    seoKeywords: ['ATC classification médicament', 'code ATC définition', 'classification anatomique thérapeutique chimique', 'OMS ATC DDD', 'code ATC niveau 5', 'classes thérapeutiques Algérie', 'A10BA02 metformine'],
    date: '2026-11-13',
    readingTime: 9,
    image: 'atc-niveaux.png',
    tags: ['ATC', 'Classification', 'OMS', 'Terminologies', 'Pédagogie', 'Classes thérapeutiques'],
    faq: [
      {
        question: 'Qui publie l’ATC ?',
        answer: 'L’ATC est développée et mise à jour par le centre collaborateur de l’OMS pour la méthodologie des statistiques sur les médicaments (WHO Collaborating Centre for Drug Statistics Methodology), basé à Oslo, en Norvège, au sein de l’Institut norvégien de santé publique. Les modifications sont examinées par un groupe d’experts et publiées une fois par an. La version de référence est en anglais.',
      },
      {
        question: 'Un médicament a-t-il un code ATC ?',
        answer: 'Ce sont les substances actives (et certaines associations) qui ont un code ATC, pas les marques. Toutes les spécialités à base de metformine seule partagent donc A10BA02. Une même substance peut avoir plusieurs codes quand ses usages diffèrent : le salbutamol a un code pour la voie inhalée (R03AC02) et un autre pour la voie systémique (R03CC02).',
      },
      {
        question: 'Le code ATC indique-t-il l’indication du médicament ?',
        answer: 'Il indique l’usage thérapeutique principal retenu pour la classification, pas l’indication autorisée ni toutes les utilisations. Il ne dit rien de l’efficacité, de la sécurité ou de l’équivalence entre deux substances d’une même classe. La référence reste le résumé des caractéristiques du produit.',
      },
      {
        question: 'Les codes ATC figurent-ils dans la nomenclature algérienne ?',
        answer: 'La nomenclature nationale publiée par le Ministère de l’Industrie Pharmaceutique ne comporte pas de colonne ATC. Sur DwaDZ, le code est rattaché à la DCI de chaque fiche (automatiquement, avec des corrections manuelles) : c’est un rapprochement de lecture, à confirmer en cas de doute.',
      },
      {
        question: 'Qu’est-ce que la DDD ?',
        answer: 'La Defined Daily Dose, ou dose définie journalière, est une unité technique fixée par le centre OMS d’Oslo pour comparer la consommation de médicaments entre pays ou entre périodes (par exemple en DDD pour 1 000 habitants par jour). Ce n’est pas la dose recommandée ni la dose prescrite à un patient.',
      },
      {
        question: 'L’ATC est-elle gratuite et peut-on la réutiliser ?',
        answer: 'L’OMS permet de consulter l’index ATC/DDD en ligne. Sa réutilisation (surtout commerciale) est encadrée par le centre collaborateur : il faut citer la source et vérifier ses conditions d’utilisation avant toute reprise. DwaDZ affiche les codes et les libellés à titre d’information, avec la mention de la source.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Quand on tape « C09AA05 » ou « J01CA04 », on lit un code ATC. C’est la façon dont le monde entier range les substances actives : un code de sept caractères qui dit, d’un coup, de quel organe il s’agit, à quoi sert la substance et de quelle famille chimique elle relève. Cet article répond aux trois questions qu’on se pose : qui la publie, comment on la lit, à quoi elle peut servir (et à quoi non).',
      },
      { type: 'h2', title: '1. Que veut dire ATC ?' },
      {
        type: 'paragraph',
        text: 'ATC signifie **Anatomical Therapeutic Chemical classification system**, en français classification anatomique, thérapeutique et chimique. Le nom résume le principe : une substance est rangée selon l’**organe ou le système** qu’elle cible (anatomique), son **usage thérapeutique** et sa **nature pharmacologique et chimique**. C’est une classification au sens strict : une hiérarchie de classes emboîtées, avec un code par classe.',
      },
      { type: 'h2', title: '2. Qui la publie ?' },
      {
        type: 'paragraph',
        text: 'Le système est né en Norvège dans les années 1970, puis a été repris par l’OMS au début des années 1980 pour permettre les comparaisons internationales de consommation de médicaments. Il est aujourd’hui géré par le **centre collaborateur de l’OMS pour la méthodologie des statistiques sur les médicaments**, à Oslo, qui réunit un groupe de travail international d’experts. Les demandes de création ou de modification de codes lui sont adressées ; les changements sont publiés **une fois par an** dans l’index ATC/DDD.',
      },
      {
        type: 'list',
        items: [
          'La version de référence est publiée en **anglais**. Les traductions (française, arabe…) sont l’œuvre d’autres acteurs et peuvent avoir un décalage de mise à jour.',
          'Sur DwaDZ, les libellés sont affichés en français et en anglais, et en arabe : cette dernière version est une **traduction automatique**, en cours de relecture.',
          'Toute substance nouvelle, ou dont l’usage change, peut recevoir un nouveau code ; un code peut aussi être supprimé ou modifié d’une année à l’autre. Un code ancien n’est donc pas toujours valable.',
        ],
      },
      { type: 'h2', title: '3. Comment lire un code : cinq niveaux' },
      {
        type: 'paragraph',
        text: 'Un code complet fait sept caractères : une lettre, deux chiffres, deux lettres, deux chiffres. Chaque tronçon ouvre un niveau, du plus général au plus précis. Prenons la metformine, **A10BA02** :',
      },
      {
        type: 'image',
        src: '/articles/terminologies/atc-niveaux-fr.png',
        width: 1428,
        height: 470,
        alt: 'Les cinq niveaux de l’ATC pour la metformine : A voies digestives et métabolisme, A10 médicaments du diabète, A10B médicaments hypoglycémiants sauf insulines, A10BA biguanides, A10BA02 metformine',
        caption: 'Le code A10BA02 se lit de gauche à droite, du général au précis. Chaque préfixe est lui-même un code de classe.',
      },
      {
        type: 'table',
        headers: ['Niveau', 'Format', 'Signification', 'Exemple'],
        rows: [
          { cells: ['1', 'une lettre', 'Groupe anatomique principal', 'A : voies digestives et métabolisme'] },
          { cells: ['2', 'deux chiffres', 'Sous-groupe thérapeutique', 'A10 : médicaments du diabète'] },
          { cells: ['3', 'une lettre', 'Sous-groupe pharmacologique', 'A10B : hypoglycémiants sauf insulines'] },
          { cells: ['4', 'une lettre', 'Sous-groupe chimique', 'A10BA : biguanides'] },
          { cells: ['5', 'deux chiffres', 'Substance chimique', 'A10BA02 : metformine'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Il existe **14 groupes principaux** (niveau 1) : A voies digestives et métabolisme, B sang et organes hématopoïétiques, C système cardiovasculaire, D dermatologie, G système génito-urinaire et hormones sexuelles, H hormones systémiques (hors hormones sexuelles et insulines), J anti-infectieux systémiques, L antinéoplasiques et immunomodulateurs, M système musculo-squelettique, N système nerveux, P antiparasitaires, R système respiratoire, S organes sensoriels, V divers.',
      },
      {
        type: 'paragraph',
        text: 'Dans la version 2026 chargée sur DwaDZ, on compte 14 groupes, 94 sous-groupes thérapeutiques, 271 sous-groupes pharmacologiques, 938 sous-groupes chimiques et plus de 5 700 substances ou associations au niveau 5. Ces nombres évoluent chaque année avec les mises à jour de l’OMS.',
      },
      { type: 'h2', title: '4. Les règles qui expliquent les surprises' },
      {
        type: 'list',
        items: [
          '**On classe la substance, pas la marque.** Tous les génériques et princeps de la metformine seule partagent A10BA02.',
          '**Le code reflète l’usage principal.** Une substance utilisée dans deux domaines peut avoir deux codes, ou un seul selon l’usage dominant.',
          '**La voie peut changer le code.** Salbutamol : R03AC02 (inhalé) et R03CC02 (voie générale), deux codes pour une seule substance.',
          '**Les associations ont leur propre code**, souvent dans une classe « associations » (par exemple les inhibiteurs de l’enzyme de conversion associés à un diurétique), distinct de celui des composants.',
          '**Le niveau 4 est parfois un « autres »** : on y range ce qui ne rentre dans aucune sous-classe précise.',
        ],
      },
      { type: 'h2', title: '5. La DDD : le compagnon de l’ATC' },
      {
        type: 'paragraph',
        text: 'Le centre d’Oslo attribue à beaucoup de codes de niveau 5 une **DDD** (dose définie journalière) : la dose moyenne d’entretien supposée par jour, chez l’adulte, dans l’indication principale. C’est une **unité statistique** : elle permet de comparer la consommation entre pays ou entre années (par exemple en DDD pour 1 000 habitants et par jour). Ce n’est ni une dose recommandée, ni une posologie : un patient peut recevoir plus ou moins que la DDD.',
      },
      { type: 'h2', title: '6. À quoi l’ATC peut-elle vous servir ?' },
      {
        type: 'table',
        headers: ['Usage', 'Comment l’ATC aide'],
        rows: [
          { cells: ['Retrouver une famille de médicaments', 'Partir d’une classe (par exemple les biguanides, A10BA) pour voir toutes les substances et leurs présentations.'] },
          { cells: ['Comparer des alternatives', 'Les substances d’un même niveau 4 sont des candidates à comparer, sans présumer qu’elles sont équivalentes : doses, indications et contre-indications peuvent différer.'] },
          { cells: ['Études de consommation', 'Compter la consommation par classe et en DDD : c’est l’usage historique de l’ATC.'] },
          { cells: ['Marché et importation', 'Mesurer la concentration par classe, la dépendance à l’importation, la redondance de l’offre.'] },
          { cells: ['Pharmacovigilance et sécurité', 'Raisonner par classe : interactions entre classes, allergies de classe (une allergie aux pénicillines concerne la classe J01C).'] },
          { cells: ['Enseignement', 'Apprendre les médicaments par famille plutôt que par liste alphabétique.'] },
          { cells: ['Échange de données', 'Un code ATC est compris par un logiciel de n’importe quel pays, quelle que soit la langue du libellé.'] },
        ],
      },
      { type: 'h2', title: '7. Ce que vous trouvez sur DwaDZ' },
      {
        type: 'list',
        items: [
          '**Le code ATC sur chaque fiche**, qui renvoie à la page de la classe.',
          '**Les pages « Classes thérapeutiques »** : on descend de l’anatomique à la substance, avec les médicaments de la nomenclature rattachés à chaque classe.',
          '**Le filtre ATC** dans la recherche, pour restreindre les résultats à une classe.',
          '**Les interactions et les allergies** : le Thesaurus de l’ANSM raisonne par classe, et l’allergie à une classe (par exemple les bêtalactamines) remonte jusqu’aux fiches concernées grâce aux codes ATC.',
          '**Les graphes de connaissances** : concentration du marché et dépendance à l’importation par classe.',
          '**Des libellés en trois langues** : français, anglais et arabe.',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'La nomenclature nationale ne publie pas de code ATC. Sur DwaDZ, le rattachement d’une DCI à son code est fait automatiquement puis corrigé à la main quand il le faut. Il facilite la lecture, mais en cas de doute (association, sel, voie particulière), la fiche officielle fait foi.',
      },
      { type: 'h2', title: '8. Les limites à connaître' },
      {
        type: 'list',
        items: [
          'L’ATC n’est **pas une classification d’efficacité** : deux substances d’une même classe ne sont pas forcément interchangeables.',
          'Elle ne donne **ni indication autorisée, ni posologie, ni contre-indication**.',
          'Un code ne dit rien de la **disponibilité en Algérie** : une substance peut avoir un code ATC sans être enregistrée.',
          'Les codes **évoluent chaque année** : une étude sur plusieurs années doit vérifier la version utilisée.',
          'Elle classe des **substances**, pas des produits : les excipients, la forme et le dosage n’en font pas partie (c’est le rôle des terminologies EDQM et UCUM).',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Pour aller plus loin : ouvrez la fiche d’un médicament que vous connaissez, cliquez sur son code ATC, puis remontez d’un niveau à la fois. C’est le moyen le plus rapide de « sentir » la classification.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'La classification ATC aide à organiser et retrouver l’information. Elle ne remplace ni l’ordonnance, ni l’avis du médecin ou du pharmacien, ni le résumé des caractéristiques du produit.',
      },
    ],
  },
  // ─────────────────────────────── 2. ATC (AR) ───────────────────────────────
  {
    slug: 'atc-classification-anatomique-therapeutique-chimique-explication-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'ما هو ATC؟ من ينشره، وكيف يُقرأ، وفيمَ يفيد (وفيمَ لا يفيد)',
    subtitle: 'التصنيف التشريحي العلاجي الكيميائي لمنظمة الصحة العالمية خطوة بخطوة، مع الميتفورمين مثالًا',
    description:
      'يضع ATC كل مادة فعالة في رمز من سبعة أحرف وأرقام بخمسة مستويات. من ينشره (المركز المتعاون مع المنظمة في أوسلو)، وكيف يُقرأ الرمز، وما هي الجرعة اليومية المحددة DDD، وفيمَ يفيد (الإحصاء واليقظة الدوائية والأصناف العلاجية والتداخلات والحساسية) وحدوده، مع استعمالاته في DwaDZ.',
    seoTitle: 'ما هو ATC؟ التصنيف التشريحي العلاجي الكيميائي: دليل الاستعمال',
    seoKeywords: ['تصنيف ATC للأدوية', 'تعريف رمز ATC', 'التصنيف التشريحي العلاجي الكيميائي', 'منظمة الصحة العالمية ATC DDD', 'رمز ATC المستوى الخامس', 'الأصناف العلاجية الجزائر', 'A10BA02 ميتفورمين'],
    date: '2026-11-13',
    readingTime: 9,
    image: 'atc-niveaux.png',
    tags: ['ATC', 'التصنيف', 'منظمة الصحة العالمية', 'المصطلحات', 'تبسيط', 'الأصناف العلاجية'],
    faq: [
      {
        question: 'من ينشر ATC؟',
        answer: 'يطوّره ويحدّثه المركز المتعاون مع منظمة الصحة العالمية لمنهجية إحصاءات الأدوية (WHO Collaborating Centre for Drug Statistics Methodology) ومقره أوسلو بالنرويج، داخل المعهد النرويجي للصحة العامة. يدرس فريق من الخبراء التعديلات وتُنشر مرة في السنة. والنسخة المرجعية بالإنجليزية.',
      },
      {
        question: 'هل للدواء رمز ATC؟',
        answer: 'المواد الفعالة (وبعض التوليفات) هي التي لها رمز ATC، لا العلامات التجارية. فكل المستحضرات القائمة على الميتفورمين وحده تشترك في A10BA02. وقد يكون للمادة الواحدة عدة رموز إذا اختلفت استعمالاتها: للسالبوتامول رمز للطريق الاستنشاقي (R03AC02) وآخر للطريق الجهازي (R03CC02).',
      },
      {
        question: 'هل يدل رمز ATC على مؤشر الدواء؟',
        answer: 'يدل على الاستعمال العلاجي الرئيسي المعتمد للتصنيف، لا على المؤشر المرخّص به ولا على كل الاستعمالات. ولا يقول شيئًا عن الفعالية أو السلامة أو التكافؤ بين مادتين من الصنف نفسه. والمرجع هو ملخص خصائص المنتج.',
      },
      {
        question: 'هل رموز ATC موجودة في المدونة الجزائرية؟',
        answer: 'لا تتضمن المدونة الوطنية التي تنشرها وزارة الصناعة الصيدلانية عمودًا لـ ATC. وفي DwaDZ يُربط الرمز بالاسم الدولي لكل بطاقة (تلقائيًّا مع تصحيحات يدوية): إنه مقاربة للقراءة تُؤكَّد عند الشك.',
      },
      {
        question: 'ما هي الجرعة اليومية المحددة DDD؟',
        answer: 'الجرعة اليومية المحددة (Defined Daily Dose) وحدة تقنية يضعها مركز أوسلو لمقارنة استهلاك الأدوية بين البلدان أو الفترات (مثلًا بعدد DDD لكل 1000 نسمة في اليوم). وليست الجرعة الموصى بها ولا جرعة المريض.',
      },
      {
        question: 'هل ATC مجاني وهل يمكن إعادة استعماله؟',
        answer: 'تتيح المنظمة الاطلاع على فهرس ATC/DDD عبر الإنترنت. أما إعادة استعماله (خاصة التجاري) فيحكمها المركز المتعاون: ينبغي ذكر المصدر والتحقق من شروط الاستعمال قبل أي نقل. ويعرض DwaDZ الرموز والتسميات على سبيل الإعلام مع ذكر المصدر.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'حين نكتب «C09AA05» أو «J01CA04» فإننا نقرأ رمز ATC. هذه هي الطريقة التي يصنّف بها العالم كله المواد الفعالة: رمز من سبعة خانات يقول دفعة واحدة أي عضو يُستهدف، وفيمَ تُستعمل المادة، وإلى أي عائلة كيميائية تنتمي. يجيب هذا المقال عن ثلاثة أسئلة: من ينشره، وكيف يُقرأ، وفيمَ يمكن أن يفيد (وفيمَ لا).',
      },
      { type: 'h2', title: '1. ماذا تعني ATC؟' },
      {
        type: 'paragraph',
        text: 'ATC اختصار **Anatomical Therapeutic Chemical classification system** أي التصنيف التشريحي العلاجي الكيميائي. والاسم يلخّص المبدأ: تُصنَّف المادة بحسب **العضو أو الجهاز** الذي تستهدفه (التشريحي)، و**استعمالها العلاجي**، و**طبيعتها الدوائية والكيميائية**. وهو تصنيف بالمعنى الدقيق: هرم من الفئات المتداخلة، لكل فئة رمز.',
      },
      { type: 'h2', title: '2. من ينشره؟' },
      {
        type: 'paragraph',
        text: 'نشأ النظام في النرويج في سبعينيات القرن الماضي، ثم تبنّته منظمة الصحة العالمية في مطلع الثمانينيات لإتاحة مقارنة استهلاك الأدوية دوليًّا. ويديره اليوم **المركز المتعاون مع المنظمة لمنهجية إحصاءات الأدوية** في أوسلو، وهو يجمع فريق عمل دوليًّا من الخبراء. تُرسل إليه طلبات إنشاء الرموز أو تعديلها، وتُنشر التغييرات **مرة في السنة** في فهرس ATC/DDD.',
      },
      {
        type: 'list',
        items: [
          'النسخة المرجعية منشورة بـ**الإنجليزية**. أما الترجمات (الفرنسية والعربية…) فمن عمل جهات أخرى وقد تتأخر في التحديث.',
          'في DwaDZ تُعرض التسميات بالفرنسية والإنجليزية وبالعربية: والنسخة العربية **ترجمة آلية** قيد المراجعة.',
          'قد تحصل المادة الجديدة، أو التي يتغير استعمالها، على رمز جديد؛ وقد يُلغى رمز أو يُعدَّل من سنة إلى أخرى. فالرمز القديم ليس دائمًا ساري المفعول.',
        ],
      },
      { type: 'h2', title: '3. كيف يُقرأ الرمز: خمسة مستويات' },
      {
        type: 'paragraph',
        text: 'يتألف الرمز الكامل من سبعة خانات: حرف، ورقمان، وحرفان، ورقمان. وكل مقطع يفتح مستوى، من الأعم إلى الأدق. لنأخذ الميتفورمين، **A10BA02**:',
      },
      {
        type: 'image',
        src: '/articles/terminologies/atc-niveaux-ar.png',
        width: 1428,
        height: 470,
        alt: 'مستويات ATC الخمسة للميتفورمين: A الجهاز الهضمي والاستقلاب، A10 أدوية السكري، A10B أدوية خافضة لسكر الدم باستثناء الإنسولينات، A10BA البيغوانيدات، A10BA02 ميتفورمين',
        caption: 'يُقرأ الرمز A10BA02 من الأعم إلى الأدق. وكل بادئة منه هي بدورها رمز فئة.',
      },
      {
        type: 'table',
        headers: ['المستوى', 'الصيغة', 'المعنى', 'مثال'],
        rows: [
          { cells: ['1', 'حرف', 'المجموعة التشريحية الرئيسية', 'A: الجهاز الهضمي والاستقلاب'] },
          { cells: ['2', 'رقمان', 'المجموعة العلاجية الفرعية', 'A10: أدوية السكري'] },
          { cells: ['3', 'حرف', 'المجموعة الدوائية الفرعية', 'A10B: خافضات سكر الدم باستثناء الإنسولين'] },
          { cells: ['4', 'حرف', 'المجموعة الكيميائية الفرعية', 'A10BA: البيغوانيدات'] },
          { cells: ['5', 'رقمان', 'المادة الكيميائية', 'A10BA02: ميتفورمين'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'هناك **14 مجموعة رئيسية** (المستوى 1): A الجهاز الهضمي والاستقلاب، B الدم والأعضاء المكوِّنة له، C القلب والأوعية، D الأمراض الجلدية، G الجهاز البولي التناسلي والهرمونات الجنسية، H الهرمونات الجهازية (باستثناء الهرمونات الجنسية والإنسولينات)، J مضادات العدوى الجهازية، L مضادات الأورام ومعدّلات المناعة، M الجهاز العضلي الهيكلي، N الجهاز العصبي، P مضادات الطفيليات، R الجهاز التنفسي، S الأعضاء الحسية، V متنوعة.',
      },
      {
        type: 'paragraph',
        text: 'وفي نسخة 2026 المحمَّلة في DwaDZ نحصي 14 مجموعة، و94 مجموعة علاجية فرعية، و271 مجموعة دوائية فرعية، و938 مجموعة كيميائية فرعية، وأكثر من 5700 مادة أو توليفة في المستوى الخامس. وهذه الأعداد تتغير كل سنة مع تحديثات المنظمة.',
      },
      { type: 'h2', title: '4. قواعد تفسّر المفاجآت' },
      {
        type: 'list',
        items: [
          '**تُصنَّف المادة لا العلامة التجارية.** كل الجنيسات والمرجعيات للميتفورمين وحده تشترك في A10BA02.',
          '**يعكس الرمز الاستعمال الرئيسي.** قد يكون للمادة المستعملة في مجالين رمزان، أو رمز واحد بحسب الاستعمال الغالب.',
          '**قد يغيّر الطريق الرمز.** السالبوتامول: R03AC02 (استنشاق) وR03CC02 (طريق عام)، رمزان لمادة واحدة.',
          '**للتوليفات رمزها الخاص**، غالبًا في فئة «توليفات» (مثل مثبطات الإنزيم المحوّل المقترنة بمدرّ)، يختلف عن رمز مكوناتها.',
          '**قد يكون المستوى 4 «أخرى»**: يوضع فيه ما لا يدخل في أي فئة فرعية محددة.',
        ],
      },
      { type: 'h2', title: '5. الجرعة اليومية المحددة DDD: رفيقة ATC' },
      {
        type: 'paragraph',
        text: 'يمنح مركز أوسلو كثيرًا من رموز المستوى الخامس **جرعة يومية محددة DDD**: متوسط جرعة المداومة المفترض في اليوم لدى البالغ في المؤشر الرئيسي. إنها **وحدة إحصائية**: تتيح مقارنة الاستهلاك بين البلدان أو السنوات (مثلًا بعدد DDD لكل 1000 نسمة في اليوم). وليست جرعة موصى بها ولا وصفة: فقد يتلقى المريض أكثر منها أو أقل.',
      },
      { type: 'h2', title: '6. فيمَ يمكن أن يفيدك ATC؟' },
      {
        type: 'table',
        headers: ['الاستعمال', 'كيف يساعد ATC'],
        rows: [
          { cells: ['إيجاد عائلة أدوية', 'الانطلاق من صنف (مثل البيغوانيدات A10BA) لرؤية كل موادّه وعروضه.'] },
          { cells: ['مقارنة البدائل', 'مواد المستوى الرابع الواحد مرشحة للمقارنة، دون افتراض أنها متكافئة: قد تختلف الجرعات والمؤشرات وموانع الاستعمال.'] },
          { cells: ['دراسات الاستهلاك', 'عدّ الاستهلاك بحسب الصنف وبوحدات DDD: وهذا هو الاستعمال التاريخي لـ ATC.'] },
          { cells: ['السوق والاستيراد', 'قياس تركّز السوق بحسب الصنف، والاعتماد على الاستيراد، وتكرار العرض.'] },
          { cells: ['اليقظة الدوائية والسلامة', 'التفكير بالأصناف: التداخلات بين الأصناف، وحساسية الصنف (الحساسية للبنسلينات تخص الصنف J01C).'] },
          { cells: ['التعليم', 'تعلّم الأدوية بالعائلات بدل القائمة الأبجدية.'] },
          { cells: ['تبادل البيانات', 'يفهم أي برنامج في أي بلد رمز ATC مهما كانت لغة التسمية.'] },
        ],
      },
      { type: 'h2', title: '7. ما تجده في DwaDZ' },
      {
        type: 'list',
        items: [
          '**رمز ATC في كل بطاقة**، يحيل إلى صفحة الصنف.',
          '**صفحات «الأصناف العلاجية»**: ننزل من التشريحي إلى المادة، مع أدوية المدونة المرتبطة بكل صنف.',
          '**مرشح ATC** في البحث، لحصر النتائج في صنف.',
          '**التداخلات والحساسية**: يفكّر مكنز ANSM بالأصناف، وتصل الحساسية لصنف (مثل البيتالاكتامات) إلى البطاقات المعنية بفضل رموز ATC.',
          '**الرسوم البيانية للمعرفة**: تركّز السوق والاعتماد على الاستيراد بحسب الصنف.',
          '**تسميات بثلاث لغات**: الفرنسية والإنجليزية والعربية.',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'لا تنشر المدونة الوطنية رمز ATC. وفي DwaDZ يُربط الاسم الدولي برمزه تلقائيًّا ثم يُصحَّح يدويًّا عند الحاجة. وهو يسهّل القراءة، لكن عند الشك (توليفة، ملح، طريق خاص) تبقى البطاقة الرسمية هي المرجع.',
      },
      { type: 'h2', title: '8. الحدود التي ينبغي معرفتها' },
      {
        type: 'list',
        items: [
          'ATC **ليس تصنيفًا للفعالية**: مادتان من صنف واحد ليستا بالضرورة قابلتين للتبادل.',
          'لا يعطي **مؤشرًا مرخَّصًا به ولا جرعة ولا مانع استعمال**.',
          'لا يقول شيئًا عن **التوفر في الجزائر**: قد يكون لمادة رمز ATC دون أن تكون مسجلة.',
          'تتطور الرموز **كل سنة**: على دراسة تمتد عدة سنوات أن تتحقق من النسخة المعتمدة.',
          'يصنّف **المواد** لا المنتجات: فالسواغ والشكل والجرعة ليست منه (وهذا دور مصطلحات EDQM وUCUM).',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'للتعمق: افتح بطاقة دواء تعرفه، وانقر على رمز ATC الخاص به، ثم اصعد مستوى واحدًا في كل مرة. هذه أسرع طريقة لـ«الإحساس» بالتصنيف.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'يساعد تصنيف ATC على تنظيم المعلومة والعثور عليها. ولا يغني عن الوصفة ولا عن رأي الطبيب أو الصيدلي ولا عن ملخص خصائص المنتج.',
      },
    ],
  },
  // ─────────────────────────────── 3. EDQM + UCUM (FR) ───────────────────────────────
  {
    slug: 'edqm-ucum-formes-voies-unites-vocabulaire-normalise-medicament',
    lang: 'fr',
    audience: 'professionnel',
    title: 'EDQM et UCUM : le vocabulaire normalisé des formes, des voies d’administration et des unités',
    subtitle: 'Pourquoi « comprimé pelliculé » et « mg » ont chacun un code, et ce que cela change sur une fiche DwaDZ',
    description:
      'Les Standard Terms de l’EDQM (Conseil de l’Europe) nomment les formes pharmaceutiques, les voies et les méthodes d’administration ; UCUM code les unités de mesure. Ce que contiennent ces terminologies, comment DwaDZ y rattache les libellés de la nomenclature (relations exact, plus large, proche), et leurs limites.',
    seoTitle: 'EDQM Standard Terms et UCUM : formes, voies d’administration et unités expliquées',
    seoKeywords: ['EDQM Standard Terms', 'forme pharmaceutique code EDQM', 'voie d’administration EDQM', 'UCUM unités', 'terminologie pharmaceutique', 'IDMP formes voies', 'nomenclature pharmaceutique algérienne'],
    date: '2026-11-13',
    readingTime: 7,
    tags: ['EDQM', 'UCUM', 'Terminologies', 'Forme galénique', 'Voie d’administration', 'Pédagogie'],
    faq: [
      {
        question: 'Qui publie les Standard Terms et à quoi servent-ils ?',
        answer: 'Ils sont publiés par la Direction européenne de la qualité du médicament et soins de santé (EDQM), au sein du Conseil de l’Europe, à Strasbourg. Ils fournissent une liste commune pour décrire les formes pharmaceutiques, les voies et méthodes d’administration et les conditionnements, utilisée notamment dans les dossiers réglementaires européens. Ils sont la propriété de l’EDQM et soumis à ses conditions d’utilisation.',
      },
      {
        question: 'Pourquoi deux terminologies, EDQM et UCUM ?',
        answer: 'Elles ne couvrent pas la même chose. L’EDQM nomme les formes, les voies et les méthodes d’administration. UCUM code les unités de mesure des dosages (mg, mL, UI…) de façon lisible par les machines. Une fiche utilise les deux : une forme, une voie, et un dosage exprimé en unités.',
      },
      {
        question: 'Que veut dire « terme plus large » ou « proche » sur une fiche ?',
        answer: 'La nomenclature écrit des formes plus fines que celles de l’EDQM. « Comprimé pelliculé sécable » n’existe pas tel quel : on rattache la forme au terme « Comprimé pelliculé », plus large, car la sécabilité n’est pas un Standard Term. Quand le meilleur terme disponible n’est qu’approximatif, la relation est « proche », à confirmer. Quand aucun terme n’est sûr, il n’y a pas de lien : DwaDZ n’invente jamais de code.',
      },
      {
        question: 'Les codes EDQM et UCUM sont-ils officiels pour les médicaments d’Algérie ?',
        answer: 'Non : la nomenclature nationale ne comporte pas ces codes. DwaDZ les rattache aux libellés par des règles automatiques, avec corrections manuelles. Ils servent à lire et à rapprocher ; en cas de doute, la fiche officielle fait foi.',
      },
      {
        question: 'Les termes arabes viennent-ils de l’EDQM ?',
        answer: 'Non. Les sources utilisées ne contiennent pas d’arabe. Les libellés arabes sont ceux de DwaDZ, et l’état de leur relecture est suivi terme par terme.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Sur une fiche DwaDZ, à côté de la forme et du dosage, on voit de petits codes : « EDQM 10221000 », « EDQM 20053000 », « UCUM mg ». Ce sont les identifiants de deux terminologies internationales. Elles servent à une chose simple : que « comprimé pelliculé », « film-coated tablet » et « قرص مغلّف » désignent le même concept pour tout le monde, y compris pour un logiciel.',
      },
      { type: 'h2', title: '1. L’EDQM et ses Standard Terms' },
      {
        type: 'paragraph',
        text: 'L’**EDQM** est la Direction européenne de la qualité du médicament et soins de santé, rattachée au Conseil de l’Europe (Strasbourg). Elle publie les **Standard Terms** : un vocabulaire contrôlé des formes pharmaceutiques, des voies d’administration, des méthodes d’administration et des unités de présentation. En Europe, il sert à décrire un médicament de la même façon dans les dossiers d’autorisation, quelle que soit la langue de l’emballage.',
      },
      {
        type: 'paragraph',
        text: 'Le jeu de termes chargé sur DwaDZ compte 426 formes pharmaceutiques, 82 voies d’administration et 19 méthodes d’administration, avec leurs libellés anglais et français. Chaque terme a un code à huit chiffres (quatre chiffres pour les méthodes).',
      },
      {
        type: 'table',
        headers: ['Classe', 'Exemple de terme', 'Code', 'Question à laquelle elle répond'],
        rows: [
          { cells: ['Forme', 'Comprimé pelliculé (Film-coated tablet)', '10221000', 'Sous quelle forme se présente-t-il ?'] },
          { cells: ['Voie', 'Voie orale (Oral use)', '20053000', 'Par où est-il administré ?'] },
          { cells: ['Méthode', 'Les méthodes d’administration (par exemple injection ou perfusion)', 'code à 4 chiffres', 'Comment est-il administré ?'] },
        ],
      },
      { type: 'h2', title: '2. UCUM : un code pour chaque unité' },
      {
        type: 'paragraph',
        text: '**UCUM** (Unified Code for Units of Measure) est un système de codes pour les unités de mesure, pensé pour être lu sans ambiguïté par un ordinateur. Il est celui qu’attend la norme d’échange de données de santé FHIR. Les codes y sont sensibles à la casse : **mg** (milligramme), **mL** (millilitre), **[iU]** (unité internationale). UCUM ne définit que des codes : il n’a pas de traductions, c’est pourquoi les noms arabes des unités sont ceux de DwaDZ.',
      },
      {
        type: 'paragraph',
        text: 'Cela règle un problème fréquent des registres : « 500 mg », « 500MG », « 500 mg. » et « 0,5 g » ne sont pas écrits pareil mais se ramènent à une valeur et une unité, ce qui permet de les comparer et de les filtrer.',
      },
      { type: 'h2', title: '3. Comment DwaDZ relie la nomenclature à l’EDQM' },
      {
        type: 'paragraph',
        text: 'La nomenclature saisit les formes à la main : « COMPRIME PELLICULE SECABLE », « COMP PELL SEC », « SOL INJ S/C EN STYLO PREREMPLI »… DwaDZ nettoie d’abord l’écriture (accents, abréviations, fautes de frappe courantes), puis cherche le terme EDQM qui correspond. Chaque rattachement porte une **relation** explicite, empruntée aux équivalences de ConceptMap FHIR :',
      },
      {
        type: 'table',
        headers: ['Relation', 'Sens', 'Exemple'],
        rows: [
          { cells: ['Exacte', 'Même concept', 'Comprimé pelliculé'] },
          { cells: ['Plus large (⊂)', 'Le terme EDQM est plus général que la forme écrite', '« Comprimé pelliculé sécable » → Comprimé pelliculé (la sécabilité n’est pas un Standard Term)'] },
          { cells: ['Proche (≈)', 'Meilleur terme disponible, à confirmer', 'Une forme dont le terme exact n’existe pas'] },
          { cells: ['Aucune', 'Pas de terme sûr : pas de lien, jamais de code inventé', 'Une forme trop ambiguë'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Les voies d’administration sont ensuite déduites de la forme (un collyre pour la voie ophtalmique, un suppositoire pour la voie rectale), puis une correction manuelle faite en base prend le pas sur le calcul. La nomenclature ne contient pas de colonne « voie » : celle-ci est toujours une indication de lecture.',
      },
      { type: 'h2', title: '4. Ce que cela permet sur DwaDZ' },
      {
        type: 'list',
        items: [
          '**Les icônes de forme et de voie** : le contenant dessine la forme, la pastille la voie EDQM de la fiche.',
          '**La recherche guidée et les filtres** : un seul choix « comprimé pelliculé » regroupe toutes les écritures qui lui correspondent.',
          '**La lecture en trois langues** : le code est identique en français, en anglais et en arabe ; seuls les libellés changent.',
          '**La comparaison** : deux fiches de dosages écrits différemment se rapprochent grâce à l’unité UCUM.',
          '**L’échange de données** : un système étranger qui comprend l’EDQM et UCUM comprend la fiche.',
        ],
      },
      { type: 'h2', title: '5. Les limites' },
      {
        type: 'list',
        items: [
          'Les codes ne sont **pas dans la nomenclature officielle** : ils sont calculés par DwaDZ, avec corrections manuelles. Ce sont des repères de lecture.',
          'Les termes EDQM chargés viennent d’un export du paquet FHIR suisse (HL7 Suisse), daté de 2021 : un terme apparu depuis peut manquer.',
          'L’EDQM n’a pas d’arabe dans nos sources : les libellés arabes sont ceux de DwaDZ, et leur relecture est suivie terme par terme.',
          'Les « unités de présentation » EDQM (flacon, sachet…) ne sont pas encore reliées ; un contenant n’a donc pas de code UCUM.',
          'Les Standard Terms sont la propriété de l’EDQM et soumis à ses conditions d’utilisation (https://standardterms.edqm.eu).',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Pour voir le mécanisme : ouvrez une fiche de médicament, repérez la ligne « Forme pharmaceutique » et son code EDQM, puis la voie d’administration et son code. Le signe ⊂ ou ≈ à côté du code vous dit quand le rapprochement n’est pas exact.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Ces terminologies servent à retrouver et à rapprocher l’information. Elles ne remplacent ni la fiche officielle, ni l’ordonnance, ni l’avis du médecin ou du pharmacien.',
      },
    ],
  },
  // ─────────────────────────────── 3. EDQM + UCUM (AR) ───────────────────────────────
  {
    slug: 'edqm-ucum-formes-voies-unites-vocabulaire-normalise-medicament-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'EDQM وUCUM: المفردات الموحّدة للأشكال وطرق الإعطاء والوحدات',
    subtitle: 'لماذا لـ«القرص المغلّف» و«mg» رمز لكل منهما، وما الذي يغيّره ذلك في بطاقة DwaDZ',
    description:
      'تسمّي Standard Terms الصادرة عن EDQM (مجلس أوروبا) الأشكال الصيدلانية وطرق الإعطاء وأساليبه، ويرمّز UCUM وحدات القياس. ما تحتويه هذه المصطلحات، وكيف يربط DwaDZ بها تسميات المدونة (علاقات مطابقة وأعم وقريبة)، وحدودها.',
    seoTitle: 'EDQM Standard Terms وUCUM: الأشكال وطرق الإعطاء والوحدات',
    seoKeywords: ['EDQM Standard Terms', 'رمز الشكل الصيدلاني EDQM', 'طريقة الإعطاء EDQM', 'وحدات UCUM', 'مصطلحات صيدلانية', 'IDMP الأشكال والطرق', 'المدونة الصيدلانية الجزائرية'],
    date: '2026-11-13',
    readingTime: 7,
    tags: ['EDQM', 'UCUM', 'المصطلحات', 'الشكل الصيدلاني', 'طريقة الإعطاء', 'تبسيط'],
    faq: [
      {
        question: 'من ينشر Standard Terms وما فائدتها؟',
        answer: 'تنشرها المديرية الأوروبية لجودة الأدوية والرعاية الصحية (EDQM) التابعة لمجلس أوروبا في ستراسبورغ. وهي تتيح قائمة مشتركة لوصف الأشكال الصيدلانية وطرق الإعطاء وأساليبه والتعبئة، تُستعمل خصوصًا في الملفات التنظيمية الأوروبية. وهي ملك لـ EDQM وتخضع لشروط استعمالها.',
      },
      {
        question: 'لماذا مصطلحان، EDQM وUCUM؟',
        answer: 'لأنهما لا يغطيان الشيء نفسه. EDQM تسمّي الأشكال وطرق الإعطاء وأساليبه. وUCUM يرمّز وحدات قياس الجرعات (mg وmL وUI…) بطريقة تقرؤها الآلات. وتستعمل البطاقة الاثنين: شكلًا وطريقة وجرعة معبَّرًا عنها بوحدات.',
      },
      {
        question: 'ماذا يعني «مصطلح أعم» أو «قريب» في البطاقة؟',
        answer: 'تكتب المدونة أشكالًا أدق من أشكال EDQM. فـ«comprimé pelliculé sécable» غير موجود بهذه الصيغة: نربط الشكل بمصطلح «Comprimé pelliculé» الأعم، لأن القابلية للقسمة ليست من Standard Terms. وحين لا يكون أفضل مصطلح متاح إلا تقريبيًّا تكون العلاقة «قريب» ويُؤكَّد لاحقًا. وحين لا يوجد مصطلح مؤكَّد لا يوجد ربط: فلا يخترع DwaDZ رمزًا أبدًا.',
      },
      {
        question: 'هل رموز EDQM وUCUM رسمية لأدوية الجزائر؟',
        answer: 'لا: فالمدونة الوطنية لا تتضمن هذه الرموز. يربطها DwaDZ بالتسميات بقواعد آلية مع تصحيحات يدوية. وهي للقراءة والمقاربة؛ وعند الشك تبقى البطاقة الرسمية هي المرجع.',
      },
      {
        question: 'هل المصطلحات العربية من EDQM؟',
        answer: 'لا. المصادر المستعملة لا تتضمن العربية. التسميات العربية من وضع DwaDZ، وتُتابَع حالة مراجعتها مصطلحًا مصطلحًا.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'في بطاقة DwaDZ، بجانب الشكل والجرعة، نرى رموزًا صغيرة: «EDQM 10221000» و«EDQM 20053000» و«UCUM mg». إنها معرّفات مصطلحين دوليين. وغايتهما بسيطة: أن يدل «comprimé pelliculé» و«film-coated tablet» و«قرص مغلّف» على المفهوم نفسه عند الجميع، بمن فيهم البرنامج الحاسوبي.',
      },
      { type: 'h2', title: '1. EDQM وStandard Terms' },
      {
        type: 'paragraph',
        text: '**EDQM** هي المديرية الأوروبية لجودة الأدوية والرعاية الصحية، التابعة لمجلس أوروبا (ستراسبورغ). تنشر **Standard Terms**: مفردات مضبوطة للأشكال الصيدلانية وطرق الإعطاء وأساليبه ووحدات العرض. وفي أوروبا تُستعمل لوصف الدواء بالطريقة نفسها في ملفات الترخيص مهما كانت لغة العبوة.',
      },
      {
        type: 'paragraph',
        text: 'تضم المجموعة المحمَّلة في DwaDZ 426 شكلًا صيدلانيًّا و82 طريقة إعطاء و19 أسلوب إعطاء، بتسميات إنجليزية وفرنسية. ولكل مصطلح رمز من ثمانية أرقام (وأربعة أرقام للأساليب).',
      },
      {
        type: 'table',
        headers: ['الفئة', 'مثال على المصطلح', 'الرمز', 'السؤال الذي تجيب عنه'],
        rows: [
          { cells: ['الشكل', 'قرص مغلّف (Film-coated tablet)', '10221000', 'في أي شكل يُعرض؟'] },
          { cells: ['الطريقة', 'عن طريق الفم (Oral use)', '20053000', 'من أين يُعطى؟'] },
          { cells: ['الأسلوب', 'أساليب الإعطاء (مثل الحقن أو التسريب)', 'رمز من 4 أرقام', 'كيف يُعطى؟'] },
        ],
      },
      { type: 'h2', title: '2. UCUM: رمز لكل وحدة' },
      {
        type: 'paragraph',
        text: '**UCUM** (Unified Code for Units of Measure) نظام رموز لوحدات القياس، صُمّم ليقرأه الحاسوب دون لبس. وهو الذي يتوقعه معيار تبادل بيانات الصحة FHIR. والرموز فيه حسّاسة لحالة الأحرف: **mg** (ملغ)، **mL** (مل)، **[iU]** (وحدة دولية). ولا يحدّد UCUM إلا الرموز: فليست له ترجمات، ولذلك فأسماء الوحدات بالعربية من وضع DwaDZ.',
      },
      {
        type: 'paragraph',
        text: 'وهذا يحل مشكلة شائعة في السجلات: «500 mg» و«500MG» و«500 mg.» و«0,5 g» مكتوبة بصيغ مختلفة لكنها ترجع إلى قيمة ووحدة، فيمكن مقارنتها وتصفيتها.',
      },
      { type: 'h2', title: '3. كيف يربط DwaDZ المدونة بـ EDQM' },
      {
        type: 'paragraph',
        text: 'تُدخَل الأشكال في المدونة يدويًّا: «COMPRIME PELLICULE SECABLE» و«COMP PELL SEC» و«SOL INJ S/C EN STYLO PREREMPLI»… ينظّف DwaDZ الكتابة أولًا (الحركات والاختصارات والأخطاء الشائعة)، ثم يبحث عن مصطلح EDQM المطابق. ويحمل كل ربط **علاقة** صريحة مستعارة من علاقات التكافؤ في ConceptMap بمعيار FHIR:',
      },
      {
        type: 'table',
        headers: ['العلاقة', 'المعنى', 'مثال'],
        rows: [
          { cells: ['مطابقة', 'المفهوم نفسه', 'Comprimé pelliculé'] },
          { cells: ['أعم (⊂)', 'مصطلح EDQM أعم من الشكل المكتوب', '«comprimé pelliculé sécable» ← Comprimé pelliculé (القابلية للقسمة ليست من Standard Terms)'] },
          { cells: ['قريب (≈)', 'أفضل مصطلح متاح، يُؤكَّد لاحقًا', 'شكل لا يوجد له مصطلح مطابق'] },
          { cells: ['لا شيء', 'لا مصطلح مؤكَّد: لا ربط، ولا رمز مخترَع أبدًا', 'شكل ملتبس جدًّا'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'ثم تُستنتج طرق الإعطاء من الشكل (قطرة العين للعين، والتحميلة للشرج)، وتتقدم التصحيحات اليدوية في قاعدة البيانات على الحساب. ولا تتضمن المدونة عمودًا لـ«الطريقة»: فهي دائمًا إشارة للقراءة.',
      },
      { type: 'h2', title: '4. ما يتيحه ذلك في DwaDZ' },
      {
        type: 'list',
        items: [
          '**أيقونات الشكل والطريقة**: الوعاء يرسم الشكل، والشارة تبيّن طريقة EDQM الخاصة بالبطاقة.',
          '**البحث الموجَّه والمرشحات**: اختيار واحد «قرص مغلّف» يجمع كل الكتابات المطابقة له.',
          '**القراءة بثلاث لغات**: الرمز واحد بالفرنسية والإنجليزية والعربية؛ والتسميات وحدها تتغير.',
          '**المقارنة**: تتقارب بطاقتان جرعتاهما مكتوبتان بصيغتين مختلفتين بفضل وحدة UCUM.',
          '**تبادل البيانات**: النظام الأجنبي الذي يفهم EDQM وUCUM يفهم البطاقة.',
        ],
      },
      { type: 'h2', title: '5. الحدود' },
      {
        type: 'list',
        items: [
          'الرموز **ليست في المدونة الرسمية**: يحسبها DwaDZ مع تصحيحات يدوية. فهي علامات للقراءة.',
          'مصطلحات EDQM المحمَّلة مأخوذة من تصدير لحزمة FHIR السويسرية (HL7 Suisse) مؤرَّخ 2021: فقد يغيب مصطلح ظهر بعده.',
          'ليست لدى EDQM عربية في مصادرنا: التسميات العربية من وضع DwaDZ، وتُتابَع مراجعتها مصطلحًا مصطلحًا.',
          'لم تُربط بعد «وحدات العرض» في EDQM (قارورة، كيس…)؛ فليس للوعاء رمز UCUM.',
          'Standard Terms ملك لـ EDQM وتخضع لشروط استعمالها (https://standardterms.edqm.eu).',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'لرؤية الآلية: افتح بطاقة دواء، وابحث عن سطر «الشكل الصيدلاني» ورمز EDQM الخاص به، ثم طريقة الإعطاء ورمزها. وتخبرك علامة ⊂ أو ≈ بجانب الرمز بأن المقاربة ليست مطابقة تمامًا.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'تخدم هذه المصطلحات البحث عن المعلومة ومقاربتها. ولا تغني عن البطاقة الرسمية ولا عن الوصفة ولا عن رأي الطبيب أو الصيدلي.',
      },
    ],
  },
]
