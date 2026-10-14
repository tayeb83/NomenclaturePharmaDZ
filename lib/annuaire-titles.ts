/**
 * Titres de l'annuaire selon la zone : « Annuaire des pharmacies de
 * Saïda », « … de Maoussa (Mascara) », « دليل صيدليات ماوسة، معسكر ».
 * Logique pure, sans accès base : les surcharges éditées en admin
 * (table annuaire_places) sont passées en paramètre.
 */

export type Lang = 'fr' | 'ar'

export type TitlePlace = {
  wilayaFr: string
  wilayaAr?: string | null
  communeFr?: string | null
  communeAr?: string | null
  /** Surcharges admin : « de Saïda » / « سعيدة » */
  phraseFr?: string | null
  phraseAr?: string | null
}

/** « de Saïda », « d'Alger », « d'Hydra » : élision devant voyelle ou H. */
export function deFr(name: string): string {
  return /^[AEIOUYHÉÈÊÂÎÔÛ]/i.test(name.trim()) ? `d'${name.trim()}` : `de ${name.trim()}`
}

/** « à Saïda » */
export function aFr(name: string): string {
  return `à ${name.trim()}`
}

function sameName(a?: string | null, b?: string | null): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** Libellé « (de X) » de la zone : sans article défini pour l'arabe. */
export function placePhrase(place: TitlePlace | null, lang: Lang): string {
  if (lang === 'ar') {
    if (!place) return 'الجزائر'
    if (place.phraseAr) return place.phraseAr
    const wilaya = place.wilayaAr || place.wilayaFr
    const commune = place.communeAr || place.communeFr
    return commune && !sameName(commune, wilaya) ? `${commune}، ${wilaya}` : wilaya
  }
  if (!place) return "d'Algérie"
  if (place.phraseFr) return place.phraseFr
  const commune = place.communeFr
  return commune && !sameName(commune, place.wilayaFr)
    ? `${deFr(commune)} (${place.wilayaFr})`
    : deFr(place.wilayaFr)
}

export type AnnuaireTitles = {
  h1: string
  metaTitle: string
  description: string
  breadcrumbLabel: string
}

export function annuaireTitles(place: TitlePlace | null, lang: Lang, count?: number): AnnuaireTitles {
  const phrase = placePhrase(place, lang)
  if (lang === 'ar') {
    const n = count != null ? `${count} صيدلية` : 'الصيدليات'
    return {
      h1: `دليل صيدليات ${phrase}`,
      metaTitle: `صيدليات ${phrase}: العناوين والهواتف وساعات العمل والمناوبة`,
      description: `${n} في ${phrase} مع العنوان ورقم الهاتف وساعات العمل والصيدليات المناوبة. بحث بالاسم أو الحي.`,
      breadcrumbLabel: place ? phrase : 'الدليل',
    }
  }
  const n = count != null ? `${count} pharmacie${count > 1 ? 's' : ''}` : 'Les pharmacies'
  return {
    h1: `Annuaire des pharmacies ${phrase}`,
    metaTitle: `Pharmacies ${phrase} : adresses, téléphones, horaires et gardes`,
    description: `${n} ${phrase} avec adresse, numéro de téléphone, horaires d'ouverture et pharmacies de garde. Recherche par nom ou quartier.`,
    breadcrumbLabel: place ? phrase.replace(/^(de |d')/, '') : 'Annuaire',
  }
}
