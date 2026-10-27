/**
 * DwaDZ — interactions médicamenteuses du Thesaurus ANSM (sql/29_interactions_ansm.sql).
 * Sans dépendance serveur : testable seul.
 *
 * Le thésaurus parle de substances et de classes. Une fiche médicament y est reliée par sa DCI :
 *   1. chaque substance de la DCI est rapprochée d'un titre du thésaurus (accents, sels, pluriel :
 *      même moteur que les RCP, lib/rcp-match.ts) ;
 *   2. les classes de cette substance s'ajoutent (« Voir aussi » du thésaurus, ou liste des membres) ;
 *   3. on affiche les lignes « + PARTENAIRE » écrites sous ces titres, jamais celles écrites pour le partenaire.
 * Prudence : un rapprochement douteux ne produit aucun lien, jamais un lien faux.
 */

import { buildMatchIndex, foldNom, resolveCible, type MatchIndex } from './rcp-match.ts'
import type { Lang } from './i18n.ts'

export type Niveau = 'contre_indication' | 'deconseillee' | 'precaution_emploi' | 'a_prendre_en_compte'

/** Du plus grave au moins grave : l'ordre d'affichage. */
export const NIVEAUX: Niveau[] = ['contre_indication', 'deconseillee', 'precaution_emploi', 'a_prendre_en_compte']
export const NIVEAU_RANG: Record<Niveau, number> = { contre_indication: 0, deconseillee: 1, precaution_emploi: 2, a_prendre_en_compte: 3 }

export type InteractionRow = {
  id: number
  substance: string
  partenaire: string
  partenaire_est_classe: boolean
  niveau: Niveau
  niveaux: Niveau[] | null
  risque_fr: string
  conduite_fr: string
  risque_ar: string | null
  conduite_ar: string | null
  partenaire_ar: string | null
  ar_statut: 'absent' | 'brouillon' | 'relu'
  page: number
  source_version: string
}

export type ClasseLien = { classe: string; membre: string }

export type ThesaurusIndex = {
  /** titres du thésaurus (substances et classes) */
  titres: MatchIndex
  /** noms cités comme membres d'une classe, et titres qui renvoient à une classe */
  membres: MatchIndex
  /** nom de membre → classes auxquelles il appartient */
  classesDe: Map<string, string[]>
  /** clé d'un titre de classe → membres connus (pour la liste dépliable) */
  membresDe: Map<string, string[]>
}

export const cle = (s: string): string => foldNom(s)

export function buildThesaurusIndex(titres: string[], liens: ClasseLien[]): ThesaurusIndex {
  const classesDe = new Map<string, string[]>()
  const membresDe = new Map<string, string[]>()
  for (const { classe, membre } of liens) {
    const c = classesDe.get(membre) ?? []
    if (!c.includes(classe)) classesDe.set(membre, [...c, classe])
    const m = membresDe.get(cle(classe)) ?? []
    if (!m.includes(membre)) membresDe.set(cle(classe), [...m, membre])
  }
  const noms = (l: string[]) => [...new Set(l)].map(dci => ({ dci, n: 1 }))
  return {
    titres: buildMatchIndex({ dcis: noms(titres), atc: [] }),
    membres: buildMatchIndex({ dcis: noms(liens.map(l => l.membre)), atc: [] }),
    classesDe,
    membresDe,
  }
}

/** Écarts connus entre la nomenclature et le thésaurus que le rapprochement ne comble pas seul. */
const EQUIVALENTS: [RegExp, string][] = [
  [/^VALPRO(?:ATE|[IÏ]QUE)\b/i, 'ACIDE VALPROIQUE'],
]

const EXPRIME_EN = /\s+EXPRIM[ÉE]E?S?\s+(?:EN|SOUS FORME DE)\s+/i

/**
 * Substances d'une DCI de la nomenclature : « A + B », « A/B ».
 * « SEL EXPRIME EN BASE » donne les deux écritures : on ne sait pas laquelle le thésaurus emploie.
 */
export function substancesDeDci(dci: string): string[] {
  const parties = EXPRIME_EN.test(dci) ? dci.split(EXPRIME_EN) : [dci]
  const noms = parties.flatMap(p => p.split(/\s*[+/]\s*|\s+ET\s+/i)).map(s => s.trim()).filter(Boolean)
  return [...new Set(noms.map(n => EQUIVALENTS.find(([re]) => re.test(n))?.[1] ?? n))]
}

export type Resolution = {
  /** titres du thésaurus qui correspondent aux substances de la fiche */
  titres: string[]
  /** classes dont ces substances sont membres */
  classes: string[]
}

export function resoudreDci(t: ThesaurusIndex, dci: string): Resolution {
  const titres = new Set<string>()
  const classes = new Set<string>()
  for (const composant of substancesDeDci(dci)) {
    const q = { libelle: composant, cible_type: null, cible: null } as const
    const titre = resolveCible(t.titres, q).dci
    if (titre) titres.add(titre)
    const membre = resolveCible(t.membres, q).dci
    for (const nom of new Set([titre, membre])) {
      for (const c of (nom && t.classesDe.get(nom)) || []) classes.add(c)
    }
  }
  for (const titre of titres) classes.delete(titre)
  return { titres: [...titres].sort(), classes: [...classes].sort() }
}

export type InteractionItem = {
  id: number
  niveau: Niveau
  /** tous les niveaux d'une ligne composée (« CI - ASDEC »), sinon un seul */
  niveaux: Niveau[]
  partenaire: string
  /** nom français d'origine, renseigné seulement quand `partenaire` est sa traduction arabe */
  partenaire_origine: string | null
  partenaire_est_classe: boolean
  risque: string
  conduite: string
  /** langue réelle des textes affichés : l'arabe retombe sur le français tant qu'il n'est pas traduit */
  langue: Lang
  /** traduction arabe relue ; false tant qu'elle est en brouillon ; null si le texte est en français */
  relue: boolean | null
  page: number
  /** titre du thésaurus sous lequel la ligne est écrite */
  substance: string
  /** renseigné quand la ligne vient d'une classe de la substance, pas de la substance elle-même */
  via_classe: string | null
}

export function toItem(row: InteractionRow, lang: Lang, directs: ReadonlySet<string>): InteractionItem {
  // une traduction partielle (risque traduit, conduite à tenir absente) ne se mélange pas au français
  const ar = lang === 'ar' && !!row.risque_ar && (!row.conduite_fr || !!row.conduite_ar)
  return {
    id: row.id,
    niveau: row.niveau,
    niveaux: row.niveaux?.length ? row.niveaux : [row.niveau],
    partenaire: (lang === 'ar' && row.partenaire_ar) || row.partenaire,
    partenaire_origine: lang === 'ar' && row.partenaire_ar ? row.partenaire : null,
    partenaire_est_classe: row.partenaire_est_classe,
    risque: ar ? row.risque_ar! : row.risque_fr,
    conduite: ar ? row.conduite_ar ?? '' : row.conduite_fr,
    langue: ar ? 'ar' : 'fr',
    relue: ar ? row.ar_statut === 'relu' : null,
    page: row.page,
    substance: row.substance,
    via_classe: directs.has(row.substance) ? null : row.substance,
  }
}

/** Gravité d'abord, puis les lignes de la substance avant celles de sa classe, puis l'alphabet. */
export function trierItems(items: InteractionItem[]): InteractionItem[] {
  return [...items].sort((a, b) =>
    NIVEAU_RANG[a.niveau] - NIVEAU_RANG[b.niveau]
    || Number(!!a.via_classe) - Number(!!b.via_classe)
    || a.partenaire.localeCompare(b.partenaire, 'fr')
    || a.id - b.id)
}

export function grouperParNiveau(items: InteractionItem[]): { niveau: Niveau; items: InteractionItem[] }[] {
  return NIVEAUX
    .map(niveau => ({ niveau, items: items.filter(i => i.niveau === niveau) }))
    .filter(g => g.items.length > 0)
}

/** « AUTRES AMINOSIDES » → « AMINOSIDES » : la classe dont le partenaire désigne le reste. */
export function classeDuPartenaire(t: ThesaurusIndex, partenaire: string): string | null {
  const k = cle(partenaire)
  if (t.membresDe.has(k)) return partenaire
  const sans = partenaire.replace(/^AUTRES\s+/i, '')
  return sans !== partenaire && t.membresDe.has(cle(sans)) ? sans : null
}

/** Membres connus d'une classe partenaire, pour la liste dépliable. */
export function membresDeClasse(t: ThesaurusIndex, partenaire: string): string[] {
  const classe = classeDuPartenaire(t, partenaire)
  return classe ? [...(t.membresDe.get(cle(classe)) ?? [])].sort((a, b) => a.localeCompare(b, 'fr')) : []
}
