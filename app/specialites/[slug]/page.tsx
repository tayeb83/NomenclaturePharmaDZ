import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getSpecialite, itemHref, titre, description } from '@/lib/specialites'
import { isLang, pickLang, type Lang } from '@/lib/i18n'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await getSpecialite(params.slug).catch(() => null)
  if (!s) return { title: 'Spécialité introuvable' }
  const canonical = `${APP_URL}/specialites/${s.slug}`
  const title = `${s.titre_fr} : médicaments en Algérie par classe`
  const desc = s.description_fr?.trim()
    || `Classes de médicaments utilisées en ${s.titre_fr.toLowerCase()}, d'après la nomenclature algérienne et la classification ATC de l'OMS.`
  return {
    title, description: desc, alternates: { canonical },
    openGraph: { title, description: desc, type: 'website', siteName: 'DwaDZ', locale: 'fr_DZ', url: canonical },
  }
}

const n = (v: number) => v.toLocaleString('fr')

export default async function SpecialitePage({ params }: { params: { slug: string } }) {
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'
  const s = await getSpecialite(params.slug).catch(() => null)
  if (!s) notFound()
  const desc = description(s, lang)

  return (
    <>
      <div className="page-header">
        <div className="container">
          <div className="spec-crumb">
            <Link href="/specialites">{pickLang(lang, { fr: 'Spécialités', ar: 'التخصصات' })}</Link>
            <span aria-hidden="true">{lang === 'ar' ? '‹' : '›'}</span>
            <span>{titre(s, lang)}</span>
          </div>
          <h1>{titre(s, lang)}</h1>
          {desc && <p>{desc}</p>}
          <div className="spec-hero-stats">
            <span><strong>{n(s.items.length)}</strong> {pickLang(lang, { fr: 'classes', ar: 'أصناف' })}</span>
            <span><strong>{n(s.nb_dci)}</strong> {pickLang(lang, { fr: s.nb_dci > 1 ? 'substances' : 'substance', ar: 'مادة فعالة' })}</span>
            <span><strong>{n(s.nb_produits)}</strong> {pickLang(lang, { fr: 'fiches', ar: 'بطاقة' })}</span>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 900 }}>
          <p className="spec-note" style={{ marginTop: 0 }}>
            {pickLang(lang, {
              fr: 'Classes fréquemment utilisées dans cette spécialité. Ce sont des repères de navigation, pas des recommandations de prescription : une classe peut aussi contenir des substances sans usage dans la spécialité.',
              ar: 'أصناف شائعة الاستعمال في هذا التخصص. هي مراجع للتصفح وليست توصيات للوصف، فقد يحتوي الصنف على مواد لا تُستعمل في التخصص.',
            })}
          </p>

          {s.items.length === 0 ? (
            <div className="alert-banner info">
              {pickLang(lang, { fr: 'Aucune classe n\'est encore rattachée à cette spécialité.', ar: 'لم يُربط أي صنف بهذا التخصص بعد.' })}
            </div>
          ) : (
            <ul className="spec-items">
              {s.items.map(it => {
                const name = lang === 'ar' && it.libelle_ar?.trim() ? it.libelle_ar : it.kind === 'atc' ? it.libelle_fr : it.valeur
                return (
                  <li key={it.id}>
                    <Link href={itemHref(it)} className="spec-item">
                      <span className={`spec-item-code${it.kind === 'dci' ? ' dci' : ''}`} dir="ltr">
                        {it.kind === 'atc' ? it.valeur : 'DCI'}
                      </span>
                      <span className="spec-item-main">
                        <span className="spec-item-name" dir={lang === 'ar' && it.libelle_ar ? 'rtl' : undefined}>{name}</span>
                        <span className="spec-item-count">
                          {it.kind === 'atc' && <>{n(it.nb_dci)} {pickLang(lang, { fr: it.nb_dci > 1 ? 'substances' : 'substance', ar: 'مادة فعالة' })} · </>}
                          {n(it.nb_produits)} {pickLang(lang, { fr: 'fiches', ar: 'بطاقة' })}
                        </span>
                      </span>
                      <span className="spec-item-arrow" aria-hidden="true">{lang === 'ar' ? '←' : '→'}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="spec-actions">
            <Link href="/training" className="home-action-btn solid">
              ✍️ {pickLang(lang, { fr: 'S\'entraîner avec les QCM', ar: 'التدرّب بأسئلة الاختيار من متعدد' })}
            </Link>
            <Link href="/recherche" className="home-action-btn outline">
              🔍 {pickLang(lang, { fr: 'Rechercher un médicament', ar: 'البحث عن دواء' })}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
