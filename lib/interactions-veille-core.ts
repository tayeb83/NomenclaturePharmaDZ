/**
 * DwaDZ — relecture des interactions candidates (sql/42_interactions_veille.sql) : libellés, validation d'une
 * décision et source à inscrire quand un candidat est accepté. Sans base ni réseau : testable seul.
 *   npm run test:interactions
 */
import { NIVEAUX, type Niveau } from './interactions-core.ts'
import { GRAVITE_VERS_NIVEAU, type Gravite } from './interactions-gap-core.ts'
import { normaliserNom, type InteractionInput } from './interactions-admin-core.ts'

export type Statut = 'nouveau' | 'en_revue' | 'accepte' | 'rejete' | 'differe'
export type EcartCandidat = 'absente' | 'divergence_niveau'

export const STATUTS: Statut[] = ['nouveau', 'en_revue', 'differe', 'accepte', 'rejete']
export const STATUT_LABEL: Record<Statut, string> = {
  nouveau: 'Nouveau', en_revue: 'En revue', differe: 'Différé', accepte: 'Accepté', rejete: 'Rejeté',
}
export const ECART_LABEL: Record<EcartCandidat, string> = {
  absente: 'Absente de l’ANSM',
  divergence_niveau: 'Niveau différent de l’ANSM',
}
export const GRAVITE_LABEL: Record<Gravite, string> = {
  contre_indiquee: 'Contre-indiquée',
  deconseillee: 'Déconseillée',
  precaution: 'Précaution d’emploi',
  a_prendre_en_compte: 'À prendre en compte',
  non_precisee: 'Gravité non précisée',
}

/** Niveau proposé au relecteur : celui qui correspond à la gravité du RCP, « précaution » quand elle n'est pas précisée. */
export const niveauSuggere = (g: Gravite): Niveau => (g === 'non_precisee' ? 'precaution_emploi' : GRAVITE_VERS_NIVEAU[g])

export type Action = 'en_revue' | 'differe' | 'rejete' | 'accepte' | 'rouvrir'

export type Decision = {
  id: number
  action: Action
  motif: string | null
  /** acceptation seulement */
  niveau: Niveau | null
  risque_fr: string
  mecanisme_fr: string | null
  conduite_fr: string
  /** preuve (interactions_evidence.id) à citer comme source ; la première si absent */
  preuve_id: number | null
}

const ACTIONS: Action[] = ['en_revue', 'differe', 'rejete', 'accepte', 'rouvrir']
const str = (v: unknown, max = 4000): string => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim().slice(0, max) : '')
const opt = (v: unknown, max = 4000): string | null => str(v, max) || null

export function validateDecision(raw: unknown): { ok: true; value: Decision } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Données invalides' }
  const b = raw as Record<string, unknown>
  const id = Number(b.id)
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: 'Candidat inconnu.' }
  if (!ACTIONS.includes(b.action as Action)) return { ok: false, error: 'Action inconnue.' }
  const action = b.action as Action
  const motif = opt(b.motif, 1000)
  if (action === 'rejete' && !motif) return { ok: false, error: 'Indiquez le motif du rejet : il évite de revoir la même paire.' }

  let niveau: Niveau | null = null
  const risque_fr = str(b.risque_fr)
  if (action === 'accepte') {
    if (!NIVEAUX.includes(b.niveau as Niveau)) return { ok: false, error: 'Choisissez le niveau de gravité.' }
    niveau = b.niveau as Niveau
    if (!risque_fr) return { ok: false, error: 'Décrivez le risque en vos propres termes (français) : le texte du RCP n’est pas recopié.' }
  }
  const preuve = Number(b.preuve_id)
  return {
    ok: true,
    value: {
      id, action, motif, niveau, risque_fr,
      mecanisme_fr: opt(b.mecanisme_fr), conduite_fr: str(b.conduite_fr),
      preuve_id: Number.isInteger(preuve) && preuve > 0 ? preuve : null,
    },
  }
}

export type PreuveRcp = {
  nom_commercial: string | null
  laboratoire: string | null
  pdf_url: string | null
  section: string
  page: number | null
  version: string | null
}

/** Source à inscrire sur l'interaction acceptée : le RCP de l'ANPP, avec sa rubrique, sa page et sa version. */
export function sourceDepuisPreuve(p: PreuveRcp): Pick<InteractionInput, 'source_type' | 'source_titre' | 'source_url' | 'source_ref'> {
  const ref = [p.section ? `rubrique ${p.section}` : '', p.page ? `p. ${p.page}` : '', p.version ? `version ${p.version}` : ''].filter(Boolean).join(', ')
  return {
    source_type: 'rcp',
    source_titre: `RCP ANPP${p.nom_commercial ? ` — ${p.nom_commercial}` : ''}${p.laboratoire ? ` (${p.laboratoire})` : ''}`,
    source_url: p.pdf_url && /^https?:\/\//.test(p.pdf_url) ? p.pdf_url : null,
    source_ref: ref || null,
  }
}

/** Interaction à créer à partir d'un candidat accepté ; deux substances : les deux sens sont créés pour que les deux fiches l'affichent. */
export function interactionDepuisCandidat(
  c: { substance_a: string; substance_b: string; b_est_classe?: boolean },
  d: Decision,
  source: PreuveRcp,
): InteractionInput {
  return {
    substance: normaliserNom(c.substance_a),
    partenaire: normaliserNom(c.substance_b),
    partenaire_est_classe: !!c.b_est_classe,
    niveau: d.niveau!,
    risque_fr: d.risque_fr,
    mecanisme_fr: d.mecanisme_fr,
    conduite_fr: d.conduite_fr,
    risque_ar: null, mecanisme_ar: null, conduite_ar: null, partenaire_ar: null, ar_statut: 'absent',
    ...sourceDepuisPreuve(source),
    // « A + CLASSE » : pas de sens inverse (la classe n'a pas de fiche médicament)
    inverse: !c.b_est_classe,
  }
}
