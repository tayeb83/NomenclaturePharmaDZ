/**
 * Textes de Dzair-Pharma Training (FR / AR).
 *
 * ⚠️ À VALIDER : toutes les équivalences arabes (objet `AR`) sont des
 * propositions de traduction non relues. Elles doivent être validées par un
 * relecteur arabophone avant mise en production ; `AR_VALIDATED` passe à
 * `true` une fois fait (il pilote la mention « traduction à valider »
 * affichée sur les pages tant qu'elle n'est pas acquise).
 */
export const AR_VALIDATED = false

export const PAGE_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61584995326062'

const FR = {
  brand: 'Dzair-Pharma Training',
  hero: {
    title: 'Banque de QCM et examens blancs',
    subtitleOther: 'بنك أسئلة الاختيار من متعدد وامتحانات تجريبية',
    subtitleLang: 'ar' as 'ar' | 'fr',
    intro:
      "Entraînez-vous aux QCM de pharmacie à partir de la nomenclature nationale des produits pharmaceutiques : noms commerciaux, DCI, génériques, formes et dosages, laboratoires, produits retirés et classes ATC. Pour les étudiants, les enseignants et les pharmaciens en Algérie.",
  },
  included: {
    title: 'Ce qui est inclus',
    items: [
      'Questions générées depuis la nomenclature, puis relues avant publication',
      'Explications détaillées : le contexte et la justification de chaque proposition',
      "Simulation d'examen chronométrée, avec marquage des questions et rayage des propositions",
      '2 examens blancs',
      'Mode tuteur (correction immédiate) et mode examen (correction à la fin)',
    ],
  },
  benefits: {
    title: 'Avantages',
    items: [
      { t: 'Ancré dans la nomenclature', d: "Chaque question repose sur les champs publiés par le MIPH, pas sur des contenus inventés." },
      { t: 'Relié aux fiches', d: "Chaque correction renvoie vers la fiche du médicament dans DwaDZ." },
      { t: 'Sans mot de passe', d: "Un lien de connexion à usage unique vous est envoyé par e-mail." },
      { t: 'Sur téléphone', d: "Les pages s'utilisent confortablement sur mobile, comme le reste de DwaDZ." },
    ],
  },
  types: {
    title: 'Types de questions',
    intro: 'Les questions couvrent les informations de la nomenclature :',
    items: [
      { t: 'DCI à partir du nom commercial', d: 'Retrouver la substance active d’une spécialité.' },
      { t: 'Référence ou générique', d: 'Identifier le produit de référence parmi des génériques.' },
      { t: 'Forme galénique et dosage', d: 'Associer une spécialité à sa présentation.' },
      { t: 'Laboratoire et pays', d: 'Retrouver le titulaire de l’enregistrement.' },
      { t: 'Produits retirés', d: 'Reconnaître un produit retiré et le motif indiqué.' },
      { t: 'Classe ATC', d: 'Situer une DCI dans la classification ATC.' },
    ],
  },
  steps: {
    title: 'Comment ça marche',
    items: [
      { t: 'Demandez votre accès', d: 'Indiquez votre e-mail et votre profil.' },
      { t: "Validation par l'équipe", d: 'Chaque demande est examinée avant ouverture.' },
      { t: 'Connectez-vous par e-mail', d: 'Vous recevez un lien de connexion à usage unique, valable 15 minutes.' },
    ],
  },
  faq: {
    title: 'Questions fréquentes',
    items: [
      { q: "L'accès est-il gratuit ?", a: "Oui : l'accès est gratuit sur inscription." },
      { q: 'Pourquoi une validation manuelle ?', a: "L'accès est réservé aux étudiants, enseignants et pharmaciens. L'équipe examine chaque demande avant d'ouvrir l'accès." },
      { q: 'Les questions sont-elles fiables ?', a: "Elles sont construites à partir des champs de la nomenclature, sans contenu pharmacologique inventé, puis relues avant publication. La nomenclature évolue : en cas de doute, la source de référence reste le MIPH." },
      { q: 'Dois-je suivre la page Facebook ?', a: "La connexion Facebook permet seulement de créer votre demande. La validation reste manuelle dans tous les cas." },
      { q: 'Que deviennent mes données ?', a: "Seuls votre e-mail, votre profil et, si vous le souhaitez, votre faculté sont conservés, pour sauvegarder votre progression et mesurer l'usage. Vous pouvez demander leur suppression." },
      { q: 'Est-ce un site officiel ?', a: "Non. DwaDZ est un service indépendant, construit sur les données publiées par le Ministère de l'Industrie Pharmaceutique." },
    ],
  },
  form: {
    title: 'Accès gratuit sur inscription',
    lead: "Votre demande est examinée par l'équipe, puis un lien de connexion vous est envoyé par e-mail.",
    facebook: 'Continuer avec Facebook',
    facebookSoon: 'Connexion Facebook bientôt disponible',
    or: 'ou par e-mail',
    email: 'Adresse e-mail',
    emailPlaceholder: 'prenom.nom@exemple.dz',
    role: 'Vous êtes',
    roles: { etudiant: 'Étudiant(e)', enseignant: 'Enseignant(e)', pharmacien: 'Pharmacien(ne)' },
    faculte: 'Faculté',
    optional: 'facultatif',
    facultePlaceholder: 'Ex. : Faculté de médecine d’Alger',
    submit: 'Demander mon accès',
    sending: 'Envoi en cours…',
    privacy: "Votre e-mail sert uniquement à vous donner accès et à sauvegarder votre progression. Suppression possible sur demande.",
    privacyLink: 'Politique de confidentialité',
    errors: {
      email: 'Saisissez une adresse e-mail valide.',
      role: 'Choisissez votre profil.',
      rate: 'Trop de tentatives. Réessayez dans un moment.',
      origine: 'Requête refusée. Rechargez la page et réessayez.',
      indisponible: "Le service n'est pas encore disponible. Réessayez plus tard.",
      serveur: "Une erreur est survenue. Réessayez dans un instant.",
      reseau: 'Connexion impossible. Vérifiez votre réseau et réessayez.',
    },
  },
  wait: {
    title: 'Demande envoyée',
    lead: "Merci, votre demande d'accès a bien été reçue.",
    steps: ['Demande reçue', "Validation par l'équipe", "E-mail d'ouverture"],
    stateDone: 'terminé',
    stateCurrent: 'en cours',
    stateTodo: 'à venir',
    body: "Quand votre accès sera ouvert, vous recevrez un e-mail contenant un lien de connexion valable 15 minutes. Pensez à vérifier vos courriers indésirables.",
    facebookTitle: 'En attendant',
    facebookText: 'Suivez la page DwaDZ sur Facebook pour les nouveautés.',
    facebookCta: 'Ouvrir la page Facebook',
    home: 'Retour à l’accueil',
  },
  login: {
    title: 'Se connecter à Training',
    lead: "Saisissez l'adresse e-mail de votre accès validé : un lien de connexion à usage unique vous sera envoyé.",
    send: 'Recevoir un lien',
    sending: 'Envoi en cours…',
    sent: "Si cette adresse correspond à un accès validé, un lien de connexion vient d'être envoyé. Il est valable 15 minutes. Pensez à vérifier vos courriers indésirables.",
    confirmTitle: 'Confirmer la connexion',
    confirmLead: 'Pour des raisons de sécurité, la connexion se fait en un clic.',
    confirm: 'Me connecter',
    invalid: "Ce lien n'est plus valable : il a expiré ou a déjà été utilisé. Demandez-en un nouveau ci-dessous.",
    noAccess: "Pas encore d'accès ?",
    requestAccess: 'Demander mon accès',
    already: 'Accès déjà validé ?',
    toLogin: 'Se connecter',
  },
  facebook: {
    title: 'Finalisez votre demande',
    lead: 'Connecté avec Facebook. Il ne reste qu’à indiquer votre profil : votre demande sera ensuite examinée par l’équipe.',
    emailLabel: 'Adresse e-mail reçue de Facebook',
    submit: 'Envoyer ma demande',
    expired: 'Votre connexion Facebook a expiré. Recommencez depuis la page Training.',
    back: 'Retour à Training',
    errors: { fb: { indisponible: "La connexion Facebook n'est pas disponible pour le moment. Utilisez votre e-mail.", annule: 'Connexion Facebook annulée.', email: "Facebook n'a pas fourni d'adresse e-mail. Utilisez la demande par e-mail.", etat: 'La connexion Facebook a expiré. Réessayez.', erreur: 'La connexion Facebook a échoué. Réessayez ou utilisez votre e-mail.', rate: 'Trop de tentatives. Réessayez plus tard.' } as Record<string, string> },
  },
  space: {
    title: 'Votre espace Training',
    welcome: 'Accès ouvert pour',
    soon: "Les séries de QCM et les examens blancs arrivent prochainement dans cet espace.",
    logout: 'Se déconnecter',
  },
  arPending: 'Traduction arabe en cours de validation.',
}

// À VALIDER (AR_VALIDATED = false) : traduction proposée, non relue.
const AR: typeof FR = {
  brand: 'Dzair-Pharma Training',
  hero: {
    title: 'بنك أسئلة الاختيار من متعدد وامتحانات تجريبية',
    subtitleOther: 'Banque de QCM et examens blancs',
    subtitleLang: 'fr',
    intro:
      'تدرّب على أسئلة الاختيار من متعدد في الصيدلة انطلاقًا من القائمة الوطنية للمنتجات الصيدلانية: الأسماء التجارية، الاسم الدولي غير المسجّل (DCI)، الأدوية الجنيسة، الأشكال والجرعات، المخابر، المنتجات المسحوبة والتصنيف ATC. موجّه لطلبة الصيدلة والأساتذة والصيادلة في الجزائر.',
  },
  included: {
    title: 'ما الذي يتضمنه',
    items: [
      'أسئلة مولَّدة من القائمة الوطنية ثم مراجَعة قبل النشر',
      'شروحات مفصّلة: السياق وتعليل كل اقتراح',
      'محاكاة امتحان بمدة محددة مع إمكانية وسم الأسئلة وشطب الاقتراحات',
      'امتحانان تجريبيان',
      'وضع المرشد (تصحيح فوري) ووضع الامتحان (تصحيح في النهاية)',
    ],
  },
  benefits: {
    title: 'المزايا',
    items: [
      { t: 'مرتبط بالقائمة الوطنية', d: 'كل سؤال مبني على الحقول التي تنشرها وزارة الصناعة الصيدلانية، وليس على محتوى مختلَق.' },
      { t: 'مرتبط بالبطاقات', d: 'كل تصحيح يحيل إلى بطاقة الدواء في DwaDZ.' },
      { t: 'بدون كلمة مرور', d: 'يصلك رابط دخول لاستعمال واحد عبر البريد الإلكتروني.' },
      { t: 'على الهاتف', d: 'الصفحات مريحة الاستعمال على الهاتف، مثل بقية DwaDZ.' },
    ],
  },
  types: {
    title: 'أنواع الأسئلة',
    intro: 'تغطي الأسئلة معلومات القائمة الوطنية:',
    items: [
      { t: 'الاسم الدولي (DCI) انطلاقًا من الاسم التجاري', d: 'إيجاد المادة الفعالة لمستحضر ما.' },
      { t: 'مرجعي أو جنيس', d: 'تحديد المنتج المرجعي بين أدوية جنيسة.' },
      { t: 'الشكل الصيدلاني والجرعة', d: 'ربط المستحضر بتقديمه.' },
      { t: 'المخبر والبلد', d: 'إيجاد صاحب التسجيل.' },
      { t: 'المنتجات المسحوبة', d: 'التعرّف على منتج مسحوب وسبب السحب المذكور.' },
      { t: 'التصنيف ATC', d: 'تحديد موضع المادة الفعالة في تصنيف ATC.' },
    ],
  },
  steps: {
    title: 'كيف يعمل',
    items: [
      { t: 'اطلب الولوج', d: 'أدخل بريدك الإلكتروني وصفتك.' },
      { t: 'مراجعة الفريق', d: 'يُدرس كل طلب قبل فتح الولوج.' },
      { t: 'ادخل عبر البريد الإلكتروني', d: 'يصلك رابط دخول لاستعمال واحد، صالح 15 دقيقة.' },
    ],
  },
  faq: {
    title: 'أسئلة شائعة',
    items: [
      { q: 'هل الولوج مجاني؟', a: 'نعم، الولوج مجاني عند التسجيل.' },
      { q: 'لماذا المراجعة يدوية؟', a: 'الولوج مخصص لطلبة الصيدلة والأساتذة والصيادلة. يدرس الفريق كل طلب قبل فتح الولوج.' },
      { q: 'هل الأسئلة موثوقة؟', a: 'هي مبنية على حقول القائمة الوطنية دون أي محتوى دوائي مختلَق، ثم تُراجع قبل النشر. القائمة تتغير: عند الشك يبقى المرجع هو وزارة الصناعة الصيدلانية.' },
      { q: 'هل يجب أن أتابع صفحة فيسبوك؟', a: 'الدخول عبر فيسبوك يُنشئ طلبك فقط. المراجعة تبقى يدوية في جميع الأحوال.' },
      { q: 'ماذا يحدث لبياناتي؟', a: 'نحتفظ فقط ببريدك الإلكتروني وصفتك وكليتك إن شئت، لحفظ تقدمك وقياس الاستعمال. يمكنك طلب حذفها.' },
      { q: 'هل هذا موقع رسمي؟', a: 'لا. DwaDZ خدمة مستقلة مبنية على البيانات التي تنشرها وزارة الصناعة الصيدلانية.' },
    ],
  },
  form: {
    title: 'ولوج مجاني عند التسجيل',
    lead: 'يدرس الفريق طلبك ثم يُرسل إليك رابط الدخول عبر البريد الإلكتروني.',
    facebook: 'المتابعة عبر فيسبوك',
    facebookSoon: 'الدخول عبر فيسبوك قريبًا',
    or: 'أو عبر البريد الإلكتروني',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'name@example.dz',
    role: 'أنت',
    roles: { etudiant: 'طالب(ة)', enseignant: 'أستاذ(ة)', pharmacien: 'صيدلي(ة)' },
    faculte: 'الكلية',
    optional: 'اختياري',
    facultePlaceholder: 'مثال: كلية الطب بالجزائر',
    submit: 'اطلب الولوج',
    sending: 'جارٍ الإرسال…',
    privacy: 'يُستعمل بريدك الإلكتروني فقط لمنحك الولوج وحفظ تقدمك. يمكن طلب الحذف.',
    privacyLink: 'سياسة الخصوصية',
    errors: {
      email: 'أدخل بريدًا إلكترونيًا صالحًا.',
      role: 'اختر صفتك.',
      rate: 'محاولات كثيرة. أعد المحاولة بعد قليل.',
      origine: 'تم رفض الطلب. أعد تحميل الصفحة وحاول مجددًا.',
      indisponible: 'الخدمة غير متاحة بعد. أعد المحاولة لاحقًا.',
      serveur: 'حدث خطأ. أعد المحاولة بعد قليل.',
      reseau: 'تعذّر الاتصال. تحقق من الشبكة وأعد المحاولة.',
    },
  },
  wait: {
    title: 'تم إرسال الطلب',
    lead: 'شكرًا، تم استلام طلب الولوج.',
    steps: ['استلام الطلب', 'مراجعة الفريق', 'رسالة فتح الولوج'],
    stateDone: 'منجز',
    stateCurrent: 'جارٍ',
    stateTodo: 'لاحقًا',
    body: 'عند فتح ولوجك ستصلك رسالة إلكترونية تتضمن رابط دخول صالحًا لمدة 15 دقيقة. تحقق من مجلد الرسائل غير المرغوب فيها.',
    facebookTitle: 'في الانتظار',
    facebookText: 'تابع صفحة DwaDZ على فيسبوك لمعرفة المستجدات.',
    facebookCta: 'فتح صفحة فيسبوك',
    home: 'العودة إلى الرئيسية',
  },
  login: {
    title: 'تسجيل الدخول إلى Training',
    lead: 'أدخل البريد الإلكتروني لولوجك المعتمد: سيصلك رابط دخول لاستعمال واحد.',
    send: 'استلام رابط',
    sending: 'جارٍ الإرسال…',
    sent: 'إذا كان هذا البريد مرتبطًا بولوج معتمد فقد أُرسل إليه رابط دخول صالح 15 دقيقة. تحقق من مجلد الرسائل غير المرغوب فيها.',
    confirmTitle: 'تأكيد الدخول',
    confirmLead: 'لأسباب أمنية، يتم الدخول بنقرة واحدة.',
    confirm: 'دخول',
    invalid: 'هذا الرابط لم يعد صالحًا: انتهت مدته أو سبق استعماله. اطلب رابطًا جديدًا أدناه.',
    noAccess: 'ليس لديك ولوج بعد؟',
    requestAccess: 'اطلب الولوج',
    already: 'ولوجك معتمد؟',
    toLogin: 'تسجيل الدخول',
  },
  facebook: {
    title: 'أكمل طلبك',
    lead: 'تم الدخول عبر فيسبوك. بقي فقط أن تحدد صفتك: سيدرس الفريق طلبك بعد ذلك.',
    emailLabel: 'البريد الإلكتروني الوارد من فيسبوك',
    submit: 'إرسال طلبي',
    expired: 'انتهت جلسة فيسبوك. ابدأ من جديد من صفحة Training.',
    back: 'العودة إلى Training',
    errors: { fb: { indisponible: 'الدخول عبر فيسبوك غير متاح حاليًا. استعمل بريدك الإلكتروني.', annule: 'تم إلغاء الدخول عبر فيسبوك.', email: 'لم يوفّر فيسبوك بريدًا إلكترونيًا. استعمل الطلب عبر البريد الإلكتروني.', etat: 'انتهت صلاحية الدخول عبر فيسبوك. أعد المحاولة.', erreur: 'فشل الدخول عبر فيسبوك. أعد المحاولة أو استعمل بريدك الإلكتروني.', rate: 'محاولات كثيرة. أعد المحاولة لاحقًا.' } as Record<string, string> },
  },
  space: {
    title: 'فضاؤك في Training',
    welcome: 'ولوج مفتوح لـ',
    soon: 'ستتوفر سلاسل الأسئلة والامتحانات التجريبية قريبًا في هذا الفضاء.',
    logout: 'تسجيل الخروج',
  },
  arPending: 'الترجمة العربية قيد المراجعة.',
}

export type TrainingCopy = typeof FR
export function getCopy(lang: 'fr' | 'ar'): TrainingCopy {
  return lang === 'ar' ? AR : FR
}
