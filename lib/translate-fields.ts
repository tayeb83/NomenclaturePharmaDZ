/**
 * Traduction (français → arabe) des propriétés d'une fiche : forme pharmaceutique, dosage,
 * conditionnement, liste, prescription, stabilité.
 *
 * Principe « quand c'est possible » : chaque traducteur retourne `null` dès qu'un mot lui est
 * inconnu, et l'affichage garde alors la valeur d'origine. Aucune traduction approximative.
 * Dictionnaires en minuscules sans accents ; à compléter au fil des valeurs rencontrées.
 *
 * Safe côté client (aucune dépendance serveur).
 */

import type { Lang } from './i18n'

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

/** Découpe en mots (lettres/chiffres/signes utiles), en gardant les nombres entiers « 2,5 ». */
function tokens(s: string): string[] {
  return fold(s).match(/\d+(?:[.,]\d+)?|[a-z]+|%|[/+.,()-]/g) ?? []
}

// ─── Unités et dosages ────────────────────────────────────────
const UNITS: Record<string, string> = {
  mg: 'ملغ', g: 'غ', gr: 'غ', kg: 'كغ', mcg: 'ميكروغرام', ug: 'ميكروغرام', µg: 'ميكروغرام',
  ml: 'مل', l: 'ل', cl: 'سل', ui: 'و.د', iu: 'و.د', meq: 'ميلي مكافئ', mmol: 'ملمول',
  '%': '٪', dose: 'جرعة', doses: 'جرعات', gtt: 'قطرة', gouttes: 'قطرات', goutte: 'قطرة',
  cp: 'قرص', comprime: 'قرص', gelule: 'كبسولة', sachet: 'كيس', ampoule: 'أمبولة', amp: 'أمبولة',
  flacon: 'قارورة', fl: 'قارورة', tube: 'أنبوب', stylo: 'قلم', seringue: 'محقنة',
  cartouche: 'خرطوشة', pulverisation: 'رشة', bouffee: 'نفخة', actuation: 'رشة',
  par: 'لكل', pour: 'لكل', de: 'من', et: 'و', ou: 'أو', mmhg: 'ملم زئبق', h: 'ساعة', heure: 'ساعة',
  heures: 'ساعات', jour: 'يوم', j: 'يوم', unite: 'وحدة', unites: 'وحدات', u: 'وحدة', k: 'ألف',
}
const SEPARATORS = new Set(['/', '+', '.', ',', '(', ')', '-'])

/** « 2,5MG » → « 2,5 ملغ » ; « 500 MG/5 ML » → « 500 ملغ/5 مل » ; null si un mot est inconnu. */
export function translateDosage(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const toks = tokens(value)
  if (!toks.length) return null
  let out = ''
  for (const t of toks) {
    if (/^\d/.test(t)) out += (out && !/[/+(-]$/.test(out) ? ' ' : '') + t
    else if (SEPARATORS.has(t)) out += t === ',' || t === '.' ? t : t
    else if (t in UNITS) out += (out && !/[/+(-]$/.test(out) ? ' ' : '') + UNITS[t]
    else return null
  }
  return out.replace(/\s+([/+)])/g, '$1').replace(/([,.])\s+/g, '$1 ').trim()
}

// ─── Formes pharmaceutiques ───────────────────────────────────
const FORME_WORDS: Record<string, string> = {
  comprime: 'قرص', comprimes: 'أقراص', gelule: 'كبسولة', gelules: 'كبسولات', capsule: 'كبسولة',
  sirop: 'شراب', solution: 'محلول', suspension: 'معلق', emulsion: 'مستحلب', poudre: 'مسحوق',
  granule: 'حبيبات', granules: 'حبيبات', sachet: 'كيس', suppositoire: 'تحاميل', ovule: 'بيوض مهبلية',
  creme: 'كريم', pommade: 'مرهم', gel: 'جل', lotion: 'غسول', shampooing: 'شامبو', pate: 'معجون',
  collyre: 'قطرة عينية', collutoire: 'غرغرة', gouttes: 'قطرات', injectable: 'للحقن', buvable: 'للشرب',
  ophtalmique: 'للعين', nasal: 'للأنف', auriculaire: 'للأذن', cutanee: 'جلدي', cutane: 'جلدي',
  vaginal: 'مهبلي', rectal: 'شرجي', oral: 'فموي', orale: 'فموية', pellicule: 'مغلف', enrobe: 'مغلف',
  effervescent: 'فوار', effervescente: 'فوارة', dispersible: 'قابل للتشتت', orodispersible: 'يذوب في الفم',
  secable: 'قابل للشطر', sublingual: 'تحت اللسان', gastroresistant: 'مقاوم للحموضة',
  prolongee: 'ممتد المفعول', retard: 'ممتد المفعول', lp: 'ممتد المفعول', liberation: 'تحرر',
  modifiee: 'معدل', lyophilisat: 'مجفف', lyophilise: 'مجفف', ampoule: 'أمبولة', flacon: 'قارورة',
  stylo: 'قلم', seringue: 'محقنة', spray: 'بخاخ', aerosol: 'إيروسول', inhalation: 'استنشاق',
  inhalateur: 'جهاز استنشاق', timbre: 'لصقة', patch: 'لصقة', transdermique: 'عبر الجلد',
  implant: 'غرسة', dispositif: 'جهاز', pastille: 'مصاصة', chewing: 'علكة', gum: 'علكة',
  perfusion: 'تسريب', intraveineuse: 'وريدي', intramusculaire: 'عضلي', sous: 'تحت',
  solvant: 'مذيب', diluant: 'مخفف', concentre: 'مركز', infusion: 'تسريب', tisane: 'مغلي أعشاب',
  masticable: 'للمضغ', unidose: 'وحيد الجرعة', multidose: 'متعدد الجرعات', adulte: 'للكبار',
  enfant: 'للأطفال', nourrisson: 'للرضع', pour: 'لـ', et: 'و', ou: 'أو', de: '', d: '', en: '',
  film: 'غشاء', sol: 'محلول', inj: 'للحقن', susp: 'معلق', cp: 'قرص',
}
/** Expressions à traduire d'un bloc (prioritaires sur le mot à mot). */
const FORME_PHRASES: Record<string, string> = {
  'comprime pellicule': 'قرص مغلف',
  'comprimes pellicules': 'أقراص مغلفة',
  'comprime enrobe': 'قرص مغلف',
  'comprime secable': 'قرص قابل للشطر',
  'comprime effervescent': 'قرص فوار',
  'comprime orodispersible': 'قرص يذوب في الفم',
  'comprime a croquer': 'قرص للمضغ',
  'comprime a liberation prolongee': 'قرص ممتد المفعول',
  'comprime a liberation modifiee': 'قرص معدل التحرر',
  'gelule gastro resistante': 'كبسولة مقاومة للحموضة',
  'poudre pour solution injectable': 'مسحوق لمحلول للحقن',
  'poudre pour suspension buvable': 'مسحوق لمعلق للشرب',
  'poudre pour solution buvable': 'مسحوق لمحلول للشرب',
  'poudre pour usage externe': 'مسحوق للاستعمال الخارجي',
  'solution injectable': 'محلول للحقن',
  'solution buvable': 'محلول للشرب',
  'suspension buvable': 'معلق للشرب',
  'solution pour perfusion': 'محلول للتسريب',
  'solution pour inhalation': 'محلول للاستنشاق',
  'solution pour pulverisation nasale': 'محلول بخاخ للأنف',
  'collyre en solution': 'قطرة عينية (محلول)',
  'gouttes buvables': 'قطرات للشرب',
  'gouttes nasales': 'قطرات للأنف',
  'gouttes auriculaires': 'قطرات للأذن',
  'gouttes ophtalmiques': 'قطرات للعين',
  'creme dermique': 'كريم جلدي',
  'sous cutanee': 'تحت الجلد',
  'voie orale': 'عن طريق الفم',
  'sirop pour enfant': 'شراب للأطفال',
}

function translateWords(value: string, words: Record<string, string>, phrases: Record<string, string> = {}): string | null {
  const toks = fold(value).match(/[a-z]+|\d+(?:[.,]\d+)?|%|[/+.,()-]/g)
  if (!toks?.length) return null
  const out: string[] = []
  let i = 0
  while (i < toks.length) {
    let matched = false
    for (let n = Math.min(5, toks.length - i); n >= 2 && !matched; n--) {
      const phrase = toks.slice(i, i + n).join(' ')
      if (phrase in phrases) { out.push(phrases[phrase]); i += n; matched = true }
    }
    if (matched) continue
    const t = toks[i]
    if (/^\d/.test(t) || t === '%') out.push(t === '%' ? '٪' : t)
    else if (SEPARATORS.has(t)) out.push(t)
    else if (t in words) { if (words[t]) out.push(words[t]) }
    else return null
    i += 1
  }
  return out.join(' ').replace(/\s+([/+,.)])/g, '$1').replace(/\(\s+/g, '(').trim() || null
}

export function translateForme(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  return translateWords(value, FORME_WORDS, FORME_PHRASES)
}

// ─── Conditionnement ──────────────────────────────────────────
const PACK: Record<string, string> = {
  b: 'علبة', bte: 'علبة', boite: 'علبة', fl: 'قارورة', flacon: 'قارورة', t: 'أنبوب', tube: 'أنبوب',
  sach: 'كيس', sachet: 'كيس', amp: 'أمبولة', ampoule: 'أمبولة', stylo: 'قلم', ser: 'محقنة',
  seringue: 'محقنة', cart: 'خرطوشة', cartouche: 'خرطوشة', pl: 'شريط', plq: 'شريط', plaquette: 'شريط',
  pot: 'علبة بلاستيكية', poche: 'كيس', unit: 'وحدة',
}

/** « B/20 » → « علبة من 20 » ; « FL/100 ML » → « قارورة 100 مل » ; sinon null. */
export function translateConditionnement(value: string | null | undefined): string | null {
  const v = value?.trim()
  if (!v) return null
  const m = fold(v).match(/^([a-z]+)\s*(?:\/|de|d')\s*(.+)$/)
  if (!m || !(m[1] in PACK)) return null
  const rest = m[2].trim()
  if (/^\d+$/.test(rest)) return `${PACK[m[1]]} من ${rest}`
  const dose = translateDosage(rest)
  return dose ? `${PACK[m[1]]} ${dose}` : null
}

// ─── Liste, prescription ──────────────────────────────────────
const LISTES: Record<string, string> = {
  'liste i': 'القائمة I',
  'liste 1': 'القائمة I',
  'liste ii': 'القائمة II',
  'liste 2': 'القائمة II',
  stupefiant: 'مخدّر',
  stupefiants: 'مخدّرات',
  'liste des stupefiants': 'قائمة المخدرات',
  psychotrope: 'مؤثر عقلي',
  psychotropes: 'مؤثرات عقلية',
  'hors liste': 'خارج القوائم',
  'non liste': 'غير مدرج في القوائم',
  'sans liste': 'غير مدرج في القوائم',
}
export function translateListe(value: string | null | undefined): string | null {
  const v = value ? fold(value).replace(/\s+/g, ' ').trim() : ''
  return v in LISTES ? LISTES[v] : null
}

const PRESCRIPTIONS: Record<string, string> = {
  hop: 'للاستعمال الاستشفائي',
  hopital: 'للاستعمال الاستشفائي',
  'usage hospitalier': 'للاستعمال الاستشفائي',
  otc: 'بدون وصفة طبية',
  oui: 'بوصفة طبية',
  non: 'بدون وصفة طبية',
  obligatoire: 'بوصفة طبية إلزامية',
  restreinte: 'وصفة مقيدة',
}
export function translatePrescription(value: string | null | undefined): string | null {
  const v = value ? fold(value).replace(/\s+/g, ' ').trim() : ''
  return v in PRESCRIPTIONS ? PRESCRIPTIONS[v] : null
}

// ─── Stabilité (durée) ────────────────────────────────────────
function plural(n: number, forms: [string, string, string, string]): string {
  // [un, deux (duel), 3-10, 11+]
  if (n === 1) return forms[0]
  if (n === 2) return forms[1]
  if (n >= 3 && n <= 10) return `${n} ${forms[2]}`
  return `${n} ${forms[3]}`
}
const DURATIONS: Record<string, [string, string, string, string]> = {
  mois: ['شهر واحد', 'شهران', 'أشهر', 'شهرا'],
  an: ['سنة واحدة', 'سنتان', 'سنوات', 'سنة'],
  ans: ['سنة واحدة', 'سنتان', 'سنوات', 'سنة'],
  jour: ['يوم واحد', 'يومان', 'أيام', 'يوما'],
  jours: ['يوم واحد', 'يومان', 'أيام', 'يوما'],
  semaine: ['أسبوع واحد', 'أسبوعان', 'أسابيع', 'أسبوعا'],
  semaines: ['أسبوع واحد', 'أسبوعان', 'أسابيع', 'أسبوعا'],
  heure: ['ساعة واحدة', 'ساعتان', 'ساعات', 'ساعة'],
  heures: ['ساعة واحدة', 'ساعتان', 'ساعات', 'ساعة'],
}
/** « 24 MOIS » → « 24 شهرا » ; « 3 ANS » → « 3 سنوات ». Les mentions de conservation restent d'origine. */
export function translateStabilite(value: string | null | undefined): string | null {
  const m = value ? fold(value).trim().match(/^(\d+)\s*([a-z]+)$/) : null
  if (!m || !(m[2] in DURATIONS)) return null
  return plural(Number(m[1]), DURATIONS[m[2]])
}

// ─── Affichage ────────────────────────────────────────────────
export type FieldKind = 'forme' | 'dosage' | 'conditionnement' | 'liste' | 'prescription' | 'stabilite'

const TRANSLATORS: Record<FieldKind, (v: string | null | undefined) => string | null> = {
  forme: translateForme,
  dosage: translateDosage,
  conditionnement: translateConditionnement,
  liste: translateListe,
  prescription: translatePrescription,
  stabilite: translateStabilite,
}

/**
 * Valeur d'une propriété selon la langue : en arabe, la traduction puis la valeur d'origine entre
 * parenthèses (comme les noms arabisés) ; valeur d'origine seule si aucune traduction sûre.
 */
export function displayField(kind: FieldKind, value: string | null | undefined, lang: Lang): string {
  if (!value) return ''
  if (lang !== 'ar') return value
  const ar = TRANSLATORS[kind](value)
  return ar && ar !== value ? `${ar} (${value})` : value
}
