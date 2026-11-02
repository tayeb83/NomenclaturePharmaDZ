'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { findWilaya } from '@/lib/demandes-core'
import type { DemandePublique } from '@/lib/demandes'

function depuis(iso: string, t: (fr: string, ar: string) => string): string {
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (j <= 0) return t("aujourd'hui", 'اليوم')
  if (j === 1) return t('hier', 'أمس')
  return t(`il y a ${j} jours`, `منذ ${j} أيام`)
}

function Carte({ d, t, ar, trouvee }: { d: DemandePublique; t: (fr: string, ar: string) => string; ar: boolean; trouvee?: boolean }) {
  const lieu = d.wilaya ? (ar ? findWilaya(d.wilaya)?.name_ar ?? d.wilaya : d.wilaya) : null
  const dci = d.dci_match || d.dci
  return (
    <div className="card h-100 shadow-sm" style={d.urgence === 'haute' && !trouvee ? { borderInlineStart: '4px solid #dc2626' } : undefined}>
      <div className="card-body d-flex flex-column gap-2">
        <div>
          <h3 className="h6 mb-1">{d.medicament}</h3>
          {d.marques.length > 0 && <div className="text-muted small">{d.marques.join(', ')}</div>}
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center small">
          {trouvee
            ? <span className="badge bg-success">{t('Signalé disponible', 'تم توفيره')}</span>
            : <>
                {d.urgence === 'haute' && <span className="badge bg-danger">{t('Urgent', 'مستعجل')}</span>}
                <span className="badge bg-secondary">
                  {d.nb_demandes} {d.nb_demandes > 1 ? t('demandes', 'طلبات') : t('demande', 'طلب')}
                </span>
              </>}
          {lieu && <span className="badge bg-light text-dark border">{lieu}</span>}
        </div>
        <div className="d-flex justify-content-between align-items-end mt-auto small text-muted">
          <span>
            {trouvee && d.trouvee_le
              ? depuis(d.trouvee_le, t)
              : t('Dernière demande ', 'آخر طلب ') + depuis(d.derniere_demande_le, t)}
          </span>
          {dci && !trouvee && (
            <Link href={`/recherche?q=${encodeURIComponent(dci)}&mode=dci`}>{t('Voir la DCI', 'عرض المادة الفعالة')}</Link>
          )}
        </div>
      </div>
    </div>
  )
}

export function DemandesPublicClient({
  actives, trouvees, facebookUrl,
}: { actives: DemandePublique[]; trouvees: DemandePublique[]; facebookUrl: string | null }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const t = (fr: string, ar_: string) => (ar ? ar_ : fr)
  const urgentes = actives.filter(d => d.urgence === 'haute')
  const autres = actives.filter(d => d.urgence !== 'haute')
  const total = actives.reduce((s, d) => s + d.nb_demandes, 0)

  return (
    <div className="page-body">
      <div className="container py-5">
        <section className="mb-4">
          <h1 className="mb-2">{t('Médicaments recherchés en ce moment', 'أدوية مطلوبة حاليًا')}</h1>
          <p className="text-muted mb-0" style={{ maxWidth: 720 }}>
            {t(
              "Des patients nous demandent ces médicaments. Vous êtes pharmacien et vous en avez en stock ? Écrivez-nous : nous transmettrons l'information. DwaDZ met en relation, ne vend rien et ne garantit aucun stock.",
              'يطلب منا مرضى هذه الأدوية. أنتم صيادلة ولديكم منها في المخزون؟ راسلونا وسنوصل المعلومة. DwaDZ يربط بين الأطراف فقط، لا يبيع ولا يضمن توفر أي دواء.'
            )}
          </p>
        </section>

        <div className="d-flex flex-wrap gap-2 mb-4">
          <Link href="/contact" className="btn btn-primary">{t('Je peux répondre à une demande', 'يمكنني الاستجابة لطلب')}</Link>
          {facebookUrl && (
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary">
              {t('Nous écrire sur Facebook', 'راسلونا على فيسبوك')}
            </a>
          )}
        </div>

        {actives.length === 0 ? (
          <div className="card"><div className="card-body">
            {t("Aucune demande en cours pour le moment. Cette page se met à jour dès qu'un médicament est recherché.",
               'لا توجد طلبات حاليًا. تتحدث هذه الصفحة بمجرد ورود طلب جديد.')}
          </div></div>
        ) : (
          <>
            <p className="text-muted small mb-3">
              {t(`${total} demande${total > 1 ? 's' : ''} pour ${actives.length} médicament${actives.length > 1 ? 's' : ''}.`,
                 `${total} طلب لـ ${actives.length} دواء.`)}
            </p>
            {urgentes.length > 0 && (
              <section className="mb-4">
                <h2 className="h5 mb-3">{t('Urgent : traitements chroniques', 'مستعجل: علاجات مزمنة')}</h2>
                <div className="row g-3">{urgentes.map(d => <div key={d.id} className="col-md-6 col-lg-4"><Carte d={d} t={t} ar={ar} /></div>)}</div>
              </section>
            )}
            {autres.length > 0 && (
              <section className="mb-4">
                <h2 className="h5 mb-3">{urgentes.length ? t('Autres demandes', 'طلبات أخرى') : t('Demandes en cours', 'الطلبات الحالية')}</h2>
                <div className="row g-3">{autres.map(d => <div key={d.id} className="col-md-6 col-lg-4"><Carte d={d} t={t} ar={ar} /></div>)}</div>
              </section>
            )}
          </>
        )}

        {trouvees.length > 0 && (
          <section className="mb-4">
            <h2 className="h5 mb-3">{t('Récemment signalés disponibles', 'تم توفيرها مؤخرًا')}</h2>
            <div className="row g-3">{trouvees.map(d => <div key={d.id} className="col-md-6 col-lg-4"><Carte d={d} t={t} ar={ar} trouvee /></div>)}</div>
          </section>
        )}

        <section className="card border-warning-subtle">
          <div className="card-body">
            <h2 className="h6 card-title">{t('À savoir', 'للعلم')}</h2>
            <ul className="mb-0 small">
              <li>{t("Les demandes sont anonymes : aucun nom, aucun contact de patient n'est publié.",
                     'الطلبات مجهولة: لا يُنشر أي اسم أو معلومة اتصال للمرضى.')}</li>
              <li>{t("Une demande disparaît de cette page après quelques semaines, ou dès qu'elle est satisfaite.",
                     'يختفي الطلب من هذه الصفحة بعد بضعة أسابيع، أو بمجرد تلبيته.')}</li>
              <li>{t("Les médicaments contrôlés (psychotropes, stupéfiants) ne sont jamais relayés ici.",
                     'الأدوية الخاضعة للرقابة (المؤثرات العقلية والمخدرات) لا تُنشر هنا أبدًا.')}</li>
              <li>{t("Adressez-vous toujours à une pharmacie officielle. N'achetez pas de médicaments auprès de particuliers.",
                     'توجهوا دائمًا إلى صيدلية رسمية. لا تشتروا الأدوية من الأفراد.')}</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
