import type { Article } from './articles'

/**
 * Article « Écrivez-le comme vous voulez » (FR + AR) : la recherche testée avec des fautes, de l'arabe et de l'arabizi.
 * Chaque exemple est vérifié par tests/search/article-fautes.test.ts contre lib/search-normalize.ts :
 *  - EXEMPLES_MEME_CLE : la saisie et le nom officiel ont la même clé phonétique (foldPhonetic) ;
 *  - EXEMPLES_ARABE : la saisie arabe et le nom officiel ont le même squelette consonantique (foldSkeleton) ;
 *  - EXEMPLES_PROCHES : clés différentes, mais assez ressemblantes pour le repli par trigrammes (seuil 0,34 de queries.ts).
 * Si une règle de recherche change, le test dit quel exemple retirer de l'article.
 * Visuels : public/articles/recherche/ et assets/articles/recherche-fautes.png (vignette de partage).
 */
export const EXEMPLES_MEME_CLE: [saisie: string, officiel: string][] = [
  ['amoxiciline', 'AMOXICILLINE'],
  ['amoksisiline', 'AMOXICILLINE'],
  ['amoxycilline', 'AMOXICILLINE'],
  ['amocsiciline', 'AMOXICILLINE'],
  ['dolipran', 'DOLIPRANE'],
  ['dolibran', 'DOLIPRANE'],
  ['dolyprane', 'DOLIPRANE'],
  ['parasetamol', 'PARACETAMOL'],
  ['klamoxil', 'CLAMOXYL'],
  ['9lamoxil', 'CLAMOXYL'],
  ['tadalaphil', 'TADALAFIL'],
  ['setirizine', 'CETIRIZINE'],
  ['omeprazol', 'OMEPRAZOLE'],
]

export const EXEMPLES_ARABE: [saisie: string, officiel: string][] = [
  ['دوليبران', 'DOLIPRANE'],
  ['باراسيتامول', 'PARACETAMOL'],
  ['أموكسيسيلين', 'AMOXICILLINE'],
  ['كلاموكسيل', 'CLAMOXYL'],
  ['ماكسيبلاز', 'MAXIPLAZ'],
  ['تادالافيل', 'TADALAFIL'],
  ['أوميبرازول', 'OMEPRAZOLE'],
]

export const EXEMPLES_PROCHES: [saisie: string, officiel: string][] = [
  ['amoxilline', 'AMOXICILLINE'],
  ['parcetamol', 'PARACETAMOL'],
  ['dolprane', 'DOLIPRANE'],
]

/** Saisie arabe que la recherche ne rapproche pas encore du nom officiel (citée comme limite dans l'article). */
export const EXEMPLE_LIMITE: [saisie: string, officiel: string] = ['سيماغلوتايد', 'SEMAGLUTIDE']

const ESSAI = 'https://www.dzair-pharma.net/recherche?q='

export const ARTICLES_RECHERCHE_FAUTES: Article[] = [
  {
    slug: 'recherche-medicament-fautes-orthographe-arabe-arabizi',
    lang: 'fr',
    audience: 'etudiant',
    title: 'Écrivez-le comme vous voulez : on a testé la recherche avec les pires fautes',
    subtitle: 'Amoxiciline, dolibran, دوليبران, 9lamoxil… vingt-trois façons d’écrire huit médicaments, et ce que la recherche en fait',
    description:
      'Personne ne sait écrire « amoxicilline » du premier coup. Nous avons tapé dans DwaDZ les pires orthographes, en français, en arabe et en arabizi : lettres oubliées, écriture « comme ça se prononce », b à la place de p, chiffres à la place de lettres. Voici ce qui passe, pourquoi, et ce qui ne passe pas encore.',
    seoTitle: 'Chercher un médicament sans connaître l’orthographe : fautes, arabe, arabizi',
    seoKeywords: ['chercher un médicament Algérie', 'orthographe médicament', 'nom de médicament en arabe', 'arabizi médicament', 'amoxiciline', 'dolipran', 'دوليبران', 'recherche médicament faute de frappe'],
    date: '2026-11-16',
    readingTime: 5,
    image: 'recherche-fautes.png',
    tags: ['Recherche', 'Mode d’emploi', 'Arabe', 'Arabizi', 'Orthographe', 'Jeu'],
    faq: [
      {
        question: 'Faut-il connaître l’orthographe exacte d’un médicament pour le trouver ?',
        answer: 'Non. La recherche essaie d’abord votre saisie telle quelle. Si elle ne donne rien, elle la compare aux noms de la nomenclature « à l’oreille » : accents, lettres doublées, y ou i, c ou k, ph ou f ne comptent plus.',
      },
      {
        question: 'Peut-on écrire le nom en arabe ?',
        answer: 'Oui. L’arabe n’écrit pas les voyelles brèves, donc la recherche compare seulement les consonnes de votre saisie à celles des noms de marque et des substances. دوليبران retrouve DOLIPRANE, باراسيتامول retrouve PARACETAMOL.',
      },
      {
        question: 'Qu’est-ce que l’arabizi, et est-il compris ?',
        answer: 'C’est l’arabe écrit avec un clavier latin, où des chiffres remplacent certaines lettres : 3 pour ع, 7 pour ح, 9 pour ق, 5 pour خ. La recherche les lit comme des lettres quand ils sont collés à un mot, et laisse tranquilles les chiffres d’un dosage.',
      },
      {
        question: 'Que faire si la recherche ne trouve toujours rien ?',
        answer: 'Essayez avec moins de lettres (le début du nom suffit souvent), ou cherchez la substance active au lieu de la marque. La recherche guidée permet aussi de partir de la forme et de la voie d’administration.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Soyons honnêtes : personne n’écrit « amoxicilline » juste du premier coup. Deux L ? Un seul ? Un X ou « ks » ? Et quand on a entendu le nom au téléphone, ou qu’on le lit en arabe sur un bout de papier, c’est pire. Alors nous avons fait le test que tout le monde fait sans le dire : taper n’importe comment, et regarder ce qui sort.',
      },
      {
        type: 'image',
        src: '/articles/recherche/fautes-vers-nom-officiel.png',
        width: 1428,
        height: 400,
        alt: 'Six façons d’écrire le même médicament, soulignées en rouge comme des fautes : amoxiciline, amoksisiline, amoxycilline, amocsiciline, أموكسيسيلين en arabe et amoxilline. Une flèche les relie toutes au nom officiel AMOXICILLINE, coché en vert',
        caption: 'Six saisies, un seul médicament : la recherche les ramène toutes au nom officiel.',
      },
      { type: 'h2', title: 'Manche 1 : les fautes de tous les jours' },
      {
        type: 'paragraph',
        text: 'On commence doucement, avec les fautes que font tous les claviers de téléphone.',
      },
      {
        type: 'table',
        headers: ['Vous tapez', 'La recherche comprend', 'La faute pardonnée'],
        rows: [
          { cells: ['amoxiciline', 'AMOXICILLINE', 'Un L oublié'] },
          { cells: ['amoxycilline', 'AMOXICILLINE', 'Y à la place de I'] },
          { cells: ['dolipran', 'DOLIPRANE', 'Le E final oublié'] },
          { cells: ['dolyprane', 'DOLIPRANE', 'Y à la place de I'] },
          { cells: ['omeprazol', 'OMEPRAZOLE', 'Le E final, et les accents ne comptent jamais'] },
        ],
      },
      { type: 'h2', title: 'Manche 2 : écrit comme ça se prononce' },
      {
        type: 'paragraph',
        text: 'Là, on ne fait plus de fautes : on écrit carrément à l’oreille. C’est ce qui arrive quand on note un nom entendu chez le médecin.',
      },
      {
        type: 'table',
        headers: ['Vous tapez', 'La recherche comprend', 'Ce qu’elle a entendu'],
        rows: [
          { cells: ['amoksisiline', 'AMOXICILLINE', 'X se prononce « ks », C devant I se prononce « s »'] },
          { cells: ['amocsiciline', 'AMOXICILLINE', '« cs » sonne comme X'] },
          { cells: ['parasetamol', 'PARACETAMOL', 'C devant E se prononce « s »'] },
          { cells: ['klamoxil', 'CLAMOXYL', 'K ou C dur, I ou Y : même son'] },
          { cells: ['tadalaphil', 'TADALAFIL', 'PH se prononce « f »'] },
          { cells: ['setirizine', 'CETIRIZINE', 'S ou C doux : même son'] },
          { cells: ['dolibran', 'DOLIPRANE', 'B à la place de P (voir plus bas)'] },
        ],
      },
      { type: 'h2', title: 'Manche 3 : en arabe' },
      {
        type: 'paragraph',
        text: 'Le nom est écrit en arabe sur l’ordonnance, ou c’est simplement votre clavier du moment. Tapez-le tel quel.',
      },
      {
        type: 'table',
        headers: ['Vous tapez', 'La recherche comprend'],
        rows: [
          { cells: ['دوليبران', 'DOLIPRANE'] },
          { cells: ['باراسيتامول', 'PARACETAMOL'] },
          { cells: ['أموكسيسيلين', 'AMOXICILLINE'] },
          { cells: ['كلاموكسيل', 'CLAMOXYL'] },
          { cells: ['ماكسيبلاز', 'MAXIPLAZ'] },
          { cells: ['تادالافيل', 'TADALAFIL'] },
          { cells: ['أوميبرازول', 'OMEPRAZOLE'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Deux astuces rendent cela possible. D’abord, l’arabe n’a pas de lettre P : on écrit ب, c’est-à-dire B. La recherche traite donc P et B comme une seule lettre, et c’est aussi pour cela que « dolibran » passait à la manche 2. Ensuite, l’arabe n’écrit pas les voyelles brèves : la recherche ne compare que les **consonnes**. PARACETAMOL et باراسيتامول deviennent tous les deux « brstml », et se reconnaissent.',
      },
      { type: 'h2', title: 'Manche 4 : l’arabizi' },
      {
        type: 'paragraph',
        text: 'L’arabizi, c’est l’arabe des SMS : des lettres latines, et des chiffres pour les sons qui n’existent pas en français. La recherche lit ces chiffres comme des lettres.',
      },
      {
        type: 'table',
        headers: ['Chiffre', 'Lettre arabe', 'Lu comme'],
        rows: [
          { cells: ['2', 'ء', 'a'] },
          { cells: ['3', 'ع', 'a'] },
          { cells: ['5', 'خ', 'kh'] },
          { cells: ['7', 'ح', 'h'] },
          { cells: ['9', 'ق', 'k'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Résultat : **9lamoxil** retrouve CLAMOXYL. Et pour ne pas tout mélanger, un chiffre n’est lu comme une lettre que s’il est collé à un mot : dans « B12 » ou « 500 mg », les chiffres restent des chiffres.',
      },
      { type: 'h2', title: 'Manche 5 : là, on exagère' },
      {
        type: 'paragraph',
        text: 'Et si on oublie carrément une lettre au milieu ? La saisie ne « sonne » plus tout à fait comme le nom. La recherche passe alors à son dernier recours : elle cherche les noms qui **ressemblent le plus** à ce que vous avez tapé.',
      },
      {
        type: 'table',
        headers: ['Vous tapez', 'Le nom le plus ressemblant', 'Ce qui manque'],
        rows: [
          { cells: ['amoxilline', 'AMOXICILLINE', 'Toute une syllabe'] },
          { cells: ['parcetamol', 'PARACETAMOL', 'Un A'] },
          { cells: ['dolprane', 'DOLIPRANE', 'Un I'] },
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Dans ce cas, la liste peut contenir des voisins : d’autres noms qui ressemblent aussi à votre saisie. Vérifiez toujours le nom, la substance et le dosage sur la fiche avant de vous y fier.',
      },
      { type: 'h2', title: 'Comment ça marche, en trois étapes' },
      {
        type: 'list',
        items: [
          '**Telle quelle.** La recherche essaie d’abord votre saisie comme vous l’avez écrite. Si le nom est juste, vous avez la réponse tout de suite.',
          '**À l’oreille.** Sinon, elle réduit votre saisie et les noms de la nomenclature à leur prononciation : plus d’accents ni de majuscules, PH devient F, Y devient I, X devient KS, les lettres doublées n’en font qu’une, le E final tombe. « Amoxicilline » et « amoksisiline » donnent alors exactement la même chose : amoksisilin.',
          '**Par ressemblance.** En dernier recours, elle garde les noms qui partagent le plus de morceaux avec votre saisie. En arabe, elle compare les consonnes.',
        ],
      },
      { type: 'h2', title: 'Ce qui ne passe pas (encore)' },
      {
        type: 'list',
        items: [
          '**Trois lettres au hasard** : il faut un minimum de matière pour reconnaître un nom.',
          '**Certaines graphies arabes** : سيماغلوتايد, par exemple, ne retrouve pas encore SEMAGLUTIDE, parce que le غ et le ايد ne correspondent pas à la façon dont le nom s’écrit en lettres latines. Tapez « semaglutide », ou le début du nom.',
          '**Un surnom** : « le cachet rose pour la tension » n’est pas un nom. Partez plutôt de la recherche guidée, par forme et par voie.',
          '**Un médicament qui n’est pas dans la nomenclature algérienne** : la recherche ne peut pas inventer une fiche.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Une recherche tolérante vous amène à une fiche, pas à une certitude. Deux médicaments peuvent avoir des noms très proches : avant toute prise, c’est la boîte, l’ordonnance et le pharmacien qui font foi.',
      },
      { type: 'h2', title: 'À vous : le défi' },
      {
        type: 'paragraph',
        text: `Essayez tout de suite : [amoksisiline](${ESSAI}amoksisiline), [dolibran](${ESSAI}dolibran), [دوليبران](${ESSAI}%D8%AF%D9%88%D9%84%D9%8A%D8%A8%D8%B1%D8%A7%D9%86), [9lamoxil](${ESSAI}9lamoxil).`,
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Puis cherchez le médicament dont vous n’avez jamais su écrire le nom. S’il sort quand même, dites-nous en commentaire sur Facebook votre pire orthographe. Et s’il ne sort pas, dites-le-nous aussi : c’est comme ça que la recherche s’améliore.',
      },
    ],
  },
  {
    slug: 'recherche-medicament-fautes-orthographe-arabe-arabizi-ar',
    lang: 'ar',
    audience: 'etudiant',
    title: 'اكتبه كما تشاء: جرّبنا البحث بأسوأ الأخطاء',
    subtitle: 'amoxiciline، dolibran، دوليبران، 9lamoxil… ثلاث وعشرون طريقة لكتابة ثمانية أدوية، وماذا يفعل بها البحث',
    description:
      'لا أحد يكتب «amoxicilline» صحيحة من أول مرة. كتبنا في DwaDZ أسوأ الإملاءات، بالفرنسية وبالعربية وبالعربيزي: حروف منسية، كتابة «كما تُنطق»، حرف B مكان P، وأرقام مكان الحروف. هذا ما ينجح، ولماذا، وما لا ينجح بعد.',
    seoTitle: 'البحث عن دواء دون معرفة إملائه: الأخطاء، العربية، العربيزي',
    seoKeywords: ['البحث عن دواء في الجزائر', 'اسم الدواء بالعربية', 'كتابة اسم الدواء', 'دوليبران', 'باراسيتامول', 'أموكسيسيلين', 'العربيزي', 'خطأ إملائي دواء'],
    date: '2026-11-16',
    readingTime: 5,
    image: 'recherche-fautes.png',
    tags: ['البحث', 'طريقة الاستعمال', 'العربية', 'العربيزي', 'الإملاء', 'لعبة'],
    faq: [
      {
        question: 'هل يجب أن أعرف الإملاء الصحيح للدواء حتى أجده؟',
        answer: 'لا. يجرّب البحث أولًا ما كتبته كما هو. فإن لم يجد شيئًا، قارنه بأسماء المدونة «بالسمع»: الحركات الفرنسية، الحروف المضاعفة، y أو i، c أو k، ph أو f، كلها لم تعد تهمّ.',
      },
      {
        question: 'هل أستطيع كتابة الاسم بالعربية؟',
        answer: 'نعم. العربية لا تكتب الحركات القصيرة، لذلك يقارن البحث الحروف الصامتة فقط في ما كتبته بمثيلاتها في الأسماء التجارية والمواد الفعالة. دوليبران تجد DOLIPRANE، وباراسيتامول تجد PARACETAMOL.',
      },
      {
        question: 'ما هو العربيزي، وهل يفهمه البحث؟',
        answer: 'هو العربية مكتوبة بلوحة مفاتيح لاتينية، تعوّض فيها الأرقام بعض الحروف: 3 للعين، 7 للحاء، 9 للقاف، 5 للخاء. يقرؤها البحث حروفًا حين تكون ملتصقة بكلمة، ويترك أرقام الجرعة كما هي.',
      },
      {
        question: 'ماذا أفعل إذا لم يجد البحث شيئًا؟',
        answer: 'جرّب بحروف أقل (بداية الاسم تكفي غالبًا)، أو ابحث عن المادة الفعالة بدل الاسم التجاري. والبحث الموجَّه يسمح أيضًا بالانطلاق من الشكل وطريقة الإعطاء.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'لنكن صادقين: لا أحد يكتب «amoxicilline» صحيحة من أول مرة. حرفا L أم واحد؟ X أم «ks»؟ وحين نسمع الاسم في الهاتف، أو نقرؤه بالعربية على ورقة، يصير الأمر أصعب. لذلك قمنا بالتجربة التي يقوم بها الجميع دون أن يعترف: نكتب كيفما اتفق، وننظر ماذا يخرج.',
      },
      {
        type: 'image',
        src: '/articles/recherche/fautes-vers-nom-officiel.png',
        width: 1428,
        height: 400,
        alt: 'ست طرق لكتابة الدواء نفسه، تحتها خط أحمر كالأخطاء: amoxiciline، amoksisiline، amoxycilline، amocsiciline، أموكسيسيلين بالعربية و amoxilline. سهم يربطها كلها بالاسم الرسمي AMOXICILLINE وعليه علامة خضراء',
        caption: 'ست كتابات ودواء واحد: البحث يعيدها كلها إلى الاسم الرسمي.',
      },
      { type: 'h2', title: 'الجولة 1: أخطاء كل يوم' },
      {
        type: 'paragraph',
        text: 'نبدأ بهدوء، بالأخطاء التي تصنعها كل لوحات مفاتيح الهواتف.',
      },
      {
        type: 'table',
        headers: ['تكتب', 'يفهم البحث', 'الخطأ المغفور'],
        rows: [
          { cells: ['amoxiciline', 'AMOXICILLINE', 'حرف L منسي'] },
          { cells: ['amoxycilline', 'AMOXICILLINE', 'Y مكان I'] },
          { cells: ['dolipran', 'DOLIPRANE', 'حرف E الأخير منسي'] },
          { cells: ['dolyprane', 'DOLIPRANE', 'Y مكان I'] },
          { cells: ['omeprazol', 'OMEPRAZOLE', 'حرف E الأخير، والحركات الفرنسية لا تُحسب أبدًا'] },
        ],
      },
      { type: 'h2', title: 'الجولة 2: مكتوب كما يُنطق' },
      {
        type: 'paragraph',
        text: 'هنا لم تعد أخطاء: نكتب بالسمع مباشرة. هذا ما يحدث حين نسجّل اسمًا سمعناه عند الطبيب.',
      },
      {
        type: 'table',
        headers: ['تكتب', 'يفهم البحث', 'ما سمعه'],
        rows: [
          { cells: ['amoksisiline', 'AMOXICILLINE', 'X تُنطق «ks»، و C قبل I تُنطق «s»'] },
          { cells: ['amocsiciline', 'AMOXICILLINE', '«cs» لها صوت X'] },
          { cells: ['parasetamol', 'PARACETAMOL', 'C قبل E تُنطق «s»'] },
          { cells: ['klamoxil', 'CLAMOXYL', 'K أو C، I أو Y: الصوت نفسه'] },
          { cells: ['tadalaphil', 'TADALAFIL', 'PH تُنطق «f»'] },
          { cells: ['setirizine', 'CETIRIZINE', 'S أو C: الصوت نفسه'] },
          { cells: ['dolibran', 'DOLIPRANE', 'B مكان P (انظر أسفله)'] },
        ],
      },
      { type: 'h2', title: 'الجولة 3: بالعربية' },
      {
        type: 'paragraph',
        text: 'الاسم مكتوب بالعربية في الوصفة، أو هي ببساطة لوحة مفاتيحك الآن. اكتبه كما هو.',
      },
      {
        type: 'table',
        headers: ['تكتب', 'يفهم البحث'],
        rows: [
          { cells: ['دوليبران', 'DOLIPRANE'] },
          { cells: ['باراسيتامول', 'PARACETAMOL'] },
          { cells: ['أموكسيسيلين', 'AMOXICILLINE'] },
          { cells: ['كلاموكسيل', 'CLAMOXYL'] },
          { cells: ['ماكسيبلاز', 'MAXIPLAZ'] },
          { cells: ['تادالافيل', 'TADALAFIL'] },
          { cells: ['أوميبرازول', 'OMEPRAZOLE'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'حيلتان تجعلان ذلك ممكنًا. أولًا، ليس في العربية حرف P: نكتب ب، أي B. لذلك يعامل البحث P و B كحرف واحد، ولهذا أيضًا نجحت «dolibran» في الجولة 2. ثانيًا، العربية لا تكتب الحركات القصيرة: فيقارن البحث **الحروف الصامتة** فقط. PARACETAMOL وباراسيتامول يصيران كلاهما «brstml»، فيتعارفان.',
      },
      { type: 'h2', title: 'الجولة 4: العربيزي' },
      {
        type: 'paragraph',
        text: 'العربيزي هو عربية الرسائل القصيرة: حروف لاتينية، وأرقام للأصوات التي لا توجد في الفرنسية. يقرأ البحث هذه الأرقام حروفًا.',
      },
      {
        type: 'table',
        headers: ['الرقم', 'الحرف العربي', 'يُقرأ'],
        rows: [
          { cells: ['2', 'ء', 'a'] },
          { cells: ['3', 'ع', 'a'] },
          { cells: ['5', 'خ', 'kh'] },
          { cells: ['7', 'ح', 'h'] },
          { cells: ['9', 'ق', 'k'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'النتيجة: **9lamoxil** تجد CLAMOXYL. وحتى لا يختلط كل شيء، لا يُقرأ الرقم حرفًا إلا إذا كان ملتصقًا بكلمة: في «B12» أو «500 mg» تبقى الأرقام أرقامًا.',
      },
      { type: 'h2', title: 'الجولة 5: هنا نبالغ' },
      {
        type: 'paragraph',
        text: 'وماذا لو نسينا حرفًا كاملًا في الوسط؟ لم يعد ما كتبناه «يُسمع» تمامًا مثل الاسم. عندها يلجأ البحث إلى حلّه الأخير: يبحث عن الأسماء **الأكثر شبهًا** بما كتبت.',
      },
      {
        type: 'table',
        headers: ['تكتب', 'الاسم الأكثر شبهًا', 'ما ينقص'],
        rows: [
          { cells: ['amoxilline', 'AMOXICILLINE', 'مقطع كامل'] },
          { cells: ['parcetamol', 'PARACETAMOL', 'حرف A'] },
          { cells: ['dolprane', 'DOLIPRANE', 'حرف I'] },
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'في هذه الحالة قد تحتوي القائمة على جيران: أسماء أخرى تشبه ما كتبت أيضًا. تحقّق دائمًا من الاسم والمادة الفعالة والجرعة في البطاقة قبل الاعتماد عليها.',
      },
      { type: 'h2', title: 'كيف يعمل ذلك، في ثلاث خطوات' },
      {
        type: 'list',
        items: [
          '**كما هي.** يجرّب البحث أولًا ما كتبته كما كتبته. إن كان الاسم صحيحًا حصلت على الجواب فورًا.',
          '**بالسمع.** وإلا ردّ ما كتبته وأسماء المدونة إلى نطقها: لا حركات ولا حروف كبيرة، PH تصير F، و Y تصير I، و X تصير KS، والحروف المضاعفة تصير حرفًا واحدًا، ويسقط حرف E الأخير. فتعطي «Amoxicilline» و«amoksisiline» الشيء نفسه تمامًا: amoksisilin.',
          '**بالتشابه.** وفي آخر المطاف يحتفظ بالأسماء التي تشترك مع ما كتبته في أكبر عدد من الأجزاء. وبالعربية يقارن الحروف الصامتة.',
        ],
      },
      { type: 'h2', title: 'ما لا ينجح (بعد)' },
      {
        type: 'list',
        items: [
          '**ثلاثة حروف عشوائية**: لا بدّ من حدّ أدنى من المادة للتعرّف على اسم.',
          '**بعض الكتابات العربية**: سيماغلوتايد مثلًا لا تجد بعد SEMAGLUTIDE، لأن الغين و«ايد» لا يطابقان طريقة كتابة الاسم بالحروف اللاتينية. اكتب «semaglutide» أو بداية الاسم.',
          '**لقب الدواء**: «الحبة الوردية تاع الضغط» ليست اسمًا. انطلق من البحث الموجَّه، حسب الشكل وطريقة الإعطاء.',
          '**دواء غير موجود في المدونة الجزائرية**: البحث لا يستطيع اختراع بطاقة.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'البحث المتسامح يوصلك إلى بطاقة، لا إلى يقين. قد يحمل دواءان اسمين متقاربين جدًا: قبل أي تناول، المرجع هو العلبة والوصفة والصيدلي.',
      },
      { type: 'h2', title: 'دورك: التحدّي' },
      {
        type: 'paragraph',
        text: `جرّب الآن: [amoksisiline](${ESSAI}amoksisiline)، [dolibran](${ESSAI}dolibran)، [دوليبران](${ESSAI}%D8%AF%D9%88%D9%84%D9%8A%D8%A8%D8%B1%D8%A7%D9%86)، [9lamoxil](${ESSAI}9lamoxil).`,
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'ثم ابحث عن الدواء الذي لم تعرف يومًا كيف يُكتب اسمه. إن ظهر رغم ذلك، اكتب لنا في تعليق على فيسبوك أسوأ إملاء عندك. وإن لم يظهر فأخبرنا أيضًا: هكذا يتحسّن البحث.',
      },
    ],
  },
]
