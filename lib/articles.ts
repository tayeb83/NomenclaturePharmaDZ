export type ArticleLang = 'fr' | 'ar'
export type ArticleAudience = 'professionnel' | 'etudiant'

export interface ArticleLink {
  label: string
  url: string
  external?: boolean
}

export interface ArticleFaq {
  question: string
  answer: string
}

export interface Article {
  slug: string
  lang: ArticleLang
  audience: ArticleAudience
  title: string
  subtitle: string
  description: string
  seoTitle?: string
  seoKeywords?: string[]
  date: string
  readingTime: number // minutes
  tags: string[]
  content: ArticleSection[]
  sourceLinks?: ArticleLink[]
  relatedLinks?: ArticleLink[]
  faq?: ArticleFaq[]
}

export interface ArticleSection {
  type: 'intro' | 'h2' | 'h3' | 'paragraph' | 'list' | 'table' | 'qcm' | 'callout'
  title?: string
  text?: string
  items?: string[]
  rows?: { cells: string[] }[]
  headers?: string[]
  questions?: QcmQuestion[]
  variant?: 'info' | 'warning' | 'tip'
}

export interface QcmQuestion {
  question: string
  options: { label: string; text: string }[]
  answer: string // label of correct answer
}

export const ARTICLES: Article[] = [
  {
    slug: 'loi-18-11-exercice-officinal-2026',
    lang: 'fr',
    audience: 'professionnel',
    title: 'Loi 18-11 et exercice officinal en Algérie : Ce qui change pour le titulaire en 2026',
    subtitle: 'Analyse réglementaire pratique pour les pharmaciens titulaires',
    description:
      'Décryptage de la Loi n°18-11 et des décrets d’application attendus en 2026 : installation, garde, traçabilité, Data Matrix et conformité de l’officine en Algérie.',
    seoTitle: 'Loi 18-11 en Algérie : obligations du pharmacien titulaire en 2026',
    seoKeywords: ['loi 18-11 algérie', 'pharmacien titulaire algérie', 'officine algérie 2026', 'garde pharmacie algérie'],
    date: '2026-03-01',
    readingTime: 8,
    tags: ['Loi 18-11', 'Réglementation officine', 'Pharmacien titulaire', 'MIPH', 'Algérie 2026'],
    sourceLinks: [
      { label: 'Télécharger le Journal Officiel (Loi 18-11)', url: 'https://www.joradp.dz/FTP/JO-FRANCAIS/2018/F2018046.pdf', external: true },
      { label: 'Consulter le site officiel du MIPH', url: 'https://www.miph.gov.dz/fr/', external: true },
    ],
    relatedLinks: [
      { label: 'Rechercher un médicament sous surveillance', url: '/recherche' },
      { label: 'Voir les derniers retraits officiels', url: '/alertes' },
      { label: 'Suivre les nouveautés réglementaires', url: '/veille' },
    ],
    faq: [
      {
        question: 'La Loi 18-11 change-t-elle le rôle du pharmacien titulaire ?',
        answer: 'Oui. Elle renforce son rôle sanitaire, sa présence effective et son obligation de conformité documentaire et technique au sein de l’officine.',
      },
      {
        question: 'Quels points doivent être vérifiés en priorité en 2026 ?',
        answer: 'Les titulaires doivent prioriser la garde, la traçabilité, la chaîne du froid, la gestion des périmés et la formalisation écrite des procédures internes.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Le paysage législatif de la pharmacie en Algérie connaît une accélération sans précédent. Si la Loi n°18-11 relative à la santé constitue le socle, les décrets d’application attendus pour 2026 viennent préciser les contours de votre exercice quotidien. Entre nouvelles règles d’installation, présence effective et réorganisation de la garde, voici l’analyse de PharmaVeille DZ pour anticiper ces mutations.',
      },
      {
        type: 'h2',
        title: '1. La Loi 18-11 : le nouveau cadre de référence de l’officine',
        text: 'La Loi 18-11 ne se limite plus à un texte de principe. Elle repositionne l’officine comme une structure de santé de proximité avec des obligations plus formalisées.',
      },
      {
        type: 'list',
        items: [
          '**Missions élargies** : le titulaire participe à l’éducation sanitaire, au bon usage du médicament et à l’orientation du patient.',
          '**Responsabilité renforcée** : la présence effective du titulaire, la qualité du stockage et la traçabilité des produits sensibles deviennent des axes centraux des inspections.',
          '**Gestion documentaire** : les procédures internes, registres et preuves de conformité doivent être accessibles et actualisés.',
        ],
      },
      {
        type: 'h2',
        title: '2. Vers une nouvelle carte pharmaceutique en 2026',
        text: 'Les projets de textes d’application cherchent à équilibrer deux impératifs parfois contradictoires :',
      },
      {
        type: 'list',
        items: [
          '**L’accessibilité territoriale** : augmenter le nombre d’officines dans les zones insuffisamment couvertes.',
          '**La viabilité économique** : éviter une fragmentation excessive de l’activité dans les zones déjà denses.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Point d’attention : une révision des critères de distance minimale ou de densité de population pourrait modifier la concurrence locale. Une veille des publications officielles du MIPH et du Journal Officiel reste indispensable.',
      },
      {
        type: 'h2',
        title: '3. Les 4 piliers de votre mise en conformité',
        text: 'Pour sécuriser votre exercice officinal, concentrez-vous sur les axes les plus opérationnels :',
      },
      {
        type: 'list',
        items: [
          '**Réorganisation de la garde** : préparez des plannings RH adaptés aux besoins réels de la commune et aux contraintes de continuité de service.',
          '**Statut du pharmacien assistant** : clarifiez les délégations de tâches, les horaires couverts et la supervision effective.',
          '**Digitalisation & traçabilité** : anticipez l’usage du Data Matrix, l’archivage numérique et la remontée des signalements de pharmacovigilance.',
          '**Auto-diagnostic interne** : formalisez la chaîne du froid, la gestion des périmés, les retours produits et les procédures de rappel.',
        ],
      },
      {
        type: 'h2',
        title: '4. Checklist express du titulaire',
        text: 'Avant toute inspection ou mise à jour réglementaire, vérifiez notamment :',
      },
      {
        type: 'list',
        items: [
          'La disponibilité des **SOP** et procédures signées.',
          'La présence des preuves de suivi de **température** et de maintenance.',
          'L’actualisation du **tableau de garde** et des relais d’équipe.',
          'La capacité à identifier rapidement un lot via **code Data Matrix** ou documents de traçabilité.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: '💡 Un doute sur un décret ou un retrait ? Croisez systématiquement vos procédures internes avec les sources officielles puis reliez l’article à vos pages Alertes, Veille et Recherche pour renforcer votre maillage interne SEO.',
      },
    ],
  },
  {
    slug: 'fiche-revision-reglementation-officine-algerie',
    lang: 'fr',
    audience: 'etudiant',
    title: 'Fiche de Révision : la réglementation de l’officine en Algérie (Loi 18-11)',
    subtitle: 'Essentiel pour les examens, stages et entretiens en pharmacie',
    description:
      'Résumé clair de la Loi n°18-11 pour les étudiants en pharmacie : définition légale de l’officine, rôle du titulaire et de l’assistant, installation, garde et QCM de révision.',
    seoTitle: 'Fiche de révision Loi 18-11 : réglementation de l’officine en Algérie',
    seoKeywords: ['fiche révision pharmacie algérie', 'loi 18-11 étudiant', 'officine algérie cours'],
    date: '2026-03-01',
    readingTime: 6,
    tags: ['Fiche de révision', 'Étudiant pharmacie', 'Loi 18-11', 'Officine Algérie', 'Législation'],
    sourceLinks: [
      { label: 'Télécharger le Journal Officiel (version FR)', url: 'https://www.joradp.dz/FTP/JO-FRANCAIS/2018/F2018046.pdf', external: true },
    ],
    relatedLinks: [
      { label: 'Comparer deux versions de la nomenclature', url: '/diff' },
      { label: 'Explorer la veille réglementaire', url: '/veille' },
    ],
    faq: [
      {
        question: 'Qui délivre l’autorisation d’ouverture d’une officine en Algérie ?',
        answer: 'Les autorités sanitaires compétentes, notamment la DSP et les instances ministérielles selon le cadre applicable.',
      },
      {
        question: 'Le pharmacien assistant peut-il remplacer définitivement le titulaire ?',
        answer: 'Non. Il exerce sous la responsabilité du titulaire et ne se substitue pas définitivement à lui sans cadre réglementaire spécifique.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Futurs confrères, la Loi n°18-11 est un texte pivot de votre cursus de législation pharmaceutique. Elle encadre votre futur métier, depuis l’ouverture de l’officine jusqu’à la responsabilité civile et pénale du pharmacien. Voici la synthèse à retenir.',
      },
      {
        type: 'h2',
        title: '🟢 1. Définition légale de l’officine',
        text: 'Selon la loi algérienne, l’officine est l’établissement destiné à la dispensation au détail des médicaments et des dispositifs médicaux.',
      },
      {
        type: 'list',
        items: [
          '**Exclusivité pharmaceutique** : seul le pharmacien peut détenir et préparer certains médicaments et préparations.',
          '**Mission de service public** : la garde et la continuité d’accès au médicament font partie de la fonction officinale.',
        ],
      },
      { type: 'h2', title: '🔵 2. Titulaire vs assistant' },
      {
        type: 'table',
        headers: ['Fonction', 'Responsabilité', 'Rôle clé'],
        rows: [
          { cells: ['Titulaire', 'Totale (technique, civile, pénale)', 'Détient l’agrément et garantit la présence effective ainsi que l’organisation globale.'] },
          { cells: ['Assistant', 'Sous l’autorité du titulaire', 'Seconde le titulaire dans la dispensation et l’organisation technique quotidienne.'] },
        ],
      },
      {
        type: 'h2',
        title: '🟡 3. Installation et autorisation',
        text: 'L’ouverture d’une pharmacie est encadrée et suppose notamment :',
      },
      {
        type: 'list',
        items: [
          '**Un agrément préalable** délivré par les autorités sanitaires compétentes.',
          '**Des critères géographiques et démographiques** pour encadrer l’implantation.',
          '**Des locaux conformes** aux exigences d’hygiène, de sécurité et d’organisation.',
        ],
      },
      {
        type: 'h2',
        title: '🔴 4. La garde : une obligation légale',
        text: 'Le service de garde garantit l’accès au médicament en dehors des horaires habituels. Le non-respect du tableau affiché peut entraîner des sanctions.',
      },
      { type: 'h2', title: '🧠 5. QCM rapide' },
      {
        type: 'qcm',
        questions: [
          {
            question: 'Qui délivre l’autorisation d’ouverture d’une officine en Algérie ?',
            options: [
              { label: 'A', text: 'La wilaya' },
              { label: 'B', text: 'Les autorités sanitaires compétentes (Ministère/DSP)' },
              { label: 'C', text: 'La chambre de commerce' },
            ],
            answer: 'B',
          },
          {
            question: 'Le pharmacien assistant peut-il remplacer définitivement le titulaire sans autorisation ?',
            options: [
              { label: 'A', text: 'Oui, s’il a plus de 5 ans d’expérience.' },
              { label: 'B', text: 'Non, il seconde le titulaire sous sa responsabilité.' },
            ],
            answer: 'B',
          },
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: '📚 Conseil SEO/contenu : cette fiche peut servir de page pilier et renvoyer vers des articles plus détaillés sur la garde, la pharmacovigilance et la traçabilité pour capter des requêtes longue traîne.',
      },
    ],
  },
  {
    slug: 'data-matrix-officine-algerie-checklist-2026',
    lang: 'fr',
    audience: 'professionnel',
    title: 'Data Matrix en officine en Algérie : checklist pratique pour 2026',
    subtitle: 'Traçabilité, réception des lots et organisation comptoir',
    description:
      'Guide pratique Data Matrix pour les pharmacies d’Algérie : réception, stockage, traçabilité, rappel de lots et bonnes pratiques pour préparer l’officine en 2026.',
    seoTitle: 'Data Matrix pharmacie Algérie : checklist officine 2026',
    seoKeywords: ['data matrix algérie', 'traçabilité pharmacie algérie', 'lot médicament algérie'],
    date: '2026-03-08',
    readingTime: 6,
    tags: ['Data Matrix', 'Traçabilité', 'Officine', 'Checklist', 'Pharmacie Algérie'],
    sourceLinks: [
      { label: 'Portail officiel MIPH', url: 'https://www.miph.gov.dz/fr/', external: true },
    ],
    relatedLinks: [
      { label: 'Accéder aux alertes de retraits', url: '/alertes' },
      { label: 'Consulter les nouveautés produits', url: '/veille' },
      { label: 'Rechercher une spécialité', url: '/recherche' },
    ],
    faq: [
      {
        question: 'Pourquoi le Data Matrix est-il important en officine ?',
        answer: 'Il facilite l’identification des lots, la traçabilité interne et la gestion plus rapide des rappels ou retraits de médicaments.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'La traçabilité devient un levier majeur de conformité et d’efficacité opérationnelle. Pour une officine, intégrer les bons réflexes autour du Data Matrix améliore la réception, le rangement, la dispensation et la gestion des rappels de lots.',
      },
      {
        type: 'h2',
        title: '1. Ce que le Data Matrix change concrètement',
        text: 'Au comptoir comme en réserve, il permet d’identifier plus vite le produit et d’associer chaque boîte à un lot et à une logique de suivi interne.',
      },
      {
        type: 'list',
        items: [
          '**Réception** : contrôle visuel et rapprochement documentaire des références livrées.',
          '**Stockage** : classement plus fiable par lot, date et rotation.',
          '**Retraits/rappels** : extraction rapide des boîtes concernées.',
        ],
      },
      {
        type: 'h2',
        title: '2. Checklist de mise en place',
        text: 'Voici les points à formaliser dans vos procédures :',
      },
      {
        type: 'list',
        items: [
          'Nommer un référent **traçabilité** dans l’équipe.',
          'Définir une procédure de **réception des lots** et de traitement des anomalies.',
          'Documenter le parcours des produits **sensibles** ou sous surveillance.',
          'Prévoir un protocole de **rappel de lot** relié à vos alertes réglementaires.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: '💡 Sur le plan SEO, cet article capte des recherches transactionnelles et informationnelles utiles : “Data Matrix pharmacie Algérie”, “traçabilité officine Algérie”, “rappel de lot médicament”.',
      },
    ],
  },
  {
    slug: 'pharmacovigilance-officine-algerie-guide-etudiant',
    lang: 'fr',
    audience: 'etudiant',
    title: 'Pharmacovigilance en officine en Algérie : guide simple pour étudiants et internes',
    subtitle: 'Comprendre le signalement, l’observation et le rôle du pharmacien',
    description:
      'Guide d’initiation à la pharmacovigilance en officine en Algérie : effets indésirables, réflexes de signalement, points à observer en stage et vocabulaire essentiel.',
    seoTitle: 'Pharmacovigilance officine Algérie : guide étudiant',
    seoKeywords: ['pharmacovigilance algérie étudiant', 'effet indésirable officine algérie'],
    date: '2026-03-10',
    readingTime: 5,
    tags: ['Pharmacovigilance', 'Étudiant', 'Officine', 'Effets indésirables', 'Stage'],
    sourceLinks: [
      { label: 'Portail officiel MIPH', url: 'https://www.miph.gov.dz/fr/', external: true },
    ],
    relatedLinks: [
      { label: 'Lire la fiche de révision sur la Loi 18-11', url: '/articles/fiche-revision-reglementation-officine-algerie' },
      { label: 'Explorer la veille réglementaire', url: '/veille' },
    ],
    faq: [
      {
        question: 'Qu’est-ce qu’un effet indésirable à retenir en stage ?',
        answer: 'C’est une réaction nocive et non voulue suspectée d’être liée à l’utilisation d’un médicament. En stage, l’objectif est surtout de savoir l’identifier, la documenter et la signaler selon le cadre applicable.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'La pharmacovigilance fait partie des compétences que les étudiants voient en cours, mais aussi en stage. En officine, il faut savoir reconnaître un signal, recueillir les informations essentielles et orienter le patient selon les procédures en vigueur.',
      },
      {
        type: 'h2',
        title: '1. Les réflexes à retenir',
        text: 'Devant un effet indésirable suspecté, la priorité est de recueillir une information utile, claire et exploitable.',
      },
      {
        type: 'list',
        items: [
          '**Identifier le médicament** suspect et le contexte d’utilisation.',
          '**Décrire l’effet observé** avec une chronologie simple.',
          '**Informer le titulaire ou l’encadrant** avant tout signalement formel.',
        ],
      },
      {
        type: 'h2',
        title: '2. Ce que vous pouvez observer en stage',
        text: 'Même sans être responsable du signalement final, vous pouvez apprendre à structurer l’observation clinique et documentaire.',
      },
      {
        type: 'list',
        items: [
          'Repérer les cas qui nécessitent une **escalade immédiate**.',
          'Comprendre la différence entre **mésusage**, **inefficacité** et **effet indésirable**.',
          'Voir comment l’officine archive les **preuves utiles** au dossier.',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: '📚 Cet article complète très bien une fiche de révision sur la Loi 18-11 et permet de travailler un champ lexical recherché par les étudiants : pharmacovigilance, effet indésirable, stage officine, rôle du pharmacien.',
      },
    ],
  },
  {
    slug: 'loi-18-11-exercice-officinal-2026-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'القانون 18-11 وممارسة مهنة الصيدلة في الجزائر: ما يجب على الصيدلي صاحب المحل معرفته في 2026',
    subtitle: 'تحليل تنظيمي عملي للصيادلة أصحاب المحلات',
    description:
      'قراءة عملية للقانون 18-11 والنصوص التطبيقية المنتظرة في 2026: شروط الاعتماد، المناوبة، التتبع، Data Matrix والامتثال القانوني داخل الصيدلية.',
    seoTitle: 'القانون 18-11 في الجزائر: التزامات الصيدلي صاحب المحل في 2026',
    seoKeywords: ['القانون 18-11 الجزائر', 'صيدلي صاحب المحل', 'تنظيم الصيدلية 2026'],
    date: '2026-03-01',
    readingTime: 8,
    tags: ['القانون 18-11', 'تنظيم الصيدليات', 'الصيدلي صاحب المحل', 'MIPH', 'الجزائر 2026'],
    sourceLinks: [
      { label: 'تحميل الجريدة الرسمية', url: 'https://www.joradp.dz/FTP/JO-ARABE/2018/A2018046.pdf', external: true },
      { label: 'الموقع الرسمي لوزارة الصناعة الصيدلانية', url: 'https://www.miph.gov.dz/ar/', external: true },
    ],
    relatedLinks: [
      { label: 'البحث عن دواء خاضع للمتابعة', url: '/recherche' },
      { label: 'متابعة آخر السحوبات الرسمية', url: '/alertes' },
      { label: 'الاطلاع على المستجدات التنظيمية', url: '/veille' },
    ],
    faq: [
      {
        question: 'هل غيّر القانون 18-11 دور الصيدلي صاحب المحل؟',
        answer: 'نعم، فقد عزز دوره الصحي وكرّس أهمية حضوره الفعلي وامتثاله الوثائقي والتقني داخل الصيدلية.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'يشهد المشهد التشريعي للصيدلة في الجزائر تسارعاً غير مسبوق. وبينما يشكل القانون رقم 18-11 المتعلق بالصحة القاعدة الأساسية، تأتي النصوص التطبيقية المنتظرة لعام 2026 لتحديد معالم ممارستكم اليومية. من شروط الاعتماد الجديدة إلى تنظيم المناوبة، إليكم تحليل منصة PharmaVeille DZ لاستباق هذه التحولات.',
      },
      {
        type: 'h2',
        title: '1. القانون 18-11: الإطار المرجعي الجديد للصيدلية',
        text: 'لم يعد القانون 18-11 مجرد نص نظري، بل أعاد تموقع الصيدلية كهيكل صحي جواري مع التزامات أكثر وضوحاً.',
      },
      {
        type: 'list',
        items: [
          '**مهام موسعة**: بالإضافة إلى صرف الأدوية، أصبح الصيدلي فاعلاً في التوعية الصحية والاستعمال العقلاني للدواء.',
          '**مسؤولية معززة**: الحضور الفعلي، جودة التخزين وتتبع المنتجات الحساسة أصبحت محاور أساسية في التفتيش.',
          '**تدبير وثائقي**: يجب أن تكون الإجراءات الداخلية والسجلات وأدلة الامتثال محدثة ومتاحة.',
        ],
      },
      {
        type: 'h2',
        title: '2. نحو خريطة صيدلانية جديدة في 2026',
        text: 'تهدف مشاريع النصوص التطبيقية إلى تحقيق توازن بين هدفين رئيسيين:',
      },
      {
        type: 'list',
        items: [
          '**التغطية الصحية**: زيادة عدد الصيدليات في المناطق الأقل تغطية.',
          '**الاستقرار الاقتصادي**: الحد من الاختلال في المناطق المشبعة.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'نقطة انتباه: مراجعة معايير المسافة الدنيا أو الكثافة السكانية قد تؤثر في المنافسة المحلية. لذلك تبقى متابعة الجريدة الرسمية وموقع الوزارة أمراً ضرورياً.',
      },
      {
        type: 'h2',
        title: '3. أربع ركائز للامتثال العملي',
        text: 'لضمان ممارسة أكثر أماناً، ركزوا على المحاور التالية:',
      },
      {
        type: 'list',
        items: [
          '**تنظيم المناوبة**: إعداد جداول بشرية مرنة تستجيب لحاجيات البلدية.',
          '**وضع الصيدلي المساعد**: توضيح المهام المفوضة وحدود الإشراف.',
          '**الرقمنة والتتبع**: الاستعداد لاستخدام Data Matrix وأرشفة التبليغات.',
          '**التقييم الذاتي**: توثيق سلسلة البرودة، الأدوية منتهية الصلاحية وإجراءات الاسترجاع.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: '💡 لتحسين السيو، اربطوا هذا المقال داخلياً بصفحات السحب، المستجدات والبحث عن الأدوية حتى يحصل الزائر ومحركات البحث على مسار محتوى متكامل.',
      },
    ],
  },
  {
    slug: 'fiche-revision-reglementation-officine-algerie-ar',
    lang: 'ar',
    audience: 'etudiant',
    title: 'بطاقة مراجعة: تنظيم الصيدليات في الجزائر وفق القانون 18-11',
    subtitle: 'ملخص عملي للامتحانات والتربصات',
    description:
      'ملخص منظم لطلاب الصيدلة حول القانون 18-11: التعريف القانوني للصيدلية، الفرق بين صاحب المحل والمساعد، شروط الفتح، المناوبة وأسئلة مراجعة سريعة.',
    seoTitle: 'بطاقة مراجعة القانون 18-11: تنظيم الصيدليات في الجزائر',
    seoKeywords: ['بطاقة مراجعة صيدلة', 'القانون 18-11 طالب صيدلة'],
    date: '2026-03-01',
    readingTime: 6,
    tags: ['بطاقة مراجعة', 'طالب صيدلة', 'القانون 18-11', 'صيدلية الجزائر', 'تشريع صيدلاني'],
    sourceLinks: [
      { label: 'تحميل الجريدة الرسمية', url: 'https://www.joradp.dz/FTP/JO-ARABE/2018/A2018046.pdf', external: true },
    ],
    relatedLinks: [
      { label: 'استكشاف المراقبة التنظيمية', url: '/veille' },
      { label: 'مقارنة نسخ التسمية الصيدلانية', url: '/diff' },
    ],
    faq: [
      {
        question: 'من يسلم رخصة فتح صيدلية في الجزائر؟',
        answer: 'تسلمها السلطات الصحية المختصة وفق الإطار التنظيمي المعمول به.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'زملائي المستقبليين، يعتبر القانون رقم 18-11 من أهم النصوص في مساركم الدراسي. فهو يؤطر الممارسة الصيدلانية من فتح الصيدلية إلى المسؤولية المدنية والجزائية. إليكم الخلاصة الأساسية.',
      },
      {
        type: 'h2',
        title: '🟢 1. التعريف القانوني للصيدلية',
        text: 'الصيدلية هي مؤسسة مخصصة لصرف الأدوية والمستلزمات الطبية بالتجزئة للجمهور.',
      },
      {
        type: 'list',
        items: [
          '**الحصرية**: الصيدلي هو المؤهل لحيازة وتحضير بعض الأدوية والتحضيرات.',
          '**الخدمة العمومية**: المناوبة جزء من استمرارية العلاج والوصول إلى الدواء.',
        ],
      },
      { type: 'h2', title: '🔵 2. صاحب المحل مقابل المساعد' },
      {
        type: 'table',
        headers: ['الوظيفة', 'المسؤولية', 'الدور الأساسي'],
        rows: [
          { cells: ['صاحب المحل', 'كاملة (تقنية، مدنية، جزائية)', 'صاحب الاعتماد ويضمن الحضور الفعلي والتنظيم العام.'] },
          { cells: ['المساعد', 'تحت سلطة صاحب المحل', 'يساعد في الصرف والتنظيم التقني اليومي.'] },
        ],
      },
      {
        type: 'h2',
        title: '🟡 3. شروط الفتح والاعتماد',
        text: 'فتح صيدلية في الجزائر يخضع لعدة شروط، منها:',
      },
      {
        type: 'list',
        items: [
          '**اعتماد مسبق** من السلطات الصحية المختصة.',
          '**معايير جغرافية وديموغرافية** تؤطر التموقع.',
          '**محل مطابق** لشروط السلامة والنظافة والتنظيم.',
        ],
      },
      {
        type: 'h2',
        title: '🔴 4. المناوبة: واجب قانوني',
        text: 'تضمن المناوبة وصول المواطن إلى الدواء خارج أوقات العمل العادية، وعدم احترامها قد يؤدي إلى عقوبات.',
      },
      { type: 'h2', title: '🧠 5. اختبر معلوماتك' },
      {
        type: 'qcm',
        questions: [
          {
            question: 'من يسلم رخصة فتح صيدلية في الجزائر؟',
            options: [
              { label: 'أ', text: 'الولاية' },
              { label: 'ب', text: 'السلطات الصحية المختصة (الوزارة/مديرية الصحة)' },
              { label: 'ج', text: 'الغرفة التجارية' },
            ],
            answer: 'ب',
          },
          {
            question: 'هل يمكن للصيدلي المساعد أن يعوض صاحب المحل نهائياً بدون ترخيص؟',
            options: [
              { label: 'أ', text: 'نعم، إذا كانت لديه خبرة كافية.' },
              { label: 'ب', text: 'لا، فهو يعمل تحت مسؤوليته فقط.' },
            ],
            answer: 'ب',
          },
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: '📚 تقنياً، وجود صفحات عربية واضحة مع lang="ar" وروابط متبادلة مع النسخة الفرنسية يساعد على تحسين الفهرسة وتجربة القراءة على الهاتف.',
      },
    ],
  },
  {
    slug: 'data-matrix-officine-algerie-checklist-2026-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'Data Matrix في الصيدلية بالجزائر: قائمة عملية للتحضير في 2026',
    subtitle: 'التتبع، استلام الدفعات وتنظيم العمل داخل الصيدلية',
    description:
      'دليل عملي للصيادلة في الجزائر حول Data Matrix: الاستلام، التخزين، التتبع وسرعة التعامل مع سحب الدفعات أو المنتجات.',
    seoTitle: 'Data Matrix في الصيدلية الجزائرية: قائمة امتثال 2026',
    seoKeywords: ['Data Matrix الجزائر', 'تتبع الأدوية الجزائر', 'دفعات الدواء'],
    date: '2026-03-08',
    readingTime: 6,
    tags: ['Data Matrix', 'التتبع', 'صيدلية', 'قائمة عملية', 'الجزائر'],
    sourceLinks: [
      { label: 'الموقع الرسمي لوزارة الصناعة الصيدلانية', url: 'https://www.miph.gov.dz/ar/', external: true },
    ],
    relatedLinks: [
      { label: 'الاطلاع على تنبيهات السحب', url: '/alertes' },
      { label: 'متابعة المستجدات', url: '/veille' },
    ],
    content: [
      {
        type: 'intro',
        text: 'أصبحت قابلية التتبع عنصراً أساسياً في الامتثال والكفاءة التشغيلية. وفي الصيدلية، يساعد اعتماد الممارسات الصحيحة المرتبطة بـ Data Matrix على تحسين الاستلام، التخزين، الصرف وإدارة سحب الدفعات.',
      },
      {
        type: 'h2',
        title: '1. ما الذي يغيّره Data Matrix عملياً؟',
        text: 'يساعد على التعرف السريع على المنتج وربطه بالدفعة ومسار التتبع الداخلي داخل الصيدلية.',
      },
      {
        type: 'list',
        items: [
          '**الاستلام**: مطابقة أوضح بين الوثائق والمنتجات.',
          '**التخزين**: فرز أكثر دقة حسب الدفعة والتاريخ.',
          '**السحب والاسترجاع**: تحديد أسرع للعلب المعنية.',
        ],
      },
      {
        type: 'h2',
        title: '2. قائمة تطبيق مختصرة',
        text: 'من الأفضل توثيق النقاط التالية في الإجراءات الداخلية:',
      },
      {
        type: 'list',
        items: [
          'تعيين مسؤول داخلي عن **التتبع**.',
          'وضع مسطرة **استلام الدفعات** ومعالجة الحالات غير المطابقة.',
          'توثيق مسار المنتجات **الحساسة** أو الخاضعة للمتابعة.',
          'ربط بروتوكول **سحب الدفعات** بصفحة التنبيهات الرسمية في الموقع.',
        ],
      },
    ],
  },
  {
    slug: 'pharmacovigilance-officine-algerie-guide-etudiant-ar',
    lang: 'ar',
    audience: 'etudiant',
    title: 'اليقظة الدوائية في الصيدلية بالجزائر: دليل مبسط للطلبة والمتربصين',
    subtitle: 'فهم التبليغ، الملاحظة ودور الصيدلي في الميدان',
    description:
      'مقدمة مبسطة لليقظة الدوائية في الصيدلية بالجزائر: التعرف على الأثر غير المرغوب فيه، ما الذي يجب ملاحظته في التربص، وكيفية بناء reflexe مهني صحيح.',
    seoTitle: 'اليقظة الدوائية في الصيدلية الجزائرية: دليل للطلبة',
    seoKeywords: ['اليقظة الدوائية الجزائر', 'أثر جانبي دواء طالب صيدلة'],
    date: '2026-03-10',
    readingTime: 5,
    tags: ['اليقظة الدوائية', 'طالب', 'صيدلية', 'أثر غير مرغوب فيه', 'تربص'],
    sourceLinks: [
      { label: 'الموقع الرسمي لوزارة الصناعة الصيدلانية', url: 'https://www.miph.gov.dz/ar/', external: true },
    ],
    relatedLinks: [
      { label: 'قراءة بطاقة مراجعة القانون 18-11', url: '/articles/fiche-revision-reglementation-officine-algerie-ar' },
      { label: 'استكشاف المستجدات التنظيمية', url: '/veille' },
    ],
    content: [
      {
        type: 'intro',
        text: 'تعتبر اليقظة الدوائية من المواضيع المهمة في الدراسة والتربص. داخل الصيدلية، يجب معرفة كيفية رصد الإشارة، جمع المعطيات الأساسية، ثم رفعها وفق الإطار المهني المعمول به.',
      },
      {
        type: 'h2',
        title: '1. reflexes أساسية',
        text: 'عند الاشتباه في أثر غير مرغوب فيه، ينبغي جمع معطيات مفيدة وواضحة.',
      },
      {
        type: 'list',
        items: [
          '**تحديد الدواء** المشتبه به وسياق استعماله.',
          '**وصف الأثر** وترتيبه الزمني بشكل مختصر.',
          '**إبلاغ المؤطر أو الصيدلي المسؤول** قبل أي إجراء رسمي.',
        ],
      },
      {
        type: 'h2',
        title: '2. ماذا تلاحظ في التربص؟',
        text: 'حتى لو لم تكن مسؤولاً عن التصريح النهائي، يمكنك تعلم كيفية بناء ملاحظة منظمة.',
      },
      {
        type: 'list',
        items: [
          'تمييز الحالات التي تحتاج إلى **تصعيد فوري**.',
          'فهم الفرق بين **سوء الاستعمال** و**الأثر غير المرغوب فيه**.',
          'معرفة كيفية حفظ **الأدلة المفيدة** في ملف الحالة.',
        ],
      },
    ],
  },
]

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find(a => a.slug === slug)
}

export function getArticlesByLang(lang: ArticleLang): Article[] {
  return ARTICLES.filter(a => a.lang === lang)
}

export function getFeaturedArticles(lang: ArticleLang, limit = 3): Article[] {
  return ARTICLES.filter(a => a.lang === lang).slice(0, limit)
}

export function getRelatedArticles(slug: string, lang: ArticleLang): Article[] {
  const current = getArticleBySlug(slug)
  return ARTICLES.filter(a => a.slug !== slug && a.lang === lang)
    .sort((a, b) => {
      const audienceScoreA = current && a.audience === current.audience ? 1 : 0
      const audienceScoreB = current && b.audience === current.audience ? 1 : 0
      return audienceScoreB - audienceScoreA
    })
    .slice(0, 3)
}
