import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import {
  getCachedMedicamentById,
  getCachedAlternatifsDCI,
  getCachedAtcHierarchyByDci,
} from '@/lib/medicament-cache'
import type { Metadata } from 'next'
import type { MedicamentDetail, AtcCode } from '@/lib/db-types'
import { getCountryFlag } from '@/lib/countryFlag'
import { pickLang, type Lang } from '@/lib/i18n'
import { medicamentPath, medicamentSlug } from '@/lib/medicament-url'
import { medicalPageJsonLd } from '@/lib/schema'
import { PrintButton } from '@/components/ui/PrintButton'
import { GlossarySection } from '@/components/ui/GlossarySection'
import { BackButton } from '@/components/ui/BackButton'
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

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className="detail-field-value">{value}</div>
    </div>
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
  const dosageSuffix = med.dosage ? ` ${med.dosage}` : ''
  const dciSuffix = med.dci ? ` (${med.dci})` : ''

  // Le nom de marque et la DCI restent en caractères latins (ce sont les
  // dénominations officielles), mais tout l'habillage éditorial est traduit :
  // c'est lui qui porte les mots-clés sur lesquels on se positionne en arabe.
  const title = pickLang(lang, {
    fr: `${med.nom_marque}${dosageSuffix} — Fiche technique et substitution | DwaDZ`,
    ar: `${med.nom_marque}${dosageSuffix} — بطاقة الدواء والبدائل | DwaDZ`,
  })
  const description = pickLang(lang, {
    fr: `${med.nom_marque}${dosageSuffix}${dciSuffix}${med.forme ? ` — ${med.forme}` : ''}${med.labo ? ` — ${med.labo}` : ''}. Médicament disponible en Algérie, substituts génériques et nomenclature MIPH officielle.`,
    ar: `${med.nom_marque}${dosageSuffix}${dciSuffix}${med.forme ? ` — ${med.forme}` : ''}${med.labo ? ` — ${med.labo}` : ''}. دواء متوفر في الجزائر، البدائل الجنيسة والتسمية الرسمية لوزارة الصناعة الصيدلانية.`,
  })

  // URLs canoniques enrichies du nom commercial : c'est cette forme qui est
  // déclarée aux moteurs et affichée dans les résultats de recherche.
  const frUrl = `${APP_URL}${medicamentPath(params.source, params.id, med, 'fr')}`
  const arUrl = `${APP_URL}${medicamentPath(params.source, params.id, med, 'ar')}`
  const canonical = pickLang(lang, { fr: frUrl, ar: arUrl })

  return {
    title,
    description,
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
    },
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

  const [alternatifs, atcHierarchy] = await Promise.all([
    getCachedAlternatifsDCI(med.dci, 10),
    getCachedAtcHierarchyByDci(med.dci),
  ])
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="page-header" style={{ background: headerBg }}>
        <div className="container">
          <BackButton
            label={pickLang(lang, { fr: '← Retour', ar: '→ رجوع' })}
            fallbackHref="/recherche"
            className="detail-back-link"
            style={{}}
          />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '.06em', marginBottom: 4 }}>
                {pickLang(lang, { fr: 'DCI — DÉNOMINATION COMMUNE INTERNATIONALE', ar: 'DCI — التسمية الدولية المشتركة' })}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>{med.dci}</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'white', margin: 0 }}>
                {med.nom_marque}
              </h1>
              {(med.forme || med.dosage) && (
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 }}>
                  {[med.forme, med.dosage].filter(Boolean).join(' — ')}
                </div>
              )}
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

          <div className="detail-grid">
            {/* ─── Identification ──────────────────────────── */}
            <div className="detail-card">
              <div className="detail-card-title">{pickLang(lang, { fr: '🔖 Identification', ar: '🔖 التعريف' })}</div>
              <Field label={pickLang(lang, { fr: 'DCI (Substance active)', ar: 'DCI (المادة الفعالة)' })} value={med.dci} />
              <Field label={pickLang(lang, { fr: 'Nom de marque', ar: 'الاسم التجاري' })} value={med.nom_marque} />
              <Field label={pickLang(lang, { fr: "N° d'enregistrement", ar: 'رقم التسجيل' })} value={med.n_enreg} />
              <Field label={pickLang(lang, { fr: 'Code produit', ar: 'رمز المنتج' })} value={med.code} />
              {/* ─── Code ATC inline dans identification si disponible ─ */}
              {med.code_atc && (
                <div className="detail-field">
                  <div className="detail-field-label">{pickLang(lang, { fr: 'Code ATC', ar: 'رمز ATC' })}</div>
                  <div className="detail-field-value">
                    <span style={{
                      display: 'inline-block',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: 13,
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1.5px solid #bfdbfe',
                      borderRadius: 6,
                      padding: '2px 10px',
                      letterSpacing: '.04em',
                    }}>
                      {med.code_atc}
                    </span>
                    {(med.atc_label_fr || med.atc_label_en) && (
                      <span style={{ marginLeft: 8, color: '#475569', fontSize: 13 }}>
                        {med.atc_label_fr || med.atc_label_en}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {med.type_prod && (
                <div className="detail-field">
                  <div className="detail-field-label">{pickLang(lang, { fr: 'Type de produit', ar: 'نوع المنتج' })}</div>
                  <div className="detail-field-value">
                    <span className={`badge ${med.type_prod === 'BIO' ? 'badge-purple' : med.type_prod === 'RE' || med.type_prod === 'Ré' ? 'badge-blue' : 'badge-green'}`}>
                      {TYPE_LABELS[med.type_prod]?.[lang] || med.type_prod}
                    </span>
                  </div>
                </div>
              )}
              {med.statut && (
                <div className="detail-field">
                  <div className="detail-field-label">{pickLang(lang, { fr: 'Origine de fabrication', ar: 'بلد التصنيع' })}</div>
                  <div className="detail-field-value">
                    <span className={`badge ${med.statut === 'F' ? 'badge-green' : 'badge-gray'}`}>
                      {STATUT_LABELS[med.statut]?.[lang] || med.statut}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Conditionnement ─────────────────────────── */}
            <div className="detail-card">
              <div className="detail-card-title">{pickLang(lang, { fr: '💊 Conditionnement', ar: '💊 الخصائص' })}</div>
              <Field label={pickLang(lang, { fr: 'Forme pharmaceutique', ar: 'الشكل الصيدلاني' })} value={med.forme} />
              <Field label={pickLang(lang, { fr: 'Dosage', ar: 'الجرعة' })} value={med.dosage} />
              {med.is_critical && (
                <Field
                  label={pickLang(lang, { fr: 'Criticité', ar: 'الحرجية' })}
                  value={med.critical_class_therapeutique
                    ? pickLang(lang, { fr: `Critique (${med.critical_class_therapeutique})`, ar: `حرج (${med.critical_class_therapeutique})` })
                    : pickLang(lang, { fr: 'Critique', ar: 'حرج' })}
                />
              )}
              <Field label={pickLang(lang, { fr: 'Conditionnement', ar: 'التعبئة' })} value={med.conditionnement} />
              <Field label={pickLang(lang, { fr: 'Liste', ar: 'القائمة' })} value={med.liste} />
              <Field label={pickLang(lang, { fr: 'Prescription', ar: 'الوصفة' })} value={med.prescription} />
              {med.stabilite && <Field label={pickLang(lang, { fr: 'Stabilité', ar: 'الاستقرار' })} value={med.stabilite} />}
            </div>

            {/* ─── Fabricant ────────────────────────────────── */}
            <div className="detail-card">
              <div className="detail-card-title">{pickLang(lang, { fr: '🏭 Fabricant', ar: '🏭 المُصنّع' })}</div>
              <Field label={pickLang(lang, { fr: 'Laboratoire', ar: 'المخبر' })} value={med.labo} />
              {med.pays && (
                <div className="detail-field">
                  <div className="detail-field-label">{pickLang(lang, { fr: "Pays d'origine", ar: 'بلد المنشأ' })}</div>
                  <div className="detail-field-value">
                    {getCountryFlag(med.pays) && (
                      <span style={{ fontSize: 20, marginRight: 6, verticalAlign: 'middle' }}>
                        {getCountryFlag(med.pays)}
                      </span>
                    )}
                    <span style={{ verticalAlign: 'middle' }}>{med.pays}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Dates & Version ─────────────────────────── */}
            <div className="detail-card">
              <div className="detail-card-title">{pickLang(lang, { fr: '📅 Dates & Enregistrement', ar: '📅 التواريخ والتسجيل' })}</div>
              <Field label={pickLang(lang, { fr: "Date d'enregistrement", ar: 'تاريخ التسجيل' })} value={med.date_init} />
              {!isRetrait && <Field label={pickLang(lang, { fr: 'Date de fin de validité', ar: 'نهاية الصلاحية' })} value={med.date_final} />}
              {med.annee && <Field label={pickLang(lang, { fr: 'Année de nomenclature', ar: 'سنة النومنكلاتور' })} value={String(med.annee)} />}
              <Field label={pickLang(lang, { fr: 'Version source', ar: 'نسخة المصدر' })} value={med.source_version} />
              {med.is_new_vs_previous === true && (
                <div className="detail-field">
                  <div className="detail-field-value">
                    <span className="badge badge-amber">Nouvelle inscription</span>
                  </div>
                </div>
              )}
              {isRetrait && (
                <>
                  <Field label={pickLang(lang, { fr: 'Date de retrait', ar: 'تاريخ السحب' })} value={med.date_retrait} />
                  <Field label={pickLang(lang, { fr: 'Motif de retrait', ar: 'سبب السحب' })} value={med.motif_retrait} />
                </>
              )}
            </div>

            {/* ─── Observations (si présentes) ─────────────── */}
            {med.obs && (
              <div className="detail-card" style={{ gridColumn: '1 / -1' }}>
                <div className="detail-card-title">{pickLang(lang, { fr: '📝 Observations', ar: '📝 ملاحظات' })}</div>
                <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.7 }}>{med.obs}</div>
              </div>
            )}
          </div>

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
                        {level.label_fr || level.label_en || ''}
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Médicaments similaires (même DCI) ───────────── */}
          {autres.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <div className="section-title">
                {pickLang(lang, { fr: '🔁 Autres médicaments avec la même DCI', ar: '🔁 أدوية أخرى بنفس المادة الفعالة' })}
              </div>
              <div className="section-sub">
                {pickLang(lang, {
                  fr: <>{autres.length} médicament(s) enregistré(s) contenant <strong>{med.dci}</strong></>,
                  ar: <>{autres.length} دواء مسجل يحتوي على <strong>{med.dci}</strong></>,
                })}
              </div>
              <div className="detail-alt-grid">
                {autres.map(a => (
                  <Link
                    key={a.id}
                    href={medicamentPath('enregistrement', a.id, a, routeLang)}
                    className="detail-alt-card"
                  >
                    <div className="detail-alt-name">{a.nom_marque}</div>
                    {(a.forme || a.dosage) && (
                      <div className="detail-alt-meta">{[a.forme, a.dosage].filter(Boolean).join(' — ')}</div>
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

          {/* ─── Actions ─────────────────────────────────────── */}
          <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <BackButton
              label={pickLang(lang, { fr: '← Retour', ar: '→ رجوع' })}
              fallbackHref="/recherche"
            />
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
