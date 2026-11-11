/**
 * DwaDZ — paramètres d'URL du filtre « Allergie connue » : ?allergie=0060520&allergie_mode=signaler|masquer.
 * Un code inconnu, une allergie sans substance (excipient, latex) ou un mode inconnu : le filtre est ignoré, jamais une erreur.
 */

import { allergieParCode } from './allergies-core.ts'

export type ModeAllergie = 'signaler' | 'masquer'
export type AllergieChoisie = { code: string; mode: ModeAllergie }

export function allergieDepuisParams(get: (nom: string) => string | null | undefined): AllergieChoisie | null {
  const code = (get('allergie') ?? '').trim().replace(/^DOID:/i, '')
  const a = code ? allergieParCode(code) : null
  if (!a || a.perimetre !== 'fiche') return null
  return { code: a.code, mode: get('allergie_mode') === 'masquer' ? 'masquer' : 'signaler' }
}
