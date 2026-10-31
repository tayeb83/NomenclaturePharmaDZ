import ShareBar from '@/components/drug/ShareBar'
import { shareMessage } from '@/lib/medicament-share'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import {
  getCachedMedicamentById,
  getCachedAlternatifsDCI,
  getCachedAtcHierarchyByDci,
  getCachedMedicamentsByMarque,
  getCachedMedicamentInsights,
} from '@/lib/medicament-cache'
import type { Metadata } from 'next'
import type { MedicamentDetail, AtcCode } from '@/lib/db-types'
import { getCountryFlag } from '@/lib/countryFlag'
import { pickLang, type Lang } from '@/lib/i18n'
import { displayName } from '@/lib/arabize'
import { displayField } from '@/lib/translate-fields'
import { atcLabel } from '@/lib/atc-label'
import { medicamentPath, medicamentSlug } from '@/lib/medicament-url'
import { lettreForNom, lettreLabel, lettrePath } from '@/lib/repertoire'
import { medicalPageJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/schema'
import { marqueSlug, MIN_FAMILY_SIZE } from '@/lib/marque'
import { buildMedicamentFaq } from '@/lib/medicament-faq'
import { buildMedicamentTitle, buildMedicamentDescription, medicamentDesignation } from '@/lib/medicament-seo'
import { PrintButton } from '@/components/ui/PrintButton'
import { GlossarySection } from '@/components/ui/GlossarySection'
import { BackButton } from '@/components/ui/BackButton'
import { MedicamentInsights } from '@/components/drug/MedicamentInsights'
import { MonographieSection } from '@/components/drug/MonographieSection'
import { InteractionsEntrantes, RcpSection } from '@/components/drug/RcpSection'
import { InteractionsAnsmSection, InteractionsBandeau } from '@/components/drug/InteractionsAnsmSection'
import { getPublishedMonographie, hasContent } from '@/lib/monographies'
import { getPpa, formatPpa } from '@/lib/ppa'
import { getInteractionsVers, getRcpForFiche, RCP_PORTAL_URL } from '@/lib/rcp'
import { getInteractionsAnsm } from '@/lib/interactions'
import { AdInContent } from '@/components/ads/AdBanner'

const TYPE_LABELS: Record<string, { fr: string; ar: string }> = {
  GE: { fr: 'Générique', ar: 'جنيس' }, 'Gé': { fr: 'Générique', ar: 'جنيس' }, RE: { fr: 'Référence étrangère', ar: 'مرجعي أجنبي' },
  BIO: { fr: 'Biologique', ar: 'بيولوجي' }, I: { fr: 'Innovateur', ar: 'مبتكر' }, 'Ré': { fr: 'Référence étrangère', ar: 'مرجعي أجنبي' },
}
const STATUT_LABELS: Record<string, { fr: string; ar: string }> = {
  F: { fr: '🇩🇿 Fabriqué en Algérie', ar: '🇩🇿 مصنع في الجزائر' }, I: { fr: '📦 Importé', ar: '📦 مستورد' },
}

// Requête volontairement précise (nom de marque + DCI + dosage + forme +
// laboratoire, jamais juste la DCI) pour que les premiers résultats
// d'images Google soient bien la boîte de CE médicament vendu en Algérie,
// et pas un générique homonyme d'un autre marché.
function googleBoxSearchHref(med: { nom_marque: string; dci: string; dosage: string | null; forme: string | null; labo: string | null }) {
  const parts = [med.nom_marque]
  if (med.dci && med.dci !== med.nom_marque) parts.push(med.dci)
  if (med.dosage) parts.push(med.dosage)
  if (med.forme) parts.push(med.forme)
  if (med.labo) parts.push(med.labo)
  parts.push('boîte médicament Algérie')
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(parts.filter(Boolean).join(' '))}`
}

/**
 * Résumé en prose d'une fiche, dans la langue de la route.
 *
 * Les fiches sont des tableaux étiquette/valeur : hors les quelques mots du
 * nom commercial et de la DCI, deux fiches partagent la totalité de leur
 * texte. Pour un moteur de recherche c'est la définition d'un doublon, et
 * c'est ce qui vaut aux versions arabes d'être signalées « page en double »
 * puis abandonnées avant même l'exploration. Ce paragraphe recompose les
 * mêmes données en une phrase — qui varie donc d'une fiche à l'autre, et
 * d'une langue à l'autre.
 */
function buildResume(
  med: {
    nom_marque: string
    dci: string
    dosage?: string | null
    forme?: string | null
    labo?: string | null
    pays?: string | null
    source?: string | null
    statut?: string | null
    prescription?: string | null
    date_retrait?: string | null
    motif_retrait?: string | null
  },
  lang: Lang
): string {
  const designation = [med.nom_marque, med.dosage].filter(Boolean).join(' ')
  const forme = med.forme ? med.forme.toLowerCase() : null

  if (lang === 'ar') {
    const phrases: string[] = []
    phrases.push(
      `${designation} دواء${forme ? ` على شكل ${forme}` : ''} مادته الفعالة ${med.dci}` +
      `${med.labo ? `، من إنتاج مخبر ${med.labo}` : ''}${med.pays ? ` (${med.pays})` : ''}.`
    )
    if (med.source === 'retrait') {
      phrases.push(
        `تم سحب هذا الدواء من التسمية الوطنية للمنتجات الصيدلانية${med.date_retrait ? ` بتاريخ ${med.date_retrait}` : ''}` +
        `${med.motif_retrait ? ` للسبب التالي : ${med.motif_retrait}` : ''}.`
      )
    } else if (med.source === 'non_renouvele') {
      phrases.push('لم يتم تجديد رخصة التسويق (AMM) الخاصة بهذا الدواء : فهو لم يعد مسجلا في التسمية الجارية.')
    } else {
      phrases.push(
        `وهو مسجل لدى وزارة الصناعة الصيدلانية${med.statut === 'F' ? ' ومصنع في الجزائر' : med.statut === 'I' ? ' ومستورد' : ''}.`
      )
    }
    if (med.prescription) phrases.push(`الوصفة : ${med.prescription}.`)
    phrases.push('تجدون أسفله البدائل الجنيسة المسجلة بنفس المادة الفعالة.')
    return phrases.join(' ')
  }

  const phrases: string[] = []
  phrases.push(
    `${designation} est un médicament${forme ? ` sous forme de ${forme}` : ''} dont la substance active est ${med.dci}` +
    `${med.labo ? `, produit par le laboratoire ${med.labo}` : ''}${med.pays ? ` (${med.pays})` : ''}.`
  )
  if (med.source === 'retrait') {
    phrases.push(
      `Il a été retiré de la nomenclature nationale des produits pharmaceutiques${med.date_retrait ? ` le ${med.date_retrait}` : ''}` +
      `${med.motif_retrait ? `, pour le motif suivant : ${med.motif_retrait}` : ''}.`
    )
  } else if (med.source === 'non_renouvele') {
    phrases.push("Son autorisation de mise sur le marché (AMM) n'a pas été renouvelée : il ne figure plus dans la nomenclature en vigueur.")
  } else {
    phrases.push(
      `Il est enregistré auprès du Ministère de l'Industrie Pharmaceutique${med.statut === 'F' ? ' et fabriqué en Algérie' : med.statut === 'I' ? ' et importé' : ''}.`
    )
  }
  if (med.prescription) phrases.push(`Prescription : ${med.prescription}.`)
  phrases.push('Les génériques enregistrés avec la même substance active sont listés plus bas.')
  return phrases.join(' ')
}

function motifColor(m: string | null) {
  if (!m) return '#6b7280'
  if (m.includes('INTERDICTION')) return '#dc2626'
  if (m.includes('COMMERCIAL')) return '#f59e0b'
  if (m.includes("PAYS D'ORIGINE")) return '#7c3aed'
  return '#6b7280'
}

function Row({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  const content = children ?? value
  if (!content) return null
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{content}</td>
    </tr>
  )
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export async function buildMedicamentMetadata(
  params: { source: string; id: string },
  lang: Lang
): Promise<Metadata> {
  const id = parseInt(params.id)
  if (isNaN(id)) return { title: 'Médicament introuvable' }
  const med = await getCachedMedicamentById(params.source, id)
  if (!med) return { title: 'Médicament introuvable' }
  // Le nom de marque et la DCI restent en caractères latins (dénominations
  // officielles, et ce que tapent les internautes), y compris en tête des
  // titres arabes ; seul l'habillage éditorial est traduit.
  const title = buildMedicamentTitle(med, lang)
  const description = buildMedicamentDescription(med, lang)

  // URLs canoniques enrichies du nom commercial : c'est cette forme qui est
  // déclarée aux moteurs et affichée dans les résultats de recherche.
  const frUrl = `${APP_URL}${medicamentPath(params.source, params.id, med, 'fr')}`
  const arUrl = `${APP_URL}${medicamentPath(params.source, params.id, med, 'ar')}`
  const canonical = pickLang(lang, { fr: frUrl, ar: arUrl })
  const shareImage = `${APP_URL}/partage/medicament/${params.source}/${params.id}${lang === 'ar' ? '?lang=ar' : ''}`

  // Les produits non renouvelés sont d'immenses séries de fiches quasi
  // identiques (même gamme, même laboratoire) que Google explore puis écarte
  // (« explorée, actuellement non indexée »). Ils restent consultables, mais
  // on n'impose pas ce budget d'index aux fiches qui valent d'être trouvées.
  const robots = med.source === 'non_renouvele' ? { index: false, follow: true } : undefined

  return {
    title,
    description,
    ...(robots ? { robots } : {}),
    alternates: {
      canonical,
      languages: { fr: frUrl, ar: arUrl, 'x-default': frUrl },
    },
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'DwaDZ',
      locale: pickLang(lang, { fr: 'fr_DZ', ar: 'ar_DZ' }),
      url: canonical,
      images: [{ url: shareImage, width: 1200, height: 630, alt: med.nom_marque }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [shareImage] },
  }
}

export async function MedicamentDetail(
  { params, lang, routeLang = 'fr' }: {
    params: { source: string; id: string; slug?: string[] }
    /** Langue d'affichage (peut suivre la préférence du visiteur). */
    lang: Lang
    /** Langue de la route, qui détermine la forme canonique de l'URL. */
    routeLang?: Lang
  }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const med = await getCachedMedicamentById(params.source, id)
  if (!med) notFound()

  // Une seule URL par fiche : si le segment descriptif est absent ou périmé
  // (nom commercial modifié depuis la mise en cache d'un lien), on redirige
  // vers la forme canonique plutôt que de servir le même contenu sous
  // plusieurs adresses. La redirection est PERMANENTE (308) : un 307
  // temporaire dit aux moteurs de conserver l'ancienne URL dans l'index, qui
  // reste alors en concurrence avec la forme canonique et se retrouve
  // signalée « page en double » ou « page avec redirection ».
  const expectedSlug = medicamentSlug(med)
  const requestedSlug = params.slug?.join('/') || ''
  if (expectedSlug && requestedSlug !== expectedSlug) {
    permanentRedirect(medicamentPath(params.source, params.id, med, routeLang))
  }

  const isRetrait = med.source === 'retrait'
  const isNonRenouv = med.source === 'non_renouvele'

  const familleSlug = med.source === 'enregistrement' ? marqueSlug(med.nom_marque) : ''
  const [alternatifs, atcHierarchy, famille, insights, monographieRaw, ppa, rcps, interactionsVers, interactionsAnsm] = await Promise.all([
    getCachedAlternatifsDCI(med.dci, 10),
    getCachedAtcHierarchyByDci(med.dci),
    familleSlug ? getCachedMedicamentsByMarque(familleSlug) : Promise.resolve([]),
    med.source === 'enregistrement' ? getCachedMedicamentInsights(med) : Promise.resolve(null),
    med.dci ? getPublishedMonographie(med.dci, lang) : Promise.resolve(null),
    getPpa(med.n_enreg, med.code).catch(() => null),
    // RCP publié par l'ANPP : rattaché aux seules fiches de la nomenclature en vigueur
    med.source === 'enregistrement' ? getRcpForFiche(med.n_enreg, med.code).catch(() => []) : Promise.resolve([]),
    // Interactions que d'autres RCP citent pour cette substance (lecture dans l'autre sens)
    getInteractionsVers(med.dci).catch(() => []),
    // Interactions du Thesaurus ANSM pour la substance de la fiche (jamais pour un médicament retiré)
    med.source === 'retrait' ? Promise.resolve(null) : getInteractionsAnsm(med.dci, lang).catch(() => null),
  ])
  const monographie = hasContent(monographieRaw) ? monographieRaw : null
  // Page « famille de marque » : proposée seulement si elle regroupe plusieurs
  // présentations (sinon elle est en noindex et n'apporterait rien).
  const familleHref = famille.length >= MIN_FAMILY_SIZE ? `/marque/${familleSlug}` : null
  const autres = alternatifs.filter(a => !(med.source === 'enregistrement' && a.id === med.id))
  const atcLevel5 = atcHierarchy.find(a => a.niveau === 5)

  const headerBg = isRetrait
    ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
    : isNonRenouv
    ? 'linear-gradient(135deg, #78350f, #b45309)'
    : 'linear-gradient(135deg, #0f172a, #0c2340)'

  const statusBadge = isRetrait
    ? { label: pickLang(lang, { fr: '🚫 Médicament retiré', ar: '🚫 دواء مسحوب' }), bg: '#fee2e2', color: '#991b1b' }
    : isNonRenouv
    ? { label: pickLang(lang, { fr: '⚠️ AMM non renouvelée', ar: '⚠️ AMM غير مجددة' }), bg: '#fef3c7', color: '#92400e' }
    : { label: pickLang(lang, { fr: '✅ Médicament actif', ar: '✅ دواء نشط' }), bg: '#d1fae5', color: '#065f46' }

  // Le résumé suit la langue d'AFFICHAGE, comme le reste des libellés de la
  // page. Les robots n'ont pas de cookie : pour eux `lang` vaut toujours
  // `routeLang`, donc le texte indexé sous une URL reste bien celui de la
  // langue qu'elle déclare.
  const resume = buildResume(med, lang)

  const canonicalUrl = `${APP_URL}${medicamentPath(med.source, med.id, med, routeLang)}`
  const jsonLd = medicalPageJsonLd({
    name: [med.nom_marque, med.dosage, med.forme].filter(Boolean).join(' — '),
    description: `${med.nom_marque}${med.dosage ? ` ${med.dosage}` : ''}${med.dci ? ` (${med.dci})` : ''}. ${pickLang(routeLang, {
      fr: 'Nomenclature pharmaceutique algérienne MIPH.',
      ar: 'التسمية الصيدلانية الجزائرية الرسمية (MIPH).',
    })}`,
    url: canonicalUrl,
    inLanguage: routeLang,
    about: {
      name: med.nom_marque,
      activeIngredient: med.dci,
      description: [med.forme, med.dosage].filter(Boolean).join(' — ') || null,
      url: canonicalUrl,
    },
    mentions: [
      ...(med.labo ? [{ '@type': 'Organization', name: med.labo }] : []),
      ...(med.pays ? [{ '@type': 'Country', name: med.pays }] : []),
    ],
  })

  const faq = buildMedicamentFaq(med, autres, lang)
  const breadcrumb = breadcrumbJsonLd([
    { name: pickLang(lang, { fr: 'Accueil', ar: 'الرئيسية' }), url: APP_URL },
    { name: pickLang(lang, { fr: 'Médicaments', ar: 'الأدوية' }), url: `${APP_URL}/medicaments` },
    ...(alternatifs.length > 0 && med.dci
      ? [{ name: med.dci, url: `${APP_URL}/dci/${encodeURIComponent(med.dci.toLowerCase())}` }]
      : []),
    { name: med.nom_marque, url: canonicalUrl },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faq)) }} />
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="page-header" style={{ background: headerBg }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '.06em', marginBottom: 4 }}>
                {pickLang(lang, { fr: 'DCI — DÉNOMINATION COMMUNE INTERNATIONALE', ar: 'DCI — التسمية الدولية المشتركة' })}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                {/* Lien vers le hub DCI uniquement s'il existe des
                    enregistrements actifs sous cette DCI (sinon 404). */}
                {alternatifs.length > 0 && med.dci ? (
                  <Link href={`/dci/${encodeURIComponent(med.dci.toLowerCase())}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                    {displayName(med.dci, lang)}
                  </Link>
                ) : displayName(med.dci, lang)}
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'white', margin: 0 }}>
                {lang === 'ar'
                  ? [displayName(med.nom_marque, lang), displayField('dosage', med.dosage, lang)].filter(Boolean).join(' ')
                  : medicamentDesignation(med)}
              </h1>
              {med.is_critical && (
                <div style={{
                  marginTop: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 10px',
                  borderRadius: 999,
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(252, 165, 165, 0.6)',
                  color: '#fee2e2',
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  🚨 {pickLang(lang, { fr: 'Médicament critique', ar: 'دواء حرج' })}
                </div>
              )}
            </div>
            <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: statusBadge.bg, color: statusBadge.color, flexShrink: 0, marginTop: 4 }}>
              {statusBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Body ───────────────────────────────────────────── */}
      <div className="page-body">
        <div className="container" style={{ maxWidth: 960 }}>
          {/* Lien vers l'autre version linguistique : utile au visiteur, et
              c'est par ce lien que les moteurs découvrent la page jumelle. Il
              suit la langue de la ROUTE et non la préférence d'affichage —
              sinon la version française proposait un lien vers elle-même aux
              visiteurs dont le cookie est en arabe. */}
          <ShareBar
            url={canonicalUrl}
            text={shareMessage(med, lang)}
            title={medicamentDesignation(med)}
            lang={lang}
          />
          <p style={{ fontSize: 13, margin: '0 0 12px' }}>
            {routeLang === 'ar' ? (
              <Link href={medicamentPath(params.source, params.id, med, 'fr')} hrefLang="fr" style={{ color: 'var(--blue)' }}>
                Voir cette fiche en français
              </Link>
            ) : (
              <Link href={medicamentPath(params.source, params.id, med, 'ar')} hrefLang="ar" style={{ color: 'var(--blue)' }}>
                بالعربية — عرض بطاقة الدواء بالعربية
              </Link>
            )}
            {/* Retour vers le répertoire alphabétique : relie chaque fiche à
                ses voisines, pour que les robots ne dépendent plus du seul
                sitemap pour les découvrir. */}
            {med.source === 'enregistrement' && lettreForNom(med.nom_marque) && (
              <>
                {' · '}
                <Link href={lettrePath(lettreForNom(med.nom_marque)!)} style={{ color: 'var(--blue)' }}>
                  {routeLang === 'ar'
                    ? `الأدوية التي تبدأ بالحرف ${lettreLabel(lettreForNom(med.nom_marque)!)}`
                    : `Médicaments commençant par ${lettreLabel(lettreForNom(med.nom_marque)!)}`}
                </Link>
              </>
            )}
          </p>

          {/* Résumé rédigé à partir des données de la fiche. Une fiche
              réduite à un tableau d'étiquettes et de valeurs n'offre presque
              aucun texte propre : deux fiches se ressemblent alors à
              l'octet près et Google les traite comme des doublons. Ce
              paragraphe donne à chaque page — et à chaque version
              linguistique — une prose qui lui appartient. */}
          <p style={{ fontSize: 14, lineHeight: 1.75, color: '#334155', margin: '0 0 20px' }}>
            {resume}
          </p>
        </div>
        <div className="container" style={{ maxWidth: 960 }}>

          {/* Alerte retrait */}
          {isRetrait && med.motif_retrait && (
            <div className="alert-banner error" style={{ borderColor: motifColor(med.motif_retrait), color: motifColor(med.motif_retrait), background: '#fef2f2', marginBottom: 24 }}>
              <strong>{pickLang(lang, { fr: 'Motif de retrait :', ar: 'سبب السحب :' })}</strong> {med.motif_retrait}
              {med.date_retrait && <span style={{ marginLeft: 12, fontWeight: 400, color: '#7f1d1d' }}>({med.date_retrait})</span>}
            </div>
          )}
          {isNonRenouv && med.date_final && (
            <div className="alert-banner warning" style={{ marginBottom: 24 }}>
              <strong>{pickLang(lang, { fr: 'AMM expirée :', ar: 'AMM منتهية الصلاحية :' })}</strong>{' '}
              {pickLang(lang, { fr: 'Date de fin de validité', ar: 'تاريخ نهاية الصلاحية' })} — {med.date_final}
            </div>
          )}
          {med.is_critical && (
            <div className="alert-banner error" style={{ marginBottom: 24 }}>
              <strong>{pickLang(lang, { fr: 'Statut critique:', ar: 'الحالة الحرجة:' })}</strong>{' '}
              {pickLang(lang, { fr: 'Ce médicament figure sur la liste ministérielle des médicaments critiques.', ar: 'هذا الدواء مدرج في القائمة الوزارية للأدوية الحرجة.' })}
              {med.critical_class_therapeutique && (
                <> {pickLang(lang, { fr: 'Classe thérapeutique', ar: 'الفئة العلاجية' })} : <strong>{med.critical_class_therapeutique}</strong></>
              )}
            </div>
          )}

          {/* Interactions : le bandeau en tête de fiche renvoie au détail juste sous l'essentiel */}
          {interactionsAnsm && <InteractionsBandeau fiche={interactionsAnsm} lang={lang} />}

          <div className="fiche-layout">
            <div className="fiche-main">
              {/* ─── Identification ──────────────────────────── */}
              <section className="fiche-box">
                <h2 className="fiche-box-title">{pickLang(lang, { fr: 'Identification', ar: 'التعريف' })}</h2>
                <table className="fiche-table"><tbody>
                  <Row label={pickLang(lang, { fr: 'DCI (Substance active)', ar: 'DCI (المادة الفعالة)' })} value={displayName(med.dci, lang)} />
                  <Row label={pickLang(lang, { fr: 'Nom de marque', ar: 'الاسم التجاري' })} value={displayName(med.nom_marque, lang)} />
                  <Row label={pickLang(lang, { fr: "N° d'enregistrement", ar: 'رقم التسجيل' })} value={med.n_enreg} />
                  <Row label={pickLang(lang, { fr: 'Code produit', ar: 'رمز المنتج' })} value={med.code} />
                  {med.code_atc && (
                    <Row label={pickLang(lang, { fr: 'Code ATC', ar: 'رمز ATC' })}>
                      <span className="fiche-atc">{med.code_atc}</span>
                      {(med.atc_label_fr || med.atc_label_en) && <> – {atcLabel({ label_fr: med.atc_label_fr, label_en: med.atc_label_en, label_ar: med.atc_label_ar }, lang)}</>}
                    </Row>
                  )}
                  {med.type_prod && (
                    <Row label={pickLang(lang, { fr: 'Type de produit', ar: 'نوع المنتج' })}>
                      <span className={`badge ${med.type_prod === 'BIO' ? 'badge-purple' : med.type_prod === 'RE' || med.type_prod === 'Ré' ? 'badge-blue' : 'badge-green'}`}>
                        {TYPE_LABELS[med.type_prod]?.[lang] || med.type_prod}
                      </span>
                    </Row>
                  )}
                  {med.statut && (
                    <Row label={pickLang(lang, { fr: 'Origine de fabrication', ar: 'بلد التصنيع' })}>
                      <span className={`badge ${med.statut === 'F' ? 'badge-green' : 'badge-gray'}`}>
                        {STATUT_LABELS[med.statut]?.[lang] || med.statut}
                      </span>
                    </Row>
                  )}
                </tbody></table>
              </section>

              {/* ─── Conditionnement ─────────────────────────── */}
              <section className="fiche-box">
                <h2 className="fiche-box-title">{pickLang(lang, { fr: 'Conditionnement', ar: 'الخصائص' })}</h2>
                <table className="fiche-table"><tbody>
                  <Row label={pickLang(lang, { fr: 'Forme pharmaceutique', ar: 'الشكل الصيدلاني' })} value={displayField('forme', med.forme, lang) || null} />
                  <Row label={pickLang(lang, { fr: 'Dosage', ar: 'الجرعة' })} value={displayField('dosage', med.dosage, lang) || null} />
                  {med.is_critical && (
                    <Row
                      label={pickLang(lang, { fr: 'Criticité', ar: 'الحرجية' })}
                      value={med.critical_class_therapeutique
                        ? pickLang(lang, { fr: `Critique (${med.critical_class_therapeutique})`, ar: `حرج (${med.critical_class_therapeutique})` })
                        : pickLang(lang, { fr: 'Critique', ar: 'حرج' })}
                    />
                  )}
                  <Row label={pickLang(lang, { fr: 'Conditionnement', ar: 'التعبئة' })} value={displayField('conditionnement', med.conditionnement, lang) || null} />
                  <Row label={pickLang(lang, { fr: 'Liste', ar: 'القائمة' })} value={displayField('liste', med.liste, lang) || null} />
                  <Row label={pickLang(lang, { fr: 'Prescription', ar: 'الوصفة' })} value={displayField('prescription', med.prescription, lang) || null} />
                  <Row label={pickLang(lang, { fr: 'Stabilité', ar: 'الاستقرار' })} value={displayField('stabilite', med.stabilite, lang) || null} />
                </tbody></table>
              </section>

              {/* ─── Fabricant ────────────────────────────────── */}
              <section className="fiche-box">
                <h2 className="fiche-box-title">{pickLang(lang, { fr: 'Fabricant', ar: 'المُصنّع' })}</h2>
                <table className="fiche-table"><tbody>
                  <Row label={pickLang(lang, { fr: 'Laboratoire', ar: 'المخبر' })} value={med.labo} />
                  {med.pays && (
                    <Row label={pickLang(lang, { fr: "Pays d'origine", ar: 'بلد المنشأ' })}>
                      {getCountryFlag(med.pays) && <span className="fiche-flag">{getCountryFlag(med.pays)}</span>}
                      {med.pays}
                    </Row>
                  )}
                </tbody></table>
              </section>

              {/* ─── Dates & Version ─────────────────────────── */}
              <section className="fiche-box">
                <h2 className="fiche-box-title">{pickLang(lang, { fr: 'Dates & Enregistrement', ar: 'التواريخ والتسجيل' })}</h2>
                <table className="fiche-table"><tbody>
                  <Row label={pickLang(lang, { fr: "Date d'enregistrement", ar: 'تاريخ التسجيل' })} value={med.date_init} />
                  {!isRetrait && <Row label={pickLang(lang, { fr: 'Date de fin de validité', ar: 'نهاية الصلاحية' })} value={med.date_final} />}
                  {med.annee && <Row label={pickLang(lang, { fr: 'Année de nomenclature', ar: 'سنة النومنكلاتور' })} value={String(med.annee)} />}
                  <Row label={pickLang(lang, { fr: 'Version source', ar: 'نسخة المصدر' })} value={med.source_version} />
                  {isRetrait && (
                    <>
                      <Row label={pickLang(lang, { fr: 'Date de retrait', ar: 'تاريخ السحب' })} value={med.date_retrait} />
                      <Row label={pickLang(lang, { fr: 'Motif de retrait', ar: 'سبب السحب' })} value={med.motif_retrait} />
                    </>
                  )}
                  {med.is_new_vs_previous === true && (
                    <Row label="">
                      <span className="badge badge-amber">Nouvelle inscription</span>
                    </Row>
                  )}
                </tbody></table>
              </section>

              {/* ─── Observations (si présentes) ─────────────── */}
              {med.obs && (
                <section className="fiche-box">
                  <h2 className="fiche-box-title">{pickLang(lang, { fr: 'Observations', ar: 'ملاحظات' })}</h2>
                  <div className="fiche-obs">{med.obs}</div>
                </section>
              )}
            </div>

            {/* ─── Repères : prix, DCI, prescription, accès rapides ─── */}
            <aside className="fiche-box fiche-aside">
              <h2 className="fiche-box-title">{pickLang(lang, { fr: 'Repères', ar: 'معالم' })}</h2>
              <div className="fiche-aside-body">
                <div className="fiche-aside-label">{pickLang(lang, { fr: 'PPA', ar: 'السعر العمومي (PPA)' })}</div>
                {ppa !== null ? (
                  <div className="fiche-price">{formatPpa(ppa, lang)}</div>
                ) : (
                  <div className="fiche-price-na">{pickLang(lang, { fr: 'Prix non disponible', ar: 'السعر غير متوفر' })}</div>
                )}

                <div className="fiche-aside-label">{pickLang(lang, { fr: 'DCI', ar: 'DCI' })}</div>
                <div className="fiche-aside-value">
                  {alternatifs.length > 0 && med.dci ? (
                    <Link href={`/dci/${encodeURIComponent(med.dci.toLowerCase())}`}><strong>{displayName(med.dci, lang)}</strong></Link>
                  ) : <strong>{displayName(med.dci, lang)}</strong>}
                </div>

                {med.prescription && (
                  <>
                    <div className="fiche-aside-label">{pickLang(lang, { fr: 'Prescription', ar: 'الوصفة' })}</div>
                    <div className="fiche-aside-value"><strong>{med.prescription}</strong></div>
                  </>
                )}

                {(med.forme || med.dosage) && (
                  <>
                    <div className="fiche-aside-label">{pickLang(lang, { fr: 'Forme / dosage', ar: 'الشكل / الجرعة' })}</div>
                    <div className="fiche-aside-value">{[med.forme, med.dosage].filter(Boolean).join(' – ')}</div>
                  </>
                )}

                {(med.statut || med.pays) && (
                  <>
                    <div className="fiche-aside-label">{pickLang(lang, { fr: 'Origine', ar: 'المنشأ' })}</div>
                    <div className="fiche-aside-value">
                      {med.pays && getCountryFlag(med.pays) && <span className="fiche-flag">{getCountryFlag(med.pays)}</span>}
                      {med.statut ? (STATUT_LABELS[med.statut]?.[lang] || med.statut) : med.pays}
                    </div>
                  </>
                )}

                {autres.length > 0 && (
                  <a className="fiche-btn" href="#meme-dci">
                    {pickLang(lang, { fr: `Voir les génériques (${autres.length})`, ar: `عرض الأدوية الجنيسة (${autres.length})` })}
                  </a>
                )}
                {interactionsAnsm && (
                  <a className="fiche-btn" href="#interactions">
                    {pickLang(lang, { fr: `Voir les interactions (${interactionsAnsm.items.length})`, ar: `عرض التداخلات (${interactionsAnsm.items.length})` })}
                  </a>
                )}
                {!isRetrait && !isNonRenouv && (
                  rcps.length > 0 ? (
                    <a className="fiche-btn" href="#rcp">
                      {pickLang(lang, { fr: 'Voir le RCP officiel', ar: 'عرض RCP الرسمي' })}
                    </a>
                  ) : (
                    <a className="fiche-btn fiche-btn-outline" href={RCP_PORTAL_URL} target="_blank" rel="noopener noreferrer">
                      {pickLang(lang, { fr: 'Chercher le RCP (ANPP)', ar: 'البحث عن RCP (ANPP)' })}
                    </a>
                  )
                )}
                <a className="fiche-btn fiche-btn-outline" href={googleBoxSearchHref(med)} target="_blank" rel="noopener noreferrer">
                  {pickLang(lang, { fr: 'Voir la boîte (Google)', ar: 'صورة العلبة (Google)' })}
                </a>
              </div>
            </aside>
          </div>

          {/* ─── Interactions médicamenteuses (Thesaurus ANSM), en avant : avant la pub et les RCP ─── */}
          {interactionsAnsm && <InteractionsAnsmSection fiche={interactionsAnsm} lang={lang} />}

          {/* Pub juste après l'essentiel de la fiche : c'est là que le
              visiteur venu de Google a encore les yeux. Celle du bas de page
              n'était presque jamais vue. */}
          <AdInContent />

          {/* ─── Monographie de la DCI (contenu saisi et relu) ──── */}
          {/* ─── RCP officiel (ANPP) : lien vers le PDF du portail ─── */}
          <RcpSection rcps={rcps} lang={lang} />
          {med.dci && <InteractionsEntrantes items={interactionsVers} dci={med.dci} lang={lang} />}

          {monographie && <MonographieSection m={monographie} dci={med.dci} lang={lang} />}

          {/* ─── Analyse propre à la fiche ───────────────────── */}
          {insights && (
            <MedicamentInsights
              med={med}
              data={insights}
              famille={famille}
              familleHref={familleHref}
              lang={lang}
              routeLang={routeLang}
            />
          )}

          {/* ─── Classification ATC ──────────────────────────── */}
          {atcHierarchy.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div className="section-title">{pickLang(lang, { fr: '🧬 Classification ATC', ar: '🧬 التصنيف ATC' })}</div>
              <div className="section-sub">
                {pickLang(lang, {
                  fr: 'Anatomical Therapeutic Chemical — Classification OMS',
                  ar: 'Anatomical Therapeutic Chemical — تصنيف منظمة الصحة العالمية',
                })}
              </div>
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: 10,
                padding: '16px 20px',
                marginTop: 12,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 0,
              }}>
                {atcHierarchy.map((level, idx) => (
                  <div key={level.code} style={{ display: 'flex', alignItems: 'center' }}>
                    {idx > 0 && (
                      <span style={{ color: '#64748b', fontSize: 16, margin: '0 6px' }}>›</span>
                    )}
                    <Link href={`/classes-therapeutiques/${level.code}`} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      textDecoration: 'none',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: level.niveau === 5 ? 800 : 600,
                        fontSize: level.niveau === 5 ? 14 : 12,
                        color: level.niveau === 5 ? '#1d4ed8' : '#64748b',
                        background: level.niveau === 5 ? '#eff6ff' : 'transparent',
                        border: level.niveau === 5 ? '1.5px solid #bfdbfe' : 'none',
                        borderRadius: level.niveau === 5 ? 5 : 0,
                        padding: level.niveau === 5 ? '1px 7px' : '0',
                        letterSpacing: '.05em',
                      }}>
                        {level.code}
                      </span>
                      <span style={{
                        fontSize: 10,
                        color: level.niveau === 5 ? '#1e40af' : '#475569',
                        maxWidth: 140,
                        lineHeight: 1.3,
                        marginTop: 2,
                      }}>
                        {atcLabel(level, lang)}
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Médicaments similaires (même DCI) ───────────── */}
          {autres.length > 0 && (
            <div id="meme-dci" style={{ marginTop: 40 }}>
              <div className="section-title">
                {pickLang(lang, { fr: '🔁 Autres médicaments avec la même DCI', ar: '🔁 أدوية أخرى بنفس المادة الفعالة' })}
              </div>
              <div className="section-sub">
                {pickLang(lang, {
                  fr: <>{autres.length} médicament(s) enregistré(s) contenant <strong>{med.dci}</strong></>,
                  ar: <>{autres.length} دواء مسجل يحتوي على <strong>{displayName(med.dci, lang)}</strong></>,
                })}
              </div>
              <div className="detail-alt-grid">
                {autres.map(a => (
                  <Link
                    key={a.id}
                    href={medicamentPath('enregistrement', a.id, a, routeLang)}
                    className="detail-alt-card"
                  >
                    <div className="detail-alt-name">{displayName(a.nom_marque, lang)}</div>
                    {(a.forme || a.dosage) && (
                      <div className="detail-alt-meta">{[displayField('forme', a.forme, lang), displayField('dosage', a.dosage, lang)].filter(Boolean).join(' — ')}</div>
                    )}
                    {a.labo && (
                      <div className="detail-alt-meta">
                        🏭 {a.labo}
                        {a.pays ? (
                          <> ({getCountryFlag(a.pays) ? `${getCountryFlag(a.pays)} ` : ''}{a.pays})</>
                        ) : ''}
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {a.type_prod && (
                        <span className={`badge ${a.type_prod === 'BIO' ? 'badge-purple' : a.type_prod === 'RE' || a.type_prod === 'Ré' ? 'badge-blue' : 'badge-green'}`}>
                          {TYPE_LABELS[a.type_prod]?.[lang] || a.type_prod}
                        </span>
                      )}
                      {a.statut && (
                        <span className={`badge ${a.statut === 'F' ? 'badge-green' : 'badge-gray'}`}>
                          {a.statut === 'F' ? '🇩🇿' : '📦'}
                        </span>
                      )}
                      {a.annee && <span className="badge badge-amber">{a.annee}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ─── FAQ (mêmes questions que le JSON-LD FAQPage) ──── */}
          <section style={{ marginTop: 40 }}>
            <div className="section-title">
              {pickLang(lang, { fr: '❓ Questions fréquentes', ar: '❓ أسئلة شائعة' })}
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {faq.map(item => (
                <div key={item.question} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{item.question}</h3>
                  <p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#334155', margin: 0 }}>{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ─── Actions ─────────────────────────────────────── */}
          <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <BackButton
              label={pickLang(lang, { fr: '← Retour', ar: '→ رجوع' })}
              fallbackHref="/recherche"
            />
            {familleHref && (
              <Link href={familleHref} style={{
                padding: '10px 20px', background: 'white', color: '#0f172a',
                border: '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 13,
                textDecoration: 'none',
              }}>
                {pickLang(lang, {
                  fr: `📚 Toutes les présentations de ${med.nom_marque.trim().split(/\s+/)[0]}`,
                  ar: `📚 كل تقديمات ${med.nom_marque.trim().split(/\s+/)[0]}`,
                })}
              </Link>
            )}
            <Link href={`/recherche?q=${encodeURIComponent(med.dci)}`} style={{
              padding: '10px 20px', background: '#0284c7', color: 'white',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
              transition: 'all .15s',
            }}>
              {pickLang(lang, { fr: '🔍 Tous les médicaments avec cette DCI', ar: '🔍 كل الأدوية بهذه المادة الفعالة' })}
            </Link>
            <a
              href={googleBoxSearchHref(med)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 20px', background: 'white', color: '#0f172a',
                border: '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 13,
                textDecoration: 'none', transition: 'all .15s',
              }}
            >
              {pickLang(lang, { fr: '🔎 Voir la boîte (Google)', ar: '🔎 صورة العلبة (Google)' })}
            </a>
            <PrintButton
              label={pickLang(lang, { fr: 'Imprimer / PDF', ar: 'طباعة / PDF' })}
            />
          </div>

          <AdInContent />

          {/* ─── Glossaire des abréviations ───────────────────── */}
          <GlossarySection lang={lang} />
        </div>
      </div>
    </>
  )
}
