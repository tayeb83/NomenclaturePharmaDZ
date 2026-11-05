import type { Article } from './articles'

/**
 * Article de présentation des graphes de connaissances (FR + AR) : ce que montrent les graphes, pour quels cas
 * d'usage, comment demander l'accès. À garder aligné sur lib/graphe/demos.ts (cas d'usage) et sur l'offre de /graphe.
 */
export const ARTICLES_GRAPHES: Article[] = [
  {
    slug: 'graphes-medicaments-algerie-cas-usage-acces',
    lang: 'fr',
    audience: 'professionnel',
    title: 'Graphes de connaissances du médicament en Algérie : cas d’usage et comment y accéder',
    subtitle: 'Substances, classes ATC, laboratoires, marques, interactions et retraits reliés en un seul dessin',
    description:
      'Ce que montrent les graphes DwaDZ, pour quels cas d’usage (interactions, dépendance à l’importation, concentration du marché, qui commercialise quoi, retraits), ce que contiennent les démos gratuites et l’explorateur payant, et comment demander l’accès.',
    seoTitle: 'Graphes de connaissances du médicament en Algérie : démos gratuites, explorateur et fiches PDF',
    seoKeywords: ['graphe de connaissances médicament', 'nomenclature pharmaceutique algérienne', 'concentration du marché pharmaceutique', 'dépendance importation médicaments Algérie', 'interactions médicamenteuses graphe', 'laboratoires pharmaceutiques Algérie'],
    date: '2026-11-05',
    readingTime: 7,
    tags: ['Graphes', 'Nomenclature', 'Cas d’usage', 'Interactions médicamenteuses', 'Marché pharmaceutique', 'Outils'],
    sourceLinks: [
      { label: 'Ministère de l’Industrie pharmaceutique (MIPH) : nomenclature nationale', url: 'https://miph.gov.dz', external: true },
      { label: 'Thesaurus des interactions médicamenteuses (ANSM, septembre 2023)', url: 'https://ansm.sante.fr/uploads/2024/06/07/20230915-thesaurus-interactions-medicamenteuses-septembre-2023.pdf', external: true },
    ],
    relatedLinks: [
      { label: 'Ouvrir les graphes et leurs démos gratuites', url: '/graphe' },
      { label: 'Démo : les marques de la metformine', url: '/graphe/demo/medicaments-metformine' },
      { label: 'Démo : le marché des AINS est-il concentré ?', url: '/graphe/demo/concentration-ains' },
      { label: 'Espace Pro', url: '/pro' },
    ],
    faq: [
      {
        question: 'Les démos sont-elles vraiment gratuites ?',
        answer: 'Oui. Elles sont ouvertes à tous, sans compte, et chacune répond à une question précise. Elles montrent les nœuds les plus importants de chaque type, pour une substance, une classe ou un laboratoire choisi à l’avance.',
      },
      {
        question: 'Que m’apporte l’explorateur payant ?',
        answer: 'Le choix libre : n’importe quelle substance, classe ATC ou laboratoire, le croisement substance + laboratoire, jusqu’à 30 nœuds par type, le recentrage d’un clic, l’export CSV des liens et la fiche PDF d’une substance.',
      },
      {
        question: 'Comment payer ?',
        answer: 'Par virement CCP ou par PayPal, et uniquement par l’un de ces deux moyens. Les coordonnées figurent sur la page des graphes ou vous sont envoyées par e-mail après votre demande.',
      },
      {
        question: 'Combien de temps faut-il pour obtenir l’accès ?',
        answer: 'L’activation est manuelle : elle suit la réception de votre paiement. Un e-mail vous prévient, puis vous vous connectez avec votre adresse, sans mot de passe.',
      },
      {
        question: 'Les graphes remplacent-ils l’avis d’un professionnel de santé ?',
        answer: 'Non. Ils servent à explorer et comparer des données de nomenclature et d’interactions. Ils ne constituent ni une prescription ni un avis médical.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Un médicament n’est pas une ligne dans un tableau : il se rattache à une substance, qui appartient à une classe ATC, qui est enregistrée par des laboratoires, venus d’un certain pays, avec des interactions et parfois des retraits. Les graphes DwaDZ dessinent ces liens à partir de la nomenclature nationale et du Thesaurus des interactions de l’ANSM, pour répondre en un coup d’œil à des questions qui demandent sinon plusieurs recherches.',
      },
      { type: 'h2', title: '1. Ce que montre un graphe' },
      {
        type: 'paragraph',
        text: 'Au centre, l’objet de la requête : une substance, une classe ATC ou un laboratoire. Autour, ses voisins, par couleur : classe ATC, laboratoires, médicaments (marques), pays d’origine, partenaires d’interaction (avec la gravité en trait plein, pointillé ou fin), retraits. Chaque nœud est relié à ce dont il dépend ; la taille d’un nœud suit son poids (nombre d’enregistrements, part de marché).',
      },
      {
        type: 'list',
        items: [
          'Un nœud marqué ↗ ouvre sa page sur le site : fiche de la substance, du laboratoire, de la classe ATC, de la marque ou année des retraits. Un premier clic le sélectionne, un second l’ouvre.',
          'Les nœuds se déplacent : glissez-les à la souris ou au doigt, ou utilisez les flèches du clavier ; « Réinitialiser la disposition » remet le dessin d’origine.',
          'Les boutons « Afficher » masquent ou montrent chaque couche (par exemple seulement les interactions, ou seulement les marques).',
          'Sous le dessin, les chiffres clés et un tableau de tous les liens, lisible aussi par un lecteur d’écran.',
        ],
      },
      { type: 'h2', title: '2. Les cas d’usage' },
      {
        type: 'table',
        headers: ['Cas d’usage', 'Question', 'Pour qui'],
        rows: [
          { cells: ['Interactions autour d’une substance', 'Avec quoi cette substance interagit-elle, et avec quelle gravité (contre-indication, association déconseillée, précaution d’emploi) ?', 'Pharmaciens, étudiants, pharmacovigilance'] },
          { cells: ['Dépendance à l’importation d’une classe', 'Quelles substances d’une classe sont fabriquées en Algérie, lesquelles sont importées, et de combien de pays ?', 'Décideurs, chercheurs, journalistes, distributeurs'] },
          { cells: ['Concentration du marché', 'Qui détient quelle part d’une classe ? Le marché est-il concentré (indice HHI) ?', 'Laboratoires, analystes, chercheurs'] },
          { cells: ['Qui commercialise quoi ?', 'Quelles marques pour une substance ? Quelles substances et marques pour un laboratoire ? Que fait tel laboratoire pour telle substance (substance + laboratoire) ?', 'Pharmaciens, représentants, grossistes'] },
          { cells: ['Après un retrait', 'Une marque est retirée : à quel laboratoire appartenait-elle, et qui a encore des enregistrements de la même substance ?', 'Pharmaciens, laboratoires, autorités'] },
        ],
      },
      { type: 'h2', title: '3. Les démos gratuites' },
      {
        type: 'paragraph',
        text: 'La page des graphes propose plusieurs démos par cas d’usage. Chacune est figée sur un exemple (la simvastatine pour les interactions, les hypolipémiants pour l’importation, les anti-inflammatoires pour la concentration, les marques de la metformine pour les médicaments…), ouverte sans compte, et montre les 8 nœuds les plus importants de chaque type. Elles suffisent à comprendre ce que l’on peut lire sur un graphe, et à juger de leur utilité pour votre activité.',
      },
      { type: 'h2', title: '4. L’explorateur payant' },
      {
        type: 'list',
        items: [
          'Toute substance de la nomenclature, toute classe ATC (en mode importation ou concentration) et tout laboratoire.',
          'Le croisement substance + laboratoire, ou classe + laboratoire : on ne garde que les enregistrements de ce laboratoire. Le laboratoire se tape en partie (« saidal » retrouve le nom exact).',
          'Jusqu’à 30 nœuds par type, au lieu de 8, et les marques de chaque substance.',
          '« Explorer ce nœud » recentre le graphe sur une substance, une classe ou un laboratoire voisin.',
          'Export CSV de tous les liens, pour vos propres analyses.',
          'Fiche PDF d’une substance : chiffres clés, graphe, laboratoires, marques, interactions classées par gravité, retraits (en français).',
        ],
      },
      { type: 'h2', title: '5. Comment demander l’accès' },
      {
        type: 'list',
        items: [
          'Ouvrez la page des graphes et descendez jusqu’au bloc « Explorateur complet ». Cliquez sur « Demander un abonnement ».',
          'Renseignez votre nom, votre adresse e-mail (celle de votre futur compte), éventuellement votre organisation et votre besoin : cas d’usage visé, substances ou laboratoires qui vous intéressent.',
          'Réglez par virement CCP ou par PayPal, uniquement. Indiquez l’adresse e-mail de votre demande en référence du paiement. Le tarif est communiqué sur demande.',
          'L’équipe active votre abonnement à réception du paiement et vous prévient par e-mail.',
          'Connectez-vous avec cette adresse : un lien à usage unique vous est envoyé, sans mot de passe. Ouvrez ensuite l’explorateur.',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Besoin d’un graphe ou d’une fiche précise (un laboratoire, une classe, une liste de substances) ? Dites-le dans le champ « Votre besoin » de la demande : le cas d’usage visé permet de vous répondre plus vite.',
      },
      { type: 'h2', title: '6. Lire les chiffres : définitions' },
      {
        type: 'table',
        headers: ['Terme', 'Définition retenue'],
        rows: [
          { cells: ['Enregistrement', 'Une ligne de la nomenclature (une présentation). C’est l’unité de comptage de tous les graphes.'] },
          { cells: ['Fabriqué en Algérie / importé', 'Selon le statut de la nomenclature (« F » = fabriqué), comme dans le comparateur du marché. Le pays d’origine est affiché à part.'] },
          { cells: ['Part de marché d’un laboratoire', 'Ses enregistrements divisés par ceux de la classe. Ce n’est pas une part de ventes : la nomenclature ne contient pas les volumes.'] },
          { cells: ['Indice HHI', 'Somme des carrés des parts en %, de 0 à 10 000. Sous 1 500 : peu concentré ; au-delà de 2 500 : très concentré.'] },
        ],
      },
      { type: 'h2', title: '7. Limites à connaître' },
      {
        type: 'list',
        items: [
          'Les graphes décrivent la nomenclature (ce qui est enregistré), pas les ventes ni la disponibilité en pharmacie.',
          'Un laboratoire écrit de deux façons dans la nomenclature compte pour deux : la concentration peut être sous-estimée.',
          'Les interactions viennent du Thesaurus de l’ANSM (France, 2023) ; une substance absente du thésaurus n’a pas d’interaction affichée, ce qui ne prouve pas qu’il n’y en a pas.',
          'Les textes de risque et de conduite à tenir de l’ANSM ne sont pas reproduits dans les graphes ni dans les PDF : ils figurent sur la fiche du médicament.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Information, pas une prescription. Les graphes ne remplacent pas l’avis d’un médecin ou d’un pharmacien.',
      },
    ],
  },
  {
    slug: 'graphes-medicaments-algerie-cas-usage-acces-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'الرسوم البيانية للمعرفة الدوائية في الجزائر: حالات الاستخدام وكيفية الولوج',
    subtitle: 'المواد الفعالة والأصناف ATC والمخابر والعلامات والتداخلات وعمليات السحب في رسم واحد',
    description:
      'ما الذي تعرضه رسوم DwaDZ، ولأي حالات استخدام (التداخلات، الاعتماد على الاستيراد، تركز السوق، من يسوّق ماذا، السحب)، وما محتوى العروض التجريبية المجانية والمستكشف المدفوع، وكيف تطلب الولوج.',
    seoTitle: 'الرسوم البيانية للمعرفة الدوائية في الجزائر: عروض مجانية ومستكشف وبطاقات PDF',
    seoKeywords: ['رسم بياني للمعرفة الدوائية', 'المدونة الوطنية للمنتجات الصيدلانية', 'تركز السوق الدوائي', 'الاعتماد على استيراد الأدوية الجزائر', 'التداخلات الدوائية', 'المخابر الصيدلانية الجزائر'],
    date: '2026-11-05',
    readingTime: 7,
    tags: ['رسوم بيانية', 'المدونة', 'حالات الاستخدام', 'التداخلات الدوائية', 'السوق الدوائي', 'أدوات'],
    sourceLinks: [
      { label: 'وزارة الصناعة الصيدلانية (MIPH): المدونة الوطنية', url: 'https://miph.gov.dz', external: true },
      { label: 'دليل التداخلات الدوائية (ANSM، سبتمبر 2023)', url: 'https://ansm.sante.fr/uploads/2024/06/07/20230915-thesaurus-interactions-medicamenteuses-septembre-2023.pdf', external: true },
    ],
    relatedLinks: [
      { label: 'فتح الرسوم وعروضها التجريبية المجانية', url: '/graphe' },
      { label: 'عرض: علامات الميتفورمين', url: '/graphe/demo/medicaments-metformine' },
      { label: 'عرض: هل سوق مضادات الالتهاب متركز؟', url: '/graphe/demo/concentration-ains' },
      { label: 'الفضاء المهني', url: '/pro' },
    ],
    faq: [
      {
        question: 'هل العروض التجريبية مجانية فعلًا؟',
        answer: 'نعم. هي مفتوحة للجميع دون حساب، وكل عرض يجيب عن سؤال محدد. تعرض أهم العقد من كل نوع، لمادة أو صنف أو مخبر مختار مسبقًا.',
      },
      {
        question: 'ماذا يضيف المستكشف المدفوع؟',
        answer: 'الاختيار الحر: أي مادة فعالة أو صنف ATC أو مخبر، وتقاطع مادة + مخبر، وحتى 30 عقدة من كل نوع، وإعادة التمركز بنقرة، وتصدير الروابط بصيغة CSV، وبطاقة PDF لمادة.',
      },
      {
        question: 'كيف أدفع؟',
        answer: 'عبر تحويل CCP أو عبر PayPal، وبإحدى هاتين الوسيلتين فقط. تجد البيانات في صفحة الرسوم أو تصلك عبر البريد الإلكتروني بعد طلبك.',
      },
      {
        question: 'كم يستغرق الحصول على الولوج؟',
        answer: 'التفعيل يدوي: يتم بعد استلام الدفع. يصلك بريد إلكتروني، ثم تسجل الدخول بعنوانك دون كلمة مرور.',
      },
      {
        question: 'هل تغني الرسوم عن رأي مهني صحي؟',
        answer: 'لا. هي لاستكشاف ومقارنة معطيات المدونة والتداخلات، وليست وصفة طبية ولا رأيًا طبيًا.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'الدواء ليس سطرًا في جدول: فهو يرتبط بمادة فعالة، تنتمي إلى صنف ATC، ويسجلها مخابر قادمة من بلد معين، مع تداخلات وأحيانًا عمليات سحب. ترسم رسوم DwaDZ هذه الروابط انطلاقًا من المدونة الوطنية ودليل التداخلات الدوائية الصادر عن ANSM، لتجيب بنظرة واحدة عن أسئلة تتطلب عادة عدة عمليات بحث.',
      },
      { type: 'h2', title: '1. ما الذي يعرضه الرسم' },
      {
        type: 'paragraph',
        text: 'في الوسط موضوع الاستعلام: مادة فعالة أو صنف ATC أو مخبر. وحوله جيرانه بالألوان: الصنف ATC، المخابر، الأدوية (العلامات)، بلدان المنشأ، شركاء التداخل (ودرجة الخطورة بخط متصل أو متقطع أو رفيع)، وعمليات السحب. كل عقدة مرتبطة بما تعتمد عليه، وحجمها يتبع وزنها (عدد التسجيلات أو الحصة في السوق).',
      },
      {
        type: 'list',
        items: [
          'العقدة التي تحمل ↗ تفتح صفحتها في الموقع: بطاقة المادة أو المخبر أو الصنف ATC أو العلامة أو سنة السحب. النقرة الأولى تحددها والثانية تفتحها.',
          'يمكن تحريك العقد: اسحبها بالفأرة أو بالإصبع أو استعمل أسهم لوحة المفاتيح؛ وزر «إعادة الترتيب الأصلي» يعيد الرسم كما كان.',
          'أزرار «عرض» تخفي أو تُظهر كل طبقة (مثلًا التداخلات فقط أو العلامات فقط).',
          'تحت الرسم الأرقام الرئيسية وجدول بكل الروابط، يقرؤه أيضًا قارئ الشاشة.',
        ],
      },
      { type: 'h2', title: '2. حالات الاستخدام' },
      {
        type: 'table',
        headers: ['حالة الاستخدام', 'السؤال', 'لمن'],
        rows: [
          { cells: ['التداخلات حول مادة فعالة', 'مع ماذا تتداخل هذه المادة وبأي درجة خطورة (مانع استعمال، اقتران غير مستحسن، احتياط عند الاستعمال)؟', 'الصيادلة، الطلبة، اليقظة الدوائية'] },
          { cells: ['الاعتماد على الاستيراد في صنف', 'أي مواد الصنف تُصنَّع في الجزائر وأيها يُستورد، ومن كم بلدًا؟', 'صناع القرار، الباحثون، الصحفيون، الموزعون'] },
          { cells: ['تركز السوق', 'من يملك أي حصة من صنف؟ وهل السوق متركز (مؤشر HHI)؟', 'المخابر، المحللون، الباحثون'] },
          { cells: ['من يسوّق ماذا؟', 'ما علامات مادة فعالة؟ وما مواد وعلامات مخبر؟ وماذا يقدّم مخبر معين لمادة معينة (مادة + مخبر)؟', 'الصيادلة، المندوبون، تجار الجملة'] },
          { cells: ['بعد السحب', 'سُحبت علامة: لأي مخبر كانت تعود، ومن لا يزال له تسجيل للمادة نفسها؟', 'الصيادلة، المخابر، السلطات'] },
        ],
      },
      { type: 'h2', title: '3. العروض التجريبية المجانية' },
      {
        type: 'paragraph',
        text: 'تقترح صفحة الرسوم عدة عروض لكل حالة استخدام. كل عرض مثبت على مثال (سيمفاستاتين للتداخلات، خافضات الدهون للاستيراد، مضادات الالتهاب للتركز، علامات الميتفورمين للأدوية…)، ومفتوح دون حساب، ويعرض أهم 8 عقد من كل نوع. وهي كافية لفهم ما يمكن قراءته على الرسم ولتقدير فائدته لنشاطك.',
      },
      { type: 'h2', title: '4. المستكشف المدفوع' },
      {
        type: 'list',
        items: [
          'أي مادة في المدونة، وأي صنف ATC (بوضع الاستيراد أو التركز)، وأي مخبر.',
          'التقاطع مادة + مخبر، أو صنف + مخبر: لا تبقى إلا تسجيلات هذا المخبر. ويمكن كتابة اسم المخبر جزئيًا («saidal» يجد الاسم الدقيق).',
          'حتى 30 عقدة من كل نوع بدل 8، وعلامات كل مادة.',
          '«استكشف هذه العقدة» يعيد تمركز الرسم على مادة أو صنف أو مخبر مجاور.',
          'تصدير كل الروابط بصيغة CSV لتحاليلك الخاصة.',
          'بطاقة PDF لمادة: الأرقام الرئيسية، الرسم، المخابر، العلامات، التداخلات مرتبة حسب الخطورة، عمليات السحب (بالفرنسية).',
        ],
      },
      { type: 'h2', title: '5. كيف تطلب الولوج' },
      {
        type: 'list',
        items: [
          'افتح صفحة الرسوم ونزّل إلى خانة «المستكشف الكامل». اضغط «اطلب اشتراكًا».',
          'اكتب اسمك وبريدك الإلكتروني (الذي سيكون عنوان حسابك)، واختياريًا مؤسستك وحاجتك: حالة الاستخدام المقصودة، والمواد أو المخابر التي تهمك.',
          'ادفع عبر تحويل CCP أو عبر PayPal فقط. اذكر البريد الإلكتروني الخاص بطلبك كمرجع للدفع. السعر عند الطلب.',
          'يفعّل الفريق اشتراكك عند استلام الدفع ويخبرك بالبريد الإلكتروني.',
          'سجّل الدخول بهذا العنوان: يصلك رابط لمرة واحدة دون كلمة مرور. ثم افتح المستكشف.',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'هل تحتاج إلى رسم أو بطاقة محددة (مخبر أو صنف أو قائمة مواد)؟ اذكر ذلك في خانة «حاجتك» ضمن الطلب: معرفة حالة الاستخدام تسمح بالرد عليك أسرع.',
      },
      { type: 'h2', title: '6. قراءة الأرقام: التعريفات' },
      {
        type: 'table',
        headers: ['المصطلح', 'التعريف المعتمد'],
        rows: [
          { cells: ['التسجيل', 'سطر في المدونة (شكل صيدلاني). وهو وحدة العد في كل الرسوم.'] },
          { cells: ['مصنّع في الجزائر / مستورد', 'حسب حالة المدونة («F» = مصنّع)، كما في مقارنة السوق. أما بلد المنشأ فيُعرض على حدة.'] },
          { cells: ['حصة المخبر في السوق', 'تسجيلاته مقسومة على تسجيلات الصنف. وهي ليست حصة مبيعات: فالمدونة لا تتضمن الكميات.'] },
          { cells: ['مؤشر HHI', 'مجموع مربعات الحصص بالنسبة المئوية، من 0 إلى 10 000. دون 1 500: تركز ضعيف؛ وفوق 2 500: تركز شديد.'] },
        ],
      },
      { type: 'h2', title: '7. حدود يجب معرفتها' },
      {
        type: 'list',
        items: [
          'تصف الرسوم المدونة (ما هو مسجل)، لا المبيعات ولا التوفر في الصيدلية.',
          'مخبر مكتوب بطريقتين في المدونة يُحسب مرتين: وقد يُقدَّر التركز بأقل من قيمته.',
          'التداخلات من دليل ANSM (فرنسا، 2023)؛ والمادة الغائبة عن الدليل لا تظهر لها تداخلات، وهذا لا يثبت أنه لا توجد.',
          'نصوص الخطر والسلوك الواجب من ANSM غير مستنسخة في الرسوم ولا في ملفات PDF: توجد في بطاقة الدواء.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'معلومة وليست وصفة. لا تغني الرسوم عن رأي الطبيب أو الصيدلي.',
      },
    ],
  },
]
