export type ArticleLang = 'fr' | 'ar'
export type ArticleAudience = 'professionnel' | 'etudiant'

export interface Article {
  slug: string
  lang: ArticleLang
  audience: ArticleAudience
  title: string
  subtitle: string
  description: string
  date: string
  readingTime: number // minutes
  tags: string[]
  content: ArticleSection[]
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
  // ─── Article 1 — FR Professionnels ────────────────────────────
  {
    slug: 'loi-18-11-exercice-officinal-2026',
    lang: 'fr',
    audience: 'professionnel',
    title: 'Loi 18-11 et exercice officinal en Algérie : Ce qui change pour le titulaire en 2026',
    subtitle: 'Analyse réglementaire pour les pharmaciens titulaires',
    description:
      'Décryptage de la Loi n°18-11 et des décrets d\'application attendus en 2026 : nouvelles règles d\'installation, réorganisation de la garde, digitalisation et mise en conformité des officines algériennes.',
    date: '2026-03-01',
    readingTime: 7,
    tags: ['Loi 18-11', 'Réglementation officine', 'Pharmacien titulaire', 'MIPH', 'Algérie 2026'],
    content: [
      {
        type: 'intro',
        text: 'Le paysage législatif de la pharmacie en Algérie connaît une accélération sans précédent. Si la Loi n°18-11 relative à la santé constitue le socle, les décrets d\'application attendus pour 2026 viennent préciser les contours de votre exercice quotidien. Entre nouvelles règles d\'installation et réorganisation de la garde, voici l\'analyse de PharmaVeille DZ pour anticiper ces mutations.',
      },
      {
        type: 'h2',
        title: '1. La Loi 18-11 : Le nouveau "Code de la Route" officinal',
        text: 'La Loi 18-11 n\'est plus seulement un texte théorique. Elle redéfinit l\'officine non plus comme un simple commerce, mais comme une structure de santé de proximité.',
      },
      {
        type: 'list',
        items: [
          '**Missions élargies** : Au-delà de la dispensation, le titulaire est désormais un acteur de l\'éducation sanitaire et du bon usage du médicament.',
          '**Responsabilité accrue** : La loi insiste sur la présence effective du titulaire. La traçabilité des produits sensibles et le respect des bonnes pratiques de stockage sont désormais des points non négociables lors des inspections.',
        ],
      },
      {
        type: 'h2',
        title: '2. Vers une nouvelle "Carte Pharmaceutique"',
        text: 'Les projets de décrets en discussion pour 2026 visent à équilibrer deux objectifs contradictoires :',
      },
      {
        type: 'list',
        items: [
          '**L\'accessibilité** : Augmenter le nombre d\'officines dans les zones d\'ombre.',
          '**La viabilité** : Préserver l\'équilibre économique des pharmacies déjà installées.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Point d\'attention : Une révision des critères de distance minimale et de densité de population pourrait modifier la concurrence locale. Il est crucial de surveiller les publications du MIPH (Ministère de l\'Industrie et de la Production Pharmaceutique).',
      },
      {
        type: 'h2',
        title: '3. Les 4 piliers de votre mise en conformité',
        text: 'Pour naviguer sereinement dans ce nouveau cadre, voici les axes prioritaires :',
      },
      {
        type: 'list',
        items: [
          '**Réorganisation de la Garde** : Les nouveaux textes prévoient une modulation de la garde selon les besoins réels des communes. Anticipez vos plannings RH en conséquence.',
          '**Statut du Pharmacien Assistant** : La clarification de son rôle facilitera les recrutements, mais imposera une définition plus stricte des délégations de tâches.',
          '**Digitalisation & Traçabilité** : Préparez-vous à l\'intégration du Data Matrix et à la numérisation des rapports de pharmacovigilance.',
          '**Auto-diagnostic** : Assurez-vous que vos modes opératoires (chaîne du froid, gestion des périmés) sont écrits et archivés.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: '💡 Un doute sur un décret ? Consultez notre base de données réglementaire mise à jour en temps réel sur PharmaVeille DZ.',
      },
    ],
  },

  // ─── Article 2 — FR Étudiants ──────────────────────────────────
  {
    slug: 'fiche-revision-reglementation-officine-algerie',
    lang: 'fr',
    audience: 'etudiant',
    title: 'Fiche de Révision : La Réglementation de l\'Officine en Algérie (Loi 18-11)',
    subtitle: 'Essentiel pour les examens et les stages en pharmacie',
    description:
      'Tout ce que les étudiants en pharmacie doivent savoir sur la Loi n°18-11 : définition légale de l\'officine, responsabilités du titulaire et de l\'assistant, conditions d\'installation, garde pharmaceutique et QCM d\'auto-évaluation.',
    date: '2026-03-01',
    readingTime: 5,
    tags: ['Fiche de révision', 'Étudiant pharmacie', 'Loi 18-11', 'Officine Algérie', 'Législation'],
    content: [
      {
        type: 'intro',
        text: 'Futurs confrères, la Loi n°18-11 est le texte majeur de votre cursus de législation pharmaceutique. Elle encadre votre futur métier, de l\'ouverture de l\'officine jusqu\'à la responsabilité civile et pénale du pharmacien. Voici l\'essentiel à retenir pour vos examens et vos stages.',
      },
      {
        type: 'h2',
        title: '🟢 1. Définition légale de l\'Officine',
        text: 'Selon la loi algérienne, l\'officine est l\'établissement destiné à la dispensation au détail des médicaments et des dispositifs médicaux.',
      },
      {
        type: 'list',
        items: [
          '**Exclusivité** : Seul le pharmacien peut détenir et préparer des médicaments (préparations magistrales et officinales).',
          '**Intérêt public** : L\'officine assure une mission de service public à travers la permanence des soins (garde).',
        ],
      },
      {
        type: 'h2',
        title: '🔵 2. Le Pharmacien Titulaire vs Assistant',
      },
      {
        type: 'table',
        headers: ['Fonction', 'Responsabilité', 'Rôle clé'],
        rows: [
          { cells: ['Titulaire', 'Totale (Technique, Civile, Pénale)', 'Propriétaire de l\'agrément, doit assurer une présence effective.'] },
          { cells: ['Assistant', 'Sous l\'autorité du titulaire', 'Seconde le titulaire, participe à la dispensation et à la gestion technique.'] },
        ],
      },
      {
        type: 'h2',
        title: '🟡 3. Installation et Autorisation',
        text: 'L\'ouverture d\'une pharmacie en Algérie n\'est pas libre :',
      },
      {
        type: 'list',
        items: [
          '**Agrément préalable** : Délivré par les autorités sanitaires (DSP/Ministère).',
          '**Numerus Clausus** : Basé sur la population (tranches d\'habitants) et la distance entre les officines.',
          '**Locaux** : Doivent répondre à des normes strictes de superficie, de sécurité et d\'hygiène.',
        ],
      },
      {
        type: 'h2',
        title: '🔴 4. La Garde : Une obligation légale',
        text: 'Le service de garde est obligatoire pour garantir l\'accès au médicament 24h/24. Le non-respect du tableau de garde affiché peut entraîner des sanctions administratives sévères (fermeture temporaire).',
      },
      {
        type: 'h2',
        title: '🧠 Testez vos connaissances (QCM Rapide)',
      },
      {
        type: 'qcm',
        questions: [
          {
            question: 'Qui délivre l\'autorisation d\'ouverture d\'une officine en Algérie ?',
            options: [
              { label: 'A', text: 'La Wilaya' },
              { label: 'B', text: 'Les autorités sanitaires compétentes (Ministère/DSP)' },
              { label: 'C', text: 'La Chambre de commerce' },
            ],
            answer: 'B',
          },
          {
            question: 'Le pharmacien assistant peut-il remplacer définitivement le titulaire sans autorisation ?',
            options: [
              { label: 'A', text: 'Oui, s\'il a plus de 5 ans d\'expérience.' },
              { label: 'B', text: 'Non, il seconde le titulaire sous sa responsabilité.' },
            ],
            answer: 'B',
          },
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: '📚 Envie d\'approfondir ? Téléchargez le texte intégral de la Loi 18-11 sur notre plateforme PharmaVeille DZ.',
      },
    ],
  },

  // ─── Article 3 — AR Professionnels ────────────────────────────
  {
    slug: 'loi-18-11-exercice-officinal-2026-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'القانون 18-11 وممارسة مهنة الصيدلة في الجزائر: ما يجب على الصيدلي صاحب المحل معرفته في 2026',
    subtitle: 'تحليل تنظيمي للصيادلة أصحاب المحلات',
    description:
      'تحليل القانون رقم 18-11 والنصوص التطبيقية المنتظرة لعام 2026: شروط الاعتماد الجديدة، تنظيم المناوبة، الرقمنة وضمان الامتثال القانوني للصيدليات الجزائرية.',
    date: '2026-03-01',
    readingTime: 7,
    tags: ['القانون 18-11', 'تنظيم الصيدليات', 'الصيدلي صاحب المحل', 'MIPH', 'الجزائر 2026'],
    content: [
      {
        type: 'intro',
        text: 'يشهد المشهد التشريعي للصيدلة في الجزائر تسارعاً غير مسبوق. وبينما يشكل القانون رقم 18-11 المتعلق بالصحة القاعدة الأساسية، تأتي النصوص التطبيقية المنتظرة لعام 2026 لتحديد معالم ممارستكم اليومية. من شروط الاعتماد الجديدة إلى تنظيم المناوبة، إليكم تحليل منصة PharmaVeille DZ لاستباق هذه التحولات.',
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
          '**الامتثال التشغيلي**: تأكدوا من توثيق إجراءاتكم التشغيلية (سلسلة البرودة، إدارة المنتهية صلاحيتها) وأرشفتها.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: '💡 هل لديكم شك حول مرسوم معين؟ راجعوا قاعدة بياناتنا التنظيمية المحينة دورياً عبر موقعنا PharmaVeille DZ.',
      },
    ],
  },

  // ─── Article 4 — AR Étudiants ──────────────────────────────────
  {
    slug: 'fiche-revision-reglementation-officine-algerie-ar',
    lang: 'ar',
    audience: 'etudiant',
    title: 'بطاقة مراجعة: تنظيم الصيدليات في الجزائر وفق القانون 18-11',
    subtitle: 'ملخص شامل للامتحانات والتربصات',
    description:
      'ملخص شامل لأهم ما يجب أن يعرفه طلاب الصيدلة حول القانون رقم 18-11: التعريف القانوني للصيدلية، مسؤوليات الصيدلي صاحب المحل والمساعد، شروط الفتح والاعتماد، المناوبة وأسئلة اختبار الفهم.',
    date: '2026-03-01',
    readingTime: 5,
    tags: ['بطاقة مراجعة', 'طالب صيدلة', 'القانون 18-11', 'صيدلية الجزائر', 'تشريع صيدلاني'],
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
      {
        type: 'h2',
        title: '🔵 2. الصيدلي صاحب المحل مقابل الصيدلي المساعد',
      },
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
      {
        type: 'h2',
        title: '🧠 اختبر معلوماتك (سؤال وجواب)',
      },
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
        text: '📚 نصائح تقنية: تأكد من إضافة علامات lang="ar" في كود HTML الخاص بالصفحات العربية. استخدم خطوطاً عربية واضحة مثل Cairo أو Amiri لتسهيل القراءة على الهاتف.',
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

export function getRelatedArticles(slug: string, lang: ArticleLang): Article[] {
  return ARTICLES.filter(a => a.slug !== slug && a.lang === lang).slice(0, 3)
}
