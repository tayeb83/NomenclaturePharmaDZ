'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'

export default function AboutPage() {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr

  return (
    <div className="page-body">
      <div className="container py-5">
        <section className="mb-4">
          <h1 className="mb-3">{t('À propos de PharmaVeille DZ', 'حول PharmaVeille DZ')}</h1>
          <p className="text-muted mb-0">
            {t(
              "PharmaVeille DZ est une plateforme d'aide à la consultation de la nomenclature pharmaceutique algérienne. Elle centralise les recherches par DCI ou nom de marque, les retraits et les nouveautés publiées officiellement.",
              'PharmaVeille DZ منصة لمساعدة المهنيين على الاطلاع على التسمية الصيدلانية الجزائرية. تجمع البحث بالاسم العلمي أو التجاري، الانسحابات والمستجدات المنشورة رسميًا.'
            )}
          </p>
        </section>

        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h2 className="h5 card-title">{t('Notre mission', 'مهمتنا')}</h2>
                <p className="card-text mb-0">
                  {t(
                    "Offrir aux pharmaciens, préparateurs et professionnels de santé un accès rapide, clair et fiable aux données utiles pour la dispensation et la veille réglementaire.",
                    'توفير وصول سريع وواضح وموثوق للصيادلة وعمال الصيدليات ومهنيي الصحة إلى البيانات اللازمة للصرف والمراقبة التنظيمية.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h2 className="h5 card-title">{t('Sources des données', 'مصادر البيانات')}</h2>
                <p className="card-text mb-2">
                  {t(
                    "Les informations affichées proviennent des publications officielles du Ministère de l'Industrie Pharmaceutique (MIPH), notamment :",
                    'المعلومات المعروضة مستمدة من المنشورات الرسمية لوزارة الصناعة الصيدلانية (MIPH)، ولا سيما:'
                  )}
                </p>
                <ul className="mb-0">
                  <li>{t('Nomenclature des produits pharmaceutiques enregistrés.', 'تسمية المنتجات الصيدلانية المسجلة.')}</li>
                  <li>{t("Liste des retraits et des AMM non renouvelées.", 'قائمة الانسحابات والـ AMM غير المجددة.')}</li>
                  <li>{t("Mises à jour de versions diffusées par l'autorité.", 'تحديثات الإصدارات الصادرة عن الجهة المختصة.')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card h-100 border-warning-subtle">
              <div className="card-body">
                <h2 className="h5 card-title">{t('Fréquence de mise à jour', 'تكرار التحديث')}</h2>
                <p className="card-text mb-0">
                  {t(
                    "Les données sont rafraîchies dès qu'une nouvelle version officielle est intégrée au système. Vérifiez toujours la date/version affichée avant toute décision critique.",
                    'يتم تحديث البيانات فور إدراج إصدار رسمي جديد في النظام. تحقق دائمًا من التاريخ/الإصدار المعروض قبل أي قرار مهم.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100 border-danger-subtle">
              <div className="card-body">
                <h2 className="h5 card-title">{t('Limites et responsabilité', 'الحدود والمسؤولية')}</h2>
                <p className="card-text mb-0">
                  {t(
                    "PharmaVeille DZ est un outil d'aide à la décision et ne remplace pas les textes réglementaires, notices officielles, ni l'avis clinique du professionnel de santé.",
                    'PharmaVeille DZ أداة مساعدة في اتخاذ القرار ولا تُغني عن النصوص التنظيمية، النشرات الرسمية، ولا الرأي السريري للمهني الصحي.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="text-center">
          <p className="mb-3">
            {t(
              "Vous souhaitez recevoir les alertes importantes (retraits, nouvelles versions) ?",
              'هل تريد تلقي التنبيهات المهمة (الانسحابات، الإصدارات الجديدة)؟'
            )}
          </p>
          <Link href="/newsletter" className="btn btn-primary px-4">
            {t("S'abonner à la newsletter", 'الاشتراك في النشرة البريدية')}
          </Link>
        </section>
      </div>
    </div>
  )
}
