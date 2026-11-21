import type { Article, ArticleSection } from './articles'

/**
 * Série « Quel est l'équivalent algérien de… ? » (FR + AR) : un article pilier (la méthode, et un tableau
 * des marques connues à l'étranger avec leur substance) puis un épisode par médicament.
 *
 * Aucune marque algérienne n'est écrite en dur : les blocs `equivalents` lisent à l'affichage les présentations
 * de la nomenclature rattachées au code ATC (components/articles/EquivalentsBlock.tsx). Les codes ATC sont ceux
 * de la classification OMS 2026 (data/atc/ATC_2026_fr_en_ar.xlsx), les interactions citées celles du Thesaurus
 * ANSM de septembre 2023 (data/ansm/interactions_fr.json), avec leur page.
 *
 * Ajouter un épisode : l'écrire en FR et en AR ci-dessous, l'ajouter à SERIE_EQUIVALENTS (il apparaît alors
 * dans le tableau et la liste de l'article pilier), puis npm run test:articles.
 */

export const SLUG_PILIER = 'equivalent-algerien-medicament-etranger-generique'

export interface EpisodeEquivalent {
  marque: string
  slug: string
  atc: string
}

/** Épisodes publiés, dans l'ordre de la série. */
export const SERIE_EQUIVALENTS: EpisodeEquivalent[] = [
  { marque: 'Augmentin', slug: 'equivalent-algerien-augmentin-amoxicilline-acide-clavulanique', atc: 'J01CR02' },
  { marque: 'Levothyrox', slug: 'equivalent-algerien-levothyrox-levothyroxine', atc: 'H03AA01' },
]

export interface MarqueConnue {
  marque: string
  dciFr: string
  dciAr: string
  atc: string
  usageFr: string
  usageAr: string
}

/** Marques que l'on rapporte souvent de l'étranger (surtout de France) ou qui figurent sur une ordonnance étrangère. */
export const MARQUES_CONNUES: MarqueConnue[] = [
  { marque: 'Doliprane, Efferalgan', dciFr: 'paracétamol', dciAr: 'باراسيتامول', atc: 'N02BE01', usageFr: 'Douleur, fièvre', usageAr: 'الألم، الحمى' },
  { marque: 'Augmentin', dciFr: 'amoxicilline + acide clavulanique', dciAr: 'أموكسيسيلين + حمض الكلافولانيك', atc: 'J01CR02', usageFr: 'Antibiotique', usageAr: 'مضاد حيوي' },
  { marque: 'Clamoxyl', dciFr: 'amoxicilline', dciAr: 'أموكسيسيلين', atc: 'J01CA04', usageFr: 'Antibiotique', usageAr: 'مضاد حيوي' },
  { marque: 'Zithromax', dciFr: 'azithromycine', dciAr: 'أزيثروميسين', atc: 'J01FA10', usageFr: 'Antibiotique', usageAr: 'مضاد حيوي' },
  { marque: 'Levothyrox', dciFr: 'lévothyroxine sodique', dciAr: 'ليفوثيروكسين الصوديوم', atc: 'H03AA01', usageFr: 'Hypothyroïdie', usageAr: 'قصور الغدة الدرقية' },
  { marque: 'Glucophage', dciFr: 'metformine', dciAr: 'ميتفورمين', atc: 'A10BA02', usageFr: 'Diabète de type 2', usageAr: 'السكري من النوع 2' },
  { marque: 'Lantus', dciFr: 'insuline glargine', dciAr: 'إنسولين غلارجين', atc: 'A10AE04', usageFr: 'Diabète (insuline lente)', usageAr: 'السكري (إنسولين بطيء)' },
  { marque: 'Kardégic', dciFr: 'acide acétylsalicylique (sel de lysine)', dciAr: 'حمض أسيتيل الساليسيليك (ملح الليزين)', atc: 'B01AC06', usageFr: 'Antiagrégant plaquettaire', usageAr: 'مضاد لتكدس الصفائح' },
  { marque: 'Plavix', dciFr: 'clopidogrel', dciAr: 'كلوبيدوغريل', atc: 'B01AC04', usageFr: 'Antiagrégant plaquettaire', usageAr: 'مضاد لتكدس الصفائح' },
  { marque: 'Xarelto', dciFr: 'rivaroxaban', dciAr: 'ريفاروكسابان', atc: 'B01AF01', usageFr: 'Anticoagulant oral', usageAr: 'مضاد تخثر فموي' },
  { marque: 'Eliquis', dciFr: 'apixaban', dciAr: 'أبيكسابان', atc: 'B01AF02', usageFr: 'Anticoagulant oral', usageAr: 'مضاد تخثر فموي' },
  { marque: 'Lovenox', dciFr: 'énoxaparine', dciAr: 'إينوكسابارين', atc: 'B01AB05', usageFr: 'Anticoagulant injectable', usageAr: 'مضاد تخثر بالحقن' },
  { marque: 'Tahor', dciFr: 'atorvastatine', dciAr: 'أتورفاستاتين', atc: 'C10AA05', usageFr: 'Cholestérol', usageAr: 'الكوليسترول' },
  { marque: 'Crestor', dciFr: 'rosuvastatine', dciAr: 'روزوفاستاتين', atc: 'C10AA07', usageFr: 'Cholestérol', usageAr: 'الكوليسترول' },
  { marque: 'Amlor', dciFr: 'amlodipine', dciAr: 'أملوديبين', atc: 'C08CA01', usageFr: 'Hypertension', usageAr: 'ارتفاع ضغط الدم' },
  { marque: 'Lasilix', dciFr: 'furosémide', dciAr: 'فوروسيميد', atc: 'C03CA01', usageFr: 'Diurétique', usageAr: 'مدر للبول' },
  { marque: 'Mopral', dciFr: 'oméprazole', dciAr: 'أوميبرازول', atc: 'A02BC01', usageFr: 'Reflux, ulcère', usageAr: 'الارتجاع، القرحة' },
  { marque: 'Inexium', dciFr: 'ésoméprazole', dciAr: 'إيزوميبرازول', atc: 'A02BC05', usageFr: 'Reflux, ulcère', usageAr: 'الارتجاع، القرحة' },
  { marque: 'Spasfon', dciFr: 'phloroglucinol', dciAr: 'فلوروغلوسينول', atc: 'A03AX12', usageFr: 'Spasmes digestifs', usageAr: 'التشنجات الهضمية' },
  { marque: 'Smecta', dciFr: 'diosmectite', dciAr: 'ديوسمكتيت', atc: 'A07BC05', usageFr: 'Diarrhée', usageAr: 'الإسهال' },
  { marque: 'Ventoline', dciFr: 'salbutamol', dciAr: 'سالبوتامول', atc: 'R03AC02', usageFr: 'Asthme (crise)', usageAr: 'الربو (النوبة)' },
  { marque: 'Voltarène', dciFr: 'diclofénac', dciAr: 'ديكلوفيناك', atc: 'M01AB05', usageFr: 'Anti-inflammatoire', usageAr: 'مضاد للالتهاب' },
  { marque: 'Deroxat', dciFr: 'paroxétine', dciAr: 'باروكسيتين', atc: 'N06AB05', usageFr: 'Antidépresseur', usageAr: 'مضاد للاكتئاب' },
  { marque: 'Lyrica', dciFr: 'prégabaline', dciAr: 'بريغابالين', atc: 'N02BF02', usageFr: 'Douleurs neuropathiques', usageAr: 'الآلام العصبية' },
]

const episodeDe = (atc: string) => SERIE_EQUIVALENTS.find(e => e.atc === atc)

function tableauMarques(lang: 'fr' | 'ar'): ArticleSection {
  const fr = lang === 'fr'
  return {
    type: 'table',
    headers: fr
      ? ['Marque connue à l’étranger', 'Substance (DCI)', 'À quoi elle sert', 'Classe ATC en Algérie']
      : ['العلامة المعروفة في الخارج', 'المادة الفعالة (DCI)', 'استعمالها', 'الصنف ATC في الجزائر'],
    rows: MARQUES_CONNUES.map(m => {
      const ep = episodeDe(m.atc)
      const suffixe = lang === 'ar' ? '-ar' : ''
      const dci = fr ? m.dciFr : m.dciAr
      return {
        cells: [
          m.marque,
          ep ? `[${dci}](/articles/${ep.slug}${suffixe})` : dci,
          fr ? m.usageFr : m.usageAr,
          `[${m.atc}](/classes-therapeutiques/${m.atc})`,
        ],
      }
    }),
  }
}

function listeEpisodes(lang: 'fr' | 'ar'): ArticleSection {
  const suffixe = lang === 'ar' ? '-ar' : ''
  return {
    type: 'list',
    items: SERIE_EQUIVALENTS.map(e => {
      const m = MARQUES_CONNUES.find(x => x.atc === e.atc)
      const dci = m ? (lang === 'fr' ? m.dciFr : m.dciAr) : ''
      return lang === 'fr'
        ? `[L’équivalent algérien de ${e.marque}](/articles/${e.slug}) : ${dci}.`
        : `[المعادل الجزائري لـ ${e.marque}](/articles/${e.slug}${suffixe}): ${dci}.`
    }),
  }
}

const QCM_REPONSES = ['B', 'C', 'A']

export const ARTICLES_EQUIVALENTS: Article[] = [
  // ─── Article pilier, FR ────────────────────────────────────────────────────
  {
    slug: SLUG_PILIER,
    lang: 'fr',
    audience: 'professionnel',
    title: 'Quel est l’équivalent algérien de… ? Trouver un médicament étranger en Algérie en 3 étapes',
    subtitle: 'Chercher la substance, pas la marque : la méthode, les pièges, et 24 marques connues avec leur DCI',
    description:
      'Une boîte ramenée de France, une ordonnance étrangère, un nom entendu : pour trouver l’équivalent en Algérie, on cherche la substance active (DCI), on vérifie le dosage et la forme, puis on regarde les présentations enregistrées dans la nomenclature. Méthode en 3 étapes, cas où « même DCI » ne suffit pas, et tableau de 24 marques connues avec leur DCI et leur classe ATC.',
    seoTitle: 'Équivalent algérien d’un médicament étranger : trouver le générique en Algérie',
    seoKeywords: ['équivalent algérien médicament', 'équivalent médicament Algérie', 'générique Algérie', 'médicament français en Algérie', 'DCI médicament', 'nomenclature médicaments Algérie', 'substitution générique Algérie', 'معادل الدواء في الجزائر'],
    date: '2026-11-21',
    readingTime: 7,
    tags: ['Équivalents', 'Générique', 'DCI', 'Substitution', 'ATC', 'Nomenclature'],
    faq: [
      {
        question: 'Comment trouver l’équivalent algérien d’un médicament français ?',
        answer: 'Lisez la DCI sur la boîte (le nom de la substance, écrit sous la marque) ou sur l’ordonnance, puis cherchez cette DCI dans DwaDZ. Vous obtenez toutes les présentations enregistrées en Algérie. Choisissez celle qui a le même dosage, la même forme et la même voie, et faites valider le choix par votre pharmacien.',
      },
      {
        question: 'Un générique algérien est-il aussi efficace que la marque étrangère ?',
        answer: 'Un générique contient la même substance active, au même dosage, et doit avoir démontré qu’il se comporte dans l’organisme comme le médicament de référence (bioéquivalence) pour être enregistré. Les excipients peuvent différer. Pour quelques médicaments à marge thérapeutique étroite, comme la lévothyroxine, un changement de marque se fait avec un contrôle médical.',
      },
      {
        question: 'Le médicament que je cherche n’apparaît pas. Que faire ?',
        answer: 'Vérifiez l’orthographe de la DCI (la recherche tolère les fautes) et essayez sans le sel (« amlodipine » plutôt que « bésilate d’amlodipine »). Si la substance n’est pas enregistrée en Algérie, regardez la classe ATC : d’autres substances de la même famille existent peut-être, mais le choix d’une autre substance revient au médecin.',
      },
      {
        question: 'Si le médicament figure dans la nomenclature, le trouverai-je en pharmacie ?',
        answer: 'Pas forcément. La nomenclature dit qu’un médicament est enregistré, pas qu’il est en stock. La disponibilité dépend de l’approvisionnement : votre pharmacien peut vous le dire, et vous orienter vers une autre marque de même DCI en cas de rupture.',
      },
      {
        question: 'Puis-je remplacer un médicament par un autre de la même classe ATC ?',
        answer: 'Non, pas de vous-même. La classe ATC regroupe des substances de la même famille, mais deux substances d’une même classe n’ont pas la même dose ni toujours les mêmes indications. Seule la même DCI, au même dosage et sous la même forme, est un équivalent ; tout le reste est un changement de traitement, à décider avec le médecin.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'C’est une des questions les plus posées au comptoir et sur les réseaux : « J’ai ramené du Doliprane de France, il est fini, c’est quoi l’équivalent ici ? », « Mon médecin à l’étranger m’a prescrit du Levothyrox, qu’est-ce que je demande en Algérie ? ». La bonne nouvelle : la réponse ne dépend pas d’une liste à apprendre par cœur. Elle tient en une règle, **on cherche la substance, pas la marque**, et en trois vérifications. Voici la méthode, puis une série d’articles qui l’appliquent médicament par médicament.',
      },
      { type: 'h2', title: 'Le principe : la marque change, la DCI reste' },
      {
        type: 'paragraph',
        text: 'Chaque médicament a deux noms. La **marque** (Doliprane, Augmentin…) est choisie par le laboratoire et change d’un pays à l’autre, parfois d’un laboratoire à l’autre dans le même pays. La **DCI**, dénomination commune internationale, est le nom de la substance active : paracétamol, amoxicilline, lévothyroxine. Elle est la même partout dans le monde. Trouver l’équivalent algérien d’un médicament étranger, c’est donc trouver les médicaments enregistrés en Algérie qui contiennent la même DCI, au même dosage, sous la même forme.',
      },
      { type: 'h2', title: 'La méthode en 3 étapes' },
      { type: 'h3', title: 'Étape 1 : trouver la DCI' },
      {
        type: 'list',
        items: [
          '**Sur la boîte** : la DCI est écrite sous la marque, en plus petit, souvent suivie du dosage (« paracétamol 1 g »).',
          '**Sur l’ordonnance** : de plus en plus de médecins prescrivent directement en DCI.',
          '**Sur la notice** : la rubrique « Que contient ce médicament » donne la substance active.',
          '**Vous n’avez que la marque ?** Le tableau plus bas donne la DCI de 24 marques souvent rapportées de l’étranger.',
        ],
      },
      { type: 'h3', title: 'Étape 2 : noter le dosage, la forme et la voie' },
      {
        type: 'paragraph',
        text: 'La DCI ne suffit pas. Notez le **dosage** (500 mg ou 1 g ?), la **forme** (comprimé, gélule, sirop, sachet, injection) et les mentions qui changent tout : **LP** ou **à libération prolongée**, **effervescent**, **orodispersible**. Un comprimé à libération prolongée ne se remplace pas par un comprimé classique, même au même dosage total.',
      },
      { type: 'h3', title: 'Étape 3 : chercher la DCI dans DwaDZ' },
      {
        type: 'paragraph',
        text: 'Tapez la DCI dans la [recherche](/recherche) (en français, en arabe ou avec des fautes, elle comprend). Cliquez la substance dans les suggestions : vous obtenez toutes les présentations enregistrées, avec leur marque, leur laboratoire et leur origine. Ouvrez la fiche qui correspond au dosage et à la forme notés à l’étape 2 : elle donne le statut (toujours enregistrée ou non), le prix public (PPA) quand il est connu, et les interactions. Voici par exemple ce que la nomenclature contient pour le paracétamol seul :',
      },
      { type: 'equivalents', atc: ['N02BE01'], dci: 'PARACETAMOL' },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Le paracétamol est aussi présent dans beaucoup de médicaments associés (contre le rhume, la grippe, certaines douleurs). Ils ne sont pas dans la liste ci-dessus : leur code ATC est celui d’une association. Si vous prenez déjà du paracétamol, vérifiez la DCI de tout autre médicament pour ne pas en prendre deux fois.',
      },
      { type: 'h2', title: '24 marques connues à l’étranger et leur substance' },
      {
        type: 'paragraph',
        text: 'Ce tableau donne la DCI de marques souvent rapportées de l’étranger, surtout de France. Certaines sont elles-mêmes enregistrées en Algérie : la recherche vous le dira. Le code ATC ouvre la classe, avec les médicaments enregistrés ici. Quand la substance est soulignée, un article de la série lui est consacré.',
      },
      tableauMarques('fr'),
      { type: 'h2', title: 'Quand « même DCI » ne suffit pas' },
      {
        type: 'paragraph',
        text: 'Pour la grande majorité des médicaments, deux présentations de même DCI, même dosage et même forme sont interchangeables. Quelques situations demandent pourtant de passer par le médecin ou le pharmacien avant de changer :',
      },
      {
        type: 'list',
        items: [
          '**Marge thérapeutique étroite** : lévothyroxine, antiépileptiques, antivitamines K, lithium, immunosuppresseurs. Un petit écart d’absorption a des effets visibles ; un changement de marque se fait avec un contrôle.',
          '**Formes à libération modifiée** (LP, « retard ») : la vitesse de libération fait partie du médicament.',
          '**Associations** : deux substances dans le même comprimé. L’équivalent doit contenir les deux, aux mêmes doses. L’amoxicilline seule n’est pas l’équivalent de l’amoxicilline + acide clavulanique.',
          '**Médicaments biologiques et insulines** : un biosimilaire n’est pas un générique ; le passage de l’un à l’autre se décide avec le médecin, et le stylo injecteur peut être différent.',
          '**Inhalateurs** : même substance, mais la technique d’inhalation change d’un dispositif à l’autre.',
          '**Excipients à effet notoire** : lactose, gluten, sucre, alcool… Ils peuvent différer d’une marque à l’autre ; ils sont indiqués dans la notice.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Enregistré ne veut pas dire disponible. La nomenclature dit qu’un médicament a une autorisation en Algérie, pas qu’il est en stock dans votre pharmacie. En cas de rupture, votre pharmacien peut proposer une autre marque de même DCI ; changer de substance relève du médecin.',
      },
      { type: 'h2', title: 'La série, médicament par médicament' },
      {
        type: 'paragraph',
        text: 'Chaque article de la série reprend la méthode pour un médicament très recherché : sa DCI, les dosages à vérifier, la liste des présentations enregistrées en Algérie (lue en direct dans la nomenclature, elle suit les mises à jour), les pièges propres à ce médicament et ses interactions principales.',
      },
      listeEpisodes('fr'),
      { type: 'h2', title: 'Testez-vous' },
      {
        type: 'qcm',
        questions: [
          {
            question: 'Vous avez une boîte étrangère et vous cherchez son équivalent. Que cherchez-vous en premier ?',
            options: [
              { label: 'A', text: 'Le nom de la marque.' },
              { label: 'B', text: 'La DCI, le nom de la substance active.' },
              { label: 'C', text: 'Le nom du laboratoire.' },
            ],
            answer: QCM_REPONSES[0],
          },
          {
            question: 'Même DCI, même dosage : lequel de ces remplacements demande l’avis du médecin ?',
            options: [
              { label: 'A', text: 'Un comprimé de paracétamol 500 mg par un autre comprimé de paracétamol 500 mg.' },
              { label: 'B', text: 'Une gélule d’oméprazole 20 mg par une autre gélule d’oméprazole 20 mg.' },
              { label: 'C', text: 'Une marque de lévothyroxine par une autre marque de lévothyroxine.' },
            ],
            answer: QCM_REPONSES[1],
          },
          {
            question: 'Le médicament figure dans la nomenclature. Qu’est-ce que cela garantit ?',
            options: [
              { label: 'A', text: 'Qu’il est enregistré en Algérie.' },
              { label: 'B', text: 'Qu’il est en stock dans toutes les pharmacies.' },
              { label: 'C', text: 'Qu’il est remboursé.' },
            ],
            answer: QCM_REPONSES[2],
          },
        ],
      },
    ],
  },

  // ─── Article pilier, AR ────────────────────────────────────────────────────
  {
    slug: `${SLUG_PILIER}-ar`,
    lang: 'ar',
    audience: 'professionnel',
    title: 'ما هو المعادل الجزائري لـ…؟ العثور على دواء أجنبي في الجزائر في 3 خطوات',
    subtitle: 'ابحث عن المادة الفعالة لا عن العلامة: الطريقة، والأخطاء الشائعة، و24 علامة معروفة مع اسمها العلمي',
    description:
      'علبة جُلبت من فرنسا، وصفة أجنبية، اسم سمعته: للعثور على المعادل في الجزائر نبحث عن المادة الفعالة (DCI)، ونتحقق من الجرعة والشكل، ثم ننظر في التقديمات المسجّلة في المدونة الوطنية. طريقة من 3 خطوات، والحالات التي لا يكفي فيها «نفس المادة»، وجدول لـ24 علامة معروفة مع اسمها العلمي وصنفها ATC.',
    seoTitle: 'المعادل الجزائري لدواء أجنبي: كيف تجد الدواء الجنيس في الجزائر',
    seoKeywords: ['معادل الدواء في الجزائر', 'دواء جنيس الجزائر', 'دواء فرنسي في الجزائر', 'الاسم العلمي للدواء', 'المدونة الوطنية للأدوية', 'équivalent algérien médicament'],
    date: '2026-11-21',
    readingTime: 7,
    tags: ['المعادلات', 'دواء جنيس', 'DCI', 'الاستبدال', 'ATC', 'المدونة'],
    faq: [
      {
        question: 'كيف أجد المعادل الجزائري لدواء فرنسي؟',
        answer: 'اقرأ الاسم العلمي (DCI) على العلبة، وهو مكتوب تحت العلامة، أو على الوصفة، ثم ابحث عنه في DwaDZ. ستظهر كل التقديمات المسجّلة في الجزائر. اختر التي لها نفس الجرعة ونفس الشكل ونفس طريقة الاستعمال، واطلب من الصيدلي تأكيد الاختيار.',
      },
      {
        question: 'هل الدواء الجنيس الجزائري فعّال مثل العلامة الأجنبية؟',
        answer: 'الدواء الجنيس يحتوي على نفس المادة الفعالة بنفس الجرعة، ويجب أن يثبت قبل تسجيله أنه يتصرف في الجسم مثل الدواء المرجعي (التكافؤ الحيوي). قد تختلف السواغات. وبالنسبة لبعض الأدوية ذات الهامش العلاجي الضيق، مثل الليفوثيروكسين، يتم تغيير العلامة مع مراقبة طبية.',
      },
      {
        question: 'الدواء الذي أبحث عنه لا يظهر. ماذا أفعل؟',
        answer: 'تحقق من كتابة الاسم العلمي (البحث يتسامح مع الأخطاء) وجرّب بدون الملح («أملوديبين» بدل «بيسيلات الأملوديبين»). إذا لم تكن المادة مسجّلة في الجزائر، انظر في الصنف ATC: قد توجد مواد أخرى من نفس العائلة، لكن اختيار مادة أخرى يعود للطبيب.',
      },
      {
        question: 'إذا كان الدواء في المدونة، هل سأجده في الصيدلية؟',
        answer: 'ليس بالضرورة. المدونة تقول إن الدواء مسجّل، لا إنه متوفر. التوفر مرتبط بالتموين: الصيدلي يمكنه إخبارك، وتوجيهك إلى علامة أخرى بنفس المادة الفعالة في حالة الانقطاع.',
      },
      {
        question: 'هل يمكنني تعويض دواء بآخر من نفس الصنف ATC؟',
        answer: 'لا، ليس من تلقاء نفسك. الصنف ATC يجمع مواد من نفس العائلة، لكن مادتين من نفس الصنف ليس لهما نفس الجرعة ولا دائمًا نفس الاستطبابات. المعادل هو نفس المادة الفعالة بنفس الجرعة ونفس الشكل فقط؛ وكل ما عدا ذلك تغيير في العلاج يقرره الطبيب.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'إنه من أكثر الأسئلة تكرارًا في الصيدلية وعلى مواقع التواصل: «جبت Doliprane من فرنسا وكمل، واش هو المعادل هنا؟»، «الطبيب في الخارج وصف لي Levothyrox، واش نطلب في الجزائر؟». الخبر السار: الجواب لا يتطلب حفظ قائمة. إنه قاعدة واحدة، **نبحث عن المادة الفعالة لا عن العلامة**، وثلاث عمليات تحقق. إليك الطريقة، ثم سلسلة مقالات تطبّقها دواءً بدواء.',
      },
      { type: 'h2', title: 'المبدأ: العلامة تتغير، والاسم العلمي يبقى' },
      {
        type: 'paragraph',
        text: 'لكل دواء اسمان. **العلامة التجارية** (Doliprane، Augmentin…) يختارها المخبر وتتغير من بلد لآخر، وأحيانًا من مخبر لآخر في نفس البلد. أما **DCI**، أي التسمية المشتركة الدولية، فهي اسم المادة الفعالة: باراسيتامول، أموكسيسيلين، ليفوثيروكسين. وهي نفسها في كل العالم. إيجاد المعادل الجزائري لدواء أجنبي يعني إذن إيجاد الأدوية المسجّلة في الجزائر التي تحتوي على نفس المادة الفعالة، بنفس الجرعة، وبنفس الشكل.',
      },
      { type: 'h2', title: 'الطريقة في 3 خطوات' },
      { type: 'h3', title: 'الخطوة 1: إيجاد الاسم العلمي (DCI)' },
      {
        type: 'list',
        items: [
          '**على العلبة**: الاسم العلمي مكتوب تحت العلامة بخط أصغر، وغالبًا متبوعًا بالجرعة («paracétamol 1 g»).',
          '**على الوصفة**: عدد متزايد من الأطباء يكتبون الاسم العلمي مباشرة.',
          '**في النشرة**: فقرة «ماذا يحتوي هذا الدواء» تذكر المادة الفعالة.',
          '**لديك العلامة فقط؟** الجدول أدناه يعطي الاسم العلمي لـ24 علامة تُجلب كثيرًا من الخارج.',
        ],
      },
      { type: 'h3', title: 'الخطوة 2: تسجيل الجرعة والشكل وطريقة الاستعمال' },
      {
        type: 'paragraph',
        text: 'الاسم العلمي وحده لا يكفي. سجّل **الجرعة** (500 ملغ أم 1 غ؟)، و**الشكل** (قرص، كبسولة، شراب، كيس، حقنة) والعبارات التي تغيّر كل شيء: **LP** أو **ممتد المفعول**، **فوار**، **يذوب في الفم**. القرص الممتد المفعول لا يُعوَّض بقرص عادي، حتى بنفس الجرعة الإجمالية.',
      },
      { type: 'h3', title: 'الخطوة 3: البحث عن الاسم العلمي في DwaDZ' },
      {
        type: 'paragraph',
        text: 'اكتب الاسم العلمي في [البحث](/recherche) (بالفرنسية أو بالعربية أو حتى مع أخطاء، فهو يفهم). اضغط على المادة في الاقتراحات: ستظهر كل التقديمات المسجّلة، مع علامتها ومخبرها ومنشئها. افتح البطاقة التي توافق الجرعة والشكل المسجّلين في الخطوة 2: ستجد الوضعية (هل ما زال مسجّلًا)، والسعر العمومي (PPA) عندما يكون معروفًا، والتداخلات. هذا مثلًا ما تحتويه المدونة بالنسبة للباراسيتامول وحده:',
      },
      { type: 'equivalents', atc: ['N02BE01'], dci: 'PARACETAMOL' },
      {
        type: 'callout',
        variant: 'tip',
        text: 'الباراسيتامول موجود أيضًا في كثير من الأدوية المركّبة (ضد الزكام، الأنفلونزا، بعض الآلام). وهي ليست في القائمة أعلاه لأن رمزها ATC هو رمز تركيبة. إذا كنت تتناول الباراسيتامول، تحقق من الاسم العلمي لأي دواء آخر حتى لا تتناوله مرتين.',
      },
      { type: 'h2', title: '24 علامة معروفة في الخارج ومادتها الفعالة' },
      {
        type: 'paragraph',
        text: 'يعطي هذا الجدول الاسم العلمي لعلامات تُجلب كثيرًا من الخارج، خاصة من فرنسا. بعضها مسجّل هو نفسه في الجزائر: البحث سيخبرك بذلك. رمز ATC يفتح الصنف مع الأدوية المسجّلة هنا. وعندما تكون المادة مسطّرة، فلها مقال خاص في السلسلة.',
      },
      tableauMarques('ar'),
      { type: 'h2', title: 'متى لا يكفي «نفس الاسم العلمي»' },
      {
        type: 'paragraph',
        text: 'بالنسبة لأغلب الأدوية، تقديمان بنفس المادة الفعالة ونفس الجرعة ونفس الشكل قابلان للتبادل. لكن بعض الحالات تستدعي المرور بالطبيب أو الصيدلي قبل التغيير:',
      },
      {
        type: 'list',
        items: [
          '**الهامش العلاجي الضيق**: الليفوثيروكسين، مضادات الصرع، مضادات الفيتامين K، الليثيوم، مثبطات المناعة. فرق صغير في الامتصاص له آثار ملموسة؛ تغيير العلامة يتم مع مراقبة.',
          '**الأشكال المعدّلة التحرير** (LP، «retard»): سرعة التحرير جزء من الدواء.',
          '**التركيبات**: مادتان في نفس القرص. المعادل يجب أن يحتوي على الاثنتين بنفس الجرعات. الأموكسيسيلين وحده ليس معادلًا للأموكسيسيلين + حمض الكلافولانيك.',
          '**الأدوية البيولوجية والإنسولين**: البديل الحيوي ليس دواءً جنيسًا؛ الانتقال من واحد لآخر يقرره الطبيب، وقد يختلف قلم الحقن.',
          '**البخاخات**: نفس المادة، لكن تقنية الاستنشاق تختلف من جهاز لآخر.',
          '**السواغات ذات التأثير المعروف**: اللاكتوز، الغلوتين، السكر، الكحول… قد تختلف من علامة لأخرى، وهي مذكورة في النشرة.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'التسجيل لا يعني التوفر. المدونة تقول إن للدواء ترخيصًا في الجزائر، لا إنه موجود في صيدليتك. في حالة الانقطاع، يمكن للصيدلي اقتراح علامة أخرى بنفس المادة الفعالة؛ أما تغيير المادة فيعود للطبيب.',
      },
      { type: 'h2', title: 'السلسلة، دواءً بدواء' },
      {
        type: 'paragraph',
        text: 'كل مقال في السلسلة يطبّق الطريقة على دواء كثير البحث: اسمه العلمي، الجرعات التي يجب التحقق منها، قائمة التقديمات المسجّلة في الجزائر (تُقرأ مباشرة من المدونة فتتبع التحديثات)، الأخطاء الخاصة بهذا الدواء وأهم تداخلاته.',
      },
      listeEpisodes('ar'),
      { type: 'h2', title: 'اختبر نفسك' },
      {
        type: 'qcm',
        questions: [
          {
            question: 'لديك علبة أجنبية وتبحث عن معادلها. عمّ تبحث أولًا؟',
            options: [
              { label: 'A', text: 'اسم العلامة.' },
              { label: 'B', text: 'الاسم العلمي (DCI)، أي اسم المادة الفعالة.' },
              { label: 'C', text: 'اسم المخبر.' },
            ],
            answer: QCM_REPONSES[0],
          },
          {
            question: 'نفس المادة ونفس الجرعة: أي تعويض من هذه يتطلب رأي الطبيب؟',
            options: [
              { label: 'A', text: 'قرص باراسيتامول 500 ملغ بقرص باراسيتامول 500 ملغ آخر.' },
              { label: 'B', text: 'كبسولة أوميبرازول 20 ملغ بكبسولة أوميبرازول 20 ملغ أخرى.' },
              { label: 'C', text: 'علامة ليفوثيروكسين بعلامة ليفوثيروكسين أخرى.' },
            ],
            answer: QCM_REPONSES[1],
          },
          {
            question: 'الدواء موجود في المدونة. ماذا يضمن ذلك؟',
            options: [
              { label: 'A', text: 'أنه مسجّل في الجزائر.' },
              { label: 'B', text: 'أنه متوفر في كل الصيدليات.' },
              { label: 'C', text: 'أنه معوَّض.' },
            ],
            answer: QCM_REPONSES[2],
          },
        ],
      },
    ],
  },

  // ─── Épisode 1 : Augmentin, FR ─────────────────────────────────────────────
  {
    slug: SERIE_EQUIVALENTS[0].slug,
    lang: 'fr',
    audience: 'professionnel',
    title: 'L’équivalent algérien d’Augmentin : amoxicilline + acide clavulanique',
    subtitle: 'Les deux nombres à vérifier sur la boîte, les présentations enregistrées en Algérie, et les erreurs à éviter',
    description:
      'Augmentin contient deux substances : l’amoxicilline et l’acide clavulanique (classe ATC J01CR02). Son équivalent en Algérie est toute présentation qui contient les deux, aux mêmes doses et sous la même forme. Liste des présentations enregistrées lue en direct dans la nomenclature, piège du rapport amoxicilline / acide clavulanique chez l’enfant, différence avec l’amoxicilline seule, interactions selon l’ANSM.',
    seoTitle: 'Équivalent Augmentin en Algérie : amoxicilline + acide clavulanique, génériques enregistrés',
    seoKeywords: ['équivalent Augmentin Algérie', 'Augmentin Algérie', 'amoxicilline acide clavulanique Algérie', 'générique Augmentin', 'Augmentin enfant sirop', 'antibiotique Algérie', 'J01CR02'],
    date: '2026-11-21',
    readingTime: 6,
    tags: ['Équivalents', 'Antibiotique', 'Amoxicilline', 'Générique', 'Pédiatrie', 'Interactions'],
    faq: [
      {
        question: 'Quel est l’équivalent d’Augmentin en Algérie ?',
        answer: 'Toute présentation enregistrée qui contient de l’amoxicilline et de l’acide clavulanique, aux mêmes doses et sous la même forme que la boîte d’origine. La liste à jour est dans cet article et dans la recherche DwaDZ (classe ATC J01CR02).',
      },
      {
        question: 'L’amoxicilline seule peut-elle remplacer Augmentin ?',
        answer: 'Non. L’acide clavulanique protège l’amoxicilline contre les enzymes (bêtalactamases) de certaines bactéries. Sans lui, l’antibiotique peut être inefficace sur l’infection pour laquelle l’association a été prescrite. C’est au médecin de décider d’un autre antibiotique.',
      },
      {
        question: 'Pour un enfant, puis-je prendre un autre sirop d’amoxicilline + acide clavulanique ?',
        answer: 'Seulement avec le pharmacien. Les suspensions buvables n’ont pas toutes la même concentration ni le même rapport entre les deux substances. La dose se calcule sur l’amoxicilline, en fonction du poids : changer de suspension oblige à recalculer le volume à donner.',
      },
      {
        question: 'Faut-il une ordonnance ?',
        answer: 'Oui. C’est un antibiotique, délivré sur prescription. Il n’agit pas sur les virus : il ne soigne ni le rhume, ni la grippe, ni la plupart des angines de l’enfant, qui sont virales.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Augmentin est l’un des antibiotiques les plus prescrits au monde, et l’une des marques que l’on cherche le plus souvent en Algérie. Son équivalent existe ici, mais il y a un détail que la plupart des gens ratent : Augmentin n’a pas une substance, il en a **deux**. Et c’est justement là que se cachent les erreurs.',
      },
      { type: 'h2', title: 'Ce que contient Augmentin' },
      {
        type: 'list',
        items: [
          '**Amoxicilline** : l’antibiotique, de la famille des pénicillines.',
          '**Acide clavulanique** : il n’a presque pas d’effet antibiotique seul, il bloque les enzymes (bêtalactamases) que certaines bactéries fabriquent pour détruire l’amoxicilline.',
          '**Classe ATC J01CR02** : « amoxicilline et inhibiteur de bêtalactamases ». C’est ce code qui regroupe tous les équivalents.',
        ],
      },
      { type: 'h2', title: 'Les deux nombres à vérifier sur la boîte' },
      {
        type: 'paragraph',
        text: 'Le dosage d’Augmentin s’écrit avec deux nombres : la dose d’amoxicilline, puis celle d’acide clavulanique, par exemple **1 g / 125 mg** ou **500 mg / 62,5 mg** pour les comprimés adultes. Selon les pays et les laboratoires, le rapport entre les deux varie (8 pour 1, 7 pour 1, 4 pour 1). Pour trouver le bon équivalent, les **deux** nombres doivent correspondre, ainsi que la forme : comprimé, sachet ou poudre pour suspension buvable.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Chez l’enfant, attention aux sirops. Les poudres pour suspension buvable n’ont pas toutes la même concentration : certaines s’expriment par millilitre, d’autres par 5 ml. La dose se calcule sur l’amoxicilline, selon le poids. Passer d’une suspension à une autre sans recalculer le volume expose à un sous-dosage ou à un surdosage, et changer de rapport modifie la quantité d’acide clavulanique, responsable de la plupart des diarrhées. Le pharmacien refait le calcul.',
      },
      { type: 'h2', title: 'Les présentations enregistrées en Algérie' },
      {
        type: 'paragraph',
        text: 'Voici les présentations de la nomenclature rattachées à la classe J01CR02. La liste est lue en direct : elle suit les ajouts et les retraits. Chaque ligne ouvre la fiche, avec le statut, le prix (PPA) quand il est connu et les interactions.',
      },
      { type: 'equivalents', atc: ['J01CR02'] },
      { type: 'h2', title: 'L’erreur classique : prendre l’amoxicilline seule' },
      {
        type: 'paragraph',
        text: 'Les boîtes d’amoxicilline seule (Clamoxyl en France, classe J01CA04) sont plus nombreuses et souvent moins chères. Elles ne sont **pas** l’équivalent d’Augmentin. Sans acide clavulanique, l’amoxicilline est détruite par les bactéries qui produisent des bêtalactamases ; or c’est souvent pour ces infections que l’association a été choisie (certaines otites, sinusites, infections dentaires ou morsures). Le passage de l’une à l’autre est une décision médicale.',
      },
      { type: 'h2', title: 'Avant de le prendre' },
      {
        type: 'list',
        items: [
          '**Allergie aux pénicillines** : c’est la contre-indication principale, et une allergie aux céphalosporines doit aussi être signalée. Le filtre [« Allergie connue »](/articles/allergie-connue-medicaments-algerie-mode-emploi) de la recherche signale les médicaments concernés.',
          '**Antécédent d’atteinte du foie** (jaunisse) lors d’un traitement précédent par cette association : à dire au médecin.',
          '**Au début du repas** : c’est le moment recommandé pour mieux le tolérer.',
          '**Jusqu’au bout** : la durée prescrite, même si l’on va mieux avant.',
        ],
      },
      { type: 'h2', title: 'Les interactions à connaître (Thesaurus ANSM)' },
      {
        type: 'table',
        headers: ['Avec', 'Niveau', 'Risque'],
        rows: [
          { cells: ['Méthotrexate', 'Association déconseillée', 'Augmentation des effets et de la toxicité hématologique du méthotrexate (les pénicillines diminuent son élimination par le rein).'] },
          { cells: ['Allopurinol', 'À prendre en compte', 'Risque accru de réactions cutanées.'] },
          { cells: ['Mycophénolate mofétil', 'À prendre en compte', 'Baisse d’environ un tiers des concentrations d’acide mycophénolique, avec un risque de moindre efficacité.'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Source : Thesaurus des interactions médicamenteuses de l’ANSM, septembre 2023, rubriques « pénicillines » et « pénicillines A », page 192. L’onglet Interactions de chaque fiche donne la liste complète.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Un antibiotique ne soigne pas un virus. Le rhume, la grippe et la plupart des angines de l’enfant sont viraux : l’amoxicilline, avec ou sans acide clavulanique, n’y change rien, et chaque prise inutile entretient la résistance des bactéries.',
      },
      {
        type: 'paragraph',
        text: 'Cet article fait partie de la série [« Quel est l’équivalent algérien de… ? »](/articles/' + SLUG_PILIER + '), qui donne la méthode pour n’importe quel médicament.',
      },
    ],
  },

  // ─── Épisode 1 : Augmentin, AR ─────────────────────────────────────────────
  {
    slug: `${SERIE_EQUIVALENTS[0].slug}-ar`,
    lang: 'ar',
    audience: 'professionnel',
    title: 'المعادل الجزائري لـ Augmentin: أموكسيسيلين + حمض الكلافولانيك',
    subtitle: 'الرقمان اللذان يجب التحقق منهما على العلبة، التقديمات المسجّلة في الجزائر، والأخطاء التي يجب تجنبها',
    description:
      'يحتوي Augmentin على مادتين: الأموكسيسيلين وحمض الكلافولانيك (الصنف ATC J01CR02). معادله في الجزائر هو كل تقديم يحتوي على الاثنتين بنفس الجرعات ونفس الشكل. قائمة التقديمات المسجّلة تُقرأ مباشرة من المدونة، فخ النسبة بين المادتين عند الطفل، الفرق مع الأموكسيسيلين وحده، والتداخلات حسب ANSM.',
    seoTitle: 'معادل Augmentin في الجزائر: أموكسيسيلين + حمض الكلافولانيك، الأدوية الجنيسة المسجّلة',
    seoKeywords: ['معادل Augmentin في الجزائر', 'أوغمنتين الجزائر', 'أموكسيسيلين حمض الكلافولانيك', 'دواء جنيس أوغمنتين', 'مضاد حيوي الجزائر', 'équivalent Augmentin Algérie'],
    date: '2026-11-21',
    readingTime: 6,
    tags: ['المعادلات', 'مضاد حيوي', 'أموكسيسيلين', 'دواء جنيس', 'طب الأطفال', 'التداخلات'],
    faq: [
      {
        question: 'ما هو معادل Augmentin في الجزائر؟',
        answer: 'كل تقديم مسجّل يحتوي على الأموكسيسيلين وحمض الكلافولانيك، بنفس الجرعات ونفس الشكل الموجود في العلبة الأصلية. القائمة المحدّثة موجودة في هذا المقال وفي بحث DwaDZ (الصنف ATC J01CR02).',
      },
      {
        question: 'هل يمكن أن يعوّض الأموكسيسيلين وحده Augmentin؟',
        answer: 'لا. حمض الكلافولانيك يحمي الأموكسيسيلين من الإنزيمات (بيتا-لاكتاماز) التي تنتجها بعض البكتيريا. بدونه قد يكون المضاد الحيوي غير فعّال على العدوى التي وُصفت لها التركيبة. اختيار مضاد حيوي آخر يعود للطبيب.',
      },
      {
        question: 'بالنسبة لطفل، هل يمكنني أخذ شراب آخر من الأموكسيسيلين + حمض الكلافولانيك؟',
        answer: 'فقط مع الصيدلي. المعلّقات الفموية ليس لها كلها نفس التركيز ولا نفس النسبة بين المادتين. الجرعة تُحسب على الأموكسيسيلين حسب الوزن: تغيير المعلّق يستوجب إعادة حساب الحجم الذي يُعطى.',
      },
      {
        question: 'هل يلزم وصفة طبية؟',
        answer: 'نعم. إنه مضاد حيوي يُصرف بوصفة. لا يؤثر على الفيروسات: لا يعالج الزكام ولا الأنفلونزا ولا أغلب التهابات الحلق عند الطفل، لأنها فيروسية.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Augmentin من أكثر المضادات الحيوية وصفًا في العالم، ومن أكثر العلامات التي يُبحث عنها في الجزائر. معادله موجود هنا، لكن هناك تفصيلًا يفوت أغلب الناس: Augmentin ليس فيه مادة واحدة، بل **مادتان**. وهنا بالضبط تختبئ الأخطاء.',
      },
      { type: 'h2', title: 'ماذا يحتوي Augmentin' },
      {
        type: 'list',
        items: [
          '**الأموكسيسيلين**: المضاد الحيوي، من عائلة البنسلينات.',
          '**حمض الكلافولانيك**: ليس له تقريبًا مفعول مضاد حيوي وحده، بل يوقف الإنزيمات (بيتا-لاكتاماز) التي تصنعها بعض البكتيريا لتدمير الأموكسيسيلين.',
          '**الصنف ATC J01CR02**: «أموكسيسيلين ومثبّط بيتا-لاكتاماز». هذا الرمز هو الذي يجمع كل المعادلات.',
        ],
      },
      { type: 'h2', title: 'الرقمان اللذان يجب التحقق منهما على العلبة' },
      {
        type: 'paragraph',
        text: 'تُكتب جرعة Augmentin برقمين: جرعة الأموكسيسيلين ثم جرعة حمض الكلافولانيك، مثلًا **1 غ / 125 ملغ** أو **500 ملغ / 62,5 ملغ** للأقراص الخاصة بالبالغين. حسب البلدان والمخابر تختلف النسبة بين الاثنين (8 إلى 1، 7 إلى 1، 4 إلى 1). لإيجاد المعادل الصحيح يجب أن يتطابق **الرقمان** معًا، وكذلك الشكل: قرص، كيس، أو مسحوق لمعلّق فموي.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'عند الطفل، انتبه للأشربة. مساحيق المعلّق الفموي ليس لها كلها نفس التركيز: بعضها يُعبَّر عنه لكل ملل، وبعضها لكل 5 ملل. الجرعة تُحسب على الأموكسيسيلين حسب الوزن. الانتقال من معلّق لآخر دون إعادة حساب الحجم يعرّض لجرعة ناقصة أو زائدة، وتغيير النسبة يغيّر كمية حمض الكلافولانيك، المسؤول عن أغلب حالات الإسهال. الصيدلي يعيد الحساب.',
      },
      { type: 'h2', title: 'التقديمات المسجّلة في الجزائر' },
      {
        type: 'paragraph',
        text: 'هذه هي تقديمات المدونة المرتبطة بالصنف J01CR02. تُقرأ القائمة مباشرة، فهي تتبع الإضافات والسحب. كل سطر يفتح البطاقة، مع الوضعية والسعر (PPA) عندما يكون معروفًا والتداخلات.',
      },
      { type: 'equivalents', atc: ['J01CR02'] },
      { type: 'h2', title: 'الخطأ الشائع: أخذ الأموكسيسيلين وحده' },
      {
        type: 'paragraph',
        text: 'علب الأموكسيسيلين وحده (Clamoxyl في فرنسا، الصنف J01CA04) أكثر عددًا وغالبًا أرخص. لكنها **ليست** معادلًا لـ Augmentin. بدون حمض الكلافولانيك، تدمّر البكتيريا المنتجة للبيتا-لاكتاماز الأموكسيسيلين؛ وغالبًا ما تُختار التركيبة لهذه العدوى بالذات (بعض التهابات الأذن، الجيوب، الأسنان أو العضّات). الانتقال من واحد للآخر قرار طبي.',
      },
      { type: 'h2', title: 'قبل تناوله' },
      {
        type: 'list',
        items: [
          '**الحساسية للبنسلينات**: هي موانع الاستعمال الرئيسية، ويجب أيضًا الإبلاغ عن أي حساسية للسيفالوسبورينات. مرشح [«حساسية معروفة»](/articles/allergie-connue-medicaments-algerie-mode-emploi-ar) في البحث يميّز الأدوية المعنية.',
          '**سوابق إصابة الكبد** (اليرقان) خلال علاج سابق بهذه التركيبة: يجب إخبار الطبيب.',
          '**في بداية الوجبة**: هو الوقت الموصى به لتحمّل أفضل.',
          '**حتى النهاية**: المدة الموصوفة كاملة، حتى لو تحسّنت قبلها.',
        ],
      },
      { type: 'h2', title: 'التداخلات التي يجب معرفتها (Thesaurus ANSM)' },
      {
        type: 'table',
        headers: ['مع', 'المستوى', 'الخطر'],
        rows: [
          { cells: ['الميثوتريكسات', 'تركيب غير مستحسن', 'زيادة مفعول الميثوتريكسات وسمّيته الدموية (البنسلينات تُنقص طرحه عبر الكلية).'] },
          { cells: ['الألوبيورينول', 'يؤخذ بعين الاعتبار', 'خطر متزايد للتفاعلات الجلدية.'] },
          { cells: ['ميكوفينولات موفيتيل', 'يؤخذ بعين الاعتبار', 'انخفاض تراكيز حمض الميكوفينوليك بنحو الثلث، مع خطر نقص الفعالية.'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'المصدر: Thesaurus التداخلات الدوائية لـ ANSM، سبتمبر 2023، فقرتا «البنسلينات» و«البنسلينات A»، الصفحة 192. تبويب التداخلات في كل بطاقة يعطي القائمة الكاملة.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'المضاد الحيوي لا يعالج الفيروس. الزكام والأنفلونزا وأغلب التهابات الحلق عند الطفل فيروسية: الأموكسيسيلين، مع حمض الكلافولانيك أو بدونه، لا يغيّر فيها شيئًا، وكل جرعة غير ضرورية تغذّي مقاومة البكتيريا.',
      },
      {
        type: 'paragraph',
        text: 'هذا المقال جزء من سلسلة [«ما هو المعادل الجزائري لـ…؟»](/articles/' + SLUG_PILIER + '-ar)، التي تشرح الطريقة لأي دواء.',
      },
    ],
  },

  // ─── Épisode 2 : Levothyrox, FR ────────────────────────────────────────────
  {
    slug: SERIE_EQUIVALENTS[1].slug,
    lang: 'fr',
    audience: 'professionnel',
    title: 'L’équivalent algérien de Levothyrox : la lévothyroxine, et pourquoi on ne change pas de marque sans contrôle',
    subtitle: 'Les dosages en microgrammes, les présentations enregistrées en Algérie, la TSH après un changement, et les médicaments à prendre à distance',
    description:
      'Levothyrox contient de la lévothyroxine sodique (classe ATC H03AA01). Son équivalent en Algérie est une présentation de lévothyroxine au même dosage en microgrammes. Mais c’est un médicament à marge thérapeutique étroite : un changement de marque se fait avec le médecin et un contrôle de la TSH. Liste des présentations enregistrées, règles de prise, interactions selon l’ANSM.',
    seoTitle: 'Équivalent Levothyrox en Algérie : lévothyroxine, marques enregistrées et changement de marque',
    seoKeywords: ['équivalent Levothyrox Algérie', 'Levothyrox Algérie', 'lévothyroxine Algérie', 'changer de marque lévothyroxine', 'hypothyroïdie traitement Algérie', 'TSH changement de marque', 'H03AA01'],
    date: '2026-11-21',
    readingTime: 6,
    tags: ['Équivalents', 'Thyroïde', 'Lévothyroxine', 'Marge thérapeutique étroite', 'Interactions'],
    faq: [
      {
        question: 'Quel est l’équivalent de Levothyrox en Algérie ?',
        answer: 'Une présentation de lévothyroxine sodique au même dosage en microgrammes (µg). La liste des présentations enregistrées est dans cet article et dans la recherche DwaDZ (classe ATC H03AA01). Le passage d’une marque à une autre se fait avec l’accord du médecin.',
      },
      {
        question: 'Pourquoi faut-il un contrôle quand on change de marque de lévothyroxine ?',
        answer: 'Parce que la lévothyroxine a une marge thérapeutique étroite : une petite différence dans la quantité absorbée suffit à déséquilibrer la thyroïde. Après un changement de marque, un dosage de la TSH est généralement recommandé six à huit semaines plus tard, surtout pour les personnes fragiles (cancer de la thyroïde, maladie cardiaque, grossesse, personne âgée).',
      },
      {
        question: 'Comment prendre la lévothyroxine ?',
        answer: 'Une fois par jour, le matin à jeun, au moins une demi-heure avant le petit-déjeuner, avec un peu d’eau, et toujours de la même façon. Le fer, le calcium et certains médicaments de l’estomac se prennent à distance (plus de 2 heures).',
      },
      {
        question: 'Et pendant le Ramadan ?',
        answer: 'L’horaire de prise doit être revu pendant le jeûne, car les repas changent d’heure. Le moment le plus adapté se décide avec le médecin, qui pourra vérifier la TSH après le mois de Ramadan.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Levothyrox est la marque de lévothyroxine la plus connue en France, et beaucoup de personnes traitées pour une hypothyroïdie la cherchent en Algérie. L’équivalent existe, mais la lévothyroxine n’est pas un médicament comme les autres : ici, « même DCI, même dosage » ne veut pas dire « je change quand je veux ». Voici pourquoi, et comment faire.',
      },
      { type: 'h2', title: 'Ce que contient Levothyrox' },
      {
        type: 'list',
        items: [
          '**Lévothyroxine sodique** : la forme de synthèse de l’hormone T4 produite par la thyroïde.',
          '**Classe ATC H03AA01** : hormones thyroïdiennes. C’est ce code qui regroupe toutes les marques.',
          '**Dosage en microgrammes (µg)** : 25, 50, 75, 100 µg et plus. Un microgramme est un millième de milligramme : les écarts entre dosages sont petits, et c’est voulu.',
        ],
      },
      { type: 'h2', title: 'Les présentations enregistrées en Algérie' },
      {
        type: 'paragraph',
        text: 'Voici les présentations de la nomenclature rattachées à la classe H03AA01, lues en direct. Comparez le dosage en microgrammes avec celui de votre boîte ; chaque ligne ouvre la fiche, avec le prix (PPA) quand il est connu.',
      },
      { type: 'equivalents', atc: ['H03AA01'], dci: 'LEVOTHYROXINE' },
      { type: 'h2', title: 'Pourquoi on ne change pas de marque sans contrôle' },
      {
        type: 'paragraph',
        text: 'La lévothyroxine est un médicament à **marge thérapeutique étroite** : la dose efficace et la dose excessive sont proches. Deux marques au même dosage contiennent la même quantité de substance, mais une petite différence d’absorption, liée par exemple aux excipients, peut suffire à déplacer la TSH. C’est ce qu’ont montré les difficultés rencontrées en France lors du changement de formule de Levothyrox en 2017.',
      },
      {
        type: 'list',
        items: [
          '**Gardez la même marque** autant que possible.',
          '**Si vous devez changer** (voyage, rupture de stock), prévenez votre médecin.',
          '**Faites contrôler la TSH** : un dosage est généralement recommandé six à huit semaines après le changement, surtout en cas de cancer de la thyroïde, de maladie cardiaque, de grossesse ou chez la personne âgée.',
          '**Signalez les symptômes** : fatigue, frilosité, prise de poids (dose trop faible) ; palpitations, nervosité, insomnie, perte de poids (dose trop forte).',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Grossesse : les besoins en lévothyroxine augmentent souvent dès le début. Une femme traitée qui découvre une grossesse doit prévenir son médecin rapidement, sans arrêter ni modifier son traitement d’elle-même.',
      },
      { type: 'h2', title: 'Bien la prendre' },
      {
        type: 'paragraph',
        text: 'Une prise par jour, **le matin à jeun**, au moins une demi-heure avant le petit-déjeuner, avec un peu d’eau. Le plus important est la régularité : même heure, même façon, tous les jours. Pendant le Ramadan, l’horaire est à revoir avec le médecin.',
      },
      { type: 'h2', title: 'Les médicaments à prendre à distance (Thesaurus ANSM)' },
      {
        type: 'table',
        headers: ['Avec', 'Niveau', 'Conduite à tenir'],
        rows: [
          { cells: ['Fer', 'Précaution d’emploi', 'Prendre les hormones thyroïdiennes à distance du fer (plus de 2 heures, si possible).'] },
          { cells: ['Calcium', 'Précaution d’emploi', 'Prendre les sels de calcium à distance des hormones thyroïdiennes (plus de 2 heures, si possible).'] },
          { cells: ['Résines chélatrices, sucralfate', 'Précaution d’emploi', 'Prendre les hormones thyroïdiennes à distance (plus de 2 heures, si possible).'] },
          { cells: ['Inhibiteurs de la pompe à protons (oméprazole, ésoméprazole…)', 'Précaution d’emploi', 'Contrôle clinique et biologique régulier, avec augmentation éventuelle de la posologie des hormones thyroïdiennes.'] },
          { cells: ['Inducteurs enzymatiques (carbamazépine, phénytoïne, rifampicine…)', 'Précaution d’emploi', 'Surveillance clinique et biologique, adaptation si besoin de la posologie pendant le traitement et après son arrêt.'] },
          { cells: ['Estrogènes non contraceptifs', 'Précaution d’emploi', 'Surveillance clinique et biologique ; adaptation éventuelle des doses chez les femmes ménopausées.'] },
          { cells: ['Millepertuis', 'Association déconseillée', 'Risque de baisse de l’efficacité des hormones thyroïdiennes.'] },
          { cells: ['Orlistat', 'À prendre en compte', 'Risque de déséquilibre du traitement thyroïdien substitutif.'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Source : Thesaurus des interactions médicamenteuses de l’ANSM, septembre 2023, rubrique « hormones thyroïdiennes », pages 113 et 114. L’onglet Interactions de chaque fiche donne la liste complète.',
      },
      {
        type: 'paragraph',
        text: 'Cet article fait partie de la série [« Quel est l’équivalent algérien de… ? »](/articles/' + SLUG_PILIER + '), qui donne la méthode pour n’importe quel médicament.',
      },
    ],
  },

  // ─── Épisode 2 : Levothyrox, AR ────────────────────────────────────────────
  {
    slug: `${SERIE_EQUIVALENTS[1].slug}-ar`,
    lang: 'ar',
    audience: 'professionnel',
    title: 'المعادل الجزائري لـ Levothyrox: الليفوثيروكسين، ولماذا لا نغيّر العلامة دون مراقبة',
    subtitle: 'الجرعات بالميكروغرام، التقديمات المسجّلة في الجزائر، تحليل TSH بعد التغيير، والأدوية التي تؤخذ بفارق زمني',
    description:
      'يحتوي Levothyrox على ليفوثيروكسين الصوديوم (الصنف ATC H03AA01). معادله في الجزائر تقديم من الليفوثيروكسين بنفس الجرعة بالميكروغرام. لكنه دواء ذو هامش علاجي ضيق: تغيير العلامة يتم مع الطبيب ومع تحليل TSH. قائمة التقديمات المسجّلة، قواعد التناول، والتداخلات حسب ANSM.',
    seoTitle: 'معادل Levothyrox في الجزائر: الليفوثيروكسين، العلامات المسجّلة وتغيير العلامة',
    seoKeywords: ['معادل Levothyrox في الجزائر', 'ليفوثيروكس الجزائر', 'ليفوثيروكسين الجزائر', 'قصور الغدة الدرقية علاج', 'تحليل TSH', 'équivalent Levothyrox Algérie'],
    date: '2026-11-21',
    readingTime: 6,
    tags: ['المعادلات', 'الغدة الدرقية', 'ليفوثيروكسين', 'هامش علاجي ضيق', 'التداخلات'],
    faq: [
      {
        question: 'ما هو معادل Levothyrox في الجزائر؟',
        answer: 'تقديم من ليفوثيروكسين الصوديوم بنفس الجرعة بالميكروغرام (µg). قائمة التقديمات المسجّلة موجودة في هذا المقال وفي بحث DwaDZ (الصنف ATC H03AA01). الانتقال من علامة لأخرى يتم بموافقة الطبيب.',
      },
      {
        question: 'لماذا تلزم مراقبة عند تغيير علامة الليفوثيروكسين؟',
        answer: 'لأن الليفوثيروكسين ذو هامش علاجي ضيق: فرق صغير في الكمية الممتصة يكفي لاختلال الغدة الدرقية. بعد تغيير العلامة يوصى عادة بتحليل TSH بعد ستة إلى ثمانية أسابيع، خاصة للأشخاص الأكثر هشاشة (سرطان الغدة، مرض القلب، الحمل، كبار السن).',
      },
      {
        question: 'كيف يؤخذ الليفوثيروكسين؟',
        answer: 'مرة في اليوم، صباحًا على الريق، قبل الفطور بنصف ساعة على الأقل، مع قليل من الماء، ودائمًا بنفس الطريقة. الحديد والكالسيوم وبعض أدوية المعدة تؤخذ بفارق زمني (أكثر من ساعتين).',
      },
      {
        question: 'وفي رمضان؟',
        answer: 'يجب مراجعة توقيت التناول خلال الصيام لأن مواعيد الوجبات تتغير. التوقيت الأنسب يحدده الطبيب، الذي يمكنه مراقبة TSH بعد شهر رمضان.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Levothyrox هي أشهر علامة ليفوثيروكسين في فرنسا، وكثير من المعالَجين من قصور الغدة الدرقية يبحثون عنها في الجزائر. المعادل موجود، لكن الليفوثيروكسين ليس دواءً كغيره: هنا «نفس المادة ونفس الجرعة» لا تعني «أغيّر متى أشاء». إليك السبب، وكيف تتصرف.',
      },
      { type: 'h2', title: 'ماذا يحتوي Levothyrox' },
      {
        type: 'list',
        items: [
          '**ليفوثيروكسين الصوديوم**: الشكل المصنّع لهرمون T4 الذي تنتجه الغدة الدرقية.',
          '**الصنف ATC H03AA01**: الهرمونات الدرقية. هذا الرمز هو الذي يجمع كل العلامات.',
          '**الجرعة بالميكروغرام (µg)**: 25، 50، 75، 100 ميكروغرام وأكثر. الميكروغرام جزء من ألف من الملّيغرام: الفروق بين الجرعات صغيرة، وهذا مقصود.',
        ],
      },
      { type: 'h2', title: 'التقديمات المسجّلة في الجزائر' },
      {
        type: 'paragraph',
        text: 'هذه هي تقديمات المدونة المرتبطة بالصنف H03AA01، تُقرأ مباشرة. قارن الجرعة بالميكروغرام مع جرعة علبتك؛ كل سطر يفتح البطاقة، مع السعر (PPA) عندما يكون معروفًا.',
      },
      { type: 'equivalents', atc: ['H03AA01'], dci: 'LEVOTHYROXINE' },
      { type: 'h2', title: 'لماذا لا نغيّر العلامة دون مراقبة' },
      {
        type: 'paragraph',
        text: 'الليفوثيروكسين دواء ذو **هامش علاجي ضيق**: الجرعة الفعالة والجرعة الزائدة متقاربتان. علامتان بنفس الجرعة تحتويان على نفس كمية المادة، لكن فرقًا صغيرًا في الامتصاص، مرتبطًا مثلًا بالسواغات، قد يكفي لتحريك TSH. وهذا ما بيّنته الصعوبات التي ظهرت في فرنسا عند تغيير تركيبة Levothyrox سنة 2017.',
      },
      {
        type: 'list',
        items: [
          '**احتفظ بنفس العلامة** قدر الإمكان.',
          '**إذا اضطررت للتغيير** (سفر، انقطاع)، أخبر طبيبك.',
          '**راقب TSH**: يوصى عادة بتحليل بعد ستة إلى ثمانية أسابيع من التغيير، خاصة في حالة سرطان الغدة، مرض القلب، الحمل، أو عند كبار السن.',
          '**أبلغ عن الأعراض**: تعب، الإحساس بالبرد، زيادة الوزن (جرعة ناقصة)؛ خفقان، عصبية، أرق، فقدان الوزن (جرعة زائدة).',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'الحمل: الحاجة إلى الليفوثيروكسين ترتفع غالبًا منذ البداية. المرأة المعالَجة التي تكتشف حملًا يجب أن تُخبر طبيبها بسرعة، دون أن توقف علاجها أو تغيّره من تلقاء نفسها.',
      },
      { type: 'h2', title: 'كيف يؤخذ بشكل صحيح' },
      {
        type: 'paragraph',
        text: 'جرعة واحدة في اليوم، **صباحًا على الريق**، قبل الفطور بنصف ساعة على الأقل، مع قليل من الماء. الأهم هو الانتظام: نفس الساعة ونفس الطريقة كل يوم. في رمضان، يُراجَع التوقيت مع الطبيب.',
      },
      { type: 'h2', title: 'الأدوية التي تؤخذ بفارق زمني (Thesaurus ANSM)' },
      {
        type: 'table',
        headers: ['مع', 'المستوى', 'ما يجب فعله'],
        rows: [
          { cells: ['الحديد', 'احتياط استعمال', 'تناول الهرمونات الدرقية بعيدًا عن الحديد (أكثر من ساعتين إن أمكن).'] },
          { cells: ['الكالسيوم', 'احتياط استعمال', 'تناول أملاح الكالسيوم بعيدًا عن الهرمونات الدرقية (أكثر من ساعتين إن أمكن).'] },
          { cells: ['الراتنجات المخلِّبة، السوكرالفات', 'احتياط استعمال', 'تناول الهرمونات الدرقية بفارق زمني (أكثر من ساعتين إن أمكن).'] },
          { cells: ['مثبطات مضخة البروتون (أوميبرازول، إيزوميبرازول…)', 'احتياط استعمال', 'مراقبة سريرية وبيولوجية منتظمة، مع زيادة محتملة لجرعة الهرمونات الدرقية.'] },
          { cells: ['المحرّضات الإنزيمية (كاربامازيبين، فينيتوين، ريفامبيسين…)', 'احتياط استعمال', 'مراقبة سريرية وبيولوجية، وتعديل الجرعة عند الحاجة خلال العلاج وبعد إيقافه.'] },
          { cells: ['الإستروجينات غير المانعة للحمل', 'احتياط استعمال', 'مراقبة سريرية وبيولوجية؛ تعديل محتمل للجرعات عند النساء في سن اليأس.'] },
          { cells: ['نبتة سانت جون (Millepertuis)', 'تركيب غير مستحسن', 'خطر انخفاض فعالية الهرمونات الدرقية.'] },
          { cells: ['الأورليستات', 'يؤخذ بعين الاعتبار', 'خطر اختلال العلاج الدرقي التعويضي.'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'المصدر: Thesaurus التداخلات الدوائية لـ ANSM، سبتمبر 2023، فقرة «الهرمونات الدرقية»، الصفحتان 113 و114. تبويب التداخلات في كل بطاقة يعطي القائمة الكاملة.',
      },
      {
        type: 'paragraph',
        text: 'هذا المقال جزء من سلسلة [«ما هو المعادل الجزائري لـ…؟»](/articles/' + SLUG_PILIER + '-ar)، التي تشرح الطريقة لأي دواء.',
      },
    ],
  },
]
