/**
 * Autocomplétion de la recherche : marques, substances (DCI) et laboratoires
 * de la nomenclature dont le nom commence par — ou contient — la saisie.
 * Insensible à la casse et aux accents. Quand rien ne correspond (faute de
 * frappe, saisie en arabe ou en arabizi), on retombe sur la recherche
 * tolérante du site, qui sait rapprocher synonymes et noms étrangers.
 */

import { query } from './db'
import { searchMedicamentsTolerant } from './queries'

export type SuggestionKind = 'marque' | 'dci' | 'labo'
export type Suggestion = { kind: SuggestionKind; label: string; sub: string | null; n: number }

const PER_KIND = 5
const FIELD: Record<SuggestionKind, string> = { marque: 'nom_marque', dci: 'dci', labo: 'labo' }

const escapeLike = (s: string) => s.replace(/[\\%_]/g, m => `\\${m}`)

async function suggestKind(kind: SuggestionKind, q: string): Promise<Suggestion[]> {
  const f = FIELD[kind]
  const sub = kind === 'marque' ? 'MIN(dci)' : 'NULL'
  const rows = await query<{ label: string; sub: string | null; n: string }>(
    `SELECT TRIM(${f}) AS label, ${sub} AS sub, COUNT(*)::TEXT AS n
       FROM enregistrements
      WHERE ${f} IS NOT NULL AND unaccent(lower(${f})) LIKE '%' || $1 || '%'
      GROUP BY TRIM(${f})
      ORDER BY (unaccent(lower(TRIM(${f}))) LIKE $1 || '%') DESC, COUNT(*) DESC, TRIM(${f})
      LIMIT ${PER_KIND}`,
    [escapeLike(q.toLowerCase())]
  )
  return rows.map(r => ({ kind, label: r.label, sub: r.sub, n: Number(r.n) }))
}

export async function suggestSearch(raw: string): Promise<Suggestion[]> {
  const q = raw.replace(/\s+/g, ' ').trim().slice(0, 60)
  if (q.length < 2) return []

  // unaccent() n'accepte pas un paramètre non typé : on le rend explicite côté SQL via lower()/unaccent() de la colonne,
  // et on retire les accents de la saisie en JS pour comparer les deux côtés.
  const folded = q.normalize('NFD').replace(/[̀-ͯ]/g, '')

  const [marques, dci, labos] = await Promise.all([
    suggestKind('marque', folded), suggestKind('dci', folded), suggestKind('labo', folded),
  ])
  const found = [...marques, ...dci, ...labos]
  if (found.length > 0 || q.length < 3) return found

  // Repli tolérant : fautes de frappe, arabe, arabizi, noms étrangers.
  try {
    const { results, matchedTerm } = await searchMedicamentsTolerant(q, 'enregistrement', 12)
    const out: Suggestion[] = []
    // La ou les substances retrouvées d'abord : c'est ce que le visiteur cherchait.
    const dcis = new Set<string>()
    if (matchedTerm) dcis.add(matchedTerm.trim().toUpperCase())
    for (const r of results) if (r.dci && dcis.size < 2) dcis.add(r.dci.trim().toUpperCase())
    for (const d of dcis) out.push({ kind: 'dci', label: d, sub: null, n: results.filter(r => r.dci?.trim().toUpperCase() === d).length })
    const seen = new Set<string>()
    for (const r of results) {
      const label = r.nom_marque?.trim()
      if (!label || seen.has(label.toLowerCase())) continue
      seen.add(label.toLowerCase())
      out.push({ kind: 'marque', label, sub: r.dci ?? null, n: 1 })
      if (out.length >= PER_KIND + dcis.size) break
    }
    return out
  } catch {
    return []
  }
}
