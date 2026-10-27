import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { listSpecialites, titre, description } from '@/lib/specialites'
import { isLang, pickLang, type Lang } from '@/lib/i18n'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Médicaments par spécialité — Algérie',
  description: 'Retrouvez les classes de médicaments utilisées dans votre spécialité (dentisterie…), classées selon la nomenclature algérienne et la classification ATC de l\'OMS.',
  alternates: { canonical: `${APP_URL}/specialites` },
  openGraph: {
    title: 'Médicaments par spécialité — Algérie',
    description: 'Classement des médicaments de la nomenclature algérienne par spécialité, d\'après la classification ATC.',
    type: 'website', siteName: 'DwaDZ', locale: 'fr_DZ', url: `${APP_URL}/specialites`,
  },
}

const n = (v: number) => v.toLocaleString('fr')

export default async function SpecialitesPage() {
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'
  const list = await listSpecialites().catch(() => [])

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>🗂️ {pickLang(lang, { fr: 'Médicaments par spécialité', ar: 'الأدوية حسب التخصص' })}</h1>
          <p>
            {pickLang(lang, {
              fr: 'Choisissez votre spécialité pour voir les classes de médicaments qui s\'y rattachent, avec les fiches, les prix et les RCP du site.',
              ar: 'اختر تخصصك لتطّلع على أصناف الأدوية المرتبطة به، مع البطاقات والأسعار وملخصات خصائص المنتج.',
            })}
          </p>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 1000 }}>
          {list.length === 0 ? (
            <div className="alert-banner info">
              {pickLang(lang, { fr: 'Aucune spécialité n\'est publiée pour le moment.', ar: 'لا يوجد أي تخصص منشور حاليًا.' })}
            </div>
          ) : (
            <div className="spec-grid">
              {list.map(s => {
                const desc = description(s, lang)
                return (
                  <Link key={s.slug} href={`/specialites/${s.slug}`} className="spec-card">
                    <div className="spec-card-top">
                      <h2 className="spec-card-title">{titre(s, lang)}</h2>
                      <span className="spec-card-go" aria-hidden="true">{lang === 'ar' ? '←' : '→'}</span>
                    </div>
                    {desc && <p className="spec-card-text">{desc}</p>}
                    <div className="spec-card-stats">
                      <span><strong>{n(s.nb_classes)}</strong> {pickLang(lang, { fr: s.nb_classes > 1 ? 'classes' : 'classe', ar: 'أصناف' })}</span>
                      <span><strong>{n(s.nb_dci)}</strong> {pickLang(lang, { fr: 'substances', ar: 'مادة فعالة' })}</span>
                      <span><strong>{n(s.nb_produits)}</strong> {pickLang(lang, { fr: 'fiches', ar: 'بطاقة' })}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          <p className="spec-note">
            {pickLang(lang, {
              fr: 'Le classement repose sur les codes ATC de l\'OMS. Il sert de repère pour naviguer, il ne remplace ni le RCP ni l\'avis d\'un professionnel de santé.',
              ar: 'يعتمد التصنيف على رموز ATC لمنظمة الصحة العالمية. هو مرجع للتصفح فقط ولا يغني عن ملخص خصائص المنتج ولا عن رأي المهني الصحي.',
            })}
          </p>
        </div>
      </div>
    </>
  )
}
