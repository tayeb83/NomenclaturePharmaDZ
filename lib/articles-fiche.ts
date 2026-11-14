import type { Article } from './articles'

/**
 * Article vitrine « lire une fiche médicament en 30 secondes » (FR + AR).
 * À garder aligné sur la fiche : app/medicament/[source]/[id]/MedicamentDetail.tsx (blocs, libellés, badges)
 * et components/drug/FicheSecurite.tsx (onglets Essentiel / Interactions / Allergies / Génériques).
 * Visuels : public/articles/fiche/ (schéma numéroté, un par langue) et assets/articles/fiche-30-secondes*.png
 * (vignettes de partage). Le schéma est une maquette : il ne reprend les données d'aucun produit réel.
 */
export const ARTICLES_FICHE: Article[] = [
  {
    slug: 'fiche-medicament-algerie-lire-en-30-secondes',
    lang: 'fr',
    audience: 'etudiant',
    title: 'Tout ce qu’une fiche médicament vous dit en 30 secondes',
    subtitle: 'Sept zones à regarder dans l’ordre : le nom, la substance, la classe, l’origine, les dates, le prix et la sécurité',
    description:
      'Une fiche DwaDZ se lit en 30 secondes quand on sait où poser les yeux. Sept zones, dans l’ordre : nom et statut, substance active (DCI), classe ATC, origine et laboratoire, dates de validité, prix public (PPA), interactions et allergies. Avec un schéma numéroté, un tableau « ma question, où regarder » et un mini-quiz.',
    seoTitle: 'Lire une fiche médicament en Algérie en 30 secondes : DCI, classe, prix, interactions',
    seoKeywords: ['fiche médicament Algérie', 'lire une fiche médicament', 'DCI médicament', 'code ATC médicament', 'prix médicament Algérie PPA', 'médicament fabriqué en Algérie', 'interactions médicamenteuses', 'nomenclature pharmaceutique algérienne'],
    date: '2026-11-14',
    readingTime: 6,
    image: 'fiche-30-secondes.png',
    tags: ['Mode d’emploi', 'Fiche médicament', 'DCI', 'ATC', 'Prix', 'Interactions', 'Nomenclature'],
    faq: [
      {
        question: 'D’où viennent les informations d’une fiche ?',
        answer: 'De la Nomenclature nationale des produits pharmaceutiques publiée par le ministère de l’Industrie pharmaceutique (MIPH) pour l’identité du médicament, son laboratoire, son origine et ses dates. Les interactions viennent du Thesaurus de l’ANSM, la notice officielle (RCP) du portail de l’ANPP, et la classe de la classification ATC de l’OMS.',
      },
      {
        question: 'Pourquoi certaines fiches affichent-elles « Prix non disponible » ?',
        answer: 'Parce que le prix public (PPA) est saisi à la main, fiche par fiche. Quand il n’a pas encore été saisi, la fiche le dit. Aucun prix n’est estimé ni déduit d’un autre médicament.',
      },
      {
        question: 'La fiche me dit-elle à quoi sert le médicament ?',
        answer: 'Pas directement : la nomenclature ne publie pas d’indication. La fiche donne la classe thérapeutique (code ATC), qui situe le médicament, et un lien vers la notice officielle (RCP) quand elle existe. C’est dans le RCP que figurent les indications et la posologie.',
      },
      {
        question: '« Médicament actif » veut-il dire qu’il est en stock en pharmacie ?',
        answer: 'Non. « Actif » veut dire que le médicament est enregistré dans la nomenclature en vigueur. Sa présence dans une pharmacie donnée dépend de l’approvisionnement : seul votre pharmacien peut vous le dire.',
      },
      {
        question: 'La fiche existe-t-elle en arabe ?',
        answer: 'Oui. Chaque fiche a une version arabe, avec les mêmes zones. Les noms de marque et de substance restent aussi écrits en lettres latines, comme sur la boîte.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Vous avez une boîte entre les mains, ou un nom sur une ordonnance. Vous tapez ce nom dans DwaDZ, vous ouvrez la fiche… et vous voyez beaucoup de lignes. Pas de panique : une fiche se lit comme une carte d’identité. Sept zones, toujours au même endroit, et trente secondes suffisent pour savoir à quoi vous avez affaire. Chrono en main, on y va.',
      },
      {
        type: 'image',
        src: '/articles/fiche/anatomie-fiche.png',
        width: 1428,
        height: 805,
        alt: 'Schéma d’une fiche médicament avec sept repères numérotés : 1 le nom, la forme et le statut dans le bandeau du haut ; 2 la substance active (DCI) ; 3 le code ATC ; 4 l’origine de fabrication et le laboratoire ; 5 les dates d’enregistrement et de fin de validité ; 6 le prix public (PPA) dans la colonne « Repères » ; 7 les onglets Interactions et Allergies',
        caption: 'Les sept zones d’une fiche. Ce schéma est une maquette : il ne reprend les données d’aucun produit réel.',
      },
      { type: 'h2', title: '1. Le bandeau : est-ce le bon médicament, et est-il toujours enregistré ?' },
      {
        type: 'paragraph',
        text: 'Tout en haut, le **nom de marque**, le **dosage** et la **forme**, avec une icône qui montre la forme et la voie d’administration. Vérifiez d’abord le dosage : deux boîtes du même nom peuvent contenir 500 mg ou 1 g. Juste à côté, un badge de couleur donne le statut.',
      },
      {
        type: 'table',
        headers: ['Badge', 'Ce qu’il veut dire'],
        rows: [
          { cells: ['✅ Médicament actif', 'Il figure dans la nomenclature en vigueur.'] },
          { cells: ['⚠️ AMM non renouvelée', 'Son autorisation n’a pas été renouvelée : il n’est plus dans la nomenclature courante.'] },
          { cells: ['🚫 Médicament retiré', 'Il a été retiré. La fiche donne la date et le motif, et propose les alternatives.'] },
          { cells: ['🚨 Médicament critique', 'Il figure sur la liste ministérielle des médicaments critiques.'] },
        ],
      },
      { type: 'h2', title: '2. La DCI : le vrai nom du médicament' },
      {
        type: 'paragraph',
        text: 'La **DCI** (dénomination commune internationale) est le nom de la substance active. La marque change d’un laboratoire à l’autre, la DCI jamais : c’est elle que le médecin et le pharmacien ont en tête. Si vous ne retenez qu’une ligne de la fiche, retenez celle-ci. Avec la DCI, vous pouvez reconnaître le même médicament sous dix noms différents, et éviter de prendre deux fois la même substance sans le savoir.',
      },
      { type: 'h2', title: '3. Le code ATC : à quelle famille il appartient' },
      {
        type: 'paragraph',
        text: 'Le **code ATC** est l’adresse du médicament dans la classification de l’OMS. Il se lit de gauche à droite, du plus large au plus précis. Prenons le paracétamol, **N02BE01** : N pour le système nerveux, N02 pour les analgésiques, N02B pour les autres analgésiques et antipyrétiques, N02BE pour les anilides, et N02BE01 pour le paracétamol lui-même. Sans rien connaître à la pharmacologie, vous savez déjà que c’est un médicament de la douleur et de la fièvre.',
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Le code est cliquable : il ouvre la classe, avec tous les médicaments de la même famille enregistrés en Algérie. Plus bas dans la fiche, le bloc « Classification ATC » déplie les cinq niveaux un par un.',
      },
      { type: 'h2', title: '4. L’origine : qui le fabrique, et où' },
      {
        type: 'list',
        items: [
          '**Origine de fabrication** : « Fabriqué en Algérie » ou « Importé ».',
          '**Laboratoire** et **pays d’origine** : le nom du fabricant et le pays d’où vient le produit.',
          '**Type de produit** : générique, référence étrangère, biologique ou innovateur.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Ces trois lignes répondent à une question que beaucoup se posent au comptoir : « c’est un générique ou l’original ? C’est local ou importé ? »',
      },
      { type: 'h2', title: '5. Les dates : depuis quand, et jusqu’à quand' },
      {
        type: 'paragraph',
        text: 'Le bloc « Dates & Enregistrement » donne la **date d’enregistrement**, la **date de fin de validité** de l’autorisation, et la **version de la nomenclature** d’où vient la fiche. Pour un médicament retiré, vous y trouvez aussi la date et le motif du retrait. C’est la zone qui vous dit si l’information est à jour.',
      },
      { type: 'h2', title: '6. Le prix : le PPA, quand il est connu' },
      {
        type: 'paragraph',
        text: 'Dans la colonne « Repères », la première ligne est le **PPA**, le prix public algérien, en dinars. S’il n’a pas encore été saisi, la fiche affiche « Prix non disponible ». Nous préférons une case vide à un prix inventé : aucun montant n’est estimé.',
      },
      {
        type: 'paragraph',
        text: 'Dans la même colonne : la **prescription** (liste, ordonnance), un rappel de la forme et du dosage, et le bouton **« Voir le RCP officiel »** qui ouvre la notice publiée par l’ANPP quand elle est rattachée à la fiche.',
      },
      { type: 'h2', title: '7. La sécurité : interactions et allergies' },
      {
        type: 'paragraph',
        text: 'Sous le bandeau, quatre onglets : **Essentiel**, **Interactions**, **Allergies** et **Génériques**, les trois derniers avec un compteur. L’onglet Interactions liste ce qu’il ne faut pas associer à la substance, selon le Thesaurus de l’ANSM, classé en quatre niveaux.',
      },
      {
        type: 'table',
        headers: ['Niveau', 'En clair'],
        rows: [
          { cells: ['Contre-indication', 'À ne pas associer.'] },
          { cells: ['Association déconseillée', 'À éviter, sauf décision du médecin.'] },
          { cells: ['Précaution d’emploi', 'Possible, avec une surveillance ou une adaptation.'] },
          { cells: ['À prendre en compte', 'Un risque à garder en tête, sans consigne particulière.'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'L’onglet **Allergies** signale les allergies documentées pour la substance ou sa classe. C’est une information, pas une contre-indication : aucune allergie croisée n’est déduite. L’onglet **Génériques** vous emmène vers les autres médicaments de même DCI.',
      },
      { type: 'h2', title: 'Ma question, où regarder' },
      {
        type: 'table',
        headers: ['Je me demande…', 'Je regarde…'],
        rows: [
          { cells: ['Est-ce bien mon médicament ?', 'Zone 1 : nom, dosage, forme'] },
          { cells: ['Est-il encore enregistré ?', 'Zone 1 : le badge de statut'] },
          { cells: ['Qu’y a-t-il dedans ?', 'Zone 2 : la DCI'] },
          { cells: ['C’est pour quoi, en gros ?', 'Zone 3 : la classe ATC, puis le RCP officiel'] },
          { cells: ['Local ou importé ? Générique ?', 'Zone 4 : origine et type de produit'] },
          { cells: ['L’information est-elle à jour ?', 'Zone 5 : dates et version'] },
          { cells: ['Combien ça coûte ?', 'Zone 6 : le PPA'] },
          { cells: ['Puis-je le prendre avec mon autre traitement ?', 'Zone 7 : onglet Interactions, puis votre pharmacien'] },
          { cells: ['Ma pharmacie n’a pas cette marque', 'Onglet Génériques : même DCI, autres marques'] },
        ],
      },
      { type: 'h2', title: 'Ce que la fiche ne dit pas' },
      {
        type: 'list',
        items: [
          'Elle ne donne **ni indication ni posologie** : c’est le rôle du RCP officiel et de votre médecin.',
          'Elle ne dit pas si le médicament est **en stock** dans une pharmacie.',
          'Elle ne remplace pas la **notice** qui se trouve dans la boîte.',
          'Le prix n’apparaît que s’il a été saisi : son absence ne veut rien dire sur le médicament.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Une fiche vous aide à comprendre et à poser les bonnes questions. Elle ne remplace ni l’ordonnance, ni l’avis du médecin ou du pharmacien.',
      },
      { type: 'h2', title: 'À vous de jouer' },
      {
        type: 'qcm',
        questions: [
          {
            question: 'Deux boîtes portent des noms différents. Quelle ligne vous dit si c’est le même médicament ?',
            options: [
              { label: 'A', text: 'Le laboratoire.' },
              { label: 'B', text: 'La DCI.' },
              { label: 'C', text: 'Le numéro d’enregistrement.' },
            ],
            answer: 'B',
          },
          {
            question: 'La fiche affiche « Prix non disponible ». Que faut-il comprendre ?',
            options: [
              { label: 'A', text: 'Le médicament n’est plus vendu.' },
              { label: 'B', text: 'Le médicament est gratuit.' },
              { label: 'C', text: 'Le prix n’a pas encore été saisi pour cette fiche.' },
            ],
            answer: 'C',
          },
          {
            question: 'Dans le code ATC N02BE01, que désigne la première lettre ?',
            options: [
              { label: 'A', text: 'Le groupe anatomique : ici le système nerveux.' },
              { label: 'B', text: 'Le pays de fabrication.' },
              { label: 'C', text: 'La forme du médicament.' },
            ],
            answer: 'A',
          },
          {
            question: 'Le badge indique « ✅ Médicament actif ». Qu’est-ce que cela garantit ?',
            options: [
              { label: 'A', text: 'Qu’il est en stock dans toutes les pharmacies.' },
              { label: 'B', text: 'Qu’il est enregistré dans la nomenclature en vigueur.' },
              { label: 'C', text: 'Qu’il convient à tout le monde.' },
            ],
            answer: 'B',
          },
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Essayez maintenant : cherchez le nom écrit sur une boîte que vous avez à la maison, ouvrez sa fiche et retrouvez les sept zones. La deuxième fois, il vous faudra moins de trente secondes.',
      },
    ],
  },
  {
    slug: 'fiche-medicament-algerie-lire-en-30-secondes-ar',
    lang: 'ar',
    audience: 'etudiant',
    title: 'كل ما تقوله لك بطاقة الدواء في 30 ثانية',
    subtitle: 'سبع مناطق تُقرأ بالترتيب: الاسم، المادة الفعالة، الصنف، المنشأ، التواريخ، السعر والسلامة',
    description:
      'تُقرأ بطاقة الدواء في DwaDZ خلال 30 ثانية إذا عرفت أين تنظر. سبع مناطق بالترتيب: الاسم والحالة، المادة الفعالة (DCI)، الصنف ATC، المنشأ والمخبر، تواريخ الصلاحية، السعر العمومي (PPA)، التداخلات والحساسيات. مع رسم مرقّم وجدول «سؤالي، أين أنظر» واختبار قصير.',
    seoTitle: 'كيف تقرأ بطاقة الدواء في الجزائر في 30 ثانية: المادة الفعالة، الصنف، السعر، التداخلات',
    seoKeywords: ['بطاقة الدواء الجزائر', 'المادة الفعالة للدواء', 'رمز ATC', 'سعر الدواء في الجزائر', 'دواء مصنع في الجزائر', 'التداخلات الدوائية', 'التسمية الوطنية للمنتجات الصيدلانية'],
    date: '2026-11-14',
    readingTime: 6,
    image: 'fiche-30-secondes-ar.png',
    tags: ['طريقة الاستعمال', 'بطاقة الدواء', 'DCI', 'ATC', 'السعر', 'التداخلات', 'التسمية الوطنية'],
    faq: [
      {
        question: 'من أين تأتي معلومات البطاقة؟',
        answer: 'هوية الدواء ومخبره ومنشؤه وتواريخه مأخوذة من التسمية الوطنية للمنتجات الصيدلانية التي تنشرها وزارة الصناعة الصيدلانية (MIPH). التداخلات مأخوذة من مرجع ANSM، والنشرة الرسمية (RCP) من بوابة الوكالة الوطنية للمنتجات الصيدلانية (ANPP)، والصنف من تصنيف ATC لمنظمة الصحة العالمية.',
      },
      {
        question: 'لماذا تعرض بعض البطاقات «السعر غير متوفر»؟',
        answer: 'لأن السعر العمومي (PPA) يُدخل يدويًا، بطاقةً بطاقة. إذا لم يُدخل بعد، تقول البطاقة ذلك صراحة. لا يُقدَّر أي سعر ولا يُستنتج من دواء آخر.',
      },
      {
        question: 'هل تخبرني البطاقة بدواعي استعمال الدواء؟',
        answer: 'ليس مباشرة: التسمية الوطنية لا تنشر دواعي الاستعمال. تعطي البطاقة الصنف العلاجي (رمز ATC) الذي يحدّد موقع الدواء، ورابطًا نحو النشرة الرسمية (RCP) إن وُجدت. دواعي الاستعمال والجرعات موجودة في هذه النشرة.',
      },
      {
        question: 'هل «دواء نشط» تعني أنه متوفر في الصيدلية؟',
        answer: 'لا. «نشط» تعني أن الدواء مسجّل في التسمية السارية. أما وجوده في صيدلية معيّنة فيتوقف على التموين: الصيدلي وحده يستطيع إخبارك.',
      },
      {
        question: 'هل توجد البطاقة بالفرنسية أيضًا؟',
        answer: 'نعم. لكل بطاقة نسخة عربية ونسخة فرنسية بالمناطق نفسها. وتبقى أسماء الأدوية والمواد مكتوبة بالحروف اللاتينية أيضًا، كما هي على العلبة.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'بين يديك علبة دواء، أو اسم مكتوب في وصفة. تكتب الاسم في DwaDZ، تفتح البطاقة… فتجد أسطرًا كثيرة. لا تقلق: البطاقة تُقرأ مثل بطاقة التعريف. سبع مناطق، دائمًا في المكان نفسه، وثلاثون ثانية تكفي لتعرف ما هذا الدواء. شغّل المؤقّت ولنبدأ.',
      },
      {
        type: 'image',
        src: '/articles/fiche/anatomie-fiche-ar.png',
        width: 1428,
        height: 926,
        alt: 'رسم لبطاقة دواء عليها سبع علامات مرقّمة: 1 الاسم والشكل والحالة في الشريط العلوي؛ 2 المادة الفعالة (DCI)؛ 3 رمز ATC؛ 4 بلد التصنيع والمخبر؛ 5 تاريخ التسجيل ونهاية الصلاحية؛ 6 السعر العمومي (PPA) في عمود «معالم»؛ 7 تبويبا التداخلات والحساسيات',
        caption: 'المناطق السبع في البطاقة. هذا الرسم نموذج توضيحي: لا ينقل بيانات أي منتج حقيقي.',
      },
      { type: 'h2', title: '1. الشريط العلوي: هل هو الدواء الصحيح، وهل ما زال مسجّلًا؟' },
      {
        type: 'paragraph',
        text: 'في الأعلى تجد **الاسم التجاري** و**الجرعة** و**الشكل**، مع أيقونة تبيّن الشكل وطريقة الإعطاء. تحقّق أولًا من الجرعة: علبتان بالاسم نفسه قد تحتويان 500 مغ أو 1 غ. وبجانب الاسم شارة ملوّنة تعطي الحالة.',
      },
      {
        type: 'table',
        headers: ['الشارة', 'معناها'],
        rows: [
          { cells: ['✅ دواء نشط', 'مدرج في التسمية السارية.'] },
          { cells: ['⚠️ AMM غير مجددة', 'لم تُجدَّد رخصة تسويقه: لم يعد في التسمية الجارية.'] },
          { cells: ['🚫 دواء مسحوب', 'تم سحبه. تذكر البطاقة التاريخ والسبب وتقترح البدائل.'] },
          { cells: ['🚨 دواء حرج', 'مدرج في القائمة الوزارية للأدوية الحرجة.'] },
        ],
      },
      { type: 'h2', title: '2. DCI: الاسم الحقيقي للدواء' },
      {
        type: 'paragraph',
        text: '**DCI** (التسمية الدولية المشتركة) هي اسم المادة الفعالة. الاسم التجاري يتغيّر من مخبر إلى آخر، أما DCI فلا تتغيّر: هي ما يفكّر فيه الطبيب والصيدلي. إن حفظت سطرًا واحدًا من البطاقة فليكن هذا. بفضلها تتعرّف على الدواء نفسه تحت عشرة أسماء مختلفة، وتتجنّب تناول المادة نفسها مرتين دون أن تدري.',
      },
      { type: 'h2', title: '3. رمز ATC: إلى أي عائلة ينتمي' },
      {
        type: 'paragraph',
        text: '**رمز ATC** هو عنوان الدواء في تصنيف منظمة الصحة العالمية. يُقرأ من اليسار إلى اليمين، من الأعمّ إلى الأدقّ. لنأخذ الباراسيتامول، **N02BE01**: الحرف N للجهاز العصبي، N02 للمسكّنات، N02B للمسكّنات وخافضات الحرارة الأخرى، N02BE للأنيليدات، و N02BE01 للباراسيتامول نفسه. دون أي معرفة بعلم الأدوية، صرت تعلم أنه دواء للألم والحمّى.',
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'الرمز قابل للنقر: يفتح الصنف وكل أدوية العائلة نفسها المسجّلة في الجزائر. وفي أسفل البطاقة، قسم «التصنيف ATC» يعرض المستويات الخمسة واحدًا واحدًا.',
      },
      { type: 'h2', title: '4. المنشأ: من يصنعه وأين' },
      {
        type: 'list',
        items: [
          '**بلد التصنيع**: «مصنع في الجزائر» أو «مستورد».',
          '**المخبر** و**بلد المنشأ**: اسم المصنّع والبلد الذي يأتي منه المنتج.',
          '**نوع المنتج**: جنيس، مرجعي أجنبي، بيولوجي أو مبتكر.',
        ],
      },
      {
        type: 'paragraph',
        text: 'هذه الأسطر الثلاثة تجيب عن سؤال يُطرح كثيرًا في الصيدلية: «هل هو جنيس أم الأصلي؟ محلي أم مستورد؟»',
      },
      { type: 'h2', title: '5. التواريخ: منذ متى وإلى متى' },
      {
        type: 'paragraph',
        text: 'قسم «التواريخ والتسجيل» يعطي **تاريخ التسجيل**، و**نهاية صلاحية** الرخصة، و**نسخة التسمية** التي أُخذت منها البطاقة. وفي حالة دواء مسحوب تجد فيه أيضًا تاريخ السحب وسببه. هذه المنطقة تخبرك هل المعلومة محيَّنة.',
      },
      { type: 'h2', title: '6. السعر: PPA عندما يكون معروفًا' },
      {
        type: 'paragraph',
        text: 'في عمود «معالم»، السطر الأول هو **PPA**، أي السعر العمومي الجزائري بالدينار. إذا لم يُدخل بعد، تعرض البطاقة «السعر غير متوفر». نفضّل خانة فارغة على سعر مختلَق: لا يُقدَّر أي مبلغ.',
      },
      {
        type: 'paragraph',
        text: 'في العمود نفسه: **الوصفة** (القائمة، الوصفة الطبية)، تذكير بالشكل والجرعة، وزر **«عرض RCP الرسمي»** الذي يفتح النشرة التي تنشرها ANPP عندما تكون مرتبطة بالبطاقة.',
      },
      { type: 'h2', title: '7. السلامة: التداخلات والحساسيات' },
      {
        type: 'paragraph',
        text: 'تحت الشريط العلوي أربعة تبويبات: **الأساسي**، **التداخلات**، **الحساسيات** و**الجنيسة**، والثلاثة الأخيرة مع عدّاد. تبويب التداخلات يسرد ما لا ينبغي جمعه مع المادة، حسب مرجع ANSM، مرتّبًا في أربعة مستويات.',
      },
      {
        type: 'table',
        headers: ['المستوى', 'بعبارة بسيطة'],
        rows: [
          { cells: ['مضاد استطباب (ممنوع الجمع)', 'لا يُجمع بينهما.'] },
          { cells: ['جمع غير موصى به', 'يُتجنَّب، إلا بقرار من الطبيب.'] },
          { cells: ['احتياطات الاستعمال', 'ممكن، مع مراقبة أو تعديل.'] },
          { cells: ['يؤخذ بعين الاعتبار', 'خطر يبقى في الذهن، دون تعليمة خاصة.'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'تبويب **الحساسيات** يشير إلى الحساسيات الموثّقة للمادة أو لصنفها. هي معلومة وليست مانع استعمال: لا تُستنتج أي حساسية متصالبة. وتبويب **الجنيسة** يأخذك إلى الأدوية الأخرى بالمادة الفعالة نفسها.',
      },
      { type: 'h2', title: 'سؤالي، أين أنظر' },
      {
        type: 'table',
        headers: ['أتساءل…', 'أنظر إلى…'],
        rows: [
          { cells: ['هل هذا دوائي فعلًا؟', 'المنطقة 1: الاسم، الجرعة، الشكل'] },
          { cells: ['هل ما زال مسجّلًا؟', 'المنطقة 1: شارة الحالة'] },
          { cells: ['ماذا يحتوي؟', 'المنطقة 2: DCI'] },
          { cells: ['لماذا يُستعمل عمومًا؟', 'المنطقة 3: الصنف ATC، ثم RCP الرسمي'] },
          { cells: ['محلي أم مستورد؟ جنيس؟', 'المنطقة 4: المنشأ ونوع المنتج'] },
          { cells: ['هل المعلومة محيَّنة؟', 'المنطقة 5: التواريخ والنسخة'] },
          { cells: ['كم سعره؟', 'المنطقة 6: PPA'] },
          { cells: ['هل أستطيع تناوله مع علاجي الآخر؟', 'المنطقة 7: تبويب التداخلات، ثم الصيدلي'] },
          { cells: ['صيدليتي لا تملك هذه العلامة', 'تبويب الجنيسة: المادة نفسها بأسماء أخرى'] },
        ],
      },
      { type: 'h2', title: 'ما لا تقوله البطاقة' },
      {
        type: 'list',
        items: [
          'لا تعطي **دواعي الاستعمال ولا الجرعات**: هذا دور RCP الرسمي وطبيبك.',
          'لا تقول هل الدواء **متوفر** في صيدلية ما.',
          'لا تعوّض **النشرة** الموجودة داخل العلبة.',
          'السعر لا يظهر إلا إذا أُدخل: غيابه لا يدلّ على شيء يخص الدواء.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'البطاقة تساعدك على الفهم وعلى طرح الأسئلة الصحيحة. لا تعوّض الوصفة ولا رأي الطبيب أو الصيدلي.',
      },
      { type: 'h2', title: 'دورك الآن' },
      {
        type: 'qcm',
        questions: [
          {
            question: 'علبتان باسمين مختلفين. أي سطر يخبرك هل هما الدواء نفسه؟',
            options: [
              { label: 'A', text: 'المخبر.' },
              { label: 'B', text: 'DCI (المادة الفعالة).' },
              { label: 'C', text: 'رقم التسجيل.' },
            ],
            answer: 'B',
          },
          {
            question: 'تعرض البطاقة «السعر غير متوفر». ماذا نفهم؟',
            options: [
              { label: 'A', text: 'الدواء لم يعد يُباع.' },
              { label: 'B', text: 'الدواء مجاني.' },
              { label: 'C', text: 'السعر لم يُدخل بعد لهذه البطاقة.' },
            ],
            answer: 'C',
          },
          {
            question: 'في رمز ATC ‏N02BE01، علامَ يدلّ الحرف الأول؟',
            options: [
              { label: 'A', text: 'على المجموعة التشريحية: هنا الجهاز العصبي.' },
              { label: 'B', text: 'على بلد التصنيع.' },
              { label: 'C', text: 'على شكل الدواء.' },
            ],
            answer: 'A',
          },
          {
            question: 'الشارة تقول «✅ دواء نشط». ماذا يضمن ذلك؟',
            options: [
              { label: 'A', text: 'أنه متوفر في كل الصيدليات.' },
              { label: 'B', text: 'أنه مسجّل في التسمية السارية.' },
              { label: 'C', text: 'أنه يناسب الجميع.' },
            ],
            answer: 'B',
          },
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'جرّب الآن: ابحث عن الاسم المكتوب على علبة في بيتك، افتح بطاقتها واعثر على المناطق السبع. في المرة الثانية ستحتاج أقل من ثلاثين ثانية.',
      },
    ],
  },
]
