/**
 * DwaDZ — Unités des dosages : symbole affiché, code UCUM, nom arabe.
 * Sans dépendance serveur.
 *
 * UCUM (Unified Code for Units of Measure, https://ucum.org) est le système d'unités attendu par FHIR
 * (Quantity.system = http://unitsofmeasure.org). UCUM ne définit que des codes : il n'a pas de traductions.
 * Les noms arabes sont donc ceux du site (mêmes abréviations que lib/translate-fields.ts).
 * Les codes ont été vérifiés avec la bibliothèque de référence @lhncbc/ucum-lhc.
 *
 * `ucum: null` : pas d'unité UCUM. Un contenant (flacon, sachet…) relève des « unités de présentation » EDQM,
 * que nos sources ne portent pas encore ; le degré alcoolique n'a pas de code UCUM propre.
 */

export const UCUM_SYSTEM = 'http://unitsofmeasure.org'

export type Contenant = 'flacon' | 'sachet' | 'stick' | 'ampoule' | 'seringue' | 'stylo' | 'cp' | 'gelule'
export type Unite = 'mg' | 'g' | 'µg' | 'ng' | 'kg' | 'ml' | 'l' | 'cl' | 'µl' | 'ui' | 'mui' | 'kui' | '%' | 'deg' | 'ir' | 'mmol' | 'meq'
  | 'dose' | 'goutte' | 'pulv' | 'cm2' | 'h' | Contenant

export type UniteInfo = { symbole: string; ucum: string | null; ar: string }

export const UNITES_INFO: Record<Unite, UniteInfo> = {
  mg: { symbole: 'mg', ucum: 'mg', ar: 'ملغ' },
  g: { symbole: 'g', ucum: 'g', ar: 'غ' },
  'µg': { symbole: 'µg', ucum: 'ug', ar: 'ميكروغرام' },
  ng: { symbole: 'ng', ucum: 'ng', ar: 'نانوغرام' },
  kg: { symbole: 'kg', ucum: 'kg', ar: 'كغ' },
  ml: { symbole: 'ml', ucum: 'mL', ar: 'مل' },
  l: { symbole: 'l', ucum: 'L', ar: 'ل' },
  cl: { symbole: 'cl', ucum: 'cL', ar: 'سل' },
  'µl': { symbole: 'µl', ucum: 'uL', ar: 'ميكرولتر' },
  ui: { symbole: 'UI', ucum: '[iU]', ar: 'و.د' },
  mui: { symbole: 'M UI', ucum: 'M[iU]', ar: 'مليون و.د' },
  kui: { symbole: 'k UI', ucum: 'k[iU]', ar: 'ألف و.د' },
  '%': { symbole: '%', ucum: '%', ar: '٪' },
  deg: { symbole: '°', ucum: null, ar: '°' },
  ir: { symbole: 'IR', ucum: '[IR]', ar: 'مؤشر التفاعل' },
  mmol: { symbole: 'mmol', ucum: 'mmol', ar: 'ملمول' },
  meq: { symbole: 'mEq', ucum: 'meq', ar: 'ميلي مكافئ' },
  dose: { symbole: 'dose', ucum: '{dose}', ar: 'جرعة' },
  goutte: { symbole: 'goutte', ucum: '[drp]', ar: 'قطرة' },
  pulv: { symbole: 'pulvérisation', ucum: '{actuation}', ar: 'رشة' },
  cm2: { symbole: 'cm²', ucum: 'cm2', ar: 'سم²' },
  h: { symbole: 'h', ucum: 'h', ar: 'ساعة' },
  flacon: { symbole: 'flacon', ucum: null, ar: 'قارورة' },
  sachet: { symbole: 'sachet', ucum: null, ar: 'كيس' },
  stick: { symbole: 'stick', ucum: null, ar: 'كيس' },
  ampoule: { symbole: 'ampoule', ucum: null, ar: 'أمبولة' },
  seringue: { symbole: 'seringue', ucum: null, ar: 'محقنة' },
  stylo: { symbole: 'stylo', ucum: null, ar: 'قلم' },
  cp: { symbole: 'comprimé', ucum: null, ar: 'قرص' },
  gelule: { symbole: 'gélule', ucum: null, ar: 'كبسولة' },
}
