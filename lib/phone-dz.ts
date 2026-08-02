/**
 * Normalisation des numéros algériens saisis à la main.
 *
 * Les documents DSP écrivent « 07.91.90.96.97 », « 048 44 74 10 » ou
 * « 0661236311 » : on garde la saisie telle quelle dans phone_raw et on
 * en déduit phone_e164, seul format utilisable pour un lien tel: ou
 * WhatsApp.
 */

const DZ_COUNTRY_CODE = '213'

/** @returns le numéro en E.164 (+213…) ou null si la saisie n'y ressemble pas. */
export function toDzE164(input: string | null | undefined): string | null {
  if (!input) return null

  const hasPlus = input.trim().startsWith('+')
  const digits = input.replace(/\D/g, '')
  if (!digits) return null

  // +213 6 61 23 63 11 / 00213…
  let national = digits
  if (hasPlus && digits.startsWith(DZ_COUNTRY_CODE)) national = digits.slice(3)
  else if (digits.startsWith('00' + DZ_COUNTRY_CODE)) national = digits.slice(5)
  else if (digits.startsWith(DZ_COUNTRY_CODE) && digits.length >= 11) national = digits.slice(3)
  else if (digits.startsWith('0')) national = digits.slice(1)

  // Mobiles : 9 chiffres après le 0 (0661236311 -> 661236311).
  // Fixes : 8 chiffres après le 0 (048.44.74.10 -> 48447410).
  const isMobile = /^[567]\d{8}$/.test(national)
  const isLandline = /^[2-4]\d{7}$/.test(national)
  if (!isMobile && !isLandline) return null

  return `+${DZ_COUNTRY_CODE}${national}`
}
