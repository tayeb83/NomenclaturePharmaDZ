/**
 * DwaDZ — texte d'analyse des fiches médicament, calculé à partir de la seule
 * nomenclature : équivalents exacts, volumes du laboratoire, validité de
 * l'AMM, sens de la mention de prescription. Aucun contenu médical (indication,
 * posologie…) n'est produit ici — voir lib/monographies.ts pour cela.
 */

import type { Lang } from './i18n'
import type { MedicamentInsightsData } from './queries'

type InsightMed = {
  nom_marque: string
  dci?: string | null
  dosage?: string | null
  forme?: string | null
  labo?: string | null
  liste?: string | null
  prescription?: string | null
  date_init?: string | null
  date_final?: string | null
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

function parseDate(s: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? '')
  if (!m) return null
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return isNaN(d.getTime()) ? null : d
}

function formatDate(d: Date, lang: Lang): string {
  return d.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

/** Durée approximative entre deux dates, en mots (« 6 ans », « 3 mois »). */
function span(from: Date, to: Date, lang: Lang): string {
  const months = Math.max(0, Math.round((to.getTime() - from.getTime()) / (30.44 * 86_400_000)))
  if (months >= 24) {
    const y = Math.floor(months / 12)
    return lang === 'ar' ? `${y} سنوات` : `${y} ans`
  }
  if (months >= 1) return lang === 'ar' ? `${months} أشهر` : `${months} mois`
  return lang === 'ar' ? 'أقل من شهر' : 'moins d\'un mois'
}

/**
 * Sens réglementaire d'une mention de liste / prescription. On n'explique que
 * les mentions reconnues sans ambiguïté ; sinon on ne dit rien plutôt que de
 * deviner.
 */
export function describePrescription(med: Pick<InsightMed, 'liste' | 'prescription'>, lang: Lang): string | null {
  const raw = `${clean(med.liste)} ${clean(med.prescription)}`.trim()
  if (!raw) return null
  const ar = lang === 'ar'
  const parts: string[] = []
  if (/stup/i.test(raw)) {
    parts.push(ar ? 'مصنف ضمن المخدرات، وتخضع وصفه وصرفه لتنظيم خاص' : 'classé parmi les stupéfiants, dont la prescription et la délivrance sont soumises à une réglementation spécifique')
  } else if (/\bliste\s*(ii|2)\b/i.test(raw)) {
    parts.push(ar ? 'مدرج في القائمة II، ويُصرف بوصفة طبية' : 'inscrit sur la liste II, délivré sur ordonnance')
  } else if (/\bliste\s*(i|1)\b/i.test(raw)) {
    parts.push(ar ? 'مدرج في القائمة I، ويُصرف بوصفة طبية' : 'inscrit sur la liste I, délivré sur ordonnance')
  }
  if (/\bhop|hôp/i.test(raw)) {
    parts.push(ar ? 'مخصص للاستعمال الاستشفائي' : 'réservé à l\'usage hospitalier')
  }
  if (!parts.length) return null
  const shown = [clean(med.liste), clean(med.prescription)].filter(Boolean).join(' / ')
  return ar
    ? `بحسب التسمية الوطنية (${shown})، هذا الدواء ${parts.join('، و')}.`
    : `Selon la nomenclature (${shown}), ce médicament est ${parts.join(' et ')}. Seul un professionnel de santé peut conseiller dans votre situation.`
}

/** Phrases de validité de l'enregistrement (AMM). */
export function describeValidity(med: Pick<InsightMed, 'nom_marque' | 'date_init' | 'date_final'>, lang: Lang, now = new Date()): string | null {
  const init = parseDate(med.date_init)
  const fin = parseDate(med.date_final)
  const ar = lang === 'ar'
  const out: string[] = []
  if (init) {
    out.push(ar
      ? `سُجّل منذ ${formatDate(init, lang)} (قبل ${span(init, now, lang)} تقريبا).`
      : `Enregistré depuis le ${formatDate(init, lang)} (il y a environ ${span(init, now, lang)}).`)
  }
  if (fin) {
    if (fin.getTime() >= now.getTime()) {
      out.push(ar
        ? `رخصة التسويق سارية حتى ${formatDate(fin, lang)} (بعد ${span(now, fin, lang)} تقريبا).`
        : `Son enregistrement est valable jusqu'au ${formatDate(fin, lang)} (dans environ ${span(now, fin, lang)}).`)
    } else {
      out.push(ar
        ? `انتهت صلاحية التسجيل المعلنة بتاريخ ${formatDate(fin, lang)} : يُرجى التحقق من التجديد في التسمية الجارية.`
        : `La validité indiquée a pris fin le ${formatDate(fin, lang)} : vérifiez le renouvellement dans la nomenclature en vigueur.`)
    }
  }
  return out.length ? out.join(' ') : null
}

export type InsightText = { equivalents: string; labo: string | null; validity: string | null; prescription: string | null }

export function buildInsightText(med: InsightMed, data: MedicamentInsightsData, lang: Lang): InsightText {
  const ar = lang === 'ar'
  const desig = [clean(med.nom_marque), clean(med.dosage)].filter(Boolean).join(' ')
  const dci = clean(med.dci)
  const n = data.equivalents_total
  const autresDosages = Math.max(0, data.dci_total - n)

  let equivalents: string
  if (n > 0) {
    const labos = data.equivalents_labos
    const locaux = data.equivalents_locaux
    equivalents = ar
      ? `يوجد في الجزائر ${n} من المنتجات المسجلة الأخرى بنفس المادة الفعالة (${dci}) ونفس الجرعة ونفس الشكل مثل ${desig}` +
        `${labos ? `، من مخابر عددها ${labos}` : ''}${locaux ? `، منها ${locaux} مصنعة محليا` : ''}.`
      : `${n} autre${n > 1 ? 's' : ''} présentation${n > 1 ? 's' : ''} enregistrée${n > 1 ? 's' : ''} en Algérie ${n > 1 ? 'ont' : 'a'} la même substance active (${dci}), le même dosage et la même forme que ${desig}` +
        `${labos ? `, issue${n > 1 ? 's' : ''} de ${labos} laboratoire${labos > 1 ? 's' : ''}` : ''}` +
        `${locaux ? ` dont ${locaux} fabriquée${locaux > 1 ? 's' : ''} localement` : ''}.`
  } else {
    equivalents = ar
      ? `لا يوجد حاليا في التسمية الوطنية منتج آخر بنفس المادة الفعالة والجرعة والشكل مثل ${desig}.`
      : `Aucune autre présentation de même substance active, dosage et forme que ${desig} n'est enregistrée dans la nomenclature actuelle.`
  }
  if (autresDosages > 0 && dci) {
    equivalents += ar
      ? ` ويحتوي ${autresDosages} من المنتجات الأخرى على ${dci} بجرعات أو أشكال مختلفة.`
      : ` ${autresDosages} autre${autresDosages > 1 ? 's' : ''} produit${autresDosages > 1 ? 's' : ''} contien${autresDosages > 1 ? 'nent' : 't'} aussi ${dci}, à d'autres dosages ou formes.`
  }

  const labo = clean(med.labo)
  const laboText = labo && data.labo_total > 0
    ? (ar
        ? `يضم سجل مخبر ${labo} ${data.labo_total} من المنتجات المسجلة الأخرى في الجزائر.`
        : `Le laboratoire ${labo} compte ${data.labo_total} autre${data.labo_total > 1 ? 's' : ''} produit${data.labo_total > 1 ? 's' : ''} enregistré${data.labo_total > 1 ? 's' : ''} en Algérie.`)
    : null

  return {
    equivalents,
    labo: laboText,
    validity: describeValidity(med, lang),
    prescription: describePrescription(med, lang),
  }
}
