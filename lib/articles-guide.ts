import type { Article } from './articles'

/**
 * Article d'explication de la recherche guidée (FR + AR) : parcours substance → voie → forme → dosage, exemples,
 * codes EDQM / UCUM, différences avec la recherche normale. À garder aligné sur app/lab/guide/GuideClient.tsx
 * (libellés des étapes) et lib/guide-core.ts (règles de normalisation).
 *
 * Les exemples viennent du site : libellés du parcours, nombres de présentations relevés pour la saisie « amoxici »,
 * codes EDQM et unités UCUM de lib/edqm-data.ts et lib/ucum.ts. Les nombres bougent avec la nomenclature : le texte
 * le dit, et il ne cite aucun chiffre que le site ne donne pas.
 */
export const ARTICLES_GUIDE: Article[] = [
  {
    slug: 'recherche-guidee-medicament-algerie-mode-emploi',
    lang: 'fr',
    audience: 'professionnel',
    title: 'La recherche guidée de DwaDZ : trouver un médicament en Algérie pas à pas, avec des exemples',
    subtitle: 'Substance, voie, forme, dosage : chaque choix devient une pastille, et les codes EDQM et UCUM s’affichent à chaque résultat',
    description:
      'Mode d’emploi détaillé de la recherche guidée de DwaDZ : où la trouver, les quatre étapes, des exemples réels (amoxicilline, recherche par marque), les étapes remplies automatiquement, les filtres d’origine et de laboratoire, et comment lire les codes EDQM et UCUM.',
    seoTitle: 'Recherche guidée de médicaments en Algérie : mode d’emploi et exemples (DwaDZ)',
    seoKeywords: ['recherche guidée médicament', 'trouver un médicament Algérie', 'nomenclature pharmaceutique algérienne', 'forme galénique dosage voie', 'codes EDQM UCUM', 'amoxicilline Algérie'],
    date: '2026-11-10',
    readingTime: 9,
    tags: ['Recherche guidée', 'Nomenclature', 'EDQM', 'UCUM', 'Outils', 'Amoxicilline'],
    faq: [
      {
        question: 'La recherche guidée est-elle gratuite et faut-il un compte ?',
        answer: 'Oui, elle est ouverte à tous, sans compte. Elle se trouve sur la page d’accueil (mode « Recherche guidée »), dans l’onglet « Guidée » de la page de recherche, et à l’adresse /lab/guide.',
      },
      {
        question: 'Quand utiliser la recherche guidée plutôt que la recherche normale ?',
        answer: 'Quand vous ne connaissez pas le nom exact, ou quand une même substance existe en plusieurs voies, formes et dosages et que vous cherchez une présentation précise (par exemple une suspension buvable pour enfant). Si vous connaissez la marque, la recherche normale est plus directe.',
      },
      {
        question: 'Pourquoi certaines étapes sont-elles remplies toutes seules ?',
        answer: 'Parce qu’il n’existe qu’une seule valeur possible pour la substance choisie. Il serait inutile de vous poser la question : l’étape est remplie et marquée d’un liseré doré.',
      },
      {
        question: 'Que signifient EDQM et UCUM à côté des résultats ?',
        answer: 'EDQM est le code du terme normalisé de la forme pharmaceutique ou de la voie d’administration (Standard Terms de la Direction européenne de la qualité du médicament). UCUM est le code de l’unité du dosage (par exemple mg ou mL). Ce sont des repères de terminologie ; la fiche officielle reste la nomenclature.',
      },
      {
        question: 'Peut-on partager un parcours ?',
        answer: 'Oui. Chaque choix est inscrit dans l’adresse de la page : copiez le lien, la personne qui l’ouvre retrouve exactement le même parcours.',
      },
      {
        question: 'La recherche guidée remplace-t-elle l’avis d’un pharmacien ou d’un médecin ?',
        answer: 'Non. Elle aide à retrouver une présentation dans la nomenclature. Elle ne donne ni indication, ni posologie, ni conseil médical.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Vous cherchez « de l’amoxicilline à boire pour un enfant » mais vous ne savez pas comment la nomenclature l’écrit ? Une même substance existe en gélules, comprimés, poudres pour suspension, solutions injectables, avec des dosages différents. La recherche guidée de DwaDZ vous pose les bonnes questions dans l’ordre : quelle substance, comment se prend-il, sous quelle forme, quel dosage. À chaque étape, vous ne voyez que les choix qui existent vraiment dans la nomenclature algérienne.',
      },
      { type: 'h2', title: '1. Où la trouver' },
      {
        type: 'list',
        items: [
          'Sur la page d’accueil de https://www.dzair-pharma.net/ : sous le titre, choisissez le mode « 🧭 Recherche guidée » dans le commutateur « Que cherchez-vous ? », puis « Commencer la recherche guidée ».',
          'Sur la page de recherche : l’onglet « 🧭 Guidée », à côté de « 🔍 Recherche ».',
          'Directement à l’adresse /lab/guide.',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Les trois modes de l’accueil sont : Médicament (la recherche habituelle), Recherche guidée, et Pharmacie de garde. On passe de l’un à l’autre d’un clic.',
      },
      { type: 'h2', title: '2. Le parcours en quatre étapes' },
      {
        type: 'table',
        headers: ['Étape', 'Question posée', 'Ce que vous choisissez'],
        rows: [
          { cells: ['1. Substance', '« Quelle substance ou quelle marque ? »', 'La DCI, ou une marque qui vous y conduit (« augm » propose amoxicilline + acide clavulanique).'] },
          { cells: ['2. Voie', '« Comment se prend-il ? »', 'À avaler (comprimé, gélule…), à boire (sirop, suspension…), injection ou perfusion, suppositoire, sur la peau, dans l’œil, etc.'] },
          { cells: ['3. Forme', '« Sous quelle forme ? »', 'La forme pharmaceutique : poudre pour suspension buvable, gélule, comprimé pelliculé sécable, solution injectable…'] },
          { cells: ['4. Dosage', '« Quel dosage ? »', 'Le dosage exact : 500 mg, 1 g, 250 mg/5 ml…'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Chaque choix se transforme en pastille, reliée à la suivante par une flèche. Une pastille se rouvre d’un clic pour changer de valeur, et se retire avec la croix ✕ ; les étapes situées après sont alors recalculées. Sous les pastilles, le compteur annonce « N présentations » et la liste se réduit à mesure que vous précisez.',
      },
      { type: 'h2', title: '3. Exemple pas à pas : une suspension d’amoxicilline à 250 mg/5 ml' },
      {
        type: 'list',
        items: [
          'Étape 1 : tapez « amoxici » dans le champ. La liste propose les substances correspondantes, chacune avec son nombre de présentations. Choisissez l’amoxicilline seule.',
          'Étape 2 : à « Comment se prend-il ? », choisissez « À boire (sirop, suspension…) ». Les gélules, comprimés et injectables disparaissent de vos choix.',
          'Étape 3 : à « Sous quelle forme ? », choisissez « Poudre pour suspension buvable ». Toutes les écritures de la nomenclature (« POUDRE POUR SUSPENSION BUVABLE », « PDRE. P. SUSP. BUV. »…) sont regroupées sous ce seul choix.',
          'Étape 4 : à « Quel dosage ? », choisissez « 250 mg/5 ml ». Les écritures « 250MG/5ML » et « 250 mg / 5 ml » ne forment qu’un seul choix.',
          'Résultat : la liste des présentations correspondantes, avec pour chacune la marque, la forme, le dosage, le conditionnement, le laboratoire et le pays. Un clic ouvre la fiche du médicament.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Le parcours complet tient dans l’adresse de la page. Envoyez le lien à un collègue : il voit la même liste, au même état d’avancement.',
      },
      { type: 'h2', title: '4. Exemple : partir d’une marque' },
      {
        type: 'paragraph',
        text: 'À la première étape, la saisie accepte aussi un nom de marque. Tapez « augm » : le site propose la substance qui se cache derrière, « amoxicilline + acide clavulanique », avec la mention « via » suivie de la marque qui a fait remonter ce résultat. Vous continuez ensuite le parcours comme avec une substance : voie, forme, dosage. C’est utile quand on connaît le nom commercial mais qu’on veut voir les autres présentations de la même association.',
      },
      { type: 'h2', title: '5. Pourquoi la liste de substances est plus longue qu’on ne l’attend' },
      {
        type: 'paragraph',
        text: 'La nomenclature n’écrit pas toujours la même substance de la même façon : le sel, l’hydrate ou l’expression de la dose sont souvent inclus dans le libellé. Pour la saisie « amoxici », le site propose, à la date de rédaction, des lignes comme celles-ci :',
      },
      {
        type: 'table',
        headers: ['Libellé proposé (nomenclature)', 'Présentations'],
        rows: [
          { cells: ['AMOXICILLINE TRIHYDRATEE EXPRIME EN AMOXICILLINE + ACIDE CLAVULANIQUE POTASSIQUE EXPRIME EN ACIDE CLAVULANIQUE', '15'] },
          { cells: ['AMOXICILLINE TRIHYDRATEE EXPRIME EN AMOXICILLINE', '12'] },
          { cells: ['AMOXICILLINE TRIHYDRATE EXPRIME EN AMOXICILLINE', '8'] },
          { cells: ['AMOXICILLINE TRIHYDRATEE EXPRIMEE EN AMOXICILLINE + ACIDE CLAVULANIQUE POTASSIQUE EXPRIME EN ACIDE CLAVULANIQUE', '7'] },
          { cells: ['AMOXICILLINE SODIQUE EXPRIME EN AMOXICILLINE + ACIDE CLAVULANIQUE POTASSIQUE EXPRIME EN ACIDE CLAVULANIQUE', '3'] },
          { cells: ['AMOXICILLINE (SOUS FORME TRIHYDRATEE) + ACIDE CLAVULANIQUE (SOUS FORME POTASSIQUE)', '2'] },
          { cells: ['AMOXICILLINE + ACIDE CLAVULANIQUE', '1'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Ces nombres changent à chaque mise à jour de la nomenclature ; ils illustrent le principe. Le site rapproche les écritures qu’il sait être équivalentes (par exemple « A + B » et « B + A » sont la même association), mais, par prudence, il ne rapproche jamais une valeur qui contient un mot qu’il ne connaît pas : elle garde son écriture d’origine plutôt que d’être confondue avec une autre.',
      },
      { type: 'h2', title: '6. Les étapes remplies automatiquement' },
      {
        type: 'paragraph',
        text: 'Si, pour la substance choisie, une seule voie, une seule forme ou un seul dosage existe, l’étape est remplie d’office : la pastille porte un liseré doré et pas de croix, puisqu’il n’y a rien d’autre à choisir. Une note sous les pastilles le rappelle. Vous arrivez ainsi plus vite aux présentations.',
      },
      {
        type: 'paragraph',
        text: 'À l’inverse, si vous ouvrez un lien ancien dont un choix n’est plus compatible avec les autres (après une mise à jour de la nomenclature, par exemple), le site retire ce choix et vous l’indique : « Choix retiré car incompatible avec le reste ».',
      },
      { type: 'h2', title: '7. Affiner : origine et laboratoire' },
      {
        type: 'list',
        items: [
          'Origine : « Toutes origines », « 🇩🇿 Fabriqué en Algérie » ou « Importé », avec le nombre de présentations de chaque groupe. Pratique pour repérer une alternative produite localement.',
          'Laboratoire : une liste déroulante des laboratoires présents dans la liste en cours, avec leur nombre de présentations.',
        ],
      },
      { type: 'h2', title: '8. Lire un résultat, et les codes EDQM et UCUM' },
      {
        type: 'paragraph',
        text: 'Chaque présentation affiche la marque (avec « 🇩🇿 Fabriqué en Algérie » le cas échéant), la forme et le dosage normalisés, le conditionnement, le laboratoire et son pays. Dessous, deux repères de terminologie apparaissent à chaque fois :',
      },
      {
        type: 'list',
        items: [
          'EDQM : le code du terme normalisé de la forme pharmaceutique. Exemple : « Poudre pour suspension buvable » correspond au terme EDQM « Powder for oral suspension », code 10111000.',
          'Pour la voie, les cartes de l’étape 2 portent le code EDQM de la voie d’administration. Exemple : la voie orale correspond à « Oral use », code 20053000.',
          'UCUM : le code de l’unité du dosage. Exemple : « mg » pour le milligramme et « mL » pour le millilitre ; un dosage de 250 mg/5 ml s’affiche donc sous la forme 250 mg / 5 mL.',
        ],
      },
      {
        type: 'paragraph',
        text: 'La relation entre la forme de la nomenclature et le terme EDQM est précisée par un signe : aucun signe quand le terme est exact, « ⊂ » quand le terme EDQM est plus large que la forme, « ≈ » quand il est proche et reste à confirmer. Sur les cartes de choix, un survol du code affiche cette signification. Ces codes sont des repères pour les professionnels et pour l’interopérabilité (FHIR, bases de données) ; ils ne modifient pas la fiche officielle.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Les codes EDQM et UCUM sont aussi affichés sur la fiche de chaque médicament, à côté de la forme, de la voie et du dosage. Le code ATC reste affiché comme sur toutes les fiches et renvoie à la classe thérapeutique.',
      },
      { type: 'h2', title: '9. Recherche guidée ou recherche normale ?' },
      {
        type: 'table',
        headers: ['', 'Recherche normale', 'Recherche guidée'],
        rows: [
          { cells: ['Point de départ', 'Un mot : nom, substance, laboratoire, forme…', 'Une substance ou une marque, puis des questions'] },
          { cells: ['Idéale pour', 'Quand vous savez ce que vous cherchez', 'Quand vous hésitez entre voies, formes et dosages'] },
          { cells: ['Affinage', 'Filtres latéraux (voie, forme, dosage, origine…) et conditions avancées ET / OU', 'Pastilles, étapes remplies d’office, origine et laboratoire'] },
          { cells: ['Résultat', 'Fiches détaillées, prix, statut', 'Liste de présentations avec codes EDQM et UCUM'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Les deux se complètent : la recherche normale propose désormais les mêmes filtres de voie, de forme, de dosage et d’origine dans une colonne à gauche, et les conditions avancées (ET / OU) s’ouvrent d’un bouton sous la barre de recherche.',
      },
      { type: 'h2', title: '10. Ce qu’il faut savoir' },
      {
        type: 'list',
        items: [
          'La liste affiche d’abord 30 présentations, puis jusqu’à 100 avec « Afficher plus ». Au-delà, précisez la forme ou le dosage.',
          'La voie n’est pas écrite dans la nomenclature : elle est déduite de la forme (une poudre pour suspension buvable est une forme orale liquide). Elle sert à guider, pas à prescrire.',
          'Le dosage est ramené à une unité commune pour regrouper les écritures équivalentes (1 g et 1000 mg ; 250 mg/5 ml et 50 mg/ml expriment la même concentration). La fiche garde l’écriture d’origine.',
          'Les données sont celles de la nomenclature nationale ; elles se mettent à jour avec elle.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'La recherche guidée aide à retrouver une présentation. Elle ne remplace ni l’ordonnance, ni l’avis du médecin ou du pharmacien, et ne donne aucune posologie.',
      },
    ],
  },
  {
    slug: 'recherche-guidee-medicament-algerie-mode-emploi-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'البحث الموجَّه في DwaDZ: اعثر على الدواء في الجزائر خطوة بخطوة مع أمثلة',
    subtitle: 'المادة الفعالة، طريقة الاستعمال، الشكل، الجرعة: كل اختيار يصبح شارة، ورمزا EDQM وUCUM يظهران مع كل نتيجة',
    description:
      'دليل مفصّل للبحث الموجَّه في DwaDZ: أين تجده، ومراحله الأربع، وأمثلة حقيقية (الأموكسيسيلين، البحث بالاسم التجاري)، والمراحل التي تُملأ تلقائيًا، ومرشحات المصدر والمخبر، وكيفية قراءة رمزي EDQM وUCUM.',
    seoTitle: 'البحث الموجَّه عن الأدوية في الجزائر: دليل الاستعمال وأمثلة (DwaDZ)',
    seoKeywords: ['البحث الموجه عن الدواء', 'البحث عن دواء في الجزائر', 'المدونة الصيدلانية الجزائرية', 'الشكل الصيدلاني والجرعة', 'رموز EDQM UCUM', 'الأموكسيسيلين الجزائر'],
    date: '2026-11-10',
    readingTime: 9,
    tags: ['البحث الموجَّه', 'المدونة', 'EDQM', 'UCUM', 'أدوات', 'الأموكسيسيلين'],
    faq: [
      {
        question: 'هل البحث الموجَّه مجاني وهل أحتاج إلى حساب؟',
        answer: 'نعم، هو مفتوح للجميع دون حساب. تجده في الصفحة الرئيسية (نمط «البحث الموجَّه»)، وفي تبويب «موجَّه» داخل صفحة البحث، وعلى العنوان /lab/guide.',
      },
      {
        question: 'متى أستعمل البحث الموجَّه بدل البحث العادي؟',
        answer: 'عندما لا تعرف الاسم بدقة، أو عندما تتوفر المادة نفسها بعدة طرق استعمال وأشكال وجرعات وتريد عرضًا محددًا (مثل معلّق للشرب للأطفال). وإذا كنت تعرف الاسم التجاري فالبحث العادي أسرع.',
      },
      {
        question: 'لماذا تُملأ بعض المراحل تلقائيًا؟',
        answer: 'لأنه لا توجد إلا قيمة واحدة ممكنة للمادة المختارة. لا فائدة من سؤالك، فتُملأ المرحلة ويُوضع حولها إطار ذهبي.',
      },
      {
        question: 'ماذا يعني EDQM وUCUM بجانب النتائج؟',
        answer: 'EDQM هو رمز المصطلح المعياري للشكل الصيدلاني أو لطريقة الإعطاء (المصطلحات المعيارية للمديرية الأوروبية لجودة الأدوية). وUCUM هو رمز وحدة الجرعة (مثل mg أو mL). هي مراجع مصطلحية، والمرجع الرسمي يبقى المدونة.',
      },
      {
        question: 'هل يمكن مشاركة مسار البحث؟',
        answer: 'نعم. كل اختيار مكتوب في عنوان الصفحة: انسخ الرابط فيجد من يفتحه المسار نفسه تمامًا.',
      },
      {
        question: 'هل يغني البحث الموجَّه عن رأي الصيدلي أو الطبيب؟',
        answer: 'لا. هو يساعد على إيجاد عرض في المدونة فقط، ولا يعطي دواعي استعمال ولا جرعات ولا نصيحة طبية.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'تبحث عن «أموكسيسيلين للشرب لطفل» لكنك لا تعرف كيف تكتبه المدونة؟ المادة نفسها توجد في كبسولات وأقراص ومساحيق للمعلّق ومحاليل للحقن، وبجرعات مختلفة. يطرح عليك البحث الموجَّه في DwaDZ الأسئلة المناسبة بالترتيب: أي مادة فعالة، كيف تُستعمل، بأي شكل، وبأي جرعة. وفي كل مرحلة لا ترى إلا الاختيارات الموجودة فعلًا في المدونة الجزائرية.',
      },
      { type: 'h2', title: '1. أين تجده' },
      {
        type: 'list',
        items: [
          'في الصفحة الرئيسية https://www.dzair-pharma.net/ : تحت العنوان، اختر نمط «🧭 بحث موجَّه» في شريط «عمّ تبحث؟» ثم اضغط «ابدأ البحث الموجَّه».',
          'في صفحة البحث: تبويب «🧭 موجَّه» بجانب «🔍 بحث».',
          'مباشرة على العنوان /lab/guide.',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'الأنماط الثلاثة في الصفحة الرئيسية هي: دواء (البحث المعتاد)، والبحث الموجَّه، وصيدلية مناوبة. وتنتقل بينها بنقرة واحدة.',
      },
      { type: 'h2', title: '2. المسار في أربع مراحل' },
      {
        type: 'table',
        headers: ['المرحلة', 'السؤال', 'ما تختاره'],
        rows: [
          { cells: ['1. المادة', '«أي مادة فعالة أو أي اسم تجاري؟»', 'الاسم الدولي غير المسجّل (DCI)، أو اسم تجاري يقودك إليها (اكتب «augm» فيقترح أموكسيسيلين + حمض الكلافولانيك).'] },
          { cells: ['2. الطريقة', '«كيف يُستعمل؟»', 'للبلع (أقراص، كبسولات…)، للشرب (شراب، معلق…)، حقن أو تسريب، تحاميل، على الجلد، في العين…'] },
          { cells: ['3. الشكل', '«بأي شكل؟»', 'الشكل الصيدلاني: مسحوق لمعلق للشرب، كبسولة، قرص مغلّف قابل للتقسيم، محلول للحقن…'] },
          { cells: ['4. الجرعة', '«أي جرعة؟»', 'الجرعة بدقة: 500 ملغ، 1 غ، 250 ملغ/5 مل…'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'كل اختيار يتحول إلى شارة يربطها سهم بالتي تليها. تُعاد فتح الشارة بنقرة لتغيير القيمة، وتُزال بالعلامة ✕، فتُعاد حسابات المراحل التالية. وتحت الشارات يعلن العدّاد «N عروض» وتقصر القائمة كلما دقّقت.',
      },
      { type: 'h2', title: '3. مثال خطوة بخطوة: معلّق الأموكسيسيلين 250 ملغ/5 مل' },
      {
        type: 'list',
        items: [
          'المرحلة 1: اكتب «amoxici» في الحقل. تقترح القائمة المواد المطابقة، وبجانب كل منها عدد عروضها. اختر الأموكسيسيلين وحده.',
          'المرحلة 2: عند «كيف يُستعمل؟» اختر «للشرب (شراب، معلق…)». تختفي الكبسولات والأقراص والحقن من اختياراتك.',
          'المرحلة 3: عند «بأي شكل؟» اختر «مسحوق لمعلق للشرب». تُجمع كل كتابات المدونة («POUDRE POUR SUSPENSION BUVABLE» و«PDRE. P. SUSP. BUV.»…) تحت اختيار واحد.',
          'المرحلة 4: عند «أي جرعة؟» اختر «250 ملغ/5 مل». كتابتا «250MG/5ML» و«250 mg / 5 ml» تشكلان اختيارًا واحدًا.',
          'النتيجة: قائمة العروض المطابقة، ومعها لكل عرض الاسم التجاري والشكل والجرعة والتعبئة والمخبر والبلد. نقرة واحدة تفتح بطاقة الدواء.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'المسار كاملًا مكتوب في عنوان الصفحة. أرسل الرابط إلى زميل فيرى القائمة نفسها في المرحلة نفسها.',
      },
      { type: 'h2', title: '4. مثال: الانطلاق من اسم تجاري' },
      {
        type: 'paragraph',
        text: 'في المرحلة الأولى يقبل الحقل اسمًا تجاريًا أيضًا. اكتب «augm» فيقترح الموقع المادة الكامنة وراءه، «أموكسيسيلين + حمض الكلافولانيك»، مع كلمة «عبر» متبوعة بالاسم التجاري الذي أظهر هذه النتيجة. ثم تتابع المسار كما مع مادة فعالة: الطريقة فالشكل فالجرعة. وهذا مفيد عندما تعرف الاسم التجاري وتريد رؤية العروض الأخرى للمزيج نفسه.',
      },
      { type: 'h2', title: '5. لماذا قائمة المواد أطول مما نتوقع' },
      {
        type: 'paragraph',
        text: 'المدونة لا تكتب المادة نفسها دائمًا بالطريقة نفسها: فالملح أو الماء المتبلور أو طريقة التعبير عن الجرعة كثيرًا ما تدخل في التسمية. عند كتابة «amoxici» يقترح الموقع، وقت كتابة هذا المقال، أسطرًا مثل:',
      },
      {
        type: 'table',
        headers: ['التسمية المقترحة (المدونة)', 'عدد العروض'],
        rows: [
          { cells: ['AMOXICILLINE TRIHYDRATEE EXPRIME EN AMOXICILLINE + ACIDE CLAVULANIQUE POTASSIQUE EXPRIME EN ACIDE CLAVULANIQUE', '15'] },
          { cells: ['AMOXICILLINE TRIHYDRATEE EXPRIME EN AMOXICILLINE', '12'] },
          { cells: ['AMOXICILLINE TRIHYDRATE EXPRIME EN AMOXICILLINE', '8'] },
          { cells: ['AMOXICILLINE TRIHYDRATEE EXPRIMEE EN AMOXICILLINE + ACIDE CLAVULANIQUE POTASSIQUE EXPRIME EN ACIDE CLAVULANIQUE', '7'] },
          { cells: ['AMOXICILLINE SODIQUE EXPRIME EN AMOXICILLINE + ACIDE CLAVULANIQUE POTASSIQUE EXPRIME EN ACIDE CLAVULANIQUE', '3'] },
          { cells: ['AMOXICILLINE (SOUS FORME TRIHYDRATEE) + ACIDE CLAVULANIQUE (SOUS FORME POTASSIQUE)', '2'] },
          { cells: ['AMOXICILLINE + ACIDE CLAVULANIQUE', '1'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'تتغير هذه الأعداد مع كل تحديث للمدونة، وهي هنا لتوضيح المبدأ. يقرّب الموقع بين الكتابات التي يعرف أنها متكافئة (مثلًا «A + B» و«B + A» هما المزيج نفسه)، لكنه يتحفظ فلا يقرّب أبدًا قيمة تحتوي كلمة لا يعرفها: تبقى بكتابتها الأصلية بدل أن تُخلط بغيرها.',
      },
      { type: 'h2', title: '6. المراحل التي تُملأ تلقائيًا' },
      {
        type: 'paragraph',
        text: 'إذا لم توجد للمادة المختارة إلا طريقة استعمال واحدة أو شكل واحد أو جرعة واحدة، تُملأ المرحلة من تلقاء نفسها: تحمل الشارة إطارًا ذهبيًا وبلا علامة ✕، إذ لا يوجد ما يُختار غيره. وتذكّر بذلك ملاحظة تحت الشارات، فتصل إلى العروض أسرع.',
      },
      {
        type: 'paragraph',
        text: 'وفي المقابل، إذا فتحت رابطًا قديمًا لم يعد أحد اختياراته متوافقًا مع الباقي (بعد تحديث المدونة مثلًا)، يزيل الموقع هذا الاختيار وينبهك: «اختيار أُزيل لعدم توافقه مع الباقي».',
      },
      { type: 'h2', title: '7. التدقيق: المصدر والمخبر' },
      {
        type: 'list',
        items: [
          'المصدر: «كل المصادر» أو «🇩🇿 مصنع في الجزائر» أو «مستورد»، مع عدد عروض كل مجموعة. مفيد لإيجاد بديل مصنّع محليًا.',
          'المخبر: قائمة منسدلة بالمخابر الموجودة في القائمة الحالية مع عدد عروضها.',
        ],
      },
      { type: 'h2', title: '8. قراءة النتيجة ورمزا EDQM وUCUM' },
      {
        type: 'paragraph',
        text: 'يعرض كل عرض الاسم التجاري (مع «🇩🇿 مصنع في الجزائر» عند الاقتضاء)، والشكل والجرعة بعد توحيدهما، والتعبئة، والمخبر وبلده. وتحتها يظهر مرجعان مصطلحيان في كل مرة:',
      },
      {
        type: 'list',
        items: [
          'EDQM: رمز المصطلح المعياري للشكل الصيدلاني. مثال: «مسحوق لمعلق للشرب» يقابل مصطلح EDQM «Powder for oral suspension» ورمزه 10111000.',
          'بالنسبة للطريقة، تحمل بطاقات المرحلة 2 رمز EDQM لطريقة الإعطاء. مثال: الطريقة الفموية تقابل «Oral use» ورمزه 20053000.',
          'UCUM: رمز وحدة الجرعة. مثال: «mg» للملغرام و«mL» للمليلتر؛ فجرعة 250 ملغ/5 مل تظهر هكذا: 250 mg / 5 mL.',
        ],
      },
      {
        type: 'paragraph',
        text: 'تُبيَّن العلاقة بين شكل المدونة ومصطلح EDQM بعلامة: لا علامة عندما يكون المصطلح مطابقًا، و«⊂» عندما يكون مصطلح EDQM أعم من الشكل، و«≈» عندما يكون قريبًا وينتظر التأكيد. وفي بطاقات الاختيار يعرض تمرير المؤشر فوق الرمز هذا المعنى. هذه الرموز مراجع للمهنيين وللتشغيل البيني (FHIR وقواعد البيانات)، ولا تغيّر البطاقة الرسمية.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'يظهر رمزا EDQM وUCUM أيضًا في بطاقة كل دواء بجانب الشكل وطريقة الإعطاء والجرعة. ويبقى رمز ATC معروضًا كما في كل البطاقات ويحيل إلى الصنف العلاجي.',
      },
      { type: 'h2', title: '9. البحث الموجَّه أم البحث العادي؟' },
      {
        type: 'table',
        headers: ['', 'البحث العادي', 'البحث الموجَّه'],
        rows: [
          { cells: ['نقطة الانطلاق', 'كلمة: اسم، مادة، مخبر، شكل…', 'مادة أو اسم تجاري ثم أسئلة'] },
          { cells: ['الأنسب عندما', 'تعرف ما تبحث عنه', 'تتردد بين طرق الاستعمال والأشكال والجرعات'] },
          { cells: ['التدقيق', 'مرشحات جانبية (الطريقة والشكل والجرعة والمصدر…) وشروط متقدمة «و / أو»', 'شارات ومراحل تُملأ تلقائيًا والمصدر والمخبر'] },
          { cells: ['النتيجة', 'بطاقات مفصلة وأسعار وحالة', 'قائمة عروض مع رمزي EDQM وUCUM'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'يكمل أحدهما الآخر: يقدّم البحث العادي اليوم المرشحات نفسها (الطريقة والشكل والجرعة والمصدر) في عمود جانبي، وتُفتح الشروط المتقدمة («و / أو») بزر تحت شريط البحث.',
      },
      { type: 'h2', title: '10. ما ينبغي معرفته' },
      {
        type: 'list',
        items: [
          'تعرض القائمة أولًا 30 عرضًا، ثم حتى 100 بزر «عرض المزيد». وما فوق ذلك دقّق الشكل أو الجرعة.',
          'طريقة الاستعمال غير مكتوبة في المدونة: تُستنتج من الشكل (مسحوق لمعلق للشرب شكل فموي سائل). وهي للتوجيه لا للوصف الطبي.',
          'تُردّ الجرعة إلى وحدة مشتركة لتجميع الكتابات المتكافئة (1 غ و1000 ملغ؛ و250 ملغ/5 مل و50 ملغ/مل يعبّران عن التركيز نفسه). وتحتفظ البطاقة بالكتابة الأصلية.',
          'البيانات هي بيانات المدونة الوطنية وتتحدث بتحديثها.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'البحث الموجَّه يساعد على إيجاد عرض في المدونة. ولا يغني عن الوصفة ولا عن رأي الطبيب أو الصيدلي، ولا يعطي أي جرعة.',
      },
    ],
  },
]
