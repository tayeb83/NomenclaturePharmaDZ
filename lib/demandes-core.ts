/**
 * DwaDZ — Demandes de médicaments : noyau pur (sans base de données).
 *
 * L'admin colle un JSON déjà structuré par un LLM externe. Ce module :
 *   - lit ce JSON de façon tolérante (bloc ```json, objet seul, texte autour) ;
 *   - refuse toute entrée contenant une donnée personnelle (email, téléphone) ;
 *   - repère les produits contrôlés (psychotropes, stupéfiants), jamais relayés ;
 *   - construit la clé d'agrégation, le texte du post Facebook (FR + AR) et
 *     les données du visuel.
 *
 * Aucune dépendance serveur : testable avec `npm run test:demandes`.
 */

import { ALGERIA_WILAYAS } from './wilayas.ts'
import type { PostVisual } from './facebook-content.ts'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Urgence = 'haute' | 'normale'

/** Entrée validée, prête à être enregistrée. */
export type DemandeInput = {
  medicament: string
  dci: string | null
  marques: string[]
  wilaya: string | null
  commune: string | null
  urgence: Urgence
  demandes: number
  jours: number
}

/** Une entrée lue mais non importable (psychotrope, donnée personnelle…). */
export type DemandeRejetee = { index: number; medicament: string; raison: string }

export type ParseResult = {
  items: DemandeInput[]
  /** Entrées écartées : jamais enregistrées. */
  rejetees: DemandeRejetee[]
  /** Erreur de format globale (JSON illisible…). */
  erreur: string | null
  /** Remarques non bloquantes (wilaya non reconnue…). */
  avertissements: string[]
}

/** Ligne de la table, telle que lue pour la page, le post et l'admin. */
export type DemandeRow = {
  id: number
  medicament: string
  dci: string | null
  dci_match: string | null
  marques: string[]
  wilaya: string | null
  commune: string | null
  urgence: Urgence
  nb_demandes: number
  statut: 'active' | 'trouvee' | 'expiree' | 'clos'
  note_privee: string | null
  derniere_demande_le: string
  expire_le: string
  trouvee_le: string | null
  created_at: string
}

export const JOURS_DEFAUT = 14
export const JOURS_MAX = 60
const MAX_ENTREES = 100

// ─── Normalisation ───────────────────────────────────────────────────────────

/** Minuscules, sans accents, ponctuation ramenée à des espaces simples (arabe conservé). */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Clé d'agrégation : (médicament, wilaya). Deux saisies identiques s'additionnent. */
export function aggKey(medicament: string, wilaya: string | null): string {
  return `${fold(medicament)}|${fold(wilaya || '')}`
}

export type WilayaMatch = { name_fr: string; name_ar: string }

/** Retrouve une wilaya par nom français, nom arabe ou code ("16", "Alger", "الجزائر"). */
export function findWilaya(raw: string | null | undefined): WilayaMatch | null {
  if (!raw) return null
  const key = fold(raw)
  if (!key) return null
  const hit = ALGERIA_WILAYAS.find(
    w => fold(w.name_fr) === key || fold(w.name_ar) === key || w.code === key.padStart(2, '0')
  )
  return hit ? { name_fr: hit.name_fr, name_ar: hit.name_ar } : null
}

// ─── Garde-fous ──────────────────────────────────────────────────────────────

/**
 * Produits contrôlés (psychotropes, stupéfiants et assimilés) : une demande
 * qui les vise n'est jamais enregistrée ni relayée. Liste volontairement
 * prudente et NON exhaustive : la liste officielle fait foi, et le
 * rapprochement avec la colonne `liste` de la nomenclature complète ce filtre
 * côté base (voir lib/demandes.ts).
 */
const CONTROLLED = [
  // benzodiazépines et apparentés
  'clonazepam', 'diazepam', 'bromazepam', 'alprazolam', 'lorazepam', 'zolpidem', 'zopiclone',
  'midazolam', 'nitrazepam', 'prazepam', 'oxazepam', 'clorazepate', 'tetrazepam', 'flunitrazepam',
  'clobazam', 'lormetazepam', 'estazolam', 'triazolam',
  // opioïdes
  'morphine', 'codeine', 'tramadol', 'fentanyl', 'oxycodone', 'buprenorphine', 'methadone',
  'pethidine', 'tapentadol', 'hydromorphone', 'nalbuphine', 'dextropropoxyphene',
  // autres
  'pregabaline', 'phenobarbital', 'methylphenidate', 'ketamine', 'amphetamine', 'dexamfetamine',
  'modafinil', 'trihexyphenidyle',
  // marques courantes
  'rivotril', 'valium', 'xanax', 'lexomil', 'temesta', 'stilnox', 'lyrica', 'subutex', 'tranxene',
  'noctran', 'ritaline', 'skenan', 'durogesic', 'tramal', 'contramal',
  // arabe
  'مورفين', 'ترامادول', 'كلونازيبام', 'ديازيبام', 'بروموزيبام', 'البرازولام', 'بريغابالين', 'فنتانيل',
]
const CONTROLLED_FOLDED = CONTROLLED.map(fold)

/** Vrai si le texte vise un produit contrôlé. Compare mot à mot (pas de faux positif par sous-chaîne). */
export function isControlled(...texts: (string | null | undefined)[]): boolean {
  const words = new Set(
    texts.filter(Boolean).flatMap(t => fold(String(t)).split(' ')).filter(Boolean)
  )
  return CONTROLLED_FOLDED.some(c => words.has(c))
}

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/
// 9 chiffres ou plus d'affilée, séparateurs usuels admis : un numéro de téléphone, pas un dosage.
const PHONE_RE = /(?:\+?\d[\s.\-]?){9,}/

/** Vrai si le texte contient un email ou un numéro de téléphone. */
export function hasPersonalData(...texts: (string | null | undefined)[]): boolean {
  return texts.some(t => !!t && (EMAIL_RE.test(String(t)) || PHONE_RE.test(String(t))))
}

// ─── Lecture du JSON collé ───────────────────────────────────────────────────

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const s = v.replace(/\s+/g, ' ').trim()
  return s ? s.slice(0, max) : null
}

/** Extrait le JSON d'un texte collé : ```json … ```, texte autour, objet seul. */
function extractJson(text: string): unknown {
  const t = text.trim()
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1].trim() : t
  try {
    return JSON.parse(body)
  } catch {
    const a = body.indexOf('['), z = body.lastIndexOf(']')
    if (a >= 0 && z > a) return JSON.parse(body.slice(a, z + 1))
    const oa = body.indexOf('{'), oz = body.lastIndexOf('}')
    if (oa >= 0 && oz > oa) return JSON.parse(body.slice(oa, oz + 1))
    throw new Error('aucun tableau JSON trouvé')
  }
}

/**
 * Lit et valide le JSON collé. Le lieu (wilaya, commune) est facultatif.
 * Une entrée invalide, personnelle ou contrôlée est écartée sans bloquer les autres.
 */
export function parseDemandes(text: string): ParseResult {
  const empty = (erreur: string): ParseResult => ({ items: [], rejetees: [], erreur, avertissements: [] })
  if (!text.trim()) return empty('Collez le JSON produit par le LLM.')

  let data: unknown
  try {
    data = extractJson(text)
  } catch (e: any) {
    return empty(`JSON illisible : ${e?.message || 'format invalide'}`)
  }
  const list = Array.isArray(data) ? data : data && typeof data === 'object' ? [data] : null
  if (!list || !list.length) return empty('Le JSON doit contenir au moins une demande.')
  if (list.length > MAX_ENTREES) return empty(`Trop d'entrées (${list.length}, maximum ${MAX_ENTREES}).`)

  const items: DemandeInput[] = []
  const rejetees: DemandeRejetee[] = []
  const avertissements: string[] = []

  list.forEach((raw: any, index: number) => {
    const medicament = clean(raw?.medicament, 200)
    const label = medicament || `entrée ${index + 1}`
    if (!medicament) {
      rejetees.push({ index, medicament: label, raison: 'Champ "medicament" manquant.' })
      return
    }

    const marques = (Array.isArray(raw.marques) ? raw.marques : [])
      .map((m: unknown) => clean(m, 60)).filter((m: string | null): m is string => !!m).slice(0, 5)
    const dci = clean(raw.dci, 200)
    const wilayaRaw = clean(raw.wilaya, 60)
    const communeRaw = clean(raw.commune, 80)

    if (hasPersonalData(medicament, dci, wilayaRaw, communeRaw, ...marques)) {
      rejetees.push({ index, medicament: label, raison: 'Donnée personnelle détectée (email ou téléphone).' })
      return
    }
    if (isControlled(medicament, dci, ...marques)) {
      rejetees.push({ index, medicament: label, raison: 'Produit contrôlé (psychotrope ou stupéfiant) : jamais relayé.' })
      return
    }

    // Wilaya facultative : reconnue → nom canonique ; non reconnue → conservée telle quelle, avec remarque.
    let wilaya: string | null = null
    if (wilayaRaw) {
      const w = findWilaya(wilayaRaw)
      if (w) wilaya = w.name_fr
      else {
        wilaya = wilayaRaw
        avertissements.push(`« ${label} » : wilaya « ${wilayaRaw} » non reconnue, conservée telle quelle.`)
      }
    }

    const demandes = Math.min(999, Math.max(1, Math.trunc(Number(raw.demandes)) || 1))
    const jours = Math.min(JOURS_MAX, Math.max(1, Math.trunc(Number(raw.jours)) || JOURS_DEFAUT))

    items.push({
      medicament,
      dci: dci ? fold(dci) : null,
      marques,
      wilaya,
      commune: communeRaw,
      urgence: raw.urgence === 'haute' ? 'haute' : 'normale',
      demandes,
      jours,
    })
  })

  return { items, rejetees, erreur: null, avertissements }
}

// ─── Post Facebook du jour ───────────────────────────────────────────────────

/** Une demande « nouvelle » (saisie dans les dernières 36 h) passe devant les autres. */
const NOUVEAU_MS = 36 * 3600 * 1000
/** Lignes maximum détaillées dans la légende. */
export const MAX_LIGNES_POST = 8

const isNouveau = (r: DemandeRow, now: Date) => now.getTime() - new Date(r.created_at).getTime() <= NOUVEAU_MS

/**
 * Choisit les demandes détaillées dans le post. Les urgentes et les nouvelles
 * sont toujours là ; les places restantes tournent d'un jour à l'autre pour que
 * le groupe ne voie pas la même liste chaque matin.
 */
export function selectPourPost(rows: DemandeRow[], now: Date, max = MAX_LIGNES_POST): DemandeRow[] {
  const byCount = (a: DemandeRow, b: DemandeRow) => b.nb_demandes - a.nb_demandes || a.id - b.id
  const prioritaires = rows
    .filter(r => r.urgence === 'haute' || isNouveau(r, now))
    .sort((a, b) => (b.urgence === 'haute' ? 1 : 0) - (a.urgence === 'haute' ? 1 : 0) || byCount(a, b))
  if (prioritaires.length >= max) return prioritaires.slice(0, max)

  const ids = new Set(prioritaires.map(r => r.id))
  const reste = rows.filter(r => !ids.has(r.id)).sort(byCount)
  if (!reste.length) return prioritaires
  const jour = Math.floor(now.getTime() / 86_400_000)
  const decalage = jour % reste.length
  const tournant = reste.slice(decalage).concat(reste.slice(0, decalage))
  return prioritaires.concat(tournant.slice(0, max - prioritaires.length))
}

const TZ = 'Africa/Algiers'
function fmt(date: Date, locale: string, opt: Intl.DateTimeFormatOptions): string {
  try { return new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opt }).format(date) } catch { return '' }
}

/** Date AAAA-MM-JJ en heure d'Alger (clé de déduplication du post du jour). */
export function jourAlger(date: Date): string {
  return fmt(date, 'en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const wilayaAr = (w: string | null): string | null => (w ? findWilaya(w)?.name_ar ?? w : null)
const pluriel = (n: number, mot: string, s = 's') => `${n} ${mot}${n > 1 ? s : ''}`

const MENTION_FR =
  "DwaDZ met en relation et ne vend rien. Aucun stock n'est garanti. Les médicaments contrôlés ne s'échangent pas par ce canal. Les demandes sont relayées sans aucune donnée personnelle."
const MENTION_AR =
  'DwaDZ يربط بين الأطراف فقط، لا يبيع ولا يضمن توفر أي دواء. الأدوية الخاضعة للرقابة لا تُتداول عبر هذه القناة. الطلبات تُنشر دون أي معلومات شخصية.'
const HASHTAGS = '#MédicamentsAlgérie #DwaDZ #Pharmacie #دواء'

/** Brouillon de post prêt pour social_content_queue (même forme que PostCandidate). */
export type DemandesPost = {
  rubrique: 'demande'
  titre: string
  corps: string
  lien: string
  dedupKey: string
  visuel: PostVisual
}

const nomCourt = (r: DemandeRow) =>
  r.marques.length ? `${r.medicament} (${r.marques[0]})` : r.medicament

function ligneFr(r: DemandeRow): string {
  const lieu = r.wilaya ? ` – ${r.wilaya}` : ''
  const n = r.nb_demandes > 1 ? ` – ${r.nb_demandes} demandes` : ''
  return `• ${nomCourt(r)}${lieu}${n}`
}
const ligneAr = (r: DemandeRow) => `• ${r.medicament}${r.wilaya ? ` – ${wilayaAr(r.wilaya)}` : ''}`

/**
 * Construit le post du jour à partir des demandes ACTIVES. Retourne null s'il
 * n'y en a aucune. Ni la commune ni la note privée n'apparaissent jamais.
 */
export function buildPostDuJour(actives: DemandeRow[], now: Date = new Date()): DemandesPost | null {
  if (!actives.length) return null

  const choisies = selectPourPost(actives, now)
  const total = actives.reduce((s, r) => s + r.nb_demandes, 0)
  const urgentes = choisies.filter(r => r.urgence === 'haute')
  const autres = choisies.filter(r => r.urgence !== 'haute')
  const reste = actives.length - choisies.length

  const dFr = fmt(now, 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const dAr = fmt(now, 'ar-DZ-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })

  const blocFr = [
    urgentes.length ? `🔴 Urgent\n${urgentes.map(ligneFr).join('\n')}` : '',
    autres.length ? `${urgentes.length ? 'Autres demandes\n' : ''}${autres.map(ligneFr).join('\n')}` : '',
    reste > 0 ? `… et ${pluriel(reste, 'autre')} sur la page.` : '',
  ].filter(Boolean).join('\n\n')

  const fr =
    `🔎 Médicaments recherchés – ${dFr}\n\n` +
    `${pluriel(total, 'demande')} en cours. Vous avez l'un de ces médicaments en stock ? ` +
    `Écrivez-nous en message privé avec le nom et la commune de votre pharmacie.\n\n` +
    `${blocFr}\n\n${MENTION_FR}`

  const ar =
    `🔎 أدوية مطلوبة – ${dAr}\n` +
    `${total} طلب حالياً. هل لديكم أحد هذه الأدوية؟ راسلونا برسالة خاصة مع اسم الصيدلية والبلدية.\n` +
    `${choisies.map(ligneAr).join('\n')}${reste > 0 ? `\n… +${reste}` : ''}\n${MENTION_AR}`

  const wilayas = new Set(actives.map(r => r.wilaya).filter(Boolean))
  const stats = [
    { value: String(total), label: total > 1 ? 'demandes en cours' : 'demande en cours' },
    { value: String(actives.length), label: actives.length > 1 ? 'médicaments' : 'médicament' },
    ...(wilayas.size ? [{ value: String(wilayas.size), label: wilayas.size > 1 ? 'wilayas' : 'wilaya' }] : []),
  ]
  const visuel: PostVisual = {
    icon: 'pill',
    kicker: 'Médicaments recherchés',
    headline: "Vous l'avez en stock ?",
    subtitle: dFr,
    stats,
    tags: choisies.map(r => (r.dci_match || r.dci || r.medicament)).slice(0, 4),
    tagsLabel: 'Parmi les demandes',
    note: urgentes.length
      ? { label: 'Urgent', text: urgentes.map(r => r.dci_match || r.dci || r.medicament).slice(0, 4).join(', ') }
      : undefined,
    accent: urgentes.length ? 'red' : 'teal',
    cta: 'Écrivez-nous en message privé',
  }

  const jour = jourAlger(now)
  return {
    rubrique: 'demande',
    titre: `Demandes du ${jour} (${pluriel(total, 'demande')})`,
    corps: `${fr}\n\n${ar}\n\n${HASHTAGS}`,
    lien: '/demandes',
    dedupKey: `demande:${jour}`,
    visuel,
  }
}

// ─── Prompt à donner au LLM (hors application) ──────────────────────────────

/** Prompt à copier dans le LLM de votre choix avant de lui donner l'email. */
export const PROMPT_LLM = `Tu reçois un email de patient qui cherche un ou plusieurs médicaments en Algérie.
Réponds uniquement par un tableau JSON, sans texte autour.

Règles :
- Ne recopie jamais le nom, le téléphone, l'email, l'âge, l'adresse précise ni la pathologie.
- Une entrée par médicament demandé.
- "medicament" : DCI + dosage + forme (ex. "Lévothyroxine sodique 100 µg comprimé").
- "dci" : la DCI seule, en minuscules.
- "marques" : noms commerciaux cités dans l'email, sinon [].
- "wilaya" et "commune" : lieu de recherche s'il est connu, sinon null. N'invente jamais un lieu.
- "urgence" : "haute" si traitement chronique vital ou arrêt dangereux (insuline, antiépileptique, anticancéreux, anticoagulant, corticoïde), sinon "normale".
- "demandes" : 1, sauf si l'email indique plusieurs personnes.
- "jours" : 14.
- Si l'email demande un psychotrope ou un stupéfiant, garde l'entrée : le site l'écartera.

Format :
[{"medicament":"","dci":"","marques":[],"wilaya":null,"commune":null,"urgence":"haute|normale","demandes":1,"jours":14}]

Email :
<<< coller l'email ici >>>`

/** Exemple d'un JSON valide, affiché comme point de départ dans l'admin. */
export const EXEMPLE_JSON = JSON.stringify([
  { medicament: 'Lévothyroxine sodique 100 µg comprimé', dci: 'lévothyroxine', marques: ['Levothyrox'], wilaya: 'Alger', commune: null, urgence: 'haute', demandes: 1, jours: 14 },
  { medicament: 'Insuline glargine 100 UI/mL stylo', dci: 'insuline glargine', marques: ['Lantus'], wilaya: null, commune: null, urgence: 'haute', demandes: 1, jours: 14 },
], null, 2)
