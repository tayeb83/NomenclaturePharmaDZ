'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'

type HelpItem = {
  href: string
  titleFr: string
  titleAr: string
  summaryFr: string
  summaryAr: string
  detailsFr: string[]
  detailsAr: string[]
}

type HelpSection = {
  id: string
  titleFr: string
  titleAr: string
  introFr: string
  introAr: string
  items: HelpItem[]
}

const sections: HelpSection[] = [
  {
    id: 'consultation',
    titleFr: '1) Consultation de la nomenclature',
    titleAr: '1) تصفح التسمية الصيدلانية',
    introFr:
      'Ces pages servent à consulter rapidement les médicaments enregistrés, retirés, critiques ou récemment modifiés.',
    introAr:
      'هذه الصفحات مخصصة للاطلاع السريع على الأدوية المسجلة، المسحوبة، الحرجة أو التي تم تحديثها مؤخراً.',
    items: [
      {
        href: '/medicaments',
        titleFr: 'Tous les médicaments',
        titleAr: 'كل الأدوية',
        summaryFr: 'Catalogue principal de la nomenclature officielle.',
        summaryAr: 'الفهرس الرئيسي للتسمية الرسمية.',
        detailsFr: [
          'Affiche la liste paginée des spécialités avec DCI, nom de marque, forme, dosage, laboratoire, pays et statut.',
          'Permet de filtrer et d’explorer la base de façon large avant d’ouvrir une fiche détaillée.',
          'Point d’entrée recommandé pour une vue globale de la disponibilité des produits.',
        ],
        detailsAr: [
          'تعرض قائمة مفصلة بالأدوية مع الاسم العلمي، الاسم التجاري، الشكل، الجرعة، المخبر، البلد والحالة.',
          'تسمح بتضييق النتائج واستكشاف القاعدة قبل فتح بطاقة الدواء التفصيلية.',
          'تُعد أفضل نقطة بداية للحصول على رؤية عامة حول المنتجات المتوفرة.',
        ],
      },
      {
        href: ‘/medicaments-critiques’,
        titleFr: ‘Médicaments critiques’,
        titleAr: ‘الأدوية الحرجة’,
        summaryFr:
          ‘Croisement de la liste officielle des médicaments critiques du Ministère de la Santé avec la nomenclature enregistrée, pour identifier les disponibilités et les manques.’,
        summaryAr:
          ‘مقارنة القائمة الرسمية للأدوية الحرجة الصادرة عن وزارة الصحة مع التسمية المسجلة، للكشف عن المتوفر والمفقود.’,
        detailsFr: [
          ‘Pourquoi cette liste ? Elle recense les médicaments jugés essentiels à la continuité des soins par le Ministère de la Santé Algérie ; leur indisponibilité représente un risque direct pour les patients.’,
          ‘Comment les entrées sont-elles construites ? Chaque médicament critique est automatiquement croisé avec les enregistrements actifs et les retraits de la nomenclature pour détecter un équivalent disponible sur le marché algérien.’,
          ‘Lire les scores de correspondance : chaque match affiche un score DCI, un score forme pharmaceutique et un score dosage (0–100), ainsi qu’un score global résumant la qualité de la concordance.’,
          ‘Le point coloré en tête de chaque entrée critique : vert = au moins une spécialité correspondante trouvée dans la nomenclature ; gris = aucune correspondance détectée.’,
          ‘Le badge de statut du match : ✓ OUI = correspondance confirmée (scores élevés sur les trois critères) ; ⚠ À REVOIR = correspondance partielle ou incertaine, à vérifier manuellement.’,
          ‘La couleur du badge source indique le statut réglementaire du médicament trouvé : vert = actif et enregistré ; rouge = retiré du marché ; orange = non renouvelé.’,
          ‘Les entrées sont regroupées par classe thérapeutique (cardiologie, antibiotiques, etc.) pour faciliter une revue systématique et prioriser les classes à risque.’,
        ],
        detailsAr: [
          ‘لماذا هذه القائمة؟ تضم الأدوية التي تعدّها وزارة الصحة الجزائرية ضرورية لاستمرارية الرعاية الصحية؛ وغيابها يشكل خطراً مباشراً على المرضى.’,
          ‘كيف تُبنى المدخلات؟ يُقارن كل دواء حرج تلقائياً مع التسجيلات النشطة والسحوبات في التسمية، للكشف عن مكافئ متوفر في السوق الجزائرية.’,
          ‘قراءة مؤشرات التشابه: تُعرض لكل مطابقة نقاط للمادة الفعالة والشكل الصيدلاني والجرعة (0-100)، إضافة إلى نقاط إجمالية تلخّص جودة التطابق.’,
          ‘النقطة الملونة في رأس كل مدخل حرج: خضراء = وُجد مكافئ في التسمية؛ رمادية = لم تُكتشف أي مطابقة.’,
          ‘شارة حالة المطابقة: ✓ نعم = مطابقة مؤكدة (نقاط مرتفعة في المعايير الثلاثة)؛ ⚠ للمراجعة = مطابقة جزئية أو غير مؤكدة، تحتاج إلى تحقق يدوي.’,
          ‘لون شارة المصدر يُشير إلى الحالة التنظيمية للدواء المُكتشف: أخضر = نشط ومسجل؛ أحمر = مسحوب من السوق؛ برتقالي = غير مجدد.’,
          ‘تُجمَّع المدخلات حسب الفئة العلاجية (قلبية وعائية، مضادات حيوية…) لتسهيل المراجعة المنهجية وتحديد الفئات ذات الأولوية.’,
        ],
      },
      {
        href: '/retraits',
        titleFr: 'Médicaments retirés',
        titleAr: 'الأدوية المسحوبة',
        summaryFr: 'Historique des retraits et produits non renouvelés.',
        summaryAr: 'سجل الأدوية المسحوبة وغير المجددة.',
        detailsFr: [
          'Indique les produits retirés ou non renouvelés pour sécuriser la dispensation.',
          'Permet de consulter par année et d’identifier les changements réglementaires.',
          'Utile pour éviter les erreurs de délivrance de produits non valides.',
        ],
        detailsAr: [
          'تعرض المنتجات المسحوبة أو غير المجددة لتعزيز أمان الصرف.',
          'تسمح بالبحث حسب السنة لتتبع التغيرات التنظيمية.',
          'مفيدة لتجنب صرف منتجات لم تعد صالحة تنظيمياً.',
        ],
      },
      {
        href: '/diff',
        titleFr: 'Mises à jour de versions',
        titleAr: 'تحديثات الإصدارات',
        summaryFr: 'Comparaison entre versions de la nomenclature.',
        summaryAr: 'مقارنة بين نسخ التسمية الصيدلانية.',
        detailsFr: [
          'Affiche les nouveautés, modifications et suppressions entre deux versions.',
          'Aide les équipes à comprendre ce qui a changé depuis la dernière mise à jour.',
          'Très utile pour les points staff, la veille interne et les procédures qualité.',
        ],
        detailsAr: [
          'تعرض الإضافات والتعديلات والحذف بين إصدارين.',
          'تساعد الفرق على فهم ما تغيّر منذ آخر تحديث.',
          'مفيدة للاجتماعات الداخلية والمتابعة التنظيمية وإجراءات الجودة.',
        ],
      },
    ],
  },
  {
    id: 'recherche',
    titleFr: '2) Recherche, analyse et décision',
    titleAr: '2) البحث والتحليل واتخاذ القرار',
    introFr:
      'Ces pages accélèrent la recherche terrain et la prise de décision en officine, hôpital ou distribution.',
    introAr:
      'هذه الصفحات تسرّع البحث الميداني ودعم القرار في الصيدلية أو المستشفى أو التوزيع.',
    items: [
      {
        href: '/recherche',
        titleFr: 'Recherche globale',
        titleAr: 'البحث الشامل',
        summaryFr: 'Moteur de recherche central (DCI, marque, labo, forme, dosage).',
        summaryAr: 'محرك البحث الرئيسي (الاسم العلمي، التجاري، المخبر، الشكل، الجرعة).',
        detailsFr: [
          'Recherche transversale dans plusieurs sources (enregistrements, retraits, statuts).',
          'Permet d’obtenir vite une réponse opérationnelle en cas de demande patient.',
          'Propose un accès direct aux fiches pour vérification détaillée.',
        ],
        detailsAr: [
          'بحث موحد عبر عدة مصادر (التسجيلات، السحوبات، الحالات).',
          'يوفر إجابة عملية سريعة عند استقبال طلب المريض.',
          'يتيح الوصول المباشر لبطاقات الدواء للتحقق التفصيلي.',
        ],
      },
      {
        href: '/substitution',
        titleFr: 'Substitution générique',
        titleAr: 'الاستبدال الجنيس',
        summaryFr: 'Aide à trouver des alternatives thérapeutiques de même DCI.',
        summaryAr: 'يساعد على إيجاد بدائل علاجية بنفس المادة الفعالة.',
        detailsFr: [
          'Rassemble les médicaments équivalents pour faciliter la substitution encadrée.',
          'Compare les présentations disponibles (forme, dosage, statut).',
          'Réduit le temps de décision pendant la dispensation.',
        ],
        detailsAr: [
          'يجمع الأدوية المكافئة لتسهيل الاستبدال المنظم.',
          'يقارن العروض المتاحة (الشكل، الجرعة، الحالة).',
          'يقلل زمن القرار أثناء عملية الصرف.',
        ],
      },
      {
        href: '/comparateur',
        titleFr: 'Comparateur de médicaments',
        titleAr: 'مقارنة الأدوية',
        summaryFr: 'Vue côte à côte de plusieurs produits.',
        summaryAr: 'عرض جنباً إلى جنب لعدة منتجات.',
        detailsFr: [
          'Permet de comparer clairement composition, forme, dosage et origine.',
          'Facilite la justification d’un choix thérapeutique ou logistique.',
          'Utile pour expliquer les différences entre références et génériques.',
        ],
        detailsAr: [
          'تمكن من مقارنة التركيب والشكل والجرعة والمنشأ بشكل واضح.',
          'تسهل تبرير اختيار علاجي أو لوجستي.',
          'مفيدة لشرح الفروقات بين المرجع والجنيس.',
        ],
      },
      {
        href: '/laboratoires',
        titleFr: 'Analyse par laboratoire',
        titleAr: 'تحليل حسب المخبر',
        summaryFr: 'Exploration des portefeuilles produits par fabricant.',
        summaryAr: 'استكشاف محفظة المنتجات حسب كل مخبر.',
        detailsFr: [
          'Affiche les médicaments par laboratoire et par pays d’origine.',
          'Permet une vision stratégique de l’offre par fabricant.',
          'Utile pour la négociation, l’achat et la gestion de fournisseurs.',
        ],
        detailsAr: [
          'تعرض الأدوية حسب المخبر وبلد المنشأ.',
          'توفر رؤية استراتيجية لعرض كل مصنع.',
          'مفيدة للتفاوض والشراء وإدارة الموردين.',
        ],
      },
    ],
  },
  {
    id: 'services',
    titleFr: '3) Information, veille et services',
    titleAr: '3) المعلومات والمتابعة والخدمات',
    introFr:
      'Ces pages complètent la base médicament avec des contenus de suivi, d’alerte et de support.',
    introAr:
      'هذه الصفحات تكمل قاعدة الأدوية بمحتوى المتابعة والتنبيهات والدعم.',
    items: [
      {
        href: '/alertes',
        titleFr: 'Alertes',
        titleAr: 'التنبيهات',
        summaryFr: 'Canal de suivi des signaux importants.',
        summaryAr: 'قناة لمتابعة الإشارات المهمة.',
        detailsFr: [
          'Regroupe les alertes de sécurité et changements à surveiller rapidement.',
          'Aide à informer l’équipe officinale et les patients sans délai.',
          'Participe à la réduction des risques de dispensation.',
        ],
        detailsAr: [
          'تجمع تنبيهات السلامة والتغييرات التي يجب متابعتها بسرعة.',
          'تساعد على إبلاغ فريق الصيدلية والمرضى دون تأخير.',
          'تساهم في تقليل مخاطر صرف الأدوية.',
        ],
      },
      {
        href: '/veille',
        titleFr: 'Veille réglementaire',
        titleAr: 'المتابعة التنظيمية',
        summaryFr: 'Suivi des nouveautés réglementaires utiles au terrain.',
        summaryAr: 'متابعة المستجدات التنظيمية المفيدة للممارسة.',
        detailsFr: [
          'Présente les évolutions administratives et réglementaires à retenir.',
          'Aide à maintenir des pratiques alignées avec les publications officielles.',
          'Supporte la formation continue des équipes.',
        ],
        detailsAr: [
          'تعرض التحديثات الإدارية والتنظيمية الأساسية.',
          'تساعد على الحفاظ على ممارسات متوافقة مع المنشورات الرسمية.',
          'تدعم التكوين المستمر للفرق.',
        ],
      },
      {
        href: '/articles',
        titleFr: 'Articles & dossiers',
        titleAr: 'مقالات وملفات',
        summaryFr: 'Contenu pédagogique et analyses thématiques.',
        summaryAr: 'محتوى تعليمي وتحليلات موضوعية.',
        detailsFr: [
          'Explique des thèmes de pratique pharmaceutique en format long.',
          'Propose des synthèses utiles pour la formation et la mise à niveau.',
          'Complète les données brutes avec un contexte métier.',
        ],
        detailsAr: [
          'تشرح مواضيع الممارسة الصيدلانية بصيغة مفصلة.',
          'تقدم خلاصات مفيدة للتكوين وتحديث المعارف.',
          'تكمل البيانات الخام بسياق مهني واضح.',
        ],
      },
      {
        href: '/newsletter',
        titleFr: 'Newsletter',
        titleAr: 'النشرة البريدية',
        summaryFr: 'Réception périodique des nouveautés DwaDZ.',
        summaryAr: 'استلام مستجدات DwaDZ بشكل دوري.',
        detailsFr: [
          'Permet de recevoir les mises à jour importantes sans visiter le site chaque jour.',
          'Utile pour les responsables qualité, titulaires et équipes de veille.',
          'Offre un canal de diffusion pratique pour les changements clés.',
        ],
        detailsAr: [
          'تسمح باستقبال التحديثات المهمة دون زيارة الموقع يومياً.',
          'مفيدة لمسؤولي الجودة وأصحاب الصيدليات وفرق المتابعة.',
          'توفر قناة عملية لنشر أهم التغييرات.',
        ],
      },
    ],
  },
]

export default function HelpPage() {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => (lang === 'ar' ? ar : fr)

  return (
    <div className="page-body">
      <div className="container py-5">
        <header className="mb-4">
          <h1 className="mb-3">{t('Centre d\'aide DwaDZ', 'مركز المساعدة DwaDZ')}</h1>
          <p className="text-muted mb-2">
            {t(
              'Ce guide explique chaque page et chaque fonctionnalité de la plateforme, avec un langage opérationnel pour les pharmaciens et équipes de santé.',
              'هذا الدليل يشرح كل صفحة وكل ميزة في المنصة بلغة عملية موجهة للصيادلة وفرق الرعاية الصحية.'
            )}
          </p>
          <p className="text-muted mb-0">
            {t(
              'Conseil : commencez par la recherche globale, puis utilisez la substitution et le comparateur pour confirmer votre décision.',
              'نصيحة: ابدأ بالبحث الشامل، ثم استخدم الاستبدال والمقارنة لتأكيد القرار.'
            )}
          </p>
        </header>

        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h2 className="h5 mb-3">{t('Accès rapide', 'وصول سريع')}</h2>
            <div className="d-flex flex-wrap gap-2">
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="btn btn-outline-primary btn-sm">
                  {lang === 'ar' ? section.titleAr : section.titleFr}
                </a>
              ))}
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="mb-5">
            <h2 className="h4 mb-2">{lang === 'ar' ? section.titleAr : section.titleFr}</h2>
            <p className="text-muted mb-3">{lang === 'ar' ? section.introAr : section.introFr}</p>

            <div className="row g-3">
              {section.items.map((item) => (
                <div className="col-12 col-lg-6" key={item.href}>
                  <article className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <h3 className="h6 mb-0">{lang === 'ar' ? item.titleAr : item.titleFr}</h3>
                        <Link href={item.href} className="btn btn-sm btn-primary">
                          {t('Ouvrir', 'فتح')}
                        </Link>
                      </div>

                      <p className="text-muted small mb-2">{lang === 'ar' ? item.summaryAr : item.summaryFr}</p>

                      <ul className="mb-0 small" style={{ lineHeight: 1.7 }}>
                        {(lang === 'ar' ? item.detailsAr : item.detailsFr).map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="card border-warning-subtle bg-warning-subtle">
          <div className="card-body">
            <h2 className="h5 mb-2">{t('Bonnes pratiques d’utilisation', 'أفضل ممارسات الاستخدام')}</h2>
            <ul className="mb-0">
              <li>{t('Toujours vérifier la version affichée dans l’en-tête du site.', 'تحقق دائماً من رقم الإصدار الظاهر أعلى الموقع.')}</li>
              <li>{t('Avant une décision critique, croiser avec les textes ou circulaires officielles.', 'قبل أي قرار حساس، قارن النتائج مع النصوص أو المناشير الرسمية.')}</li>
              <li>{t('Utiliser la page Contact pour signaler une incohérence de donnée.', 'استخدم صفحة الاتصال للإبلاغ عن أي تعارض في البيانات.')}</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
