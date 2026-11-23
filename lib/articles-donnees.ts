import type { Article } from './articles'
import { SERIE_EQUIVALENTS, SLUG_PILIER } from './articles-equivalents.ts'

/**
 * Trois articles tirés de la nomenclature (FR + AR) :
 *   - ruptures de stock : trouver une alternative (même DCI, autre dosage, autre labo) et en parler au pharmacien ;
 *   - les 20 laboratoires les plus présents, et la part fabriquée en Algérie (bloc `top-labos`) ;
 *   - les substances qui ont le plus de génériques, et celles qui n'en ont aucun (bloc `dci-generiques`).
 *
 * Aucun chiffre de la nomenclature n'est écrit dans le texte : les classements sont calculés à l'affichage
 * (components/articles/ClassementBlocks.tsx), la liste d'exemple par EquivalentsBlock.
 */

export const SLUG_RUPTURE = 'rupture-stock-medicament-algerie-trouver-alternative'
export const SLUG_LABOS = 'laboratoires-pharmaceutiques-algerie-classement-nomenclature'
export const SLUG_GENERIQUES = 'generiques-algerie-dci-plus-de-generiques-sans-generique'

const SLUG_LEVOTHYROX = SERIE_EQUIVALENTS.find(e => e.marque === 'Levothyrox')!.slug
const SLUG_FICHE = 'fiche-medicament-algerie-lire-en-30-secondes'
const SLUG_GRAPHES = 'graphes-medicaments-algerie-cas-usage-acces'

export const ARTICLES_DONNEES: Article[] = [
  // ─── Ruptures de stock, FR ─────────────────────────────────────────────────
  {
    slug: SLUG_RUPTURE,
    lang: 'fr',
    audience: 'professionnel',
    title: 'Rupture de stock : comment trouver une alternative quand votre médicament manque',
    subtitle: 'Même DCI, autre laboratoire, autre dosage, autre forme : ce qui est possible, dans quel ordre, et pourquoi il faut en parler à votre pharmacien',
    description:
      'Votre médicament est introuvable en pharmacie ? Avant de changer de traitement, il existe souvent une alternative avec la même substance : un autre laboratoire, un autre dosage ou une autre forme. Les quatre solutions dans l’ordre, comment les chercher dans la nomenclature, ce que votre pharmacien peut faire, et les erreurs à éviter.',
    seoTitle: 'Rupture de médicament en Algérie : trouver une alternative (même DCI, autre labo, autre dosage)',
    seoKeywords: ['rupture médicament Algérie', 'médicament introuvable Algérie', 'pénurie médicament Algérie', 'alternative médicament', 'même DCI autre laboratoire', 'remplacer un médicament en rupture', 'انقطاع الدواء في الجزائر'],
    date: '2026-11-23',
    readingTime: 7,
    tags: ['Ruptures', 'Alternatives', 'DCI', 'Générique', 'Pharmacien', 'Nomenclature'],
    faq: [
      {
        question: 'Mon médicament est en rupture. Le pharmacien peut-il me donner une autre marque ?',
        answer: 'Oui, si c’est la même substance (DCI), au même dosage et sous la même forme : c’est le cas le plus simple. Pour un autre dosage ou une autre forme, le pharmacien vérifie que la dose totale et la façon de la prendre restent les mêmes. Pour une autre substance, il faut l’avis du médecin.',
      },
      {
        question: 'Puis-je prendre deux comprimés de 500 mg à la place d’un comprimé de 1 g ?',
        answer: 'Souvent oui, la dose est la même, mais pas toujours : les formes à libération prolongée (LP) ne se remplacent pas par des formes classiques, et certains comprimés ne se coupent pas. Faites valider l’équivalence par votre pharmacien avant de changer.',
      },
      {
        question: 'Le médicament figure dans la nomenclature mais aucune pharmacie ne l’a. Pourquoi ?',
        answer: 'La nomenclature dit qu’un médicament est enregistré, pas qu’il est livré. Une rupture vient de l’approvisionnement (production, importation, distribution) : le médicament reste autorisé, il manque seulement dans les pharmacies.',
      },
      {
        question: 'Que faire si je ne trouve aucune alternative ?',
        answer: 'Retournez voir votre médecin : lui seul peut choisir une autre substance. N’arrêtez pas brutalement un traitement chronique et n’achetez pas de médicament hors pharmacie. Vous pouvez aussi nous signaler votre recherche : les demandes sont publiées sans nom sur la page Médicaments recherchés.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: '« Il n’y en a plus, revenez la semaine prochaine. » Cette phrase, beaucoup de patients l’entendent au comptoir. Quand un médicament manque, le réflexe est de faire le tour des pharmacies, ou de demander sur les réseaux. Pourtant, dans beaucoup de cas, une solution existe déjà sur l’étagère : **la même substance, sous un autre nom**. Voici comment la trouver, dans quel ordre chercher, et à quel moment c’est au pharmacien ou au médecin de décider.',
      },
      { type: 'h2', title: 'Rupture, retrait, non enregistré : trois situations différentes' },
      {
        type: 'table',
        headers: ['Situation', 'Ce que ça veut dire', 'Ce que vous voyez sur DwaDZ'],
        rows: [
          { cells: ['**Rupture de stock**', 'Le médicament est autorisé, mais il n’arrive pas en pharmacie, souvent pour un temps.', 'La fiche est « Médicament actif » : la rupture ne se voit pas dans la nomenclature.'] },
          { cells: ['**Retrait**', 'L’autorisation a été retirée : le médicament ne reviendra pas sous cette forme.', 'Badge 🚫 « Médicament retiré », avec la date, le motif et des alternatives.'] },
          { cells: ['**Non enregistré**', 'Le médicament n’existe pas en Algérie (une boîte ramenée de l’étranger, par exemple).', 'Aucune fiche. Cherchez sa DCI : voir la série [« Quel est l’équivalent algérien de… ? »](/articles/' + SLUG_PILIER + ').'] },
        ],
      },
      { type: 'h2', title: 'Les 4 alternatives, de la plus simple à celle qui demande le médecin' },
      {
        type: 'table',
        headers: ['Alternative', 'Exemple', 'Qui décide'],
        rows: [
          { cells: ['**1. Même DCI, même dosage, même forme, autre laboratoire**', 'Une autre marque d’amoxicilline 1 g en comprimés', 'Le pharmacien peut la proposer'] },
          { cells: ['**2. Même DCI, autre dosage**', 'Deux comprimés de 500 mg au lieu d’un comprimé de 1 g', 'Le pharmacien, qui vérifie la dose et la forme'] },
          { cells: ['**3. Même DCI, autre forme**', 'Une gélule au lieu d’un comprimé, une suspension au lieu d’un sachet', 'Le pharmacien, et le médecin pour un enfant ou une forme particulière'] },
          { cells: ['**4. Autre DCI de la même famille**', 'Un autre antibiotique, un autre antihypertenseur', 'Le médecin seulement'] },
        ],
      },
      { type: 'h3', title: '1. Même substance, même dosage, autre laboratoire' },
      {
        type: 'paragraph',
        text: 'C’est la solution la plus fréquente, et la plus sûre. Quand une marque manque, une autre marque de la même DCI, au même dosage et sous la même forme, est souvent disponible : c’est un générique, ou le médicament de référence. Le médicament est le même ; seuls le nom, la boîte et parfois les excipients changent. Voici, par exemple, toutes les présentations d’amoxicilline enregistrées en Algérie : autant de laboratoires, de dosages et de formes que l’on peut comparer.',
      },
      { type: 'equivalents', atc: ['J01CA04'], dci: 'AMOXICILLINE' },
      { type: 'h3', title: '2. Même substance, autre dosage' },
      {
        type: 'paragraph',
        text: 'Le 1 g manque, mais le 500 mg est là ? Deux comprimés de 500 mg font la même dose. C’est souvent possible, avec trois vérifications : que la **dose totale** soit exactement la même, que la forme ne soit pas **à libération prolongée** (LP), qui ne se remplace pas par une forme classique, et qu’on ne doive pas **couper** un comprimé qui ne se coupe pas. À l’inverse, couper un comprimé plus dosé n’est possible que s’il est sécable.',
      },
      { type: 'h3', title: '3. Même substance, autre forme' },
      {
        type: 'paragraph',
        text: 'Gélule ou comprimé, sachet ou suspension buvable : la substance est la même, mais la forme change la façon de prendre le médicament, parfois la vitesse d’action. Chez l’enfant, passer d’une forme à une autre oblige à recalculer le volume ou le nombre de prises : c’est le pharmacien qui fait ce calcul, avec le médecin si besoin.',
      },
      { type: 'h3', title: '4. Une autre substance de la même famille' },
      {
        type: 'paragraph',
        text: 'Quand la DCI elle-même manque sous toutes ses formes, il reste parfois une autre substance de la même classe thérapeutique (même code ATC au niveau de la famille). Mais deux substances d’une même classe n’ont ni la même dose, ni toujours les mêmes indications ou les mêmes contre-indications : **ce choix revient au médecin**, jamais au patient.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Pour certains médicaments, même un changement de marque se fait avec un contrôle : lévothyroxine, antiépileptiques, antivitamines K, lithium, immunosuppresseurs. Un petit écart d’absorption suffit à déséquilibrer le traitement. Voir l’exemple de la [lévothyroxine](/articles/' + SLUG_LEVOTHYROX + ').',
      },
      { type: 'h2', title: 'Comment chercher une alternative sur DwaDZ' },
      {
        type: 'list',
        items: [
          '**Ouvrez la fiche de votre médicament** et repérez sa DCI, son dosage et sa forme (voir [lire une fiche en 30 secondes](/articles/' + SLUG_FICHE + ')).',
          '**Onglet « Génériques »** de la fiche : il liste les autres médicaments de même DCI.',
          '**Ou tapez la DCI** dans la [recherche](/recherche), puis cliquez la substance dans les suggestions : toutes les présentations s’affichent, avec les filtres de forme, de dosage et d’origine.',
          '**Filtre « Fabriqué en Algérie / Importé »** : quand une version importée manque, une version fabriquée localement de la même DCI existe parfois, et inversement.',
          '**Notez deux ou trois noms** au même dosage et à la même forme, et montrez-les à votre pharmacien.',
        ],
      },
      { type: 'h2', title: 'Parlez-en à votre pharmacien' },
      {
        type: 'paragraph',
        text: 'Le pharmacien est la personne la mieux placée face à une rupture. Il voit les stocks des distributeurs, sait souvent quand un produit doit revenir, connaît les équivalences de dosage et de forme, et peut appeler un confrère. Il peut aussi contacter votre médecin si une autre substance est nécessaire.',
      },
      { type: 'h3', title: 'Ce qu’il faut lui apporter' },
      {
        type: 'list',
        items: [
          'La **boîte** ou l’**ordonnance** du médicament qui manque.',
          'La liste de **vos autres médicaments** : une alternative ne doit pas créer d’interaction.',
          'Vos **allergies** connues, et pour un enfant, son **poids**.',
        ],
      },
      { type: 'h3', title: 'Les questions à lui poser' },
      {
        type: 'list',
        items: [
          '« Existe-t-il la même DCI, au même dosage, chez un autre laboratoire ? »',
          '« Si non, peut-on obtenir la même dose avec un autre dosage ou une autre forme ? »',
          '« Savez-vous quand il doit revenir ? »',
          '« Faut-il prévenir mon médecin, ou faire un contrôle après le changement ? »',
        ],
      },
      { type: 'h2', title: 'Ce qu’il ne faut pas faire' },
      {
        type: 'list',
        items: [
          '**Arrêter brutalement un traitement chronique.** Pour certains médicaments, l’arrêt brusque est dangereux : antiépileptiques, bêtabloquants, corticoïdes pris au long cours, certains antidépresseurs, insuline. Prévenez votre médecin avant d’être à court.',
          '**Acheter hors pharmacie** (réseaux sociaux, marché informel) : risque de contrefaçon, de produit périmé ou mal conservé.',
          '**Faire des réserves** de plusieurs boîtes : cela aggrave la rupture pour les autres patients.',
          '**Prendre le médicament d’un proche** : même nom, mais parfois pas le même dosage ni la même forme.',
        ],
      },
      { type: 'h2', title: 'Vous ne trouvez vraiment rien ?' },
      {
        type: 'list',
        items: [
          '**Retournez voir votre médecin** : il peut choisir une autre substance adaptée.',
          '**Signalez votre recherche** par la page [Contact](/contact) ou sur Facebook : les demandes sont publiées sans nom sur la page [Médicaments recherchés](/demandes), que des pharmaciens consultent.',
          '**Consultez la liste des [médicaments critiques](/medicaments-critiques)**, ceux que le ministère suit en priorité.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Pour savoir quelles substances ont beaucoup d’alternatives, et lesquelles n’en ont aucune, voir [les DCI qui ont le plus de génériques en Algérie](/articles/' + SLUG_GENERIQUES + ').',
      },
      { type: 'h2', title: 'Testez-vous' },
      {
        type: 'qcm',
        questions: [
          {
            question: 'Votre amoxicilline 1 g en comprimés manque. Quelle alternative le pharmacien peut-il proposer en premier ?',
            options: [
              { label: 'A', text: 'Un autre antibiotique.' },
              { label: 'B', text: 'Une autre marque d’amoxicilline 1 g en comprimés.' },
              { label: 'C', text: 'De l’amoxicilline en sirop pour enfant.' },
            ],
            answer: 'B',
          },
          {
            question: 'Lequel de ces remplacements n’est pas une simple équivalence ?',
            options: [
              { label: 'A', text: 'Un comprimé LP par deux comprimés classiques.' },
              { label: 'B', text: 'Une marque par une autre, même DCI, même dosage, même forme.' },
              { label: 'C', text: 'Deux comprimés de 500 mg par un comprimé de 1 g, même forme.' },
            ],
            answer: 'A',
          },
          {
            question: 'Un médicament est marqué « Médicament actif » mais introuvable. Que veut dire « actif » ?',
            options: [
              { label: 'A', text: 'Qu’il est en stock partout.' },
              { label: 'B', text: 'Qu’il a été retiré.' },
              { label: 'C', text: 'Qu’il est enregistré dans la nomenclature.' },
            ],
            answer: 'C',
          },
        ],
      },
    ],
  },

  // ─── Ruptures de stock, AR ─────────────────────────────────────────────────
  {
    slug: `${SLUG_RUPTURE}-ar`,
    lang: 'ar',
    audience: 'professionnel',
    title: 'انقطاع الدواء: كيف تجد بديلًا عندما يغيب دواؤك',
    subtitle: 'نفس المادة الفعالة، مخبر آخر، جرعة أخرى، شكل آخر: ما الممكن، بأي ترتيب، ولماذا يجب أن تتحدث مع الصيدلي',
    description:
      'دواؤك غير موجود في الصيدلية؟ قبل تغيير العلاج، يوجد غالبًا بديل بنفس المادة الفعالة: مخبر آخر، جرعة أخرى أو شكل آخر. الحلول الأربعة بالترتيب، كيف تبحث عنها في المدونة، ما يمكن للصيدلي فعله، والأخطاء التي يجب تجنبها.',
    seoTitle: 'انقطاع الدواء في الجزائر: إيجاد بديل (نفس المادة، مخبر آخر، جرعة أخرى)',
    seoKeywords: ['انقطاع الدواء في الجزائر', 'دواء مفقود', 'ندرة الأدوية الجزائر', 'بديل الدواء', 'نفس المادة الفعالة', 'rupture médicament Algérie'],
    date: '2026-11-23',
    readingTime: 7,
    tags: ['الانقطاعات', 'البدائل', 'DCI', 'دواء جنيس', 'الصيدلي', 'المدونة'],
    faq: [
      {
        question: 'دوائي منقطع. هل يمكن للصيدلي أن يعطيني علامة أخرى؟',
        answer: 'نعم، إذا كانت نفس المادة الفعالة (DCI)، بنفس الجرعة ونفس الشكل: إنها الحالة الأبسط. بالنسبة لجرعة أخرى أو شكل آخر، يتحقق الصيدلي من أن الجرعة الإجمالية وطريقة التناول تبقيان نفسها. أما مادة أخرى فتتطلب رأي الطبيب.',
      },
      {
        question: 'هل يمكنني أخذ قرصين من 500 ملغ بدل قرص واحد من 1 غ؟',
        answer: 'غالبًا نعم، فالجرعة نفسها، لكن ليس دائمًا: الأشكال الممتدة المفعول (LP) لا تُعوَّض بأشكال عادية، وبعض الأقراص لا تُقسم. اطلب من الصيدلي تأكيد التكافؤ قبل التغيير.',
      },
      {
        question: 'الدواء موجود في المدونة لكن لا توجد صيدلية لديها. لماذا؟',
        answer: 'المدونة تقول إن الدواء مسجّل، لا إنه يصل إلى الصيدليات. الانقطاع مصدره التموين (الإنتاج، الاستيراد، التوزيع): الدواء يبقى مرخّصًا، لكنه غائب عن الصيدليات فقط.',
      },
      {
        question: 'ماذا أفعل إذا لم أجد أي بديل؟',
        answer: 'عد إلى طبيبك: هو وحده من يمكنه اختيار مادة أخرى. لا توقف علاجًا مزمنًا فجأة ولا تشترِ دواءً خارج الصيدلية. يمكنك أيضًا إبلاغنا ببحثك: تُنشر الطلبات دون اسم في صفحة الأدوية المطلوبة.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: '«ماكانش، ارجع الأسبوع الجاي». هذه الجملة يسمعها كثير من المرضى في الصيدلية. عندما يغيب دواء، يكون رد الفعل هو التنقل بين الصيدليات أو السؤال على مواقع التواصل. ومع ذلك، في كثير من الحالات يوجد الحل على الرف: **نفس المادة، باسم آخر**. إليك كيف تجده، وبأي ترتيب تبحث، ومتى يكون القرار للصيدلي أو للطبيب.',
      },
      { type: 'h2', title: 'انقطاع، سحب، غير مسجّل: ثلاث حالات مختلفة' },
      {
        type: 'table',
        headers: ['الحالة', 'ماذا تعني', 'ما تراه في DwaDZ'],
        rows: [
          { cells: ['**انقطاع المخزون**', 'الدواء مرخّص، لكنه لا يصل إلى الصيدليات، غالبًا لفترة.', 'البطاقة «دواء نشط»: الانقطاع لا يظهر في المدونة.'] },
          { cells: ['**سحب**', 'سُحب الترخيص: لن يعود الدواء بهذا الشكل.', 'شارة 🚫 «دواء مسحوب»، مع التاريخ والسبب والبدائل.'] },
          { cells: ['**غير مسجّل**', 'الدواء غير موجود في الجزائر (علبة جُلبت من الخارج مثلًا).', 'لا توجد بطاقة. ابحث عن اسمه العلمي: انظر سلسلة [«ما هو المعادل الجزائري لـ…؟»](/articles/' + SLUG_PILIER + '-ar).'] },
        ],
      },
      { type: 'h2', title: 'البدائل الأربعة، من الأبسط إلى الذي يتطلب الطبيب' },
      {
        type: 'table',
        headers: ['البديل', 'مثال', 'من يقرر'],
        rows: [
          { cells: ['**1. نفس المادة، نفس الجرعة، نفس الشكل، مخبر آخر**', 'علامة أخرى من أموكسيسيلين 1 غ أقراص', 'يمكن للصيدلي اقتراحها'] },
          { cells: ['**2. نفس المادة، جرعة أخرى**', 'قرصان من 500 ملغ بدل قرص من 1 غ', 'الصيدلي، الذي يتحقق من الجرعة والشكل'] },
          { cells: ['**3. نفس المادة، شكل آخر**', 'كبسولة بدل قرص، معلّق بدل كيس', 'الصيدلي، والطبيب بالنسبة للطفل أو لشكل خاص'] },
          { cells: ['**4. مادة أخرى من نفس العائلة**', 'مضاد حيوي آخر، خافض ضغط آخر', 'الطبيب فقط'] },
        ],
      },
      { type: 'h3', title: '1. نفس المادة، نفس الجرعة، مخبر آخر' },
      {
        type: 'paragraph',
        text: 'إنه الحل الأكثر شيوعًا والأكثر أمانًا. عندما تغيب علامة، تتوفر غالبًا علامة أخرى بنفس المادة الفعالة ونفس الجرعة ونفس الشكل: دواء جنيس أو الدواء المرجعي. الدواء هو نفسه؛ يتغير الاسم والعلبة وأحيانًا السواغات فقط. هذه مثلًا كل تقديمات الأموكسيسيلين المسجّلة في الجزائر: عدد من المخابر والجرعات والأشكال يمكن مقارنتها.',
      },
      { type: 'equivalents', atc: ['J01CA04'], dci: 'AMOXICILLINE' },
      { type: 'h3', title: '2. نفس المادة، جرعة أخرى' },
      {
        type: 'paragraph',
        text: 'الـ1 غ غائب، لكن الـ500 ملغ موجود؟ قرصان من 500 ملغ يعطيان نفس الجرعة. هذا ممكن غالبًا، مع ثلاث عمليات تحقق: أن تكون **الجرعة الإجمالية** نفسها تمامًا، وألا يكون الشكل **ممتد المفعول** (LP) لأنه لا يُعوَّض بشكل عادي، وألا نضطر إلى **قسم** قرص لا يُقسم. وبالعكس، لا يمكن قسم قرص أعلى جرعة إلا إذا كان قابلًا للقسم.',
      },
      { type: 'h3', title: '3. نفس المادة، شكل آخر' },
      {
        type: 'paragraph',
        text: 'كبسولة أو قرص، كيس أو معلّق فموي: المادة نفسها، لكن الشكل يغيّر طريقة التناول وأحيانًا سرعة المفعول. عند الطفل، الانتقال من شكل لآخر يستوجب إعادة حساب الحجم أو عدد الجرعات: الصيدلي هو من يقوم بهذا الحساب، مع الطبيب عند الحاجة.',
      },
      { type: 'h3', title: '4. مادة أخرى من نفس العائلة' },
      {
        type: 'paragraph',
        text: 'عندما تغيب المادة الفعالة نفسها بكل أشكالها، تبقى أحيانًا مادة أخرى من نفس الصنف العلاجي (نفس رمز ATC على مستوى العائلة). لكن مادتين من نفس الصنف ليس لهما نفس الجرعة، ولا دائمًا نفس الاستطبابات أو موانع الاستعمال: **هذا الاختيار يعود للطبيب**، وليس للمريض أبدًا.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'بالنسبة لبعض الأدوية، حتى تغيير العلامة يتم مع مراقبة: الليفوثيروكسين، مضادات الصرع، مضادات الفيتامين K، الليثيوم، مثبطات المناعة. فرق صغير في الامتصاص يكفي لاختلال العلاج. انظر مثال [الليفوثيروكسين](/articles/' + SLUG_LEVOTHYROX + '-ar).',
      },
      { type: 'h2', title: 'كيف تبحث عن بديل في DwaDZ' },
      {
        type: 'list',
        items: [
          '**افتح بطاقة دوائك** وحدد اسمه العلمي وجرعته وشكله (انظر [قراءة البطاقة في 30 ثانية](/articles/' + SLUG_FICHE + '-ar)).',
          '**تبويب «الأدوية الجنيسة»** في البطاقة: يعرض الأدوية الأخرى بنفس المادة الفعالة.',
          '**أو اكتب الاسم العلمي** في [البحث](/recherche)، ثم اضغط على المادة في الاقتراحات: تظهر كل التقديمات، مع مرشحات الشكل والجرعة والمنشأ.',
          '**مرشح «مصنوع في الجزائر / مستورد»**: عندما تغيب نسخة مستوردة، توجد أحيانًا نسخة مصنوعة محليًا من نفس المادة، والعكس.',
          '**سجّل اسمين أو ثلاثة** بنفس الجرعة ونفس الشكل، وأرِها للصيدلي.',
        ],
      },
      { type: 'h2', title: 'تحدّث مع الصيدلي' },
      {
        type: 'paragraph',
        text: 'الصيدلي هو الشخص الأنسب أمام الانقطاع. يرى مخزون الموزعين، ويعرف غالبًا متى يعود المنتج، ويعرف تكافؤ الجرعات والأشكال، ويمكنه الاتصال بزميل. كما يمكنه الاتصال بطبيبك إذا كانت مادة أخرى ضرورية.',
      },
      { type: 'h3', title: 'ما يجب أن تحضره له' },
      {
        type: 'list',
        items: [
          '**العلبة** أو **الوصفة** الخاصة بالدواء الغائب.',
          'قائمة **أدويتك الأخرى**: يجب ألا يُحدث البديل تداخلًا.',
          '**حساسياتك** المعروفة، وبالنسبة للطفل، **وزنه**.',
        ],
      },
      { type: 'h3', title: 'الأسئلة التي تطرحها عليه' },
      {
        type: 'list',
        items: [
          '«هل توجد نفس المادة، بنفس الجرعة، عند مخبر آخر؟»',
          '«إذا لا، هل يمكن الحصول على نفس الجرعة بجرعة أخرى أو بشكل آخر؟»',
          '«هل تعرف متى يعود؟»',
          '«هل يجب إخبار طبيبي، أو إجراء مراقبة بعد التغيير؟»',
        ],
      },
      { type: 'h2', title: 'ما لا يجب فعله' },
      {
        type: 'list',
        items: [
          '**إيقاف علاج مزمن فجأة.** بالنسبة لبعض الأدوية، الإيقاف المفاجئ خطير: مضادات الصرع، حاصرات بيتا، الكورتيزون المأخوذ لمدة طويلة، بعض مضادات الاكتئاب، الإنسولين. أخبر طبيبك قبل أن ينفد دواؤك.',
          '**الشراء خارج الصيدلية** (مواقع التواصل، السوق الموازية): خطر التقليد، أو منتج منتهي الصلاحية أو سيئ الحفظ.',
          '**تخزين عدة علب**: هذا يزيد الانقطاع سوءًا بالنسبة للمرضى الآخرين.',
          '**أخذ دواء أحد الأقارب**: نفس الاسم، لكن أحيانًا ليس نفس الجرعة ولا نفس الشكل.',
        ],
      },
      { type: 'h2', title: 'لم تجد شيئًا فعلًا؟' },
      {
        type: 'list',
        items: [
          '**عد إلى طبيبك**: يمكنه اختيار مادة أخرى مناسبة.',
          '**أبلغ ببحثك** عبر صفحة [الاتصال](/contact) أو على فيسبوك: تُنشر الطلبات دون اسم في صفحة [الأدوية المطلوبة](/demandes)، التي يطّلع عليها صيادلة.',
          '**اطّلع على قائمة [الأدوية الحرجة](/medicaments-critiques)**، التي تتابعها الوزارة بالأولوية.',
        ],
      },
      {
        type: 'paragraph',
        text: 'لمعرفة المواد التي لها بدائل كثيرة وتلك التي ليس لها أي بديل، انظر [المواد الأكثر أدوية جنيسة في الجزائر](/articles/' + SLUG_GENERIQUES + '-ar).',
      },
      { type: 'h2', title: 'اختبر نفسك' },
      {
        type: 'qcm',
        questions: [
          {
            question: 'أموكسيسيلين 1 غ أقراص غائب. أي بديل يمكن للصيدلي اقتراحه أولًا؟',
            options: [
              { label: 'A', text: 'مضاد حيوي آخر.' },
              { label: 'B', text: 'علامة أخرى من أموكسيسيلين 1 غ أقراص.' },
              { label: 'C', text: 'أموكسيسيلين شراب للأطفال.' },
            ],
            answer: 'B',
          },
          {
            question: 'أي من هذه التعويضات ليس تكافؤًا بسيطًا؟',
            options: [
              { label: 'A', text: 'قرص LP بقرصين عاديين.' },
              { label: 'B', text: 'علامة بأخرى، نفس المادة، نفس الجرعة، نفس الشكل.' },
              { label: 'C', text: 'قرصان من 500 ملغ بقرص من 1 غ، نفس الشكل.' },
            ],
            answer: 'A',
          },
          {
            question: 'دواء مكتوب عليه «دواء نشط» لكنه مفقود. ماذا تعني «نشط»؟',
            options: [
              { label: 'A', text: 'أنه متوفر في كل مكان.' },
              { label: 'B', text: 'أنه سُحب.' },
              { label: 'C', text: 'أنه مسجّل في المدونة.' },
            ],
            answer: 'C',
          },
        ],
      },
    ],
  },

  // ─── Laboratoires, FR ──────────────────────────────────────────────────────
  {
    slug: SLUG_LABOS,
    lang: 'fr',
    audience: 'professionnel',
    title: 'Les 20 laboratoires les plus présents dans la nomenclature algérienne, et où ils fabriquent',
    subtitle: 'Le classement calculé en direct sur la nomenclature : nombre de présentations, de substances, part fabriquée en Algérie et pays',
    description:
      'Quels laboratoires ont le plus de médicaments enregistrés en Algérie ? Le classement des 20 premiers, calculé en direct sur la nomenclature du MIPH : nombre de présentations et de substances, part des présentations fabriquées en Algérie, et pays indiqués. Avec la méthode et les limites du classement.',
    seoTitle: 'Laboratoires pharmaceutiques en Algérie : le top 20 de la nomenclature, fabrication locale et importation',
    seoKeywords: ['laboratoires pharmaceutiques Algérie', 'classement laboratoires Algérie', 'industrie pharmaceutique Algérie', 'médicaments fabriqués en Algérie', 'production locale médicaments', 'nomenclature MIPH', 'مخابر الأدوية في الجزائر'],
    date: '2026-11-23',
    readingTime: 5,
    tags: ['Laboratoires', 'Industrie', 'Fabriqué en Algérie', 'Importation', 'Données', 'Nomenclature'],
    faq: [
      {
        question: 'Comment ce classement est-il calculé ?',
        answer: 'On compte, pour chaque laboratoire, les lignes de la nomenclature en vigueur : une ligne est une présentation (une marque, un dosage, une forme). Le calcul est refait à chaque affichage de la page, il suit donc les mises à jour de la nomenclature.',
      },
      {
        question: 'Que veut dire « fabriqué en Algérie » dans le tableau ?',
        answer: 'C’est la part des présentations du laboratoire que la nomenclature indique comme fabriquées localement. Un laboratoire étranger peut avoir des produits fabriqués en Algérie, dans sa propre usine ou chez un façonnier, et un laboratoire algérien peut aussi importer certains produits.',
      },
      {
        question: 'Le premier laboratoire est-il le plus gros fabricant ?',
        answer: 'Pas forcément. Le classement compte des présentations enregistrées, pas des boîtes vendues ni un chiffre d’affaires. Un laboratoire qui décline une substance en de nombreux dosages et formes monte dans le classement sans produire davantage.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Derrière chaque boîte, il y a un laboratoire. La nomenclature nationale en recense plusieurs centaines, algériens et étrangers, mais une petite partie d’entre eux concentre une grande part des médicaments enregistrés. Qui sont-ils, combien de substances couvrent-ils, et quelle part de leurs produits est fabriquée en Algérie ? Le classement ci-dessous est calculé en direct sur la nomenclature : il suit chaque mise à jour.',
      },
      { type: 'h2', title: 'Le classement' },
      { type: 'top-labos', limite: 20 },
      { type: 'h2', title: 'Comment lire le tableau' },
      {
        type: 'list',
        items: [
          '**Présentations** : le nombre de lignes de la nomenclature au nom du laboratoire. Une même marque déclinée en 500 mg et 1 g, en comprimé et en sachet, compte pour plusieurs présentations.',
          '**Substances** : le nombre de DCI différentes. C’est la largeur de la gamme : un laboratoire peut avoir beaucoup de présentations sur peu de substances.',
          '**Fabriqué en Algérie** : combien de ses présentations la nomenclature indique comme fabriquées localement, et la part que cela représente.',
          '**Pays indiqués** : les pays les plus fréquents dans ses présentations, tels qu’ils sont écrits dans la nomenclature.',
        ],
      },
      { type: 'h2', title: 'Fabriqué en Algérie ou importé : ce que dit la colonne' },
      {
        type: 'paragraph',
        text: 'La nomenclature distingue les médicaments **fabriqués en Algérie** des médicaments **importés**. Cette distinction porte sur le produit, pas sur la nationalité du laboratoire : un groupe étranger peut fabriquer une partie de sa gamme en Algérie, dans sa propre usine ou chez un façonnier, et importer le reste. À l’inverse, un laboratoire algérien peut importer certains produits qu’il ne fabrique pas. C’est pourquoi la colonne donne une part, et non un oui ou un non.',
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'La part fabriquée localement compte aussi pour les patients : quand une version importée d’un médicament manque, une version fabriquée en Algérie de la même DCI peut être disponible. Voir [comment trouver une alternative en cas de rupture](/articles/' + SLUG_RUPTURE + ').',
      },
      { type: 'h2', title: 'À quoi sert ce classement' },
      {
        type: 'list',
        items: [
          '**Aux pharmaciens** : savoir vers quels laboratoires se tourner pour une substance, et repérer les gammes locales.',
          '**Aux étudiants** : situer les acteurs de l’industrie pharmaceutique algérienne.',
          '**Aux industriels et aux chercheurs** : mesurer la concentration du marché et la production locale. Les [graphes de connaissances](/articles/' + SLUG_GRAPHES + ') montrent les liens entre laboratoires, substances et classes.',
        ],
      },
      { type: 'h2', title: 'Aller plus loin' },
      {
        type: 'paragraph',
        text: 'La page [Laboratoires](/laboratoires) liste tous les laboratoires de la nomenclature. Chaque nom du tableau ouvre la page du laboratoire : ses produits, ses substances, ses nouveautés par année, ses retraits et la répartition entre fabrication locale et importation.',
      },
      { type: 'h2', title: 'Les limites à garder en tête' },
      {
        type: 'list',
        items: [
          '**Des présentations, pas des ventes** : le classement ne dit rien des volumes vendus ni du chiffre d’affaires.',
          '**Le nom tel qu’il est écrit** : un même groupe peut apparaître sous plusieurs raisons sociales (filiale, ancien nom), comptées séparément.',
          '**La nomenclature en vigueur** : les médicaments retirés ou non renouvelés ne sont pas comptés.',
        ],
      },
    ],
  },

  // ─── Laboratoires, AR ──────────────────────────────────────────────────────
  {
    slug: `${SLUG_LABOS}-ar`,
    lang: 'ar',
    audience: 'professionnel',
    title: 'المخابر العشرون الأكثر حضورًا في المدونة الجزائرية، وأين تصنع',
    subtitle: 'الترتيب محسوب مباشرة من المدونة: عدد التقديمات والمواد، حصة المصنوع في الجزائر والبلدان',
    description:
      'ما هي المخابر التي لها أكبر عدد من الأدوية المسجّلة في الجزائر؟ ترتيب العشرين الأوائل، محسوب مباشرة من مدونة وزارة الصناعة الصيدلانية: عدد التقديمات والمواد، حصة التقديمات المصنوعة في الجزائر، والبلدان المذكورة. مع طريقة الترتيب وحدوده.',
    seoTitle: 'مخابر الأدوية في الجزائر: أول 20 في المدونة، التصنيع المحلي والاستيراد',
    seoKeywords: ['مخابر الأدوية في الجزائر', 'ترتيب المخابر', 'الصناعة الصيدلانية الجزائر', 'أدوية مصنوعة في الجزائر', 'الإنتاج المحلي للأدوية', 'laboratoires pharmaceutiques Algérie'],
    date: '2026-11-23',
    readingTime: 5,
    tags: ['المخابر', 'الصناعة', 'مصنوع في الجزائر', 'الاستيراد', 'المعطيات', 'المدونة'],
    faq: [
      {
        question: 'كيف يُحسب هذا الترتيب؟',
        answer: 'نحسب لكل مخبر أسطر المدونة السارية: السطر هو تقديم (علامة، جرعة، شكل). يُعاد الحساب عند كل عرض للصفحة، فهو يتبع تحديثات المدونة.',
      },
      {
        question: 'ماذا تعني «مصنوع في الجزائر» في الجدول؟',
        answer: 'هي حصة تقديمات المخبر التي تذكر المدونة أنها مصنوعة محليًا. يمكن لمخبر أجنبي أن تكون له منتجات مصنوعة في الجزائر، في مصنعه أو عند مصنّع بالمناولة، ويمكن لمخبر جزائري أن يستورد بعض المنتجات.',
      },
      {
        question: 'هل المخبر الأول هو أكبر مصنّع؟',
        answer: 'ليس بالضرورة. الترتيب يحسب تقديمات مسجّلة، لا علبًا مبيعة ولا رقم أعمال. مخبر يقدّم مادة بجرعات وأشكال كثيرة يصعد في الترتيب دون أن ينتج أكثر.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'وراء كل علبة مخبر. تحصي المدونة الوطنية عدة مئات منها، جزائرية وأجنبية، لكن جزءًا صغيرًا منها يجمع حصة كبيرة من الأدوية المسجّلة. من هي، كم مادة تغطي، وما حصة منتجاتها المصنوعة في الجزائر؟ الترتيب أدناه محسوب مباشرة من المدونة: يتبع كل تحديث.',
      },
      { type: 'h2', title: 'الترتيب' },
      { type: 'top-labos', limite: 20 },
      { type: 'h2', title: 'كيف يُقرأ الجدول' },
      {
        type: 'list',
        items: [
          '**التقديمات**: عدد أسطر المدونة باسم المخبر. نفس العلامة بجرعتي 500 ملغ و1 غ، قرصًا وكيسًا، تُحسب عدة تقديمات.',
          '**المواد**: عدد المواد الفعالة (DCI) المختلفة. إنه عرض التشكيلة: قد يكون لمخبر تقديمات كثيرة على مواد قليلة.',
          '**مصنوع في الجزائر**: عدد تقديماته التي تذكر المدونة أنها مصنوعة محليًا، والحصة التي يمثلها ذلك.',
          '**البلدان المذكورة**: البلدان الأكثر تكرارًا في تقديماته، كما هي مكتوبة في المدونة.',
        ],
      },
      { type: 'h2', title: 'مصنوع في الجزائر أو مستورد: ماذا يقول العمود' },
      {
        type: 'paragraph',
        text: 'تميّز المدونة بين الأدوية **المصنوعة في الجزائر** والأدوية **المستوردة**. هذا التمييز يخص المنتج لا جنسية المخبر: مجمّع أجنبي قد يصنع جزءًا من تشكيلته في الجزائر، في مصنعه أو عند مصنّع بالمناولة، ويستورد الباقي. وبالعكس، قد يستورد مخبر جزائري بعض المنتجات التي لا يصنعها. لهذا يعطي العمود حصة وليس نعم أو لا.',
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'الحصة المصنوعة محليًا تهم المرضى أيضًا: عندما تغيب نسخة مستوردة من دواء، قد تتوفر نسخة مصنوعة في الجزائر من نفس المادة. انظر [كيف تجد بديلًا عند الانقطاع](/articles/' + SLUG_RUPTURE + '-ar).',
      },
      { type: 'h2', title: 'فيمَ يفيد هذا الترتيب' },
      {
        type: 'list',
        items: [
          '**الصيادلة**: معرفة المخابر التي يُلجأ إليها لمادة ما، وتحديد التشكيلات المحلية.',
          '**الطلبة**: التعرف على فاعلي الصناعة الصيدلانية الجزائرية.',
          '**الصناعيون والباحثون**: قياس تركّز السوق والإنتاج المحلي. [الرسوم البيانية للمعرفة](/articles/' + SLUG_GRAPHES + '-ar) تُظهر الروابط بين المخابر والمواد والأصناف.',
        ],
      },
      { type: 'h2', title: 'للمزيد' },
      {
        type: 'paragraph',
        text: 'صفحة [المخابر](/laboratoires) تعرض كل مخابر المدونة. كل اسم في الجدول يفتح صفحة المخبر: منتجاته، مواده، جديده حسب السنة، عمليات السحب، والتوزيع بين التصنيع المحلي والاستيراد.',
      },
      { type: 'h2', title: 'حدود يجب تذكّرها' },
      {
        type: 'list',
        items: [
          '**تقديمات لا مبيعات**: الترتيب لا يقول شيئًا عن الكميات المبيعة ولا عن رقم الأعمال.',
          '**الاسم كما هو مكتوب**: قد يظهر نفس المجمّع تحت عدة تسميات (فرع، اسم قديم)، تُحسب كل واحدة منها على حدة.',
          '**المدونة السارية**: الأدوية المسحوبة أو غير المجدّدة لا تُحسب.',
        ],
      },
    ],
  },

  // ─── Génériques, FR ────────────────────────────────────────────────────────
  {
    slug: SLUG_GENERIQUES,
    lang: 'fr',
    audience: 'professionnel',
    title: 'Les DCI qui ont le plus de génériques en Algérie, et celles qui n’en ont aucun',
    subtitle: 'Deux classements calculés en direct sur la nomenclature, et ce qu’ils changent pour les patients en cas de rupture',
    description:
      'Quelles substances ont le plus de génériques enregistrés en Algérie, et lesquelles n’en ont aucun ? Deux classements calculés en direct sur la nomenclature, l’explication des termes générique, référence et biologique, les raisons pour lesquelles un médicament n’a pas de générique, et ce que cela change en cas de rupture.',
    seoTitle: 'Génériques en Algérie : les DCI qui en ont le plus, et celles qui n’en ont aucun',
    seoKeywords: ['génériques Algérie', 'médicament générique Algérie', 'DCI génériques', 'médicament sans générique', 'biosimilaire Algérie', 'substitution générique', 'الأدوية الجنيسة في الجزائر'],
    date: '2026-11-23',
    readingTime: 6,
    tags: ['Génériques', 'DCI', 'Biosimilaires', 'Substitution', 'Données', 'Nomenclature'],
    faq: [
      {
        question: 'Qu’est-ce qu’un générique ?',
        answer: 'Un médicament qui contient la même substance active, au même dosage et sous la même forme qu’un médicament de référence, et qui a démontré qu’il se comporte de la même façon dans l’organisme (bioéquivalence). Il peut être commercialisé quand la protection du médicament de référence a pris fin.',
      },
      {
        question: 'Pourquoi un médicament n’a-t-il pas de générique ?',
        answer: 'Souvent parce qu’il est encore protégé par un brevet, parce que c’est un médicament biologique (on parle alors de biosimilaire, pas de générique), parce que son marché est trop petit, ou parce que sa forme est difficile à reproduire. Il peut aussi exister ailleurs sans être enregistré en Algérie.',
      },
      {
        question: 'Comment les substances sont-elles comptées ?',
        answer: 'Quand la DCI est rattachée à un code ATC de substance, toutes ses graphies et tous ses sels sont réunis sous ce code ; sinon, la DCI est prise telle qu’elle est écrite dans la nomenclature. Une association de substances compte comme une substance à part.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Pour certaines substances, la nomenclature algérienne aligne des dizaines de génériques, fabriqués par de nombreux laboratoires. Pour d’autres, il n’existe qu’un seul médicament, sans aucune alternative de même DCI. Ce n’est pas qu’une curiosité : quand un médicament manque, c’est ce chiffre qui dit s’il existe une solution sur l’étagère. Voici les deux classements, calculés en direct sur la nomenclature.',
      },
      { type: 'h2', title: 'Générique, référence, biologique : les mots de la nomenclature' },
      {
        type: 'table',
        headers: ['Type', 'Ce que c’est'],
        rows: [
          { cells: ['**Référence** (ou innovateur)', 'Le médicament d’origine, celui qui a fait la preuve de son efficacité et sert de modèle.'] },
          { cells: ['**Générique**', 'La même substance, au même dosage, sous la même forme, avec une bioéquivalence démontrée.'] },
          { cells: ['**Biologique**', 'Un médicament produit à partir d’organismes vivants (insulines, anticorps, vaccins…). Sa copie est un biosimilaire, qui n’est pas un générique.'] },
        ],
      },
      { type: 'h2', title: 'Les substances qui ont le plus de génériques' },
      { type: 'dci-generiques', mode: 'plus', limite: 20 },
      {
        type: 'paragraph',
        text: 'Ce sont en général des substances anciennes, dont la protection est tombée depuis longtemps, et que l’on prescrit beaucoup. La colonne **Laboratoires** compte combien de fabricants différents proposent un générique : plus il y en a, plus il est probable qu’une version reste disponible quand une autre manque.',
      },
      { type: 'h2', title: 'Celles qui n’en ont aucun' },
      { type: 'dci-generiques', mode: 'aucun', limite: 20 },
      {
        type: 'paragraph',
        text: 'Une substance sans générique n’est pas forcément rare : elle peut avoir plusieurs présentations (dosages, formes) chez un seul laboratoire, ou plusieurs médicaments de référence. Les raisons les plus fréquentes :',
      },
      {
        type: 'list',
        items: [
          '**Un brevet encore en cours** : le médicament est récent, personne n’a encore le droit de le copier.',
          '**Un médicament biologique** : sa copie est un biosimilaire, enregistré comme biologique et non comme générique.',
          '**Un marché trop petit** : maladies rares, usage hospitalier très spécialisé.',
          '**Une forme difficile à reproduire** : inhalateurs, dispositifs injectables, patchs, formes à libération particulière.',
          '**Pas encore enregistré** : un générique peut exister ailleurs sans avoir été enregistré en Algérie.',
        ],
      },
      { type: 'h2', title: 'Ce que ça change pour vous' },
      {
        type: 'list',
        items: [
          '**Beaucoup de génériques, c’est beaucoup d’alternatives** : en cas de rupture, une autre marque de la même DCI est souvent disponible. Voir [comment trouver une alternative](/articles/' + SLUG_RUPTURE + ').',
          '**Aucun générique, c’est une seule source** : si le médicament manque, il n’y a pas d’autre marque, et le changement de substance passe par le médecin. Beaucoup de ces médicaments figurent sur la liste des [médicaments critiques](/medicaments-critiques).',
          '**Un générique n’est pas un médicament au rabais** : il doit démontrer sa bioéquivalence pour être enregistré. Pour quelques substances à marge étroite, un changement de marque se fait toutefois avec un contrôle.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Pour voir toutes les présentations d’une substance, cliquez son nom dans un des tableaux : il ouvre sa classe ATC. La page [Substitution](/substitution) liste aussi les génériques par DCI, et la page [Laboratoires](/laboratoires) les fabricants. Voir aussi [les 20 laboratoires les plus présents](/articles/' + SLUG_LABOS + ').',
      },
      { type: 'h2', title: 'Méthode et limites' },
      {
        type: 'list',
        items: [
          '**Une substance = un code ATC** quand la DCI y est rattachée : les sels et graphies d’une même DCI sont réunis. Sinon, la DCI est prise telle qu’elle est écrite, et deux graphies peuvent être comptées séparément.',
          '**Les associations** (deux substances dans le même médicament) comptent comme une substance à part.',
          '**Le type** (générique, référence, biologique) est celui qu’indique la nomenclature, sans correction.',
          '**Seule la nomenclature en vigueur** est comptée : les médicaments retirés ne figurent pas dans les tableaux.',
        ],
      },
    ],
  },

  // ─── Génériques, AR ────────────────────────────────────────────────────────
  {
    slug: `${SLUG_GENERIQUES}-ar`,
    lang: 'ar',
    audience: 'professionnel',
    title: 'المواد التي لها أكبر عدد من الأدوية الجنيسة في الجزائر، وتلك التي ليس لها أي دواء جنيس',
    subtitle: 'ترتيبان محسوبان مباشرة من المدونة، وما يغيّرانه بالنسبة للمرضى عند الانقطاع',
    description:
      'ما هي المواد التي لها أكبر عدد من الأدوية الجنيسة المسجّلة في الجزائر، وما هي التي ليس لها أي دواء جنيس؟ ترتيبان محسوبان مباشرة من المدونة، شرح مصطلحات الدواء الجنيس والمرجعي والبيولوجي، أسباب غياب الدواء الجنيس، وما يغيّره ذلك عند الانقطاع.',
    seoTitle: 'الأدوية الجنيسة في الجزائر: المواد التي لها أكثرها، وتلك التي ليس لها أي دواء جنيس',
    seoKeywords: ['الأدوية الجنيسة في الجزائر', 'دواء جنيس', 'دواء بدون جنيس', 'البدائل الحيوية', 'الاستبدال', 'génériques Algérie'],
    date: '2026-11-23',
    readingTime: 6,
    tags: ['الأدوية الجنيسة', 'DCI', 'البدائل الحيوية', 'الاستبدال', 'المعطيات', 'المدونة'],
    faq: [
      {
        question: 'ما هو الدواء الجنيس؟',
        answer: 'دواء يحتوي على نفس المادة الفعالة، بنفس الجرعة ونفس الشكل الموجود في دواء مرجعي، وقد أثبت أنه يتصرف بنفس الطريقة في الجسم (التكافؤ الحيوي). يمكن تسويقه عندما تنتهي حماية الدواء المرجعي.',
      },
      {
        question: 'لماذا لا يوجد دواء جنيس لدواء ما؟',
        answer: 'غالبًا لأنه ما زال محميًا ببراءة اختراع، أو لأنه دواء بيولوجي (نتحدث عندها عن بديل حيوي لا عن دواء جنيس)، أو لأن سوقه صغير جدًا، أو لأن شكله صعب التقليد. وقد يوجد في بلد آخر دون أن يكون مسجّلًا في الجزائر.',
      },
      {
        question: 'كيف تُحسب المواد؟',
        answer: 'عندما يكون الاسم العلمي مرتبطًا برمز ATC لمادة، تُجمع كل كتاباته وأملاحه تحت هذا الرمز؛ وإلا يؤخذ كما هو مكتوب في المدونة. التركيبة من عدة مواد تُحسب مادة مستقلة.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'بالنسبة لبعض المواد، تضم المدونة الجزائرية عشرات الأدوية الجنيسة التي يصنعها مخابر عديدة. وبالنسبة لمواد أخرى، لا يوجد إلا دواء واحد، دون أي بديل بنفس المادة. هذا ليس مجرد فضول: عندما يغيب دواء، هذا الرقم هو الذي يقول إن كان هناك حل على الرف. إليك الترتيبين، محسوبين مباشرة من المدونة.',
      },
      { type: 'h2', title: 'جنيس، مرجعي، بيولوجي: مصطلحات المدونة' },
      {
        type: 'table',
        headers: ['النوع', 'ما هو'],
        rows: [
          { cells: ['**مرجعي** (أو مبتكر)', 'الدواء الأصلي، الذي أثبت فعاليته ويُتخذ نموذجًا.'] },
          { cells: ['**جنيس**', 'نفس المادة، بنفس الجرعة، بنفس الشكل، مع إثبات التكافؤ الحيوي.'] },
          { cells: ['**بيولوجي**', 'دواء يُنتج من كائنات حية (الإنسولين، الأجسام المضادة، اللقاحات…). نسخته بديل حيوي، وليست دواءً جنيسًا.'] },
        ],
      },
      { type: 'h2', title: 'المواد التي لها أكبر عدد من الأدوية الجنيسة' },
      { type: 'dci-generiques', mode: 'plus', limite: 20 },
      {
        type: 'paragraph',
        text: 'إنها عمومًا مواد قديمة، انتهت حمايتها منذ زمن، وتوصف كثيرًا. عمود **المخابر** يحسب عدد المصنّعين المختلفين الذين يقترحون دواءً جنيسًا: كلما زاد عددهم، زاد احتمال بقاء نسخة متوفرة عندما تغيب أخرى.',
      },
      { type: 'h2', title: 'المواد التي ليس لها أي دواء جنيس' },
      { type: 'dci-generiques', mode: 'aucun', limite: 20 },
      {
        type: 'paragraph',
        text: 'المادة التي ليس لها دواء جنيس ليست بالضرورة نادرة: قد تكون لها عدة تقديمات (جرعات، أشكال) عند مخبر واحد، أو عدة أدوية مرجعية. الأسباب الأكثر شيوعًا:',
      },
      {
        type: 'list',
        items: [
          '**براءة اختراع سارية**: الدواء حديث، ولا يحق لأحد تقليده بعد.',
          '**دواء بيولوجي**: نسخته بديل حيوي، يُسجّل كبيولوجي لا كجنيس.',
          '**سوق صغير جدًا**: الأمراض النادرة، الاستعمال الاستشفائي المتخصص جدًا.',
          '**شكل صعب التقليد**: البخاخات، أجهزة الحقن، اللصقات، أشكال التحرير الخاصة.',
          '**غير مسجّل بعد**: قد يوجد دواء جنيس في بلد آخر دون أن يُسجّل في الجزائر.',
        ],
      },
      { type: 'h2', title: 'ما يغيّره ذلك بالنسبة لك' },
      {
        type: 'list',
        items: [
          '**أدوية جنيسة كثيرة تعني بدائل كثيرة**: عند الانقطاع، تتوفر غالبًا علامة أخرى بنفس المادة. انظر [كيف تجد بديلًا](/articles/' + SLUG_RUPTURE + '-ar).',
          '**غياب الدواء الجنيس يعني مصدرًا واحدًا**: إذا غاب الدواء، لا توجد علامة أخرى، وتغيير المادة يمر عبر الطبيب. كثير من هذه الأدوية موجودة في قائمة [الأدوية الحرجة](/medicaments-critiques).',
          '**الدواء الجنيس ليس دواءً أقل جودة**: يجب أن يثبت تكافؤه الحيوي ليُسجّل. لكن بالنسبة لبعض المواد ذات الهامش الضيق، يتم تغيير العلامة مع مراقبة.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'لرؤية كل تقديمات مادة، اضغط على اسمها في أحد الجدولين: يفتح صنفها ATC. صفحة [الاستبدال](/substitution) تعرض أيضًا الأدوية الجنيسة حسب المادة، وصفحة [المخابر](/laboratoires) المصنّعين. انظر أيضًا [المخابر العشرون الأكثر حضورًا](/articles/' + SLUG_LABOS + '-ar).',
      },
      { type: 'h2', title: 'الطريقة والحدود' },
      {
        type: 'list',
        items: [
          '**مادة = رمز ATC** عندما يكون الاسم العلمي مرتبطًا به: تُجمع أملاح وكتابات نفس المادة. وإلا يؤخذ الاسم كما هو مكتوب، وقد تُحسب كتابتان على حدة.',
          '**التركيبات** (مادتان في نفس الدواء) تُحسب مادة مستقلة.',
          '**النوع** (جنيس، مرجعي، بيولوجي) هو الذي تذكره المدونة، دون تصحيح.',
          '**المدونة السارية فقط** تُحسب: الأدوية المسحوبة لا تظهر في الجداول.',
        ],
      },
    ],
  },
]
