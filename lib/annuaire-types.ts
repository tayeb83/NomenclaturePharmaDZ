/**
 * Types et helpers de l'annuaire utilisables côté client (aucune
 * dépendance base de données).
 */
import { slugify } from '@/lib/slug'
import type { GardeWindow, PharmacyHours } from '@/lib/annuaire-hours'

/** Slug indicatif d'une fiche (jamais utilisé comme clé : l'id fait foi). */
export function pharmacySlug(p: { name_fr: string | null; name_ar: string | null }): string {
  return slugify(p.name_fr || '') || 'pharmacie'
}

/** Chemin canonique d'une fiche : /pharmacie/12-pharmacie-el-amel (préfixe /ar en arabe). */
export function pharmacyPath(p: { id: number; name_fr: string | null; name_ar: string | null }, lang: 'fr' | 'ar' = 'fr'): string {
  return `${lang === 'ar' ? '/ar' : ''}/pharmacie/${p.id}-${pharmacySlug(p)}`
}

/** Extrait l'id d'un segment « 12-pharmacie-el-amel » ou « 12 ». */
export function parsePharmacyParam(param: string): { id: number; slug: string } | null {
  let decoded = param
  try { decoded = decodeURIComponent(param) } catch { return null }
  const m = /^(\d{1,12})(?:-(.*))?$/.exec(decoded)
  if (!m) return null
  return { id: Number(m[1]), slug: m[2] || '' }
}

/** Ligne de liste : le strict nécessaire pour ne pas alourdir la page. */
export type ListPharmacy = {
  id: number
  name_fr: string | null
  name_ar: string | null
  commune_slug: string
  commune_name_fr: string
  commune_name_ar: string | null
  address_fr: string | null
  address_ar: string | null
  phone_raw: string | null
  phone_e164: string | null
  lat: number | null
  lng: number | null
  verified: boolean
  is_premium: boolean
  highlight_fr: string | null
  highlight_ar: string | null
  hours: PharmacyHours
  garde: GardeWindow[]
}

export function toListItem(p: ListPharmacy): ListPharmacy {
  return {
    id: p.id, name_fr: p.name_fr, name_ar: p.name_ar,
    commune_slug: p.commune_slug, commune_name_fr: p.commune_name_fr, commune_name_ar: p.commune_name_ar,
    address_fr: p.address_fr, address_ar: p.address_ar,
    phone_raw: p.phone_raw, phone_e164: p.phone_e164, lat: p.lat, lng: p.lng,
    verified: p.verified, is_premium: p.is_premium,
    highlight_fr: p.highlight_fr, highlight_ar: p.highlight_ar,
    hours: p.hours, garde: p.garde,
  }
}

/** Nom d'affichage dans la langue de la page, avec repli sur l'autre. */
export function displayName(p: { name_fr: string | null; name_ar: string | null }, lang: 'fr' | 'ar'): string {
  if (lang === 'ar') return p.name_ar || p.name_fr || 'صيدلية'
  return p.name_fr || p.name_ar || 'Pharmacie'
}

/**
 * Numéro à afficher : toujours en chiffres occidentaux et groupés
 * (0661 23 63 11, 048 44 74 10), quelle que soit la langue de la page.
 * À rendre dans un élément dir="ltr" pour que la bidi ne l'inverse pas.
 */
export function formatPhoneDisplay(e164: string | null, raw?: string | null): string {
  if (e164 && /^\+213\d{8,9}$/.test(e164)) {
    const n = e164.slice(4)
    return n.length === 9
      ? `0${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}`
      : `0${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)} ${n.slice(6)}`
  }
  // Chiffres arabo-indiens éventuels dans la saisie brute → chiffres occidentaux.
  return (raw || '')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .trim()
}
