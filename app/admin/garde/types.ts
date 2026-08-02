/** Fiche pharmacie telle que l'admin la manipule (API /api/admin/garde/pharmacies). */
export type AdminPharmacy = {
  id: number
  external_id?: string
  wilaya_code: string
  wilaya_name_fr: string | null
  commune_code: string | null
  commune_name_fr: string
  commune_name_ar: string | null
  type: string | null
  name_fr: string | null
  name_ar: string | null
  address_fr: string | null
  address_ar: string | null
  phone_raw: string | null
  phone_e164: string | null
  lat: number | null
  lng: number | null
  geocode_status: string
  is_premium?: boolean
  premium_verified?: boolean
}

/** Abonnement « Fiche Pharmacie Premium » (sql/15_garde_premium.sql). */
export type PremiumRecord = {
  pharmacy_id: number
  is_active: boolean
  verified: boolean
  plan: string
  starts_on: string | null
  ends_on: string | null
  whatsapp_e164: string | null
  hours_fr: string | null
  hours_ar: string | null
  highlight_fr: string | null
  highlight_ar: string | null
  photos: { url: string; caption?: string | null }[]
  admin_note: string | null
}

export type PremiumStats = { views_30d: number; views_month: number }
