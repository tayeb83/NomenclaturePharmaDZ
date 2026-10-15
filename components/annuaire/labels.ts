import type { Lang } from '@/lib/i18n'
import type { OpenStatus } from '@/lib/annuaire-hours'

const FR = {
  home: 'Accueil', directory: 'Annuaire', search: 'Rechercher une pharmacie', searchPh: 'Nom, quartier, rue…',
  allCommunes: 'Toutes les communes', commune: 'Commune / quartier', onlyOpen: 'Ouvertes maintenant', onlyGarde: 'De garde',
  onlyVerified: 'Vérifiées', sortName: 'Nom', sortOpen: 'Ouvertes d’abord', sortDistance: 'Près de moi', nearMe: 'Près de moi',
  locating: 'Localisation…', locationDenied: 'Position indisponible',
  count: (n: number) => `${n} pharmacie${n > 1 ? 's' : ''}`, none: 'Aucune pharmacie ne correspond. Essayez un autre quartier ou retirez un filtre.',
  showMore: 'Afficher plus', reset: 'Réinitialiser', showMap: 'Voir la carte', hideMap: 'Masquer la carte', copyLink: 'Copier le lien de cette recherche',
  linkCopied: 'Lien copié', verified: 'Vérifiée', premium: 'Fiche complète', garde: 'De garde', open: 'Ouverte', closing: 'Ferme bientôt',
  gardeLater: (t: string) => `De garde dès ${t}`,
  closed: 'Fermée', until: (t: string) => `jusqu’à ${t}`, opensAt: (t: string) => `ouvre à ${t}`, opensTomorrow: (t: string) => `ouvre demain à ${t}`,
  opensDay: (d: string, t: string) => `ouvre ${d} à ${t}`, call: 'Appeler', whatsapp: 'WhatsApp', route: 'Itinéraire', share: 'Partager',
  copyNumber: 'Copier le numéro', numberCopied: 'Numéro copié', seeCard: 'Voir la fiche', km: 'km',
  address: 'Adresse', phone: 'Téléphone', mobile: 'Mobile', hours: 'Horaires', today: 'aujourd’hui', closedDay: 'Fermée',
  gardeTitle: 'Prochaines gardes', gardeNone: 'Aucune garde enregistrée dans les prochains jours.', gardeFrom: (a: string, b: string) => `du ${a} à ${b}`,
  gardeLine: (d: string, a: string, b: string) => `${d} · ${a} → ${b}`,
  gardeNote: 'Les horaires de garde viennent des listes officielles des directions de la santé (DSP). En dehors de la garde, la pharmacie est ouverte aux horaires habituels de la fiche.',
  hoursNote: 'Horaires habituels hors garde. Appelez avant de vous déplacer.',
  hoursDefaultNote: 'Horaires indicatifs : le pharmacien n’a pas encore précisé les siens.',
  trust: 'Fiabilité de la fiche', trustVerified: (d: string | null) => d ? `Vérifiée par appel de contrôle le ${d}.` : 'Vérifiée par appel de contrôle.',
  trustUnverified: 'Fiche non vérifiée : les coordonnées viennent des listes officielles et peuvent avoir changé.',
  seeOnMap: 'Voir sur la carte', nearby: 'Autres pharmacies', in: 'à', pharmacy: 'Pharmacie', otherLang: 'بالعربية',
  communes: 'Communes', pharmaciesIn: 'pharmacies', wilayas: 'Wilayas couvertes', gardeLink: 'Pharmacies de garde',
  hubIntro: 'Trouvez une pharmacie par nom, quartier ou commune : adresse, téléphone, horaires et pharmacies de garde. Hors garde, une pharmacie est considérée ouverte de 10h à 21h tant que son pharmacien n’a pas précisé d’autres horaires.',
  placeIntro: (c: number) => `${c} pharmacie${c > 1 ? 's' : ''} référencée${c > 1 ? 's' : ''}. Hors garde, une pharmacie est considérée ouverte de 10h à 21h tant que son pharmacien n’a pas précisé d’autres horaires.`,
  globalSearchPh: 'Nom de pharmacie, quartier, commune…', globalSearchBtn: 'Rechercher', globalNoHit: 'Aucun résultat.',
  mapApprox: 'Position approximative (adresse géocodée)',
  disclaimer: 'Liste non exhaustive, recensée au fil des plannings de garde officiels. Une erreur ? Signalez-la depuis la fiche de la pharmacie.',
  hoursText: 'Horaires précisés par le pharmacien', mailFooter: '',
  weekdays: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayAcc: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
}

const AR: typeof FR = {
  home: 'الرئيسية', directory: 'الدليل', search: 'ابحث عن صيدلية', searchPh: 'الاسم، الحي، الشارع…',
  allCommunes: 'كل البلديات', commune: 'البلدية / الحي', onlyOpen: 'مفتوحة الآن', onlyGarde: 'مناوبة',
  onlyVerified: 'موثّقة', sortName: 'الاسم', sortOpen: 'المفتوحة أولا', sortDistance: 'الأقرب إليّ', nearMe: 'الأقرب إليّ',
  locating: 'جارٍ تحديد الموقع…', locationDenied: 'تعذّر تحديد الموقع',
  count: (n: number) => `${n} صيدلية`, none: 'لا توجد صيدلية مطابقة. جرّب حيا آخر أو أزل أحد المرشحات.',
  showMore: 'عرض المزيد', reset: 'إعادة التعيين', showMap: 'عرض الخريطة', hideMap: 'إخفاء الخريطة', copyLink: 'نسخ رابط هذا البحث',
  linkCopied: 'تم نسخ الرابط', verified: 'موثّقة', premium: 'بطاقة كاملة', garde: 'مناوبة', open: 'مفتوحة', closing: 'تغلق قريبا',
  gardeLater: (t: string) => `مناوبة ابتداء من ${t}`,
  closed: 'مغلقة', until: (t: string) => `حتى ${t}`, opensAt: (t: string) => `تفتح عند ${t}`, opensTomorrow: (t: string) => `تفتح غدا عند ${t}`,
  opensDay: (d: string, t: string) => `تفتح ${d} عند ${t}`, call: 'اتصال', whatsapp: 'واتساب', route: 'الاتجاهات', share: 'مشاركة',
  copyNumber: 'نسخ الرقم', numberCopied: 'تم نسخ الرقم', seeCard: 'عرض البطاقة', km: 'كم',
  address: 'العنوان', phone: 'الهاتف', mobile: 'النقال', hours: 'ساعات العمل', today: 'اليوم', closedDay: 'مغلقة',
  gardeTitle: 'المناوبات القادمة', gardeNone: 'لا توجد مناوبة مسجلة في الأيام القادمة.', gardeFrom: (a: string, b: string) => `من ${a} إلى ${b}`,
  gardeLine: (d: string, a: string, b: string) => `${d} · ${a} ← ${b}`,
  gardeNote: 'أوقات المناوبة مأخوذة من القوائم الرسمية لمديريات الصحة (DSP). خارج المناوبة تعمل الصيدلية في ساعاتها المعتادة المبيّنة في البطاقة.',
  hoursNote: 'الساعات المعتادة خارج المناوبة. يُستحسن الاتصال قبل التنقل.',
  hoursDefaultNote: 'ساعات تقريبية: لم يحدّد الصيدلي ساعاته بعد.',
  trust: 'موثوقية البطاقة', trustVerified: (d: string | null) => d ? `موثّقة باتصال تحقق بتاريخ ${d}.` : 'موثّقة باتصال تحقق.',
  trustUnverified: 'بطاقة غير موثّقة: البيانات من القوائم الرسمية وقد تكون تغيّرت.',
  seeOnMap: 'عرض على الخريطة', nearby: 'صيدليات أخرى', in: 'في', pharmacy: 'صيدلية', otherLang: 'Français',
  communes: 'البلديات', pharmaciesIn: 'صيدلية', wilayas: 'الولايات المغطاة', gardeLink: 'الصيدليات المناوبة',
  hubIntro: 'اعثر على صيدلية بالاسم أو الحي أو البلدية: العنوان والهاتف وساعات العمل والصيدليات المناوبة. خارج المناوبة تُعتبر الصيدلية مفتوحة من 10:00 إلى 21:00 ما لم يحدّد الصيدلي ساعات أخرى.',
  placeIntro: (c: number) => `${c} صيدلية مسجلة. خارج المناوبة تُعتبر الصيدلية مفتوحة من 10:00 إلى 21:00 ما لم يحدّد الصيدلي ساعات أخرى.`,
  globalSearchPh: 'اسم الصيدلية، الحي، البلدية…', globalSearchBtn: 'بحث', globalNoHit: 'لا توجد نتائج.',
  mapApprox: 'موقع تقريبي (حسب العنوان)',
  disclaimer: 'قائمة غير شاملة، جُمعت من برامج المناوبة الرسمية. وجدت خطأ؟ أبلغ عنه من بطاقة الصيدلية.',
  hoursText: 'ساعات حدّدها الصيدلي', mailFooter: '',
  weekdays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  dayAcc: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
}

export function labels(lang: Lang) {
  return lang === 'ar' ? AR : FR
}

export type Labels = ReturnType<typeof labels>

/** Texte secondaire d'un statut : « jusqu'à 21:00 », « ouvre demain à 10:00 »… */
export function statusDetail(status: OpenStatus, t: Labels): string {
  if (status.state === 'closed') {
    if (!status.opensAt) return ''
    if (status.opensInDays === 0) return t.opensAt(status.opensAt)
    if (status.opensInDays === 1) return t.opensTomorrow(status.opensAt)
    return ''
  }
  return status.until ? t.until(status.until) : ''
}
