import type { Article, ArticleDevinette } from './articles'

/**
 * Jeu « devinez le médicament à partir de son icône » (FR + AR) : dix icônes de forme et de voie, réponse au clic.
 * Les icônes sont dessinées par lib/dwadz-icons à partir du libellé `forme` : si une règle de reconnaissance change,
 * vérifier que chaque devinette donne toujours l'icône décrite dans sa réponse.
 * Codes de voie : table edqm_route de lib/dwadz-icons/forme_rules.json. Vignette : assets/articles/jeu-icones.png.
 * Les exemples cités sont des classiques de la pharmacie, pas des fiches précises de la nomenclature.
 */

type Texte = Pick<ArticleDevinette, 'indice' | 'reponse' | 'details'>
type Enigme = Pick<ArticleDevinette, 'forme' | 'codes'> & { fr: Texte; ar: Texte }

const ENIGMES: Enigme[] = [
  // ─── Niveau 1 ───
  {
    forme: 'COMPRIME EFFERVESCENT',
    fr: {
      indice: 'Il fait des bulles dans un verre d’eau.',
      reponse: 'Un comprimé effervescent, par voie orale.',
      details: [
        'Le dessin montre un verre où le comprimé se dissout. La pastille verte indique la **voie orale** (code EDQM 20053000).',
        'Exemples connus : vitamine C, paracétamol effervescent. On attend la fin des bulles avant de boire.',
      ],
    },
    ar: {
      indice: 'يُخرج فقاعات في كأس ماء.',
      reponse: 'قرص فوّار، عن طريق الفم.',
      details: [
        'يُظهر الرسم كأسًا يذوب فيها القرص. والدائرة الخضراء تدلّ على **طريق الفم** (رمز EDQM ‏20053000).',
        'أمثلة معروفة: فيتامين C، الباراسيتامول الفوّار. ننتظر انتهاء الفقاعات قبل الشرب.',
      ],
    },
  },
  {
    forme: 'COLLYRE EN SOLUTION',
    codes: ['20051000'],
    fr: {
      indice: 'Une goutte, et on cligne des yeux.',
      reponse: 'Un collyre, par voie ophtalmique.',
      details: [
        'Le contenant est un flacon compte-gouttes. La pastille bleue porte un œil : **voie ophtalmique** (code EDQM 20051000).',
        'Le même flacon avec une pastille « oreille » serait des gouttes auriculaires : c’est la pastille qui fait la différence.',
      ],
    },
    ar: {
      indice: 'قطرة واحدة، ثم نرمش.',
      reponse: 'قطرة للعين.',
      details: [
        'الرسم قارورة قطرات. والدائرة الزرقاء تحمل عينًا: **في العين** (رمز EDQM ‏20051000).',
        'القارورة نفسها مع دائرة «الأذن» تصير قطرات للأذن: الدائرة هي التي تصنع الفرق.',
      ],
    },
  },
  {
    forme: 'SUPPOSITOIRE ENFANT',
    fr: {
      indice: 'Le recours des parents quand le petit a de la fièvre et refuse le sirop.',
      reponse: 'Un suppositoire pour enfant, par voie rectale.',
      details: [
        'La pastille indique la **voie rectale** (code EDQM 20061000). Le petit visage en haut signale une forme destinée à l’**enfant ou au nourrisson**.',
        'Exemple connu : le paracétamol en suppositoire. Le dosage se choisit selon le poids de l’enfant, avec le pharmacien.',
      ],
    },
    ar: {
      indice: 'ملجأ الوالدين حين ترتفع حرارة الصغير ويرفض الشراب.',
      reponse: 'تحميلة للأطفال، عن طريق الشرج.',
      details: [
        'الدائرة تدلّ على **طريق الشرج** (رمز EDQM ‏20061000). والوجه الصغير في الأعلى يشير إلى شكل موجَّه **للأطفال أو الرضّع**.',
        'مثال معروف: تحاميل الباراسيتامول. تُختار الجرعة حسب وزن الطفل، مع الصيدلي.',
      ],
    },
  },
  {
    forme: 'SUSPENSION POUR INHALATION EN FLACON PRESSURISE',
    fr: {
      indice: 'On le secoue, on souffle, on appuie, on inspire.',
      reponse: 'Un inhalateur, par voie inhalée.',
      details: [
        'La pastille indique la **voie inhalée** (code EDQM 20020000) : le médicament va directement dans les bronches.',
        'Exemple connu : le salbutamol, que beaucoup de personnes asthmatiques gardent sur elles.',
      ],
    },
    ar: {
      indice: 'نرجّه، نزفر، نضغط، ثم نستنشق.',
      reponse: 'جهاز استنشاق (بخاخ الربو).',
      details: [
        'الدائرة تدلّ على **الاستنشاق** (رمز EDQM ‏20020000): يذهب الدواء مباشرة إلى القصبات.',
        'مثال معروف: السالبوتامول، الذي يحمله كثير من مرضى الربو معهم.',
      ],
    },
  },
  // ─── Niveau 2 ───
  {
    forme: 'POUDRE POUR SUSPENSION BUVABLE',
    fr: {
      indice: 'Au départ, le flacon ne contient que de la poudre.',
      reponse: 'Une poudre pour suspension buvable, à reconstituer.',
      details: [
        'Le flacon de poudre et le signe **« à reconstituer »** disent la même chose : il faut ajouter de l’eau jusqu’au trait avant la première prise, puis agiter avant chaque prise.',
        'Exemple connu : l’amoxicilline pour enfant. Voie orale (code EDQM 20053000).',
      ],
    },
    ar: {
      indice: 'في البداية لا تحتوي القارورة إلا على مسحوق.',
      reponse: 'مسحوق لتحضير معلّق يُشرب.',
      details: [
        'قارورة المسحوق وعلامة **«يُحضَّر قبل الاستعمال»** تقولان الشيء نفسه: يُضاف الماء حتى الخط قبل أول جرعة، ثم تُرجّ القارورة قبل كل جرعة.',
        'مثال معروف: الأموكسيسيلين للأطفال. عن طريق الفم (رمز EDQM ‏20053000).',
      ],
    },
  },
  {
    forme: 'COMPRIME PELLICULE SECABLE',
    fr: {
      indice: 'Il porte une barre au milieu, et ce n’est pas pour faire joli.',
      reponse: 'Un comprimé sécable, par voie orale.',
      details: [
        'Le signe en haut veut dire **sécable** : le comprimé peut être divisé le long de sa barre de cassure.',
        'À retenir : un comprimé qui n’a pas ce signe ne se coupe pas sans l’avis du pharmacien.',
      ],
    },
    ar: {
      indice: 'في وسطه خطّ، وليس للزينة.',
      reponse: 'قرص قابل للقسمة، عن طريق الفم.',
      details: [
        'العلامة في الأعلى تعني **قابل للقسمة**: يمكن تقسيم القرص على طول خط الكسر.',
        'للحفظ: القرص الذي لا يحمل هذه العلامة لا يُقسم دون رأي الصيدلي.',
      ],
    },
  },
  {
    forme: 'SOLUTION INJECTABLE EN STYLO PREREMPLI',
    codes: ['20066000'],
    fr: {
      indice: 'Il ressemble à un stylo, mais on ne signe rien avec.',
      reponse: 'Un stylo injectable, par voie sous-cutanée.',
      details: [
        'La pastille rouge est celle des injectables. Son dessin précise la **voie sous-cutanée** (code EDQM 20066000) : sous la peau, pas dans une veine.',
        'Exemple connu : les stylos à insuline. Ici la voie vient du code EDQM de la fiche : le libellé seul ne la donne pas.',
      ],
    },
    ar: {
      indice: 'يشبه القلم، لكننا لا نكتب به.',
      reponse: 'قلم للحقن، تحت الجلد.',
      details: [
        'الدائرة الحمراء خاصة بالحقن. ورسمها يحدّد الطريق: **تحت الجلد** (رمز EDQM ‏20066000)، لا في الوريد.',
        'مثال معروف: أقلام الأنسولين. هنا يأتي الطريق من رمز EDQM في البطاقة: التسمية وحدها لا تذكره.',
      ],
    },
  },
  // ─── Niveau 3 ───
  {
    forme: 'PATCH TRANSDERMIQUE',
    codes: ['20070000'],
    fr: {
      indice: 'On le colle le matin et on l’oublie.',
      reponse: 'Un patch, par voie transdermique.',
      details: [
        'Le piège : **transdermique** (code EDQM 20070000) n’est pas **cutanée** (20003000). Une crème agit sur la peau ; un patch fait traverser la peau au médicament pour qu’il passe dans le sang.',
        'Exemple connu : les patchs à la nicotine.',
      ],
    },
    ar: {
      indice: 'نلصقها في الصباح وننساها.',
      reponse: 'لصقة، عبر الجلد.',
      details: [
        'الفخّ: **عبر الجلد** (رمز EDQM ‏20070000) ليس **على الجلد** (20003000). الكريم يعمل على الجلد؛ أما اللصقة فتجعل الدواء يعبر الجلد ليصل إلى الدم.',
        'مثال معروف: لصقات النيكوتين.',
      ],
    },
  },
  {
    forme: 'GELULE GASTRO-RESISTANTE',
    fr: {
      indice: 'Elle traverse l’estomac sans s’ouvrir.',
      reponse: 'Une gélule gastro-résistante, par voie orale.',
      details: [
        'Le bouclier indique un enrobage **gastro-résistant** : il protège le contenu de l’acidité de l’estomac, et la substance est libérée plus loin, dans l’intestin.',
        'Exemple connu : l’oméprazole. On l’avale sans croquer ; avant d’ouvrir une gélule, on demande au pharmacien.',
      ],
    },
    ar: {
      indice: 'تعبر المعدة دون أن تنفتح.',
      reponse: 'كبسولة مقاومة للحموضة المعدية، عن طريق الفم.',
      details: [
        'الدرع يدلّ على غلاف **مقاوم للحموضة المعدية**: يحمي المحتوى من حموضة المعدة، فتتحرّر المادة بعد ذلك في الأمعاء.',
        'مثال معروف: الأوميبرازول. تُبلع دون مضغ؛ وقبل فتح أي كبسولة نسأل الصيدلي.',
      ],
    },
  },
  {
    forme: 'COMPRIME A LIBERATION PROLONGEE',
    fr: {
      indice: 'Il prend son temps : une prise, et il travaille des heures.',
      reponse: 'Un comprimé à libération prolongée, par voie orale.',
      details: [
        'L’horloge signale une **libération prolongée ou modifiée** : la substance sort du comprimé petit à petit.',
        'C’est pourquoi on ne l’écrase pas et on ne le croque pas : toute la dose serait libérée d’un coup.',
      ],
    },
    ar: {
      indice: 'يأخذ وقته: جرعة واحدة ويعمل لساعات.',
      reponse: 'قرص ممتد التحرير، عن طريق الفم.',
      details: [
        'الساعة تشير إلى **تحرير ممتد أو معدّل**: تخرج المادة من القرص شيئًا فشيئًا.',
        'لذلك لا يُسحق ولا يُمضغ: وإلا تحرّرت الجرعة كلها دفعة واحدة.',
      ],
    },
  },
]

const devinettes = (lang: 'fr' | 'ar', debut: number, fin: number): ArticleDevinette[] =>
  ENIGMES.slice(debut, fin).map((e, i) => ({ forme: e.forme, codes: e.codes, numero: debut + i + 1, ...e[lang] }))

export const ARTICLES_JEU_ICONES: Article[] = [
  {
    slug: 'jeu-devinez-medicament-icones-forme-voie',
    lang: 'fr',
    audience: 'etudiant',
    title: 'Devinez le médicament à partir de son icône : 10 énigmes',
    subtitle: 'Dix icônes sans légende, un indice, la réponse au clic. Trois niveaux pour apprendre à lire la forme, la voie et les petits signes',
    description:
      'Un jeu en dix énigmes : pour chaque icône de DwaDZ, devinez la forme du médicament et sa voie d’administration, puis cliquez pour voir la réponse. Comprimé effervescent, collyre, stylo injectable, patch, gélule gastro-résistante… avec les voies et les codes EDQM expliqués au passage.',
    seoTitle: 'Jeu : devinez la forme du médicament à partir de son icône (voies EDQM)',
    seoKeywords: ['jeu médicament', 'quiz forme galénique', 'voie d’administration', 'icône médicament', 'EDQM voie orale', 'comprimé sécable', 'gastro-résistant', 'libération prolongée', 'nomenclature pharmaceutique algérienne'],
    date: '2026-11-15',
    readingTime: 5,
    image: 'jeu-icones.png',
    tags: ['Jeu', 'Icônes', 'Forme galénique', 'Voie d’administration', 'EDQM', 'Quiz'],
    faq: [
      {
        question: 'Une icône permet-elle de reconnaître un médicament précis ?',
        answer: 'Non. L’icône décrit la présentation : la forme (comprimé, sirop, stylo…), la voie d’administration et quelques particularités. Des centaines de médicaments différents partagent la même icône. Le nom de marque et la DCI, écrits à côté, restent indispensables.',
      },
      {
        question: 'Qu’est-ce que l’EDQM ?',
        answer: 'La Direction européenne de la qualité du médicament, rattachée au Conseil de l’Europe. Elle publie les Standard Terms, un vocabulaire normalisé des formes pharmaceutiques et des voies d’administration. DwaDZ s’en sert pour rattacher une voie à chaque fiche.',
      },
      {
        question: 'Pourquoi deux icônes identiques peuvent-elles avoir des pastilles différentes ?',
        answer: 'Parce que le contenant et la voie sont deux informations distinctes. Un flacon compte-gouttes peut servir pour l’œil, l’oreille ou la bouche : c’est la pastille qui indique la voie.',
      },
      {
        question: 'Les exemples cités sont-ils des médicaments de la nomenclature algérienne ?',
        answer: 'Ce sont des classiques de la pharmacie, donnés pour aider à deviner. Pour savoir quelles présentations sont enregistrées en Algérie, cherchez la substance sur DwaDZ et filtrez par forme.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Sur DwaDZ, chaque médicament porte une petite icône. Elle ne dit pas son nom, mais elle dit comment il se présente et par où il se prend. Saurez-vous la lire ? Voici dix icônes sans légende. Pour chacune : regardez, lisez l’indice, pariez, puis cliquez pour voir la réponse. Comptez un point par bonne réponse.',
      },
      { type: 'h2', title: 'La règle du jeu' },
      {
        type: 'list',
        items: [
          '**Le grand dessin** montre le contenant : comprimé, gélule, flacon, tube, stylo…',
          '**La pastille en bas** donne la voie d’administration. Sa couleur indique la famille : vert pour la voie orale, rouge pour les injectables, bleu pour l’œil et l’oreille.',
          '**Le petit signe en haut**, quand il existe, signale une particularité : sécable, gastro-résistant, libération prolongée, à reconstituer, pour l’enfant.',
        ],
      },
      { type: 'h2', title: 'Niveau 1 : l’échauffement' },
      { type: 'devinette', devinettes: devinettes('fr', 0, 4) },
      { type: 'h2', title: 'Niveau 2 : regardez les détails' },
      { type: 'devinette', devinettes: devinettes('fr', 4, 7) },
      { type: 'h2', title: 'Niveau 3 : pour les experts' },
      { type: 'devinette', devinettes: devinettes('fr', 7, 10) },
      { type: 'h2', title: 'Votre score' },
      {
        type: 'table',
        headers: ['Points', 'Verdict'],
        rows: [
          { cells: ['0 à 4', 'Apprenti : vous connaissez les boîtes, pas encore les icônes. Refaites un tour dans une semaine.'] },
          { cells: ['5 à 7', 'Habitué du comptoir : la forme ne vous échappe plus, les petits signes encore un peu.'] },
          { cells: ['8 à 10', 'Préparateur dans l’âme : vous lisez une fiche plus vite que son ombre.'] },
        ],
      },
      { type: 'h2', title: 'Ce que vous venez d’apprendre : six voies du vocabulaire EDQM' },
      {
        type: 'paragraph',
        text: 'Sans le savoir, vous avez utilisé un vocabulaire international. Les voies d’administration affichées sur les fiches viennent des **Standard Terms de l’EDQM**, la Direction européenne de la qualité du médicament. Chaque voie y porte un nom fixe et un code : deux logiciels, deux pays ou deux pharmaciens qui échangent ce code parlent de la même chose.',
      },
      {
        type: 'table',
        headers: ['Voie', 'Code EDQM', 'En clair', 'Énigme'],
        rows: [
          { cells: ['Voie orale', '20053000', 'On avale', '1, 5, 6, 9, 10'] },
          { cells: ['Voie ophtalmique', '20051000', 'Dans l’œil', '2'] },
          { cells: ['Voie rectale', '20061000', 'Par l’anus', '3'] },
          { cells: ['Voie inhalée', '20020000', 'On respire le médicament', '4'] },
          { cells: ['Voie sous-cutanée', '20066000', 'Injection sous la peau', '7'] },
          { cells: ['Voie transdermique', '20070000', 'À travers la peau, vers le sang', '8'] },
        ],
      },
      { type: 'h2', title: 'Pourquoi l’icône ne donne pas le nom' },
      {
        type: 'paragraph',
        text: 'Soyons honnêtes : le titre triche un peu. Une icône ne permet pas de deviner un médicament, elle décrit sa **présentation**. Le comprimé sécable de l’énigme 6 pourrait être un antihypertenseur, un antidiabétique ou un antalgique. C’est justement son intérêt : dans une liste de cinquante lignes, elle permet de repérer d’un coup d’œil « le sirop » ou « l’injectable », avant de lire les noms.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Trois signes à prendre au sérieux : pas de signe « sécable », on ne coupe pas ; signe « gastro-résistant » ou « libération prolongée », on n’écrase pas et on ne croque pas. En cas de doute, le pharmacien tranche.',
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Pour continuer à jouer : ouvrez la recherche de DwaDZ, tapez une substance que vous connaissez et regardez combien d’icônes différentes apparaissent. Une même substance existe souvent en comprimé, en sirop et en injectable.',
      },
    ],
  },
  {
    slug: 'jeu-devinez-medicament-icones-forme-voie-ar',
    lang: 'ar',
    audience: 'etudiant',
    title: 'خمّن الدواء من أيقونته: 10 ألغاز',
    subtitle: 'عشر أيقونات بلا شرح، تلميح واحد، والجواب بنقرة. ثلاثة مستويات لتتعلّم قراءة الشكل وطريقة الإعطاء والعلامات الصغيرة',
    description:
      'لعبة من عشرة ألغاز: أمام كل أيقونة من DwaDZ، خمّن شكل الدواء وطريقة إعطائه، ثم انقر لترى الجواب. قرص فوّار، قطرة عين، قلم حقن، لصقة، كبسولة مقاومة للحموضة… مع شرح طرق الإعطاء ورموز EDQM في الطريق.',
    seoTitle: 'لعبة: خمّن شكل الدواء من أيقونته (طرق الإعطاء حسب EDQM)',
    seoKeywords: ['لعبة الأدوية', 'اختبار الشكل الصيدلاني', 'طريقة إعطاء الدواء', 'أيقونة الدواء', 'EDQM', 'قرص قابل للقسمة', 'مقاوم للحموضة المعدية', 'تحرير ممتد', 'المدونة الصيدلانية الجزائرية'],
    date: '2026-11-15',
    readingTime: 5,
    image: 'jeu-icones.png',
    tags: ['لعبة', 'أيقونات', 'الشكل الصيدلاني', 'طريقة الإعطاء', 'EDQM', 'اختبار'],
    faq: [
      {
        question: 'هل تسمح الأيقونة بمعرفة دواء بعينه؟',
        answer: 'لا. الأيقونة تصف التقديم: الشكل (قرص، شراب، قلم…)، طريقة الإعطاء وبعض الخصائص. مئات الأدوية المختلفة تشترك في الأيقونة نفسها. الاسم التجاري والمادة الفعالة (DCI) المكتوبان بجانبها يبقيان ضروريين.',
      },
      {
        question: 'ما هي EDQM؟',
        answer: 'هي المديرية الأوروبية لجودة الدواء، التابعة لمجلس أوروبا. تنشر Standard Terms، وهي مفردات موحّدة للأشكال الصيدلانية وطرق الإعطاء. يستعملها DwaDZ لربط كل بطاقة بطريقة إعطاء.',
      },
      {
        question: 'لماذا قد تحمل أيقونتان متطابقتان دائرتين مختلفتين؟',
        answer: 'لأن الوعاء وطريقة الإعطاء معلومتان مستقلتان. قارورة القطرات قد تكون للعين أو للأذن أو للفم: الدائرة هي التي تحدّد الطريق.',
      },
      {
        question: 'هل الأمثلة المذكورة أدوية من المدونة الجزائرية؟',
        answer: 'هي أمثلة كلاسيكية في الصيدلة، ذُكرت للمساعدة على التخمين. لمعرفة التقديمات المسجّلة في الجزائر، ابحث عن المادة في DwaDZ ثم رشّح حسب الشكل.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'في DwaDZ يحمل كل دواء أيقونة صغيرة. لا تقول اسمه، لكنها تقول كيف يُقدَّم ومن أين يُؤخذ. هل تعرف قراءتها؟ إليك عشر أيقونات بلا شرح. مع كل واحدة: انظر، اقرأ التلميح، راهن، ثم انقر لترى الجواب. احسب نقطة لكل جواب صحيح.',
      },
      { type: 'h2', title: 'قاعدة اللعبة' },
      {
        type: 'list',
        items: [
          '**الرسم الكبير** يبيّن الوعاء: قرص، كبسولة، قارورة، أنبوب، قلم…',
          '**الدائرة في الأسفل** تعطي طريقة الإعطاء. ولونها يدلّ على العائلة: الأخضر لطريق الفم، الأحمر للحقن، الأزرق للعين والأذن.',
          '**العلامة الصغيرة في الأعلى**، إن وُجدت، تشير إلى خاصية: قابل للقسمة، مقاوم للحموضة المعدية، ممتد التحرير، يُحضَّر قبل الاستعمال، للأطفال.',
        ],
      },
      { type: 'h2', title: 'المستوى 1: التسخين' },
      { type: 'devinette', devinettes: devinettes('ar', 0, 4) },
      { type: 'h2', title: 'المستوى 2: دقّق في التفاصيل' },
      { type: 'devinette', devinettes: devinettes('ar', 4, 7) },
      { type: 'h2', title: 'المستوى 3: للخبراء' },
      { type: 'devinette', devinettes: devinettes('ar', 7, 10) },
      { type: 'h2', title: 'نتيجتك' },
      {
        type: 'table',
        headers: ['النقاط', 'الحكم'],
        rows: [
          { cells: ['من 0 إلى 4', 'مبتدئ: تعرف العلب، ولم تتعرّف بعد على الأيقونات. أعد المحاولة بعد أسبوع.'] },
          { cells: ['من 5 إلى 7', 'زبون وفيّ للصيدلية: الشكل لا يفوتك، والعلامات الصغيرة ما زالت تفوتك قليلًا.'] },
          { cells: ['من 8 إلى 10', 'صيدلي بالفطرة: تقرأ البطاقة في لمح البصر.'] },
        ],
      },
      { type: 'h2', title: 'ما تعلّمته للتو: ست طرق إعطاء من مفردات EDQM' },
      {
        type: 'paragraph',
        text: 'دون أن تدري، استعملت مفردات دولية. طرق الإعطاء المعروضة في البطاقات مأخوذة من **Standard Terms** الصادرة عن EDQM، المديرية الأوروبية لجودة الدواء. لكل طريق فيها اسم ثابت ورمز: برنامجان أو بلدان أو صيدليان يتبادلون هذا الرمز يتحدثون عن الشيء نفسه.',
      },
      {
        type: 'table',
        headers: ['الطريق', 'رمز EDQM', 'بعبارة بسيطة', 'اللغز'],
        rows: [
          { cells: ['عن طريق الفم', '20053000', 'يُبلع', '1، 5، 6، 9، 10'] },
          { cells: ['في العين', '20051000', 'قطرات في العين', '2'] },
          { cells: ['عن طريق الشرج', '20061000', 'تحميلة', '3'] },
          { cells: ['استنشاق', '20020000', 'نتنفّس الدواء', '4'] },
          { cells: ['تحت الجلد', '20066000', 'حقنة تحت الجلد', '7'] },
          { cells: ['عبر الجلد', '20070000', 'يعبر الجلد نحو الدم', '8'] },
        ],
      },
      { type: 'h2', title: 'لماذا لا تعطي الأيقونة الاسم' },
      {
        type: 'paragraph',
        text: 'لنكن صادقين: العنوان يغشّ قليلًا. الأيقونة لا تسمح بتخمين دواء، بل تصف **تقديمه**. القرص القابل للقسمة في اللغز 6 قد يكون دواءً للضغط أو للسكري أو مسكّنًا. وهذه بالذات فائدتها: في قائمة من خمسين سطرًا، تتعرّف بنظرة واحدة على «الشراب» أو «الحقنة» قبل قراءة الأسماء.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'ثلاث علامات تؤخذ بجدية: بلا علامة «قابل للقسمة» لا نقسم القرص؛ ومع علامة «مقاوم للحموضة المعدية» أو «ممتد التحرير» لا نسحق ولا نمضغ. عند الشك، الصيدلي يحسم.',
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'لمواصلة اللعب: افتح البحث في DwaDZ، اكتب مادة تعرفها وانظر كم أيقونة مختلفة تظهر. المادة نفسها توجد غالبًا على شكل أقراص وشراب وحقن.',
      },
    ],
  },
]
