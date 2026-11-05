/** DwaDZ — découpe de texte en lignes (visuels de partage). Aucune dépendance : testable seul. */

/**
 * Découpe un texte en lignes d'au plus `max` caractères, coupées entre deux mots. Sert à l'arabe : satori écarte
 * trop les mots d'un texte qui passe à la ligne tout seul, alors qu'une ligne en un seul segment (espaces
 * insécables) reste bien serrée.
 */
export function lignes(texte: string, max: number, maxLignes = 4): string[] {
  const out: string[] = []
  let cur = ''
  for (const mot of texte.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + ' ' + mot).length > max) { out.push(cur); cur = mot } else cur = cur ? `${cur} ${mot}` : mot
  }
  if (cur) out.push(cur)
  if (out.length > maxLignes) { const r = out.slice(0, maxLignes); r[maxLignes - 1] = `${r[maxLignes - 1]}…`; return r }
  return out
}
