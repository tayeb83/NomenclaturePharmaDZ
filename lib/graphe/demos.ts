/**
 * DwaDZ — catalogue des cas d'usage et de leurs démos.
 *
 * Pour ajouter une démo : ajouter une entrée dans `demos` du cas d'usage voulu (id unique dans tout le
 * catalogue). Pour ajouter un cas d'usage : ajouter un objet à CAS_USAGE. Rien d'autre à toucher : la page
 * /graphe, la page de la démo et le sitemap lisent ce fichier.
 *
 * Une démo fige ses paramètres (la substance, la classe ATC, les couches affichées) : elle est ouverte à
 * tous, plafonnée à PLAFOND_DEMO nœuds par type. L'explorateur payant prend les mêmes vues avec des
 * paramètres libres.
 */
import type { Couche } from './core.ts'

/**
 * Ce qu'une démo (ou une requête de l'explorateur) demande. Le laboratoire est un filtre facultatif :
 * « substance + laboratoire » ne garde que ce que ce laboratoire enregistre pour cette substance.
 */
export type Vue =
  | { vue: 'substance'; substance: string; couches: Couche[]; labo?: string }
  | { vue: 'classe'; atc: string; mode: 'importation' | 'concentration'; labo?: string }
  | { vue: 'laboratoire'; labo: string; couches: Couche[] }

export type Demo = {
  id: string
  titre: { fr: string; ar: string }
  /** la question à laquelle la démo répond, en une phrase */
  question: { fr: string; ar: string }
  /** ce qu'il faut regarder sur le graphe */
  lecture: { fr: string; ar: string }
  params: Vue
}

export type CasUsage = {
  id: string
  icone: string
  titre: { fr: string; ar: string }
  resume: { fr: string; ar: string }
  demos: Demo[]
}

export const CAS_USAGE: CasUsage[] = [
  {
    id: 'interactions',
    icone: '⚠️',
    titre: { fr: 'Risque d\'interaction autour d\'une substance', ar: 'خطر التداخل حول مادة فعالة' },
    resume: {
      fr: 'Quelles substances et quelles classes interagissent avec celle-ci, et avec quelle gravité (Thesaurus ANSM) ?',
      ar: 'ما المواد والأصناف التي تتداخل مع هذه المادة، وبأي درجة خطورة (دليل ANSM)؟',
    },
    demos: [
      {
        id: 'interactions-simvastatine',
        titre: { fr: 'Simvastatine', ar: 'سيمفاستاتين' },
        question: { fr: 'Quels médicaments faut-il éviter avec une statine ?', ar: 'ما الأدوية التي يجب تجنبها مع الستاتين؟' },
        lecture: { fr: 'Les traits pleins rouges sont des contre-indications ; les pointillés, des précautions d\'emploi.', ar: 'الخطوط الحمراء المتصلة تعني موانع استعمال، والمتقطعة احتياطات.' },
        params: { vue: 'substance', substance: 'SIMVASTATINE', couches: ['atc', 'interactions'] },
      },
      {
        id: 'interactions-amiodarone',
        titre: { fr: 'Amiodarone', ar: 'أميودارون' },
        question: { fr: 'Pourquoi l\'amiodarone est-elle l\'une des substances les plus « connectées » ?', ar: 'لماذا يعد الأميودارون من أكثر المواد ارتباطًا بالتداخلات؟' },
        lecture: { fr: 'Beaucoup de partenaires, souvent par classe : la conduite à tenir est dans la fiche du médicament.', ar: 'شركاء كثيرون، غالبًا عبر الأصناف: السلوك الواجب في بطاقة الدواء.' },
        params: { vue: 'substance', substance: 'AMIODARONE', couches: ['atc', 'interactions'] },
      },
      {
        id: 'interactions-warfarine',
        titre: { fr: 'Warfarine', ar: 'وارفارين' },
        question: { fr: 'Quelles associations surveiller chez un patient sous antivitamine K ?', ar: 'ما الأدوية المشتركة التي يجب مراقبتها عند مريض يتناول مضاد فيتامين ك؟' },
        lecture: { fr: 'Une même substance peut apparaître à plusieurs gravités selon la situation.', ar: 'قد تظهر المادة نفسها بدرجات خطورة مختلفة حسب الحالة.' },
        params: { vue: 'substance', substance: 'WARFARINE', couches: ['atc', 'interactions'] },
      },
    ],
  },
  {
    id: 'importation',
    icone: '🌍',
    titre: { fr: 'Dépendance à l\'importation d\'une classe', ar: 'الاعتماد على الاستيراد في صنف علاجي' },
    resume: {
      fr: 'Dans une classe thérapeutique, quelles substances sont produites en Algérie et lesquelles viennent d\'un seul pays ?',
      ar: 'في صنف علاجي، ما المواد المنتجة في الجزائر وما التي تأتي من بلد واحد؟',
    },
    demos: [
      {
        id: 'importation-statines',
        titre: { fr: 'Hypolipémiants (C10A)', ar: 'خافضات الدهون (C10A)' },
        question: { fr: 'Les statines sont-elles produites localement ?', ar: 'هل تُنتج الستاتينات محليًا؟' },
        lecture: { fr: 'Les substances vertes ont au moins un enregistrement fabriqué en Algérie (statut « F ») ; les autres sont importées uniquement.', ar: 'المواد الخضراء لها تسجيل واحد على الأقل مصنّع في الجزائر (الحالة «F»)؛ وغيرها مستوردة فقط.' },
        params: { vue: 'classe', atc: 'C10A', mode: 'importation' },
      },
      {
        id: 'importation-antibiotiques',
        titre: { fr: 'Pénicillines (J01C)', ar: 'البنسلينات (J01C)' },
        question: { fr: 'Quels pays fournissent les pénicillines ?', ar: 'ما البلدان التي تزودنا بالبنسلينات؟' },
        lecture: { fr: 'Une substance reliée à un seul pays est fragile en cas de rupture chez ce fournisseur.', ar: 'المادة المرتبطة ببلد واحد هشة عند انقطاعها لدى ذلك المورد.' },
        params: { vue: 'classe', atc: 'J01C', mode: 'importation' },
      },
      {
        id: 'importation-antidiabetiques',
        titre: { fr: 'Antidiabétiques (A10B)', ar: 'مضادات السكري (A10B)' },
        question: { fr: 'Le traitement du diabète repose-t-il sur l\'importation ?', ar: 'هل يعتمد علاج السكري على الاستيراد؟' },
        lecture: { fr: 'Comparez la taille des nœuds : plus il y a d\'enregistrements, plus la substance est répandue.', ar: 'قارن أحجام العقد: كلما زاد عدد التسجيلات كانت المادة أكثر انتشارًا.' },
        params: { vue: 'classe', atc: 'A10B', mode: 'importation' },
      },
    ],
  },
  {
    id: 'concentration',
    icone: '🏭',
    titre: { fr: 'Qui domine le marché d\'une classe ?', ar: 'من يهيمن على سوق صنف علاجي؟' },
    resume: {
      fr: 'Répartition des spécialités d\'une classe entre laboratoires, avec l\'indice de concentration HHI.',
      ar: 'توزيع مستحضرات صنف علاجي بين المخابر، مع مؤشر التركز HHI.',
    },
    demos: [
      {
        id: 'concentration-ains',
        titre: { fr: 'Anti-inflammatoires (M01A)', ar: 'مضادات الالتهاب (M01A)' },
        question: { fr: 'Le marché des AINS est-il concentré ?', ar: 'هل سوق مضادات الالتهاب اللاستيرويدية متركز؟' },
        lecture: { fr: 'La taille d\'un nœud et son pourcentage donnent la part du laboratoire dans la classe ; l\'anneau doré marque la plus grande part.', ar: 'حجم العقدة ونسبتها يبينان حصة المخبر في الصنف؛ والحلقة الذهبية تدل على أكبر حصة.' },
        params: { vue: 'classe', atc: 'M01A', mode: 'concentration' },
      },
      {
        id: 'concentration-ipp',
        titre: { fr: 'Inhibiteurs de la pompe à protons (A02B)', ar: 'مثبطات مضخة البروتون (A02B)' },
        question: { fr: 'Combien de laboratoires se partagent les IPP ?', ar: 'كم مخبرًا يتقاسم سوق مثبطات مضخة البروتون؟' },
        lecture: { fr: 'L\'indice HHI (0 à 10 000) résume la concentration : en dessous de 1 500 le marché est peu concentré, au-dessus de 2 500 très concentré.', ar: 'يلخص مؤشر HHI (من 0 إلى 10 000) التركز: فوق 2 500 يكون السوق شديد التركز.' },
        params: { vue: 'classe', atc: 'A02B', mode: 'concentration' },
      },
    ],
  },
  {
    id: 'laboratoires',
    icone: '🏷️',
    titre: { fr: 'Qui commercialise quoi ?', ar: 'من يسوّق ماذا؟' },
    resume: {
      fr: 'Les médicaments (marques) d\'une substance, ceux d\'un laboratoire, et leur croisement : substance + laboratoire.',
      ar: 'أدوية (علامات) مادة فعالة، وأدوية مخبر، وتقاطعهما: مادة + مخبر.',
    },
    demos: [
      {
        id: 'laboratoire-saidal',
        titre: { fr: 'Un laboratoire : Saidal', ar: 'مخبر: صيدال' },
        question: { fr: 'Quelles substances et quels médicaments un laboratoire enregistre-t-il ?', ar: 'ما المواد والأدوية التي يسجلها مخبر؟' },
        lecture: { fr: 'Le laboratoire est au centre ; ses substances en dessous, avec leur classe ATC et leurs marques ; ses pays d\'origine et ses retraits autour.', ar: 'المخبر في الوسط؛ وتحته مواده مع صنفها ATC وعلاماتها؛ وحوله بلدان المنشأ وعمليات السحب.' },
        params: { vue: 'laboratoire', labo: 'SAIDAL', couches: ['atc', 'medicaments', 'pays', 'retraits'] },
      },
      {
        id: 'medicaments-metformine',
        titre: { fr: 'Les marques de la metformine', ar: 'علامات الميتفورمين' },
        question: { fr: 'Quels médicaments contiennent cette substance, et chez quels laboratoires ?', ar: 'ما الأدوية التي تحتوي هذه المادة، ولدى أي مخابر؟' },
        lecture: { fr: 'Chaque marque est reliée à la substance ; la taille suit son nombre de présentations et son détail donne ses laboratoires.', ar: 'كل علامة مرتبطة بالمادة؛ وحجمها يتبع عدد أشكالها وتفصيلها يعطي مخابرها.' },
        params: { vue: 'substance', substance: 'METFORMINE', couches: ['atc', 'labos', 'medicaments'] },
      },
      {
        id: 'substance-laboratoire-paracetamol',
        titre: { fr: 'Paracétamol chez Saidal', ar: 'باراسيتامول عند صيدال' },
        question: { fr: 'Que fait ce laboratoire pour cette substance ?', ar: 'ماذا يقدّم هذا المخبر لهذه المادة؟' },
        lecture: { fr: 'Substance + laboratoire : seuls les enregistrements de ce laboratoire pour cette substance sont gardés ; les interactions restent celles de la substance.', ar: 'مادة + مخبر: لا تبقى إلا تسجيلات هذا المخبر لهذه المادة؛ وتبقى التداخلات هي تداخلات المادة.' },
        params: { vue: 'substance', substance: 'PARACETAMOL', labo: 'SAIDAL', couches: ['atc', 'labos', 'medicaments', 'interactions'] },
      },
    ],
  },
  {
    id: 'retraits',
    icone: '🚫',
    titre: { fr: 'Après un retrait : que reste-t-il sur le marché ?', ar: 'بعد السحب: ماذا يبقى في السوق؟' },
    resume: {
      fr: 'Quand une spécialité est retirée, quelles spécialités de la même substance restent enregistrées, chez qui ?',
      ar: 'عند سحب مستحضر، ما المستحضرات المسجلة من المادة نفسها وعند من؟',
    },
    demos: [
      {
        id: 'retraits-valsartan',
        titre: { fr: 'Valsartan', ar: 'فالسارتان' },
        question: { fr: 'Après un retrait de valsartan, quels équivalents restent disponibles ?', ar: 'بعد سحب فالسارتان، ما المكافئات التي تبقى متاحة؟' },
        lecture: { fr: 'Chaque retrait est relié à la substance et à son laboratoire titulaire ; les autres laboratoires montrent qui a encore des enregistrements.', ar: 'كل سحب مرتبط بالمادة وبالمخبر صاحب التسجيل؛ وتبين المخابر الأخرى من لا يزال له تسجيل.' },
        params: { vue: 'substance', substance: 'VALSARTAN', couches: ['atc', 'labos', 'retraits'] },
      },
      {
        id: 'retraits-ranitidine',
        titre: { fr: 'Ranitidine', ar: 'رانيتيدين' },
        question: { fr: 'Que reste-t-il d\'une substance retirée partout ?', ar: 'ماذا يبقى من مادة سُحبت في كل مكان؟' },
        lecture: { fr: 'Les laboratoires reliés à la substance sont ceux qui ont encore un enregistrement ; un laboratoire relié seulement à un retrait n\'en a plus.', ar: 'المخابر المرتبطة بالمادة هي التي لا يزال لها تسجيل؛ والمخبر المرتبط بسحب فقط لم يعد له أي تسجيل.' },
        params: { vue: 'substance', substance: 'RANITIDINE', couches: ['atc', 'labos', 'retraits'] },
      },
    ],
  },
]

export const DEMOS: Demo[] = CAS_USAGE.flatMap(c => c.demos)

export function trouverDemo(id: string): { cas: CasUsage; demo: Demo } | null {
  for (const cas of CAS_USAGE) {
    const demo = cas.demos.find(d => d.id === id)
    if (demo) return { cas, demo }
  }
  return null
}
