/**
 * DwaDZ — FAQ des fiches médicament, rédigée uniquement à partir des données
 * de la nomenclature (DCI, type, statut, ATC, dates, laboratoire).
 *
 * Aucune posologie, indication ou effet indésirable n'est inventé : la
 * nomenclature MIPH n'en publie pas, et un contenu médical non relu n'a pas sa
 * place ici. La dernière question dit explicitement où trouver ces
 * informations, ce qui répond aux requêtes « posologie », « effets
 * secondaires » sans les promettre.
 */

import type { Lang } from './i18n'

export type FaqItem = { question: string; answer: string }

type FaqMed = {
  source: 'enregistrement' | 'retrait' | 'non_renouvele'
  nom_marque: string
  dci?: string | null
  dosage?: string | null
  forme?: string | null
  labo?: string | null
  pays?: string | null
  type_prod?: string | null
  statut?: string | null
  prescription?: string | null
  date_init?: string | null
  date_final?: string | null
  date_retrait?: string | null
  motif_retrait?: string | null
  code_atc?: string | null
  atc_label_fr?: string | null
}

type Equivalent = { nom_marque: string }

const TYPE_LABEL: Record<string, { fr: string; ar: string }> = {
  GE: { fr: 'un médicament générique', ar: 'دواء جنيس' },
  'Gé': { fr: 'un médicament générique', ar: 'دواء جنيس' },
  RE: { fr: 'un médicament de référence (étranger)', ar: 'دواء مرجعي أجنبي' },
  'Ré': { fr: 'un médicament de référence (étranger)', ar: 'دواء مرجعي أجنبي' },
  BIO: { fr: 'un médicament biologique', ar: 'دواء بيولوجي' },
  I: { fr: 'un médicament innovateur', ar: 'دواء مبتكر' },
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

export function buildMedicamentFaq(med: FaqMed, equivalents: Equivalent[], lang: Lang): FaqItem[] {
  const ar = lang === 'ar'
  const nom = [clean(med.nom_marque), clean(med.dosage)].filter(Boolean).join(' ')
  const dci = clean(med.dci)
  const labo = clean(med.labo)
  const pays = clean(med.pays)
  const items: FaqItem[] = []

  if (dci) {
    items.push(
      ar
        ? { question: `ما هي المادة الفعالة في ${nom}؟`, answer: `المادة الفعالة في ${nom} هي ${dci}، حسب التسمية الوطنية للمنتجات الصيدلانية (MIPH).` }
        : { question: `Quelle est la substance active de ${nom} ?`, answer: `La substance active de ${nom} est ${dci} (DCI), selon la nomenclature nationale des produits pharmaceutiques (MIPH).` }
    )
  }

  // Statut réglementaire : la réponse qui compte pour qui cherche « est-ce
  // encore en vente ? ».
  const dates = [med.date_init && (ar ? `تاريخ التسجيل ${med.date_init}` : `date d'enregistrement : ${med.date_init}`),
    med.date_final && (ar ? `تاريخ الانتهاء ${med.date_final}` : `échéance : ${med.date_final}`)].filter(Boolean)
  if (med.source === 'retrait') {
    const when = med.date_retrait ? (ar ? ` (تاريخ السحب: ${med.date_retrait})` : ` (date de retrait : ${med.date_retrait})`) : ''
    const why = med.motif_retrait ? (ar ? `. السبب: ${med.motif_retrait}` : `. Motif : ${med.motif_retrait}`) : ''
    items.push(ar
      ? { question: `هل ${nom} ما زال مسجلا في الجزائر؟`, answer: `لا، سُحب ${nom} من التسمية الوطنية${when}${why}. راجعوا البدائل المسجلة بنفس المادة الفعالة.` }
      : { question: `${nom} est-il encore enregistré en Algérie ?`, answer: `Non, ${nom} a été retiré de la nomenclature nationale${when}${why}. Consultez les équivalents encore enregistrés avec la même substance active.` })
  } else if (med.source === 'non_renouvele') {
    items.push(ar
      ? { question: `هل ${nom} ما زال مسجلا في الجزائر؟`, answer: `لا، لم يتم تجديد رخصة التسويق (AMM) الخاصة بـ ${nom}، فهو لم يعد مسجلا في التسمية الجارية.` }
      : { question: `${nom} est-il encore enregistré en Algérie ?`, answer: `Non, l'autorisation de mise sur le marché (AMM) de ${nom} n'a pas été renouvelée : il ne figure plus dans la nomenclature en vigueur.` })
  } else {
    items.push(ar
      ? { question: `هل ${nom} مسجل في الجزائر؟`, answer: `نعم، ${nom} مسجل في التسمية الوطنية للمنتجات الصيدلانية${dates.length ? ` (${dates.join('، ')})` : ''}.` }
      : { question: `${nom} est-il enregistré en Algérie ?`, answer: `Oui, ${nom} figure dans la nomenclature nationale des produits pharmaceutiques${dates.length ? ` (${dates.join(', ')})` : ''}.` })
  }

  const type = med.type_prod ? TYPE_LABEL[med.type_prod] : undefined
  if (type) {
    items.push(ar
      ? { question: `هل ${nom} دواء جنيس؟`, answer: `${nom} مصنف في التسمية الوطنية على أنه ${type.ar}.` }
      : { question: `${nom} est-il un générique ?`, answer: `${nom} est classé dans la nomenclature nationale comme ${type.fr}.` })
  }

  if (labo || pays) {
    const local = med.statut === 'F'
    const imported = med.statut === 'I'
    items.push(ar
      ? { question: `من ينتج ${nom}؟`, answer: `${nom} من إنتاج ${labo ? `مخبر ${labo}` : 'مخبر غير مذكور'}${pays ? ` (${pays})` : ''}${local ? '، وهو مصنع في الجزائر' : imported ? '، وهو دواء مستورد' : ''}.` }
      : { question: `Quel laboratoire fabrique ${nom} ?`, answer: `${nom} est produit par ${labo ? `le laboratoire ${labo}` : 'un laboratoire non renseigné'}${pays ? ` (${pays})` : ''}${local ? ' ; il est fabriqué en Algérie' : imported ? ' ; il est importé' : ''}.` })
  }

  const names = Array.from(new Set(equivalents.map(e => clean(e.nom_marque)).filter(n => n && n.toLowerCase() !== clean(med.nom_marque).toLowerCase()))).slice(0, 5)
  if (dci && names.length) {
    items.push(ar
      ? { question: `ما هي بدائل ${nom}؟`, answer: `تحتوي أدوية أخرى مسجلة في الجزائر على المادة الفعالة نفسها (${dci})، منها: ${names.join('، ')}. القائمة الكاملة أسفل الصفحة. استشيروا الصيدلي قبل أي استبدال.` }
      : { question: `Existe-t-il des équivalents ou génériques de ${nom} ?`, answer: `D'autres médicaments enregistrés en Algérie contiennent la même substance active (${dci}), par exemple : ${names.join(', ')}. La liste complète figure plus bas sur la page. Demandez conseil à un pharmacien avant toute substitution.` })
  }

  if (med.code_atc) {
    const label = clean(med.atc_label_fr)
    items.push(ar
      ? { question: `ما هو التصنيف العلاجي (ATC) لـ ${nom}؟`, answer: `رمز ATC المرتبط بـ ${dci || nom} هو ${med.code_atc}${label ? ` (${label})` : ''}.` }
      : { question: `Quelle est la classe thérapeutique (ATC) de ${nom} ?`, answer: `Le code ATC associé à ${dci || nom} est ${med.code_atc}${label ? ` (${label})` : ''}.` })
  }

  if (clean(med.prescription)) {
    items.push(ar
      ? { question: `هل يتطلب ${nom} وصفة طبية؟`, answer: `الوصفة حسب التسمية الوطنية: ${clean(med.prescription)}. للتأكد من حالتكم، استشيروا طبيبا أو صيدليا.` }
      : { question: `${nom} nécessite-t-il une ordonnance ?`, answer: `Mention de prescription dans la nomenclature : ${clean(med.prescription)}. Pour votre situation, demandez conseil à un médecin ou à un pharmacien.` })
  }

  // Les requêtes qui amènent sur les fiches sont surtout « <marque> prix
  // algérie ». La base n'a aucun prix : on le dit, au lieu de laisser le
  // visiteur le chercher sur la page, et on l'oriente vers la source fiable.
  if (med.source === 'enregistrement') {
    items.push(ar
      ? { question: `ما هو سعر ${nom} في الجزائر؟`, answer: `لا تنشر التسمية الوطنية (MIPH) أسعار الأدوية، ولا يتوفر موقعنا على سعر ${nom}. للاطلاع على السعر المعمول به، اسألوا الصيدلي.` }
      : { question: `Quel est le prix de ${nom} en Algérie ?`, answer: `La nomenclature nationale (MIPH) ne publie pas les prix des médicaments, et DwaDZ ne dispose pas du prix de ${nom}. Pour connaître le prix en vigueur, demandez-le à votre pharmacien.` })
  }

  items.push(ar
    ? { question: `أين أجد الجرعة والآثار الجانبية لـ ${nom}؟`, answer: 'لا تنشر التسمية الوطنية (MIPH) الجرعات ولا الآثار الجانبية. راجعوا نشرة الدواء المرفقة بالعلبة أو استشيروا طبيبا أو صيدليا.' }
    : { question: `Où trouver la posologie et les effets secondaires de ${nom} ?`, answer: "La nomenclature nationale (MIPH) ne publie ni posologie ni effets indésirables. Reportez-vous à la notice fournie avec la boîte, ou demandez conseil à un médecin ou à un pharmacien." })

  return items
}
