/**
 * DwaDZ — saisie des interactions depuis l'admin : validation et libellés, sans base ni réseau (testable).
 * Voir sql/40_interactions_admin.sql. Une interaction saisie à la main porte toujours sa source :
 * RCP, article scientifique, étude, site, thésaurus ANSM ou autre.
 *   npm run test:interactions
 */
import { cle, NIVEAUX, type Niveau } from './interactions-core.ts'

export type SourceType = 'ansm' | 'rcp' | 'article' | 'etude' | 'site' | 'autre'
export const SOURCE_TYPES: SourceType[] = ['rcp', 'article', 'etude', 'site', 'ansm', 'autre']
export const SOURCE_LABEL: Record<SourceType, { fr: string; ar: string }> = {
  ansm: { fr: 'Thésaurus ANSM', ar: 'مدونة ANSM' },
  rcp: { fr: 'RCP (résumé des caractéristiques du produit)', ar: 'ملخص خصائص المنتج (RCP)' },
  article: { fr: 'Article scientifique', ar: 'مقال علمي' },
  etude: { fr: 'Étude / essai clinique', ar: 'دراسة / تجربة سريرية' },
  site: { fr: 'Site web de référence', ar: 'موقع مرجعي' },
  autre: { fr: 'Autre source', ar: 'مصدر آخر' },
}
export const SOURCE_COURT: Record<SourceType, { fr: string; ar: string }> = {
  ansm: { fr: 'ANSM', ar: 'ANSM' },
  rcp: { fr: 'RCP', ar: 'RCP' },
  article: { fr: 'Article scientifique', ar: 'مقال علمي' },
  etude: { fr: 'Étude', ar: 'دراسة' },
  site: { fr: 'Site', ar: 'موقع' },
  autre: { fr: 'Source', ar: 'مصدر' },
}

export const NIVEAU_LABEL: Record<Niveau, string> = {
  contre_indication: 'Contre-indication',
  deconseillee: 'Association déconseillée',
  precaution_emploi: 'Précaution d’emploi',
  a_prendre_en_compte: 'À prendre en compte',
}

export type InteractionInput = {
  id?: number
  substance: string
  partenaire: string
  partenaire_est_classe: boolean
  niveau: Niveau
  risque_fr: string
  mecanisme_fr: string | null
  conduite_fr: string
  risque_ar: string | null
  mecanisme_ar: string | null
  conduite_ar: string | null
  partenaire_ar: string | null
  ar_statut: 'absent' | 'brouillon' | 'relu'
  source_type: SourceType
  source_titre: string | null
  source_url: string | null
  source_ref: string | null
  /** crée aussi la ligne inverse (partenaire + substance), pour que l'interaction figure sur les deux fiches */
  inverse: boolean
}

const str = (v: unknown, max = 4000): string => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim().slice(0, max) : '')
const opt = (v: unknown, max = 4000): string | null => str(v, max) || null

export const isHttpUrl = (v: unknown): v is string => {
  if (typeof v !== 'string') return false
  try { const p = new URL(v).protocol; return p === 'https:' || p === 'http:' } catch { return false }
}

/** Nom de substance tel qu'écrit dans le thésaurus : majuscules, espaces simples. */
export const normaliserNom = (s: string): string => s.replace(/\s+/g, ' ').trim().toLocaleUpperCase('fr')

export function validateInteraction(raw: unknown): { ok: true; value: InteractionInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Données invalides' }
  const b = raw as Record<string, unknown>
  const substance = normaliserNom(str(b.substance, 200))
  const partenaire = normaliserNom(str(b.partenaire, 200))
  if (!substance) return { ok: false, error: 'Indiquez la première substance.' }
  if (!partenaire) return { ok: false, error: 'Indiquez la substance (ou la classe) associée.' }
  if (cle(substance) === cle(partenaire)) return { ok: false, error: 'Les deux substances doivent être différentes.' }
  if (!NIVEAUX.includes(b.niveau as Niveau)) return { ok: false, error: 'Niveau de gravité invalide.' }
  const risque_fr = str(b.risque_fr)
  if (!risque_fr) return { ok: false, error: 'Décrivez le risque (en français).' }
  const source_type = b.source_type as SourceType
  if (!SOURCE_TYPES.includes(source_type)) return { ok: false, error: 'Choisissez le type de source.' }
  const source_titre = opt(b.source_titre, 500)
  const source_url = opt(b.source_url, 1000)
  if (source_url && !isHttpUrl(source_url)) return { ok: false, error: 'L’adresse de la source doit commencer par http:// ou https://.' }
  if (!source_titre && !source_url) return { ok: false, error: 'Sourcez l’interaction : titre de la source ou adresse (lien).' }
  const ar_statut = b.ar_statut === 'relu' || b.ar_statut === 'brouillon' ? b.ar_statut : 'absent'
  const risque_ar = opt(b.risque_ar)
  const conduite_ar = opt(b.conduite_ar)
  // pas de statut « traduit » sans texte arabe
  const statut = !risque_ar ? 'absent' : ar_statut === 'absent' ? 'brouillon' : ar_statut
  const value: InteractionInput = {
    substance, partenaire,
    partenaire_est_classe: b.partenaire_est_classe === true,
    niveau: b.niveau as Niveau,
    risque_fr,
    mecanisme_fr: opt(b.mecanisme_fr),
    conduite_fr: str(b.conduite_fr),
    risque_ar, mecanisme_ar: opt(b.mecanisme_ar), conduite_ar,
    partenaire_ar: opt(b.partenaire_ar, 200),
    ar_statut: statut,
    source_type, source_titre, source_url, source_ref: opt(b.source_ref, 500),
    inverse: b.inverse === true,
  }
  const id = Number(b.id)
  if (Number.isInteger(id) && id > 0) value.id = id
  return { ok: true, value }
}

/** Ligne inverse : mêmes textes et même source, substance et partenaire échangés (l'arabe du partenaire ne suit pas). */
export function inverseDe(v: InteractionInput): InteractionInput {
  return { ...v, id: undefined, substance: v.partenaire, partenaire: v.substance, partenaire_est_classe: false, partenaire_ar: null, inverse: false }
}

/** Source présentée au public, ou null (ligne du thésaurus sans source détaillée : l'affichage retombe sur « ANSM »). */
export type SourceItem = { type: SourceType; titre: string | null; url: string | null; ref: string | null }

export function sourceDe(row: {
  origine?: string | null; source_type?: string | null; source_titre?: string | null; source_url?: string | null; source_ref?: string | null
}): SourceItem | null {
  const type = row.source_type as SourceType | null | undefined
  if (type && SOURCE_TYPES.includes(type)) {
    return { type, titre: row.source_titre || null, url: row.source_url || null, ref: row.source_ref || null }
  }
  return null
}
