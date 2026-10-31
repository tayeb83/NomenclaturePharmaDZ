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
        text: 'Le paysage législatif de la pharmacie en Algérie connaît une accélération sans précédent. Si la Loi n°18-11 relative à la santé constitue le socle, les décrets d’application attendus pour 2026 viennent préciser les contours de votre exercice quotidien. Entre nouvelles règles d’installation, présence effective et réorganisation de la garde, voici l’analyse de DwaDZ pour anticiper ces mutations.',
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
      'قراءة عملية للقانون 18-11 والنصوص التطبيقية المنتظرة في 2026: شروط الاعتماد، تنظيم المناوبة، التتبع، Data Matrix والامتثال القانوني داخل الصيدلية.',
    seoTitle: 'القانون 18-11 في الجزائر: التزامات الصيدلي صاحب المحل في 2026',
    seoKeywords: ['القانون 18-11 الجزائر', 'صيدلي صاحب المحل', 'تنظيم الصيدلية 2026'],
    date: '2026-03-01',
    readingTime: 8,
    tags: ['القانون 18-11', 'تنظيم الصيدليات', 'الصيدلي صاحب المحل', 'MIPH', 'الجزائر 2026'],
    sourceLinks: [
      { label: 'تحميل الجريدة الرسمية (القانون 18-11)', url: 'https://www.joradp.dz/FTP/JO-ARABE/2018/A2018046.pdf', external: true },
      { label: 'الموقع الرسمي لوزارة الصناعة الصيدلانية', url: 'https://www.miph.gov.dz/ar/', external: true },
    ],
    relatedLinks: [
      { label: 'البحث في قاعدة البيانات التنظيمية', url: '/recherche' },
      { label: 'متابعة آخر السحوبات الرسمية', url: '/alertes' },
      { label: 'الاطلاع على المستجدات التنظيمية', url: '/veille' },
    ],
    faq: [
      {
        question: 'هل غيّر القانون 18-11 دور الصيدلي صاحب المحل؟',
        answer: 'نعم. فقد أعاد تعريف الصيدلية كهيكل صحي جواري ووسّع دور الصيدلي ليتجاوز صرف الأدوية نحو التربية الصحية والاستخدام العقلاني للدواء.',
      },
      {
        question: 'ما هي الأولويات التي يجب التحقق منها أولاً في 2026؟',
        answer: 'الأولوية لتنظيم المناوبة، وضع الصيدلي المساعد، التتبع والرقمنة باستعمال Data Matrix، مع احترام شروط التخزين وتتبع المنتجات الحساسة.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'يشهد المشهد التشريعي للصيدلة في الجزائر تسارعاً غير مسبوق. وبينما يشكل القانون رقم 18-11 المتعلق بالصحة القاعدة الأساسية، تأتي النصوص التطبيقية المنتظرة لعام 2026 لتحديد معالم ممارستكم اليومية. من شروط الاعتماد الجديدة إلى تنظيم المناوبة، إليكم تحليل منصة DwaDZ لاستباق هذه التحولات.',
      },
      {
        type: 'h2',
        title: '1. القانون 18-11: الدعامة الأساسية لتنظيم الصيدليات',
        text: 'لم يعد القانون 18-11 مجرد نص نظري، بل أعاد تعريف الصيدلية كـ هيكل صحي جواري وليس مجرد محل تجاري.',
      },
      {
        type: 'list',
        items: [
          '**مهام موسعة**: بالإضافة إلى صرف الأدوية، أصبح الصيدلي فاعلاً في التربية الصحية والاستخدام العقلاني للدواء.',
          '**المسؤولية المباشرة**: يشدد القانون على الحضور الفعلي للصيدلي صاحب المحل. أصبح تتبع المنتجات الحساسة واحترام قواعد التخزين نقاطاً غير قابلة للتفاوض أثناء عمليات التفتيش.',
        ],
      },
      {
        type: 'h2',
        title: '2. نحو "خريطة صيدلانية" جديدة',
        text: 'تهدف مشاريع المراسيم قيد المناقشة لعام 2026 إلى تحقيق توازن بين هدفين:',
      },
      {
        type: 'list',
        items: [
          '**التغطية الصحية**: زيادة عدد الصيدليات في "مناطق الظل".',
          '**الاستقرار الاقتصادي**: الحفاظ على التوازن المالي للصيدليات القائمة حالياً.',
        ],
      },
      {
        type: 'h2',
        title: '3. الركائز الأربع للامتثال القانوني',
        text: 'لإدارة صيدليتكم بهدوء في ظل الإطار الجديد، إليكم المحاور ذات الأولوية:',
      },
      {
        type: 'list',
        items: [
          '**تنظيم المناوبة**: تتوقع النصوص الجديدة تكييف المناوبة حسب الاحتياجات الحقيقية للبلديات.',
          '**وضع الصيدلي المساعد**: توضيح دوره سيسهل عملية التوظيف مع فرض تحديد أدق للمهام المفوضة.',
          '**الرقمنة والتتبع**: استعدوا لإدراج نظام Data Matrix ورقمنة تقارير اليقظة الصيدلانية.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: '💡 هل لديكم شك حول مرسوم معين؟ راجعوا قاعدة بياناتنا التنظيمية المحينة دورياً عبر موقعنا.',
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
        answer: 'السلطات الصحية المختصة، سواء الوزارة أو مديرية الصحة، وفقاً للإطار التنظيمي المعمول به.',
      },
      {
        question: 'هل يمكن للصيدلي المساعد تعويض صاحب المحل نهائياً بدون رخصة؟',
        answer: 'لا، فهو يعاون صاحب المحل تحت مسؤوليته فقط ولا يمكنه الحلول محله نهائياً بدون إطار تنظيمي ورخصة مناسبة.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'زملائي المستقبليين، يعتبر القانون رقم 18-11 النص الأهم في مساركم الدراسي في تشريع الصيدلة. فهو يؤطر مهنتكم المستقبلية، من فتح الصيدلية إلى المسؤولية المدنية والجزائية. إليكم ملخص لأهم النقاط لامتحاناتكم وتربصاتكم.',
      },
      {
        type: 'h2',
        title: '🟢 1. التعريف القانوني للصيدلية',
        text: 'وفقاً للقانون الجزائري، الصيدلية هي مؤسسة مخصصة لصرف الأدوية والمستلزمات الطبية بالتجزئة للجمهور.',
      },
      {
        type: 'list',
        items: [
          '**الحصرية**: الصيدلي وحده هو المؤهل لحيازة وتحضير الأدوية (التحضيرات الوصفية والطبية).',
          '**المصلحة العامة**: تضمن الصيدلية مهمة الخدمة العمومية من خلال استمرارية العلاج (المناوبة).',
        ],
      },
      { type: 'h2', title: '🔵 2. الصيدلي صاحب المحل مقابل الصيدلي المساعد' },
      {
        type: 'table',
        headers: ['الوظيفة', 'المسؤولية', 'الدور الأساسي'],
        rows: [
          { cells: ['صاحب المحل', 'كاملة (تقنية، مدنية، جزائية)', 'صاحب الاعتماد، يجب أن يضمن الحضور الفعلي.'] },
          { cells: ['المساعد', 'تحت سلطة صاحب المحل', 'يعاون صاحب المحل، يشارك في الصرف والإدارة التقنية.'] },
        ],
      },
      {
        type: 'h2',
        title: '🟡 3. شروط الفتح والاعتماد',
        text: 'فتح صيدلية في الجزائر ليس حراً تماماً، بل يخضع لـ:',
      },
      {
        type: 'list',
        items: [
          '**اعتماد مسبق**: يسلم من طرف السلطات الصحية المختصة (الوزارة أو مديرية الصحة).',
          '**المقاييس الجغرافية**: تعتمد على عدد السكان (نسمة لكل صيدلية) والمسافة الدنيا بين الصيدليات.',
          '**المحل**: يجب أن يستوفي معايير صارمة من حيث المساحة، الأمن، والنظافة.',
        ],
      },
      {
        type: 'h2',
        title: '🔴 4. المناوبة: واجب قانوني',
        text: 'خدمة المناوبة إجبارية لضمان وصول المواطن للدواء خارج أوقات العمل الرسمية. وأي إخلال بجدول المناوبة المعلق قد يؤدي إلى عقوبات إدارية صارمة.',
      },
      { type: 'h2', title: '🧠 اختبر معلوماتك (سؤال وجواب)' },
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
            question: 'هل يمكن للصيدلي المساعد تعويض صاحب المحل نهائياً بدون رخصة؟',
            options: [
              { label: 'أ', text: 'نعم، إذا كان لديه خبرة أكثر من 5 سنوات.' },
              { label: 'ب', text: 'لا، فهو يعاون صاحب المحل تحت مسؤوليته فقط.' },
            ],
            answer: 'ب',
          },
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'نصائح تقنية لـ DwaDZ: SEO : تأكد من إضافة علامات lang="ar" في كود HTML الخاص بالصفحات العربية. الخطوط : استخدم خطوطاً عربية واضحة مثل Cairo أو Amiri لتسهيل القراءة على الهاتف. الربط : ضع زر "النسخة العربية" في أعلى المقال الفرنسي والعكس، لزيادة التفاعل.',
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
      { label: 'البحث عن تخصص دوائي', url: '/recherche' },
    ],
    faq: [
      {
        question: 'لماذا يعتبر Data Matrix مهماً داخل الصيدلية؟',
        answer: 'لأنه يسهل تحديد الدفعات، تحسين التتبع الداخلي، وتسريع التعامل مع سحب أو استرجاع الأدوية عند الحاجة.',
      },
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
      {
        type: 'callout',
        variant: 'tip',
        text: '💡 هذا المقال مناسب أيضاً لتحسين الظهور على كلمات بحث مثل “Data Matrix صيدلية الجزائر”، “تتبع الأدوية” و“سحب دفعات الدواء”.',
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
      'مقدمة مبسطة لليقظة الدوائية في الصيدلية بالجزائر: التعرف على الأثر غير المرغوب فيه، ما الذي يجب ملاحظته في التربص، وكيفية بناء رد فعل مهني صحيح.',
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
    faq: [
      {
        question: 'ما هو الأثر غير المرغوب فيه الذي يجب تذكره أثناء التربص؟',
        answer: 'هو تفاعل ضار وغير مقصود يُشتبه في ارتباطه باستعمال دواء. وخلال التربص، الأهم هو تعلم التعرف عليه، توثيقه، ثم رفعه وفق الإطار المعمول به.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'تعتبر اليقظة الدوائية من المواضيع المهمة في الدراسة والتربص. داخل الصيدلية، يجب معرفة كيفية رصد الإشارة، جمع المعطيات الأساسية، ثم رفعها وفق الإطار المهني المعمول به.',
      },
      {
        type: 'h2',
        title: '1. ردود فعل أساسية يجب تذكرها',
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
      {
        type: 'callout',
        variant: 'info',
        text: '📚 يكمل هذا المقال بطاقة مراجعة القانون 18-11، كما يساعد الطلبة على اكتساب مفردات مهنية مهمة مثل اليقظة الدوائية، الأثر غير المرغوب فيه، التربص ودور الصيدلي.',
      },
    ],
  },
  {
    slug: 'medicaments-cabinet-dentaire-algerie',
    lang: 'fr',
    audience: 'professionnel',
    title: 'Les médicaments du cabinet dentaire : comment s’y retrouver avec la nomenclature algérienne',
    subtitle: 'Classes ATC, DCI, RCP officiels : le repérage avant la prescription',
    description:
      'Chirurgiens-dentistes et étudiants : comment retrouver, par classe ATC, les médicaments de la nomenclature algérienne utilisés en dentisterie, et vérifier statut, retrait et RCP officiel.',
    seoTitle: 'Médicaments en dentisterie en Algérie : classes ATC et nomenclature',
    seoKeywords: ['médicaments dentisterie algérie', 'chirurgien-dentiste algérie', 'classes ATC dentaire', 'nomenclature pharmaceutique algérie', 'anesthésiques locaux algérie'],
    date: '2026-10-27',
    readingTime: 4,
    tags: ['Dentisterie', 'Classification ATC', 'Nomenclature MIPH', 'RCP ANPP', 'Algérie'],
    sourceLinks: [
      { label: 'Classification ATC de l’OMS (index officiel)', url: 'https://atcddd.fhi.no/atc_ddd_index/', external: true },
      { label: 'RCP publiés par l’ANPP', url: 'https://rcp.anpp.dz/', external: true },
      { label: 'Site officiel du MIPH', url: 'https://www.miph.gov.dz/fr/', external: true },
    ],
    relatedLinks: [
      { label: 'Médicaments par spécialité : la dentisterie', url: '/specialites/dentaire' },
      { label: 'Classes thérapeutiques (ATC)', url: '/classes-therapeutiques' },
      { label: 'Trouver un générique', url: '/substitution' },
      { label: 'Alertes et retraits', url: '/alertes' },
      { label: 'S’entraîner avec les QCM', url: '/training' },
    ],
    faq: [
      {
        question: 'Existe-t-il un code ATC pour la dentisterie ?',
        answer: 'Non. La classification ATC se fait par substance et par usage thérapeutique, pas par spécialité. Le groupe A01 (préparations stomatologiques) et le groupe N01B (anesthésiques locaux) sont les plus proches ; les antibactériens, analgésiques et anti-inflammatoires sont des classes transversales.',
      },
      {
        question: 'Cette liste est-elle une recommandation de prescription ?',
        answer: 'Non. Elle sert de repère pour naviguer dans la nomenclature. Une classe peut contenir des substances sans usage en dentisterie : le RCP officiel de chaque produit reste la référence.',
      },
      {
        question: 'Où trouver le RCP officiel d’un médicament en Algérie ?',
        answer: 'Sur le portail de l’ANPP (rcp.anpp.dz). Les fiches de DwaDZ renvoient vers le RCP quand le rattachement est établi.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Devant la nomenclature nationale, une question revient chez les chirurgiens-dentistes et les étudiants en médecine dentaire : par où commencer pour retrouver rapidement les médicaments de sa pratique ? Cet article propose une méthode de repérage, appuyée sur la classification ATC de l’OMS et sur les données officielles algériennes. Il ne contient aucune recommandation de prescription.',
      },
      {
        type: 'h2',
        title: '1. Il n’existe pas de code ATC « dentisterie »',
        text: 'La classification ATC range les substances selon l’organe visé et l’usage thérapeutique, jamais selon la spécialité de celui qui prescrit. Deux groupes sont toutefois proches de la pratique dentaire, auxquels s’ajoutent trois classes transversales.',
      },
      {
        type: 'table',
        headers: ['Code ATC', 'Classe', 'Ce qu’elle regroupe'],
        rows: [
          { cells: ['A01', 'Préparations stomatologiques', 'Produits à usage local buccal (par exemple A01AA : agents de prophylaxie carieuse, A01AB : antiseptiques et anti-infectieux locaux).'] },
          { cells: ['N01B', 'Anesthésiques locaux', 'Substances d’anesthésie locale.'] },
          { cells: ['J01', 'Antibactériens à usage systémique', 'Classe transversale, bien plus large que la dentisterie.'] },
          { cells: ['N02', 'Analgésiques', 'Classe transversale.'] },
          { cells: ['M01', 'Anti-inflammatoires et antirhumatismaux', 'Classe transversale.'] },
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Une classe n’est pas une recommandation : J01, N02 et M01 contiennent de nombreuses substances sans usage en dentisterie. Le classement sert à naviguer, pas à choisir un traitement.',
      },
      {
        type: 'h2',
        title: '2. Quatre gestes pour retrouver un médicament en Algérie',
        text: 'Dans DwaDZ, chacune de ces étapes s’appuie sur la nomenclature officielle du MIPH :',
      },
      {
        type: 'list',
        items: [
          '**Partir de la classe** : la page « Médicaments par spécialité » liste les classes de la dentisterie et renvoie vers chaque classe ATC, de la classe jusqu’à la substance.',
          '**Passer par la DCI** : une même substance existe sous plusieurs noms commerciaux. Cherchez la DCI, puis comparez les présentations (forme, dosage, laboratoire).',
          '**Vérifier le statut** : produit enregistré, non renouvelé ou retiré du marché. Les alertes et retraits sont consultables en un clic.',
          '**Ouvrir le RCP officiel** : le résumé des caractéristiques du produit publié par l’ANPP est la source de référence pour les indications, contre-indications et interactions.',
        ],
      },
      {
        type: 'h2',
        title: '3. Génériques, prix et disponibilité',
        text: 'Pour une substance donnée, la substitution générique montre les alternatives enregistrées et leur origine (fabriquées en Algérie ou importées). Le prix public algérien est affiché lorsqu’il est renseigné ; sinon la fiche l’indique. Aucune valeur n’est estimée.',
      },
      {
        type: 'h2',
        title: '4. Pour les étudiants',
        text: 'Les classes ATC et le lien marque, DCI et classe sont un excellent terrain de révision. L’espace Training propose des QCM construits à partir de la nomenclature : noms commerciaux, DCI, génériques, laboratoires, produits retirés et classes ATC.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Information à visée professionnelle, établie à partir de documents officiels. Elle ne remplace ni le RCP du produit, ni le jugement clinique du praticien.',
      },
    ],
  },
  {
    slug: 'medicaments-cabinet-dentaire-algerie-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'أدوية عيادة طب الأسنان: كيف تتنقل داخل التسمية الجزائرية للأدوية',
    subtitle: 'تصنيف ATC والاسم الدولي (DCI) وملخص خصائص المنتج: التعرّف قبل الوصف',
    description:
      'لأطباء الأسنان والطلبة: كيف تجد حسب صنف ATC أدوية التسمية الجزائرية المستعملة في طب الأسنان، وكيف تتحقق من حالتها وسحبها وملخص خصائص المنتج الرسمي.',
    seoTitle: 'أدوية طب الأسنان في الجزائر: أصناف ATC والتسمية الرسمية',
    seoKeywords: ['أدوية طب الأسنان الجزائر', 'طبيب أسنان الجزائر', 'تصنيف ATC', 'التسمية الصيدلانية الجزائرية', 'المخدرات الموضعية'],
    date: '2026-10-27',
    readingTime: 4,
    tags: ['طب الأسنان', 'تصنيف ATC', 'التسمية الصيدلانية', 'RCP', 'الجزائر'],
    sourceLinks: [
      { label: 'تصنيف ATC لمنظمة الصحة العالمية (الفهرس الرسمي)', url: 'https://atcddd.fhi.no/atc_ddd_index/', external: true },
      { label: 'ملخصات خصائص المنتج المنشورة من طرف الوكالة الوطنية للمنتجات الصيدلانية', url: 'https://rcp.anpp.dz/', external: true },
      { label: 'الموقع الرسمي لوزارة الصناعة الصيدلانية', url: 'https://www.miph.gov.dz/ar/', external: true },
    ],
    relatedLinks: [
      { label: 'الأدوية حسب التخصص: طب الأسنان', url: '/specialites/dentaire' },
      { label: 'الأصناف العلاجية (ATC)', url: '/classes-therapeutiques' },
      { label: 'البحث عن بديل جنيس', url: '/substitution' },
      { label: 'التنبيهات والأدوية المسحوبة', url: '/alertes' },
      { label: 'التدرّب بأسئلة الاختيار من متعدد', url: '/training' },
    ],
    faq: [
      {
        question: 'هل يوجد رمز ATC خاص بطب الأسنان؟',
        answer: 'لا. يُصنَّف الدواء في نظام ATC حسب المادة الفعالة والاستعمال العلاجي، لا حسب تخصص الواصف. أقرب مجموعتين هما A01 (مستحضرات الفم والأسنان) وN01B (المخدّرات الموضعية)، أما مضادات الجراثيم والمسكّنات ومضادات الالتهاب فأصناف مشتركة بين عدة تخصصات.',
      },
      {
        question: 'هل هذه القائمة توصية بالوصف؟',
        answer: 'لا. هي مرجع للتصفح داخل التسمية فقط. قد يحتوي الصنف على مواد لا تُستعمل في طب الأسنان، ويبقى ملخص خصائص المنتج الرسمي هو المرجع لكل دواء.',
      },
      {
        question: 'أين أجد ملخص خصائص المنتج الرسمي لدواء في الجزائر؟',
        answer: 'في بوابة الوكالة الوطنية للمنتجات الصيدلانية (rcp.anpp.dz). وتحيل بطاقات DwaDZ إلى الملخص كلما ثبت الربط بين البطاقة والوثيقة.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'أمام التسمية الوطنية للأدوية يتكرر سؤال لدى أطباء الأسنان وطلبة طب الأسنان: من أين نبدأ لنعثر بسرعة على أدوية ممارستنا؟ يقترح هذا المقال طريقة للتعرّف تعتمد على تصنيف ATC لمنظمة الصحة العالمية وعلى المعطيات الرسمية الجزائرية. وهو لا يتضمن أي توصية بالوصف.',
      },
      {
        type: 'h2',
        title: '1. لا يوجد رمز ATC «لطب الأسنان»',
        text: 'يرتّب تصنيف ATC المواد حسب العضو المستهدف والاستعمال العلاجي، ولا يرتّبها أبدًا حسب تخصص من يصفها. غير أن مجموعتين قريبتان من الممارسة السنّية، يُضاف إليهما ثلاثة أصناف مشتركة بين التخصصات.',
      },
      {
        type: 'table',
        headers: ['رمز ATC', 'الصنف', 'ما يشمله'],
        rows: [
          { cells: ['A01', 'مستحضرات الفم والأسنان', 'منتجات للاستعمال الموضعي في الفم (مثلًا A01AA: الوقاية من النخر، A01AB: مطهّرات ومضادات عدوى موضعية).'] },
          { cells: ['N01B', 'المخدّرات الموضعية', 'مواد التخدير الموضعي.'] },
          { cells: ['J01', 'مضادات الجراثيم للاستعمال الجهازي', 'صنف مشترك أوسع بكثير من طب الأسنان.'] },
          { cells: ['N02', 'المسكّنات', 'صنف مشترك.'] },
          { cells: ['M01', 'مضادات الالتهاب ومضادات الروماتيزم', 'صنف مشترك.'] },
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'الصنف ليس توصية: تضم الأصناف J01 وN02 وM01 مواد كثيرة لا تُستعمل في طب الأسنان. التصنيف وسيلة للتنقل وليس لاختيار علاج.',
      },
      {
        type: 'h2',
        title: '2. أربع خطوات للعثور على دواء في الجزائر',
        text: 'في DwaDZ تعتمد كل خطوة على التسمية الرسمية لوزارة الصناعة الصيدلانية:',
      },
      {
        type: 'list',
        items: [
          '**ابدأ من الصنف**: تعرض صفحة «الأدوية حسب التخصص» أصناف طب الأسنان وتحيل إلى كل صنف ATC، من الصنف إلى المادة الفعالة.',
          '**مرّ عبر الاسم الدولي (DCI)**: المادة الواحدة توجد بعدة أسماء تجارية. ابحث عن الـ DCI ثم قارن الأشكال والجرعات والمخابر.',
          '**تحقق من الحالة**: دواء مسجّل أو غير مجدَّد أو مسحوب من السوق. التنبيهات والأدوية المسحوبة متاحة بنقرة واحدة.',
          '**افتح ملخص خصائص المنتج الرسمي**: الوثيقة المنشورة من الوكالة الوطنية للمنتجات الصيدلانية هي المرجع للدواعي وموانع الاستعمال والتداخلات.',
        ],
      },
      {
        type: 'h2',
        title: '3. البدائل الجنيسة والأسعار والتوفر',
        text: 'بالنسبة لمادة فعالة معيّنة، تعرض صفحة الاستبدال الجنيس البدائل المسجّلة ومصدرها (مصنّعة في الجزائر أو مستوردة). ويظهر السعر العمومي الجزائري عندما يكون مُدخَلًا، وإلا تشير البطاقة إلى أنه غير متوفر. لا يُقدَّر أي سعر.',
      },
      {
        type: 'h2',
        title: '4. للطلبة',
        text: 'أصناف ATC والربط بين الاسم التجاري والـ DCI والصنف ميدان ممتاز للمراجعة. يوفر فضاء التدريب أسئلة اختيار من متعدد مبنية على التسمية: الأسماء التجارية، الـ DCI، الأدوية الجنيسة، المخابر، المنتجات المسحوبة وأصناف ATC.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'معلومات موجهة للمهنيين ومأخوذة من وثائق رسمية. لا تغني عن ملخص خصائص المنتج ولا عن التقدير السريري للممارس.',
      },
    ],
  },
  {
    slug: 'comparateur-medicaments-interactions-guide',
    lang: 'fr',
    audience: 'etudiant',
    title: 'Comparateur de médicaments : comprendre où et à quel niveau se produit une interaction',
    subtitle: 'Guide pas à pas de l’outil, avec des exemples (amiodarone, amoxicilline, morphine…)',
    description:
      'Comment utiliser le comparateur DwaDZ par nom de marque ou par substance, lire le schéma d’une interaction du Thesaurus ANSM (substance, classe, gravité) et trouver les partenaires d’un médicament. Exemples commentés.',
    seoTitle: 'Comparateur de médicaments DwaDZ : lire une interaction médicamenteuse (Thesaurus ANSM)',
    seoKeywords: ['comparateur de médicaments', 'interactions médicamenteuses', 'thesaurus ANSM', 'amiodarone simvastatine', 'pharmacie étudiant algérie'],
    date: '2026-10-27',
    readingTime: 7,
    tags: ['Comparateur', 'Interactions médicamenteuses', 'Thesaurus ANSM', 'Pédagogie', 'Outils'],
    sourceLinks: [
      { label: 'Thesaurus des interactions médicamenteuses (ANSM, septembre 2023)', url: 'https://ansm.sante.fr/uploads/2024/06/07/20230915-thesaurus-interactions-medicamenteuses-septembre-2023.pdf', external: true },
    ],
    relatedLinks: [
      { label: 'Ouvrir le comparateur de médicaments (accès limité)', url: '/outils/comparateur-medicaments' },
      { label: 'Tous les outils', url: '/outils' },
      { label: 'Rechercher un médicament', url: '/recherche' },
    ],
    faq: [
      {
        question: 'Peut-on comparer une marque et une substance ?',
        answer: 'Oui. Chaque côté du comparateur est au choix un nom de marque ou une substance, et les deux peuvent être mélangés.',
      },
      {
        question: 'Pourquoi le comparateur parle-t-il de substances et pas de marques ?',
        answer: 'Parce que le Thesaurus ANSM décrit les interactions par substance active, parfois par classe pharmacologique. Une marque en hérite à travers ses substances.',
      },
      {
        question: 'Que faire si je n’ai choisi qu’un seul médicament ?',
        answer: 'L’outil liste tous ses partenaires d’interaction, par gravité, et permet de choisir le second côté d’un clic : une substance, ou une marque qui la contient.',
      },
      {
        question: 'Aucune interaction signalée veut-elle dire qu’il n’y en a pas ?',
        answer: 'Non. Le thésaurus ne couvre pas toutes les associations. L’outil ne remplace pas l’avis d’un médecin ou d’un pharmacien.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Une interaction médicamenteuse ne se joue pas entre deux boîtes, mais entre des substances. Le comparateur de DwaDZ rend ce passage visible : il montre, pour chaque interaction, quelle substance de chaque médicament est en cause, si le lien passe par une classe pharmacologique, et quelle est la gravité. C’est un outil de compréhension autant que de consultation.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Le comparateur est un outil à accès limité : la demande se fait par e-mail depuis la page de l’outil, avec validation manuelle. Les interactions viennent du Thesaurus de l’ANSM (France, septembre 2023), reproduit tel quel.',
      },
      { type: 'h2', title: '1. Choisir ses deux côtés : marque ou substance' },
      {
        type: 'paragraph',
        text: 'Chaque côté a deux onglets : « Nom de marque » et « Substance ». Avec une marque, on retrouve la fiche complète (forme, dosage, laboratoire, prix, classe ATC) et, entre deux marques, un tableau côte à côte avec les différences en surbrillance. Avec une substance, on compare directement les principes actifs, ce qui convient pour réviser un cours sans penser à la marque. On peut aussi mélanger : une marque contre une substance.',
      },
      {
        type: 'list',
        items: [
          'Marque : tapez le nom commercial (ex. CORDARONE) ; l’outil retrouve sa substance (amiodarone).',
          'Substance : tapez la DCI (ex. amiodarone) ; les titres du thésaurus, y compris les classes, sont proposés.',
          'Le bouton « Inverser » échange les deux côtés ; « Comparer » lance l’analyse.',
        ],
      },
      { type: 'h2', title: '2. Lire le schéma d’une interaction' },
      {
        type: 'paragraph',
        text: 'Sous chaque carte d’interaction, un schéma montre les deux côtés. Les substances concernées sont en plein ; les autres substances d’une association sont atténuées. Au centre, la gravité. Une étiquette donne le niveau du rapprochement et une phrase l’explique.',
      },
      {
        type: 'table',
        headers: ['Niveau du rapprochement', 'Ce que cela signifie'],
        rows: [
          { cells: ['Substance ↔ substance', 'Le thésaurus cite directement les deux substances. C’est le cas le plus précis.'] },
          { cells: ['Substance ↔ classe', 'Une des deux substances est visée à travers sa classe : l’interaction vaut pour tous les membres de la classe.'] },
          { cells: ['Classe ↔ classe', 'Les deux extrémités passent par une classe.'] },
        ],
      },
      { type: 'h2', title: '3. Exemples commentés' },
      { type: 'h3', title: 'Exemple 1 : amiodarone + simvastatine (substance ↔ substance)' },
      {
        type: 'paragraph',
        text: 'Choisissez « amiodarone » d’un côté et « simvastatine » de l’autre (ou leurs marques). Le thésaurus traite directement le couple : précaution d’emploi. Le risque est une augmentation des effets indésirables musculaires de la simvastatine, de type rhabdomyolyse ; la conduite à tenir est de ne pas dépasser 20 mg/j de simvastatine, ou d’utiliser une autre statine non concernée. Le bloc « Comprendre l’interaction » liste aussi les classes de chaque substance (antiarythmiques, statines, substrats à risque du CYP3A4…), sans qu’elles soient ici à l’origine du lien.',
      },
      { type: 'h3', title: 'Exemple 2 : amoxicilline + méthotrexate (substance ↔ classe)' },
      {
        type: 'paragraph',
        text: 'Choisissez « AMOXICILLINE TRIHYDRATE EXPRIMÉ EN AMOXICILLINE » d’un côté (8 médicaments dans la nomenclature) et « MÉTHOTREXATE » de l’autre (3 médicaments). Le thésaurus n’écrit pas de ligne au nom de l’amoxicilline : la ligne est écrite pour la classe des pénicillines, dont elle est membre, et vise le méthotrexate nommément. L’outil l’indique : « Substance ↔ classe ». Résultat : association déconseillée, car les pénicillines inhibent la sécrétion tubulaire rénale du méthotrexate et augmentent sa toxicité hématologique. À noter : une DCI écrite « sel exprimé en base » donne deux écritures (le sel et la base), toutes deux rattachées à la classe, car on ne sait pas laquelle le thésaurus emploie.',
      },
      { type: 'h3', title: 'Exemple 3 : morphine + aripiprazole (classe ↔ classe, et ligne composée)' },
      {
        type: 'paragraph',
        text: 'Morphine sulfate (4 médicaments) et aripiprazole (32 médicaments) sont deux membres de la classe des médicaments sédatifs (43 substances). Aucune des deux n’est citée : c’est le rapprochement de la classe avec elle-même qui crée l’interaction, d’où l’étiquette « Classe ↔ classe ». Le risque : majoration de la dépression centrale ; l’altération de la vigilance peut rendre dangereuses la conduite de véhicules et l’utilisation de machines.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Attention à la lecture : cette ligne du thésaurus est composée. Elle regroupe plusieurs niveaux, et la carte affiche le plus grave (contre-indication) à côté des autres. La « conduite à tenir » dit lequel s’applique : pour deux médicaments sédatifs entre eux, c’est « à prendre en compte » ; la contre-indication ne concerne que l’oxybate de sodium avec les opiacés ou les barbituriques, et l’oxybate avec les autres sédatifs est déconseillé. Toujours lire la conduite à tenir, pas seulement l’étiquette.',
      },
      { type: 'h2', title: '4. Un seul médicament choisi : trouver ses partenaires' },
      {
        type: 'paragraph',
        text: 'Si vous remplissez un côté seulement, l’outil ouvre le panneau « Ce qui interagit avec … » : tous les partenaires du thésaurus, classés par gravité, avec un filtre par gravité et une recherche par nom (ex. rifampicine). Pour chaque partenaire :',
      },
      {
        type: 'list',
        items: [
          '« Choisir cette substance » la place dans l’autre côté.',
          '« Marques » déplie les marques de la nomenclature algérienne qui contiennent cette substance : un clic remplit le second côté.',
          'Pour une classe (ex. anticoagulants oraux), « Substances de la classe » déplie ses membres : une classe ne se compare pas directement, on choisit l’un d’eux.',
        ],
      },
      { type: 'h2', title: '5. Les quatre gravités' },
      {
        type: 'table',
        headers: ['Gravité', 'Lecture'],
        rows: [
          { cells: ['⊗ Contre-indication', 'Ne jamais associer.'] },
          { cells: ['▲ Association déconseillée', 'À éviter, sauf si le bénéfice attendu l’emporte nettement ; surveillance étroite.'] },
          { cells: ['◆ Précaution d’emploi', 'Association possible en respectant les mesures indiquées (surveillance, adaptation de dose).'] },
          { cells: ['○ À prendre en compte', 'Risque à garder à l’esprit, sans conduite systématique.'] },
        ],
      },
      { type: 'h2', title: '6. Limites à connaître' },
      {
        type: 'list',
        items: [
          'Le thésaurus est français et date de septembre 2023 : la disponibilité des spécialités diffère en Algérie.',
          'Le rapprochement entre une substance de la nomenclature et le thésaurus est automatique ; une substance absente du thésaurus est signalée comme telle, jamais devinée.',
          'Aucune interaction signalée ne signifie pas absence d’interaction.',
          'Les traductions arabes des lignes du thésaurus sont en cours de relecture ; à défaut, le texte français d’origine s’affiche.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Information, pas une prescription. Ces interactions ne remplacent pas l’avis d’un médecin ou d’un pharmacien.',
      },
    ],
  },
  {
    slug: 'comparateur-medicaments-interactions-guide-ar',
    lang: 'ar',
    audience: 'etudiant',
    title: 'مقارنة الأدوية: فهم موضع التداخل الدوائي ومستواه',
    subtitle: 'دليل خطوة بخطوة لاستعمال الأداة، مع أمثلة (أميودارون، أموكسيسيلين، مورفين…)',
    description:
      'كيف تستعمل مقارنة DwaDZ بالاسم التجاري أو بالمادة الفعالة، وكيف تقرأ مخطط التداخل في دليل ANSM (المادة، الصنف، الخطورة)، وكيف تجد الأدوية المتداخلة مع دواء ما. أمثلة مشروحة.',
    seoTitle: 'مقارنة الأدوية DwaDZ: قراءة التداخل الدوائي (دليل ANSM)',
    seoKeywords: ['مقارنة الأدوية', 'التداخلات الدوائية', 'دليل ANSM', 'أميودارون سيمفاستاتين', 'صيدلة الجزائر'],
    date: '2026-10-27',
    readingTime: 7,
    tags: ['مقارنة الأدوية', 'التداخلات الدوائية', 'دليل ANSM', 'تعليم', 'أدوات'],
    sourceLinks: [
      { label: 'دليل التداخلات الدوائية (ANSM، سبتمبر 2023)', url: 'https://ansm.sante.fr/uploads/2024/06/07/20230915-thesaurus-interactions-medicamenteuses-septembre-2023.pdf', external: true },
    ],
    relatedLinks: [
      { label: 'فتح مقارنة الأدوية (ولوج محدود)', url: '/outils/comparateur-medicaments' },
      { label: 'كل الأدوات', url: '/outils' },
      { label: 'البحث عن دواء', url: '/recherche' },
    ],
    faq: [
      {
        question: 'هل يمكن مقارنة اسم تجاري بمادة فعالة؟',
        answer: 'نعم. كل جهة في الأداة هي إما اسم تجاري أو مادة فعالة، ويمكن الخلط بينهما.',
      },
      {
        question: 'لماذا تتحدث الأداة عن المواد وليس عن الأسماء التجارية؟',
        answer: 'لأن دليل ANSM يصف التداخلات حسب المادة الفعالة، وأحيانًا حسب الصنف الدوائي. ويرث الاسم التجاري التداخلات عبر مواده.',
      },
      {
        question: 'ماذا أفعل إذا اخترت دواءً واحدًا فقط؟',
        answer: 'تعرض الأداة كل شركاء التداخل مرتبين حسب الخطورة، ويمكن اختيار الجهة الثانية بنقرة: مادة، أو اسم تجاري يحتويها.',
      },
      {
        question: 'هل غياب التداخل المُعلَن يعني أنه لا يوجد تداخل؟',
        answer: 'لا. الدليل لا يغطي كل التركيبات، والأداة لا تغني عن رأي الطبيب أو الصيدلي.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'لا يحدث التداخل الدوائي بين علبتين، بل بين مواد فعالة. وتُظهر أداة المقارنة في DwaDZ هذا الانتقال: تبيّن لكل تداخل أي مادة من كل دواء هي المعنية، وهل يمر الرابط عبر صنف دوائي، وما درجة الخطورة. إنها أداة للفهم بقدر ما هي أداة للاطلاع.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'أداة المقارنة ذات ولوج محدود: يُطلب الولوج بالبريد الإلكتروني من صفحة الأداة، ثم يُتحقق منه يدويًا. والتداخلات مأخوذة من دليل ANSM الفرنسي (سبتمبر 2023) كما هو.',
      },
      { type: 'h2', title: '1. اختيار الجهتين: اسم تجاري أو مادة فعالة' },
      {
        type: 'paragraph',
        text: 'لكل جهة تبويبان: «اسم تجاري» و«مادة فعالة». مع الاسم التجاري تظهر البطاقة الكاملة (الشكل، الجرعة، المخبر، الثمن، الفئة ATC)، وبين اسمين تجاريين يُعرض جدول جنبًا إلى جنب تُبرَز فيه الفروق. ومع المادة الفعالة تقارن المواد مباشرة، وهو مناسب لمراجعة درس دون التفكير في الاسم التجاري. ويمكن الخلط: اسم تجاري مقابل مادة فعالة.',
      },
      {
        type: 'list',
        items: [
          'اسم تجاري: اكتب الاسم (مثل CORDARONE) فتجد الأداة مادته الفعالة (أميودارون).',
          'مادة فعالة: اكتب الاسم الدولي (مثل amiodarone) فتُقترح عناوين الدليل، ومنها الأصناف.',
          'زر «عكس» يبدّل الجهتين، وزر «قارن» يبدأ التحليل.',
        ],
      },
      { type: 'h2', title: '2. قراءة مخطط التداخل' },
      {
        type: 'paragraph',
        text: 'تحت كل بطاقة تداخل مخطط يبيّن الجهتين. تظهر المواد المعنية بلون ممتلئ، وتبهت بقية مواد التركيبة. وفي الوسط درجة الخطورة. وتحدد علامة مستوى المطابقة، وتشرحه جملة.',
      },
      {
        type: 'table',
        headers: ['مستوى المطابقة', 'المعنى'],
        rows: [
          { cells: ['مادة ↔ مادة', 'يذكر الدليل المادتين مباشرة. وهذه أدق حالة.'] },
          { cells: ['مادة ↔ صنف', 'إحدى المادتين مستهدفة عبر صنفها: يسري التداخل على كل أفراد الصنف.'] },
          { cells: ['صنف ↔ صنف', 'يمر الطرفان معًا عبر صنف.'] },
        ],
      },
      { type: 'h2', title: '3. أمثلة مشروحة' },
      { type: 'h3', title: 'المثال 1: أميودارون + سيمفاستاتين (مادة ↔ مادة)' },
      {
        type: 'paragraph',
        text: 'اختر «أميودارون» في جهة و«سيمفاستاتين» في الأخرى (أو اسميهما التجاريين). يعالج الدليل الزوج مباشرة: احتياطات الاستعمال. الخطر هو زيادة الآثار العضلية غير المرغوبة للسيمفاستاتين من نوع انحلال العضلات المخطّطة، والسلوك الواجب اتباعه هو عدم تجاوز 20 ملغ/يوم من السيمفاستاتين، أو استعمال ستاتين آخر غير معني. ويسرد مربع «فهم التداخل» أيضًا أصناف كل مادة (مضادات اضطراب النظم، الستاتينات، ركائز الـCYP3A4 عالية الخطورة…) دون أن تكون هنا أصل الرابط.',
      },
      { type: 'h3', title: 'المثال 2: أموكسيسيلين + ميثوتريكسات (مادة ↔ صنف)' },
      {
        type: 'paragraph',
        text: 'اختر «AMOXICILLINE TRIHYDRATE EXPRIMÉ EN AMOXICILLINE» في جهة (8 أدوية في التسمية) و«MÉTHOTREXATE» في الأخرى (3 أدوية). لا يكتب الدليل سطرًا باسم الأموكسيسيلين: السطر مكتوب لصنف البنسيلينات الذي تنتمي إليه، ويستهدف الميثوتريكسات بالاسم. وتبيّن الأداة ذلك: «مادة ↔ صنف». والنتيجة: جمع غير موصى به، لأن البنسيلينات تثبّط الإفراز الأنبوبي الكلوي للميثوتريكسات وتزيد سميته الدموية. ملاحظة: عندما يُكتب الاسم الدولي «ملح معبَّر عنه بالقاعدة» تظهر كتابتان (الملح والقاعدة) وتُربط كلتاهما بالصنف، لأننا لا نعرف أيهما يستعمل الدليل.',
      },
      { type: 'h3', title: 'المثال 3: مورفين + أريبيبرازول (صنف ↔ صنف، وسطر مركّب)' },
      {
        type: 'paragraph',
        text: 'كبريتات المورفين (4 أدوية) والأريبيبرازول (32 دواءً) عضوان في صنف الأدوية المهدّئة (43 مادة). لا تُذكر أي منهما بالاسم: مطابقة الصنف مع نفسه هي التي تُنشئ التداخل، ومن هنا علامة «صنف ↔ صنف». الخطر: زيادة تثبيط الجهاز العصبي المركزي؛ واضطراب اليقظة قد يجعل قيادة المركبات واستعمال الآلات خطيرين.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'انتبه عند القراءة: هذا السطر في الدليل مركّب. فهو يجمع عدة مستويات، وتعرض البطاقة الأشد خطورة (مضاد استطباب) إلى جانب الباقي. و«السلوك الواجب اتباعه» هو الذي يحدد ما ينطبق: بين دواءين مهدّئين يكون المستوى «يؤخذ بعين الاعتبار»؛ أما مضاد الاستطباب فيخص أوكسيبات الصوديوم مع الأفيونيات أو الباربيتورات، وأوكسيبات الصوديوم مع المهدّئات الأخرى جمعٌ غير موصى به. اقرأ دائمًا السلوك الواجب اتباعه، لا العلامة وحدها.',
      },
      { type: 'h2', title: '4. اختيار دواء واحد: العثور على شركائه' },
      {
        type: 'paragraph',
        text: 'إذا ملأت جهة واحدة فقط، تفتح الأداة لوحة «ما يتداخل مع …»: كل شركاء الدليل مرتبين حسب الخطورة، مع تصفية حسب الخطورة وبحث بالاسم (مثل ريفامبيسين). ولكل شريك:',
      },
      {
        type: 'list',
        items: [
          '«اختيار هذه المادة» تضعها في الجهة الأخرى.',
          '«الأسماء التجارية» تعرض الأسماء التجارية في التسمية الجزائرية التي تحتوي هذه المادة: نقرة واحدة تملأ الجهة الثانية.',
          'بالنسبة إلى صنف (مثل مضادات التخثر الفموية) تعرض «مواد الصنف» أفراده: لا يُقارَن الصنف مباشرة، بل نختار أحد أفراده.',
        ],
      },
      { type: 'h2', title: '5. درجات الخطورة الأربع' },
      {
        type: 'table',
        headers: ['الخطورة', 'القراءة'],
        rows: [
          { cells: ['⊗ مضاد استطباب', 'لا يجوز الجمع أبدًا.'] },
          { cells: ['▲ جمع غير موصى به', 'يُتجنَّب إلا إذا رجحت الفائدة المنتظرة بوضوح، مع مراقبة دقيقة.'] },
          { cells: ['◆ احتياطات الاستعمال', 'الجمع ممكن مع احترام التدابير المذكورة (مراقبة، تعديل الجرعة).'] },
          { cells: ['○ يؤخذ بعين الاعتبار', 'خطر يُحتفظ به في الذهن دون سلوك محدد.'] },
        ],
      },
      { type: 'h2', title: '6. حدود يجب معرفتها' },
      {
        type: 'list',
        items: [
          'الدليل فرنسي ويعود إلى سبتمبر 2023، وتوفر الأدوية في الجزائر يختلف.',
          'مطابقة مادة التسمية مع الدليل آلية؛ والمادة غير الواردة في الدليل يُشار إليها كذلك ولا تُخمَّن.',
          'عدم الإشارة إلى تداخل لا يعني انعدامه.',
          'ترجمة سطور الدليل إلى العربية قيد المراجعة؛ وعند غيابها يظهر النص الفرنسي الأصلي.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'معلومة وليست وصفة طبية. لا تغني هذه التداخلات عن استشارة الطبيب أو الصيدلي.',
      },
    ],
  },
  {
    slug: 'medicaments-par-specialite-codes-atc',
    lang: 'fr',
    audience: 'professionnel',
    title: 'Médicaments par spécialité : 18 portes d’entrée dans la nomenclature algérienne, construites avec les codes ATC',
    subtitle: 'Comment DwaDZ regroupe les classes ATC par spécialité médicale, avec des exemples à ouvrir sur le site',
    description:
      'Cardiologie, diabétologie, neurologie, dermatologie… : la méthode de construction des spécialités de DwaDZ à partir de la classification ATC de l’OMS, ses limites et des exemples concrets.',
    seoTitle: 'Médicaments par spécialité en Algérie : classes ATC et nomenclature',
    seoKeywords: ['médicaments par spécialité algérie', 'classification ATC spécialité', 'nomenclature pharmaceutique algérie', 'cardiologie ATC', 'classes thérapeutiques algérie'],
    date: '2026-10-31',
    readingTime: 8,
    tags: ['Spécialités', 'Classification ATC', 'Nomenclature MIPH', 'Algérie'],
    sourceLinks: [
      { label: 'Classification ATC de l’OMS (index officiel)', url: 'https://atcddd.fhi.no/atc_ddd_index/', external: true },
      { label: 'RCP publiés par l’ANPP', url: 'https://rcp.anpp.dz/', external: true },
      { label: 'Site officiel du MIPH', url: 'https://www.miph.gov.dz/fr/', external: true },
    ],
    relatedLinks: [
      { label: 'Toutes les spécialités', url: '/specialites' },
      { label: 'Cardiologie', url: '/specialites/cardiologie' },
      { label: 'Diabétologie / Endocrinologie', url: '/specialites/diabetologie' },
      { label: 'Psychiatrie', url: '/specialites/psychiatrie' },
      { label: 'Dermatologie', url: '/specialites/dermatologie' },
      { label: 'Classes thérapeutiques (ATC)', url: '/classes-therapeutiques' },
    ],
    faq: [
      {
        question: 'Pourquoi une même classe apparaît-elle dans plusieurs spécialités ?',
        answer: 'Parce que l’ATC classe par usage thérapeutique, pas par prescripteur. Les corticoïdes systémiques (H02), les bisphosphonates (M05) ou les myorelaxants (M03) servent à plusieurs spécialités. Les totaux d’une spécialité comptent chaque substance et chaque fiche une seule fois.',
      },
      {
        question: 'Une spécialité est-elle une liste de médicaments à prescrire ?',
        answer: 'Non. C’est un repère de navigation. Une classe peut contenir des substances sans rapport avec la pratique de la spécialité : le RCP officiel de chaque produit reste la référence.',
      },
      {
        question: 'Comment les compteurs sont-ils calculés ?',
        answer: 'À chaque affichage, à partir de la nomenclature : les substances rattachées aux codes ATC de la spécialité, puis les fiches enregistrées qui portent ces DCI. Rien n’est saisi à la main.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Après la dentisterie, DwaDZ propose désormais 18 spécialités : de la cardiologie à l’imagerie. Chacune est une porte d’entrée vers les classes de médicaments de la nomenclature algérienne qui s’y rattachent. Cet article explique comment elles ont été construites à partir des codes ATC de l’OMS, ce que cela permet, et surtout ce que cela ne dit pas.',
      },
      {
        type: 'h2',
        title: '1. Le principe : une spécialité = un ensemble de codes ATC',
        text: 'Le code ATC se lit en cinq niveaux : le groupe anatomique (une lettre), le sous-groupe thérapeutique (2 chiffres), le sous-groupe pharmacologique (une lettre), le sous-groupe chimique (une lettre) et la substance (2 chiffres).',
      },
      {
        type: 'table',
        headers: ['Niveau', 'Exemple', 'Signification'],
        rows: [
          { cells: ['1', 'A', 'Voies digestives et métabolisme'] },
          { cells: ['2', 'A10', 'Médicaments du diabète'] },
          { cells: ['3', 'A10B', 'Hypoglycémiants, hors insulines'] },
          { cells: ['4', 'A10BA', 'Biguanides'] },
          { cells: ['5', 'A10BA02', 'Metformine'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Une spécialité DwaDZ ne stocke aucune information médicale : elle liste des préfixes (par exemple A10 ou N05A). Tout ce qui commence par ce préfixe en fait partie. Les substances sont rattachées aux codes ATC, puis les fiches de la nomenclature aux substances : les listes, prix et RCP affichés sont ceux du reste du site.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Exemple à ouvrir : la classe A10 sur /classes-therapeutiques/A10 liste les médicaments du diabète ; la spécialité /specialites/diabetologie la regroupe avec les hormones hypophysaires et thyroïdiennes (H01 à H05) et les médicaments de l’os (M05).',
      },
      {
        type: 'h2',
        title: '2. Les 18 spécialités et leurs classes',
        text: 'Le tableau donne le périmètre retenu pour chaque spécialité. Chaque ligne est consultable sur /specialites/ suivi de l’identifiant.',
      },
      {
        type: 'table',
        headers: ['Spécialité', 'Classes ATC', 'Remarque'],
        rows: [
          { cells: ['Dentisterie (dentaire)', 'A01, N01B, J01, N02, M01', 'Point de départ : stomatologie, anesthésiques locaux, plus trois classes transversales.'] },
          { cells: ['Cardiologie (cardiologie)', 'C01 à C10, B01', 'Les antithrombotiques (B01) sont rattachés à la cardiologie.'] },
          { cells: ['Diabétologie / Endocrinologie (diabetologie)', 'A10, H01 à H05, M05', 'H02 (corticoïdes) est partagé avec d’autres spécialités.'] },
          { cells: ['Pneumologie / Allergologie (pneumologie)', 'R03, R05, R06', 'R01 (décongestionnants nasaux) va en ORL.'] },
          { cells: ['Gastro-entérologie / Hépatologie (gastro-enterologie)', 'A02 à A07, A09, A16, J05AP', 'J05AP : antiviraux de l’hépatite C.'] },
          { cells: ['Infectiologie (infectiologie)', 'J01, J02, J04, J05, P01, P02', 'Antibactériens, antifongiques, antituberculeux, antiviraux, antiparasitaires.'] },
          { cells: ['Neurologie (neurologie)', 'N03, N04, N02C, N06D, N07', 'N02C : antimigraineux ; N06D : médicaments de la démence.'] },
          { cells: ['Psychiatrie (psychiatrie)', 'N05A, N05B, N05C, N06A', 'N05AN : lithium, au sein des antipsychotiques N05A.'] },
          { cells: ['Rhumatologie (rhumatologie)', 'M01, M03, M04, M05, L04', 'L04 : immunosuppresseurs et biothérapies.'] },
          { cells: ['Dermatologie (dermatologie)', 'D01 à D11', 'D07 corticoïdes locaux, D10 acné, D05 psoriasis.'] },
          { cells: ['Ophtalmologie (ophtalmologie)', 'S01, S03', 'S03 : formes ophtalmo-otologiques.'] },
          { cells: ['ORL (orl)', 'S02, R01, R02', 'Petit périmètre.'] },
          { cells: ['Gynécologie-obstétrique (gynecologie)', 'G01, G02, G03, H01BB', 'G03 contient les contraceptifs ; H01BB : ocytociques.'] },
          { cells: ['Urologie / Néphrologie (urologie-nephrologie)', 'G04, B03, A11CC, V03AE', 'Périmètre néphrologie plus hétérogène.'] },
          { cells: ['Oncologie (oncologie)', 'L01, L02, L03', 'Cytotoxiques, hormonothérapies, immunostimulants.'] },
          { cells: ['Hématologie (hematologie)', 'B02, B03', 'Antihémorragiques et antianémiques (B03 aussi en néphrologie).'] },
          { cells: ['Anesthésie-réanimation / Urgences (anesthesie-reanimation)', 'N01, N02A, M03, B05, V03AB', 'V03AB : antidotes.'] },
          { cells: ['Imagerie / Radiologie (imagerie)', 'V08, V09', 'Produits de contraste et radiopharmaceutiques.'] },
        ],
      },
      {
        type: 'h2',
        title: '3. Trois cas qui montrent la méthode',
        text: 'Les exemples ci-dessous se vérifient en ouvrant la page indiquée.',
      },
      {
        type: 'h3',
        title: 'Cardiologie : une plage de codes',
        text: 'C01 (cardiothérapie), C02 (antihypertenseurs), C03 (diurétiques), C04 (vasodilatateurs périphériques), C05, C07 (bêtabloquants), C08 (inhibiteurs calciques), C09 (système rénine-angiotensine) et C10 (hypolipémiants), auxquels s’ajoute B01 (antithrombotiques). Le code C06 n’existe plus dans l’ATC, c’est pourquoi la plage C01 à C10 compte neuf classes. Pages : /specialites/cardiologie et /classes-therapeutiques/C09.',
      },
      {
        type: 'h3',
        title: 'Psychiatrie : descendre d’un niveau',
        text: 'Les neuroleptiques sont N05A, les anxiolytiques N05B, les hypnotiques N05C et les antidépresseurs N06A. Le lithium (N05AN01) n’a pas de classe propre dans la spécialité : il est déjà couvert par N05A. Descendre d’un niveau, c’est possible : il suffit d’ajouter N05AN seul pour une spécialité plus étroite. Page : /specialites/psychiatrie.',
      },
      {
        type: 'h3',
        title: 'Gastro-entérologie : un code précis dans un groupe réservé à l’infectiologie',
        text: 'La spécialité retient A02 à A07, A09 et A16, mais aussi J05AP, les antiviraux directs de l’hépatite C, qui relèvent du groupe J (anti-infectieux). La même logique, inversée, s’applique à l’infectiologie : J05 entier, donc J05AP aussi. Une substance peut donc apparaître dans deux spécialités sans doublon dans les totaux. Pages : /specialites/gastro-enterologie et /specialites/infectiologie.',
      },
      {
        type: 'h2',
        title: '4. Les limites à connaître',
        text: '',
      },
      {
        type: 'list',
        items: [
          '**L’ATC classe des substances, pas des prescripteurs.** Une classe transversale comme J01 (antibactériens) figure en dentisterie et en infectiologie ; elle contient des produits sans usage dans l’une ou l’autre.',
          '**Les classes se recoupent.** H02 (corticoïdes), M05, B03 ou M03 apparaissent dans plusieurs spécialités. C’est voulu, et les totaux ne comptent chaque fiche qu’une fois.',
          '**Oncologie et hématologie sont séparées**, parce que le volume de L01 à L03 est important ; B03 reste commun avec la néphrologie.',
          '**Les spécialités sont modifiables.** L’administration permet d’ajouter ou de retirer une classe ou une substance précise, avec un contrôle de l’existence du code et de la DCI dans la base.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Le classement sert à naviguer, pas à choisir un traitement. Il ne remplace ni le RCP officiel, ni le jugement clinique du praticien.',
      },
      {
        type: 'h2',
        title: '5. Comment s’en servir',
        text: '',
      },
      {
        type: 'list',
        items: [
          '**Ouvrez /specialites** et choisissez votre spécialité : le nombre de classes, de substances et de fiches est calculé à partir de la nomenclature.',
          '**Descendez dans la classe** (par exemple N03 pour les antiépileptiques) jusqu’à la substance, puis à la fiche du produit.',
          '**Comparez les génériques** de la substance, vérifiez le statut (enregistré, non renouvelé, retiré) et ouvrez le RCP publié par l’ANPP.',
        ],
      },
    ],
  },
  {
    slug: 'medicaments-par-specialite-codes-atc-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'الأدوية حسب التخصص: 18 مدخلًا إلى التسمية الجزائرية مبنيّة على رموز ATC',
    subtitle: 'كيف تجمع DwaDZ أصناف ATC حسب التخصص الطبي، مع أمثلة يمكن فتحها في الموقع',
    description:
      'أمراض القلب، السكري، الأعصاب، الجلد…: طريقة بناء تخصصات DwaDZ انطلاقًا من تصنيف ATC لمنظمة الصحة العالمية، وحدودها وأمثلة ملموسة.',
    seoTitle: 'الأدوية حسب التخصص في الجزائر: أصناف ATC والتسمية الرسمية',
    seoKeywords: ['الأدوية حسب التخصص الجزائر', 'تصنيف ATC', 'التسمية الصيدلانية الجزائرية', 'الأصناف العلاجية', 'أمراض القلب'],
    date: '2026-10-31',
    readingTime: 8,
    tags: ['التخصصات', 'تصنيف ATC', 'التسمية الصيدلانية', 'الجزائر'],
    sourceLinks: [
      { label: 'تصنيف ATC لمنظمة الصحة العالمية (الفهرس الرسمي)', url: 'https://atcddd.fhi.no/atc_ddd_index/', external: true },
      { label: 'ملخصات خصائص المنتج المنشورة من طرف الوكالة الوطنية للمنتجات الصيدلانية', url: 'https://rcp.anpp.dz/', external: true },
      { label: 'الموقع الرسمي لوزارة الصناعة الصيدلانية', url: 'https://www.miph.gov.dz/ar/', external: true },
    ],
    relatedLinks: [
      { label: 'جميع التخصصات', url: '/specialites' },
      { label: 'أمراض القلب', url: '/specialites/cardiologie' },
      { label: 'السكري والغدد الصماء', url: '/specialites/diabetologie' },
      { label: 'الطب النفسي', url: '/specialites/psychiatrie' },
      { label: 'الأمراض الجلدية', url: '/specialites/dermatologie' },
      { label: 'الأصناف العلاجية (ATC)', url: '/classes-therapeutiques' },
    ],
    faq: [
      {
        question: 'لماذا يظهر الصنف نفسه في عدة تخصصات؟',
        answer: 'لأن تصنيف ATC يرتّب حسب الاستعمال العلاجي لا حسب الواصف. فالكورتيكوئيدات الجهازية (H02) والبيسفوسفونات (M05) ومرخيات العضلات (M03) تُستعمل في عدة تخصصات. وتُحسب كل مادة وكل بطاقة مرة واحدة فقط في مجاميع التخصص.',
      },
      {
        question: 'هل التخصص قائمة أدوية للوصف؟',
        answer: 'لا. هو مرجع للتصفح فقط. قد يضم الصنف مواد لا علاقة لها بممارسة التخصص، ويبقى ملخص خصائص المنتج الرسمي هو المرجع لكل دواء.',
      },
      {
        question: 'كيف تُحسب الأعداد المعروضة؟',
        answer: 'عند كل عرض انطلاقًا من التسمية: المواد المرتبطة برموز ATC الخاصة بالتخصص، ثم البطاقات المسجّلة التي تحمل هذه الأسماء الدولية. لا يُدخَل شيء يدويًا.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'بعد طب الأسنان، تقترح DwaDZ اليوم 18 تخصصًا، من أمراض القلب إلى التصوير الطبي. كل تخصص مدخل إلى أصناف الأدوية في التسمية الجزائرية المرتبطة به. يشرح هذا المقال كيف بُنيت انطلاقًا من رموز ATC لمنظمة الصحة العالمية، وما الذي تتيحه، وخصوصًا ما لا تقوله.',
      },
      {
        type: 'h2',
        title: '1. المبدأ: التخصص = مجموعة من رموز ATC',
        text: 'يُقرأ رمز ATC على خمسة مستويات: المجموعة التشريحية (حرف)، المجموعة العلاجية (رقمان)، المجموعة الدوائية (حرف)، المجموعة الكيميائية (حرف)، ثم المادة الفعالة (رقمان).',
      },
      {
        type: 'table',
        headers: ['المستوى', 'مثال', 'المعنى'],
        rows: [
          { cells: ['1', 'A', 'الجهاز الهضمي والاستقلاب'] },
          { cells: ['2', 'A10', 'أدوية السكري'] },
          { cells: ['3', 'A10B', 'خافضات سكر الدم عدا الأنسولين'] },
          { cells: ['4', 'A10BA', 'البيغوانيدات'] },
          { cells: ['5', 'A10BA02', 'ميتفورمين'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'لا يخزّن التخصص في DwaDZ أي معلومة طبية: هو قائمة بادئات (مثل A10 أو N05A)، وكل رمز يبدأ بها ينتمي إلى التخصص. تُربط المواد برموز ATC، ثم بطاقات التسمية بالمواد: فالقوائم والأسعار وملخصات الخصائص المعروضة هي نفسها في بقية الموقع.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'مثال للفتح: الصنف A10 في /classes-therapeutiques/A10 يضم أدوية السكري، أما التخصص /specialites/diabetologie فيجمعه مع هرمونات النخامية والغدة الدرقية (H01 إلى H05) وأدوية العظام (M05).',
      },
      {
        type: 'h2',
        title: '2. التخصصات الثمانية عشر وأصنافها',
        text: 'يعرض الجدول النطاق المعتمد لكل تخصص. يمكن فتح كل سطر على العنوان /specialites/ متبوعًا بالمعرّف.',
      },
      {
        type: 'table',
        headers: ['التخصص', 'أصناف ATC', 'ملاحظة'],
        rows: [
          { cells: ['طب الأسنان (dentaire)', 'A01, N01B, J01, N02, M01', 'نقطة الانطلاق: مستحضرات الفم، المخدّرات الموضعية، وثلاثة أصناف مشتركة.'] },
          { cells: ['أمراض القلب (cardiologie)', 'C01 إلى C10، B01', 'مضادات التخثر (B01) ملحقة بأمراض القلب.'] },
          { cells: ['السكري والغدد الصماء (diabetologie)', 'A10, H01 إلى H05, M05', 'H02 (الكورتيكوئيدات) مشترك مع تخصصات أخرى.'] },
          { cells: ['أمراض الرئة والحساسية (pneumologie)', 'R03, R05, R06', 'R01 (مزيلات احتقان الأنف) في الأنف والأذن والحنجرة.'] },
          { cells: ['الجهاز الهضمي والكبد (gastro-enterologie)', 'A02 إلى A07، A09، A16، J05AP', 'J05AP: مضادات فيروسات التهاب الكبد C.'] },
          { cells: ['الأمراض المعدية (infectiologie)', 'J01, J02, J04, J05, P01, P02', 'مضادات الجراثيم والفطريات والسل والفيروسات والطفيليات.'] },
          { cells: ['طب الأعصاب (neurologie)', 'N03, N04, N02C, N06D, N07', 'N02C: أدوية الشقيقة؛ N06D: أدوية الخرف.'] },
          { cells: ['الطب النفسي (psychiatrie)', 'N05A, N05B, N05C, N06A', 'N05AN: الليثيوم ضمن مضادات الذهان N05A.'] },
          { cells: ['أمراض الروماتيزم (rhumatologie)', 'M01, M03, M04, M05, L04', 'L04: مثبطات المناعة والعلاجات البيولوجية.'] },
          { cells: ['الأمراض الجلدية (dermatologie)', 'D01 إلى D11', 'D07 كورتيكوئيدات موضعية، D10 حب الشباب، D05 الصدفية.'] },
          { cells: ['طب العيون (ophtalmologie)', 'S01, S03', 'S03: أشكال العين والأذن.'] },
          { cells: ['الأنف والأذن والحنجرة (orl)', 'S02, R01, R02', 'نطاق صغير.'] },
          { cells: ['أمراض النساء والتوليد (gynecologie)', 'G01, G02, G03, H01BB', 'G03 يضم وسائل منع الحمل؛ H01BB: مقوّيات الطلق.'] },
          { cells: ['المسالك البولية وأمراض الكلى (urologie-nephrologie)', 'G04, B03, A11CC, V03AE', 'نطاق أمراض الكلى أكثر تنوعًا.'] },
          { cells: ['طب الأورام (oncologie)', 'L01, L02, L03', 'مثبطات الخلايا، العلاج الهرموني، منبهات المناعة.'] },
          { cells: ['أمراض الدم (hematologie)', 'B02, B03', 'مضادات النزف ومضادات فقر الدم (B03 مشترك مع أمراض الكلى).'] },
          { cells: ['التخدير والإنعاش والاستعجالات (anesthesie-reanimation)', 'N01, N02A, M03, B05, V03AB', 'V03AB: الأدوية المضادة للسموم.'] },
          { cells: ['التصوير الطبي والأشعة (imagerie)', 'V08, V09', 'مواد التباين والمستحضرات الصيدلانية الإشعاعية.'] },
        ],
      },
      {
        type: 'h2',
        title: '3. ثلاث حالات توضح الطريقة',
        text: 'يمكن التحقق من الأمثلة التالية بفتح الصفحة المذكورة.',
      },
      {
        type: 'h3',
        title: 'أمراض القلب: نطاق من الرموز',
        text: 'C01 (علاج القلب)، C02 (خافضات الضغط)، C03 (مدرّات البول)، C04 (موسّعات الأوعية المحيطية)، C05، C07 (حاصرات بيتا)، C08 (حاصرات الكالسيوم)، C09 (جهاز الرينين-أنجيوتنسين) وC10 (خافضات الدهون)، ويُضاف إليها B01 (مضادات التخثر). الرمز C06 لم يعد موجودًا في ATC، ولهذا يضم النطاق C01 إلى C10 تسعة أصناف. الصفحات: /specialites/cardiologie و/classes-therapeutiques/C09.',
      },
      {
        type: 'h3',
        title: 'الطب النفسي: النزول مستوى واحدًا',
        text: 'مضادات الذهان هي N05A، ومضادات القلق N05B، والمنوّمات N05C، ومضادات الاكتئاب N06A. أما الليثيوم (N05AN01) فلا صنف خاص به في التخصص لأن N05A يغطيه. ويمكن النزول مستوى واحدًا: يكفي إضافة N05AN وحده لتخصص أضيق. الصفحة: /specialites/psychiatrie.',
      },
      {
        type: 'h3',
        title: 'الجهاز الهضمي: رمز دقيق داخل مجموعة المضادات للعدوى',
        text: 'يعتمد التخصص A02 إلى A07 وA09 وA16، وكذلك J05AP، أي مضادات فيروسات التهاب الكبد C المباشرة، وهي تنتمي إلى المجموعة J. وينطبق المنطق نفسه في الاتجاه المعاكس على الأمراض المعدية: J05 كاملًا ومنه J05AP. فقد تظهر المادة في تخصصين دون تكرار في المجاميع. الصفحتان: /specialites/gastro-enterologie و/specialites/infectiologie.',
      },
      {
        type: 'h2',
        title: '4. حدود يجب معرفتها',
        text: '',
      },
      {
        type: 'list',
        items: [
          '**يصنّف ATC المواد لا الواصفين.** صنف مشترك مثل J01 (مضادات الجراثيم) يظهر في طب الأسنان وفي الأمراض المعدية، ويضم منتجات لا تُستعمل في أحدهما أو الآخر.',
          '**تتداخل الأصناف.** تظهر H02 (الكورتيكوئيدات) وM05 وB03 وM03 في عدة تخصصات. وهذا مقصود، ولا تُحسب البطاقة إلا مرة واحدة في المجاميع.',
          '**فُصل طب الأورام عن أمراض الدم** لأن حجم L01 إلى L03 كبير؛ ويبقى B03 مشتركًا مع أمراض الكلى.',
          '**التخصصات قابلة للتعديل.** تتيح لوحة الإدارة إضافة صنف أو مادة بعينها أو سحبها، مع التحقق من وجود الرمز أو الاسم الدولي في القاعدة.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'التصنيف وسيلة للتنقل وليس لاختيار علاج. لا يغني عن ملخص خصائص المنتج الرسمي ولا عن التقدير السريري للممارس.',
      },
      {
        type: 'h2',
        title: '5. كيف تستعمله',
        text: '',
      },
      {
        type: 'list',
        items: [
          '**افتح /specialites** واختر تخصصك: تُحسب أعداد الأصناف والمواد والبطاقات انطلاقًا من التسمية.',
          '**انزل داخل الصنف** (مثلًا N03 لمضادات الصرع) حتى المادة الفعالة ثم بطاقة المنتج.',
          '**قارن البدائل الجنيسة** للمادة، وتحقق من الحالة (مسجّل، غير مجدَّد، مسحوب)، وافتح ملخص خصائص المنتج المنشور من الوكالة الوطنية للمنتجات الصيدلانية.',
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
