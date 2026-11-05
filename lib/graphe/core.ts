/**
 * DwaDZ — graphes de connaissances : types, plafonds démo/abonné, disposition en étoile et droits d'accès.
 * Aucun accès serveur : testable seul (node --test tests/graphe/).
 */

export type NodeKind = 'substance' | 'atc' | 'labo' | 'pays' | 'interaction' | 'retrait' | 'classe'

export type GraphNode = {
  id: string
  kind: NodeKind
  label: string
  labelAr?: string
  /** poids (nombre de spécialités, de retraits…) : fixe la taille du nœud */
  weight?: number
  /** précision courte affichée au survol (« 12 spécialités », « contre-indication »…) */
  detail?: string
  detailAr?: string
  /** nœud d'origine locale (production algérienne), pour colorer les substances */
  local?: boolean
  /** page du site qui détaille ce nœud (fiche DCI, laboratoire, classe ATC, année de retrait) */
  href?: string
}

export type EdgeKind = 'classe' | 'fabrique' | 'origine' | 'interagit' | 'retire' | 'contient' | 'vend'
export type Gravite = 'contre_indication' | 'deconseillee' | 'precaution_emploi' | 'a_prendre_en_compte'

export type GraphEdge = {
  source: string
  target: string
  kind: EdgeKind
  /** gravité d'une interaction */
  niveau?: Gravite
  weight?: number
}

export type GraphData = {
  centre: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** indicateurs résumés, affichés sous le graphe */
  stats: { cle: string; fr: string; ar: string; valeur: string }[]
  /** vrai si des nœuds ont été écartés pour respecter le plafond */
  tronque: boolean
}

export type Couche = 'atc' | 'labos' | 'pays' | 'interactions' | 'retraits'
export const COUCHES: Couche[] = ['atc', 'labos', 'pays', 'interactions', 'retraits']

/** Plafond de nœuds par couche : la démo montre l'essentiel, l'abonné voit tout. */
export const PLAFOND_DEMO = 8
export const PLAFOND_ABONNE = 30

export type Acces = 'public' | 'connecte' | 'abonne'

/**
 * Droit d'accès à l'explorateur complet.
 *  - équipe (propriétaire, ADMIN_EMAILS, compte admin actif) : toujours ;
 *  - abonnement actif à la date du jour : oui ;
 *  - compte connecté sans abonnement : « connecte » (démos seulement) ;
 *  - sinon « public ».
 */
export function decideAcces(o: { email: string | null; equipe: boolean; abonnement: { is_active: boolean; starts_on: string | null; ends_on: string | null } | null; aujourdhui: string }): Acces {
  if (!o.email) return 'public'
  if (o.equipe) return 'abonne'
  const a = o.abonnement
  if (a && a.is_active && (!a.starts_on || a.starts_on <= o.aujourdhui) && (!a.ends_on || a.ends_on >= o.aujourdhui)) return 'abonne'
  return 'connecte'
}

/** Garde les `max` nœuds les plus lourds de chaque type, et les arêtes qui en dépendent. */
export function plafonner(g: GraphData, max: number): GraphData {
  const parType = new Map<NodeKind, GraphNode[]>()
  for (const n of g.nodes) {
    if (n.id === g.centre) continue
    parType.set(n.kind, [...(parType.get(n.kind) ?? []), n])
  }
  const gardes = new Set<string>([g.centre])
  let tronque = g.tronque
  for (const list of parType.values()) {
    const tries = [...list].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || a.label.localeCompare(b.label))
    if (tries.length > max) tronque = true
    for (const n of tries.slice(0, max)) gardes.add(n.id)
  }
  return {
    ...g,
    nodes: g.nodes.filter(n => gardes.has(n.id)),
    edges: g.edges.filter(e => gardes.has(e.source) && gardes.has(e.target)),
    tronque,
  }
}

/** Filtre par couches : le centre reste, les autres nœuds suivent leur type. */
const COUCHE_DE_KIND: Partial<Record<NodeKind, Couche>> = {
  atc: 'atc', labo: 'labos', pays: 'pays', interaction: 'interactions', classe: 'interactions', retrait: 'retraits',
}
export const coucheDe = (k: NodeKind): Couche | undefined => COUCHE_DE_KIND[k]
export function filtrerCouches(g: GraphData, actives: ReadonlySet<Couche>): GraphData {
  const nodes = g.nodes.filter(n => n.id === g.centre || !COUCHE_DE_KIND[n.kind] || actives.has(COUCHE_DE_KIND[n.kind]!))
  const ids = new Set(nodes.map(n => n.id))
  return { ...g, nodes, edges: g.edges.filter(e => ids.has(e.source) && ids.has(e.target)) }
}

// ─── Disposition en étoile ───────────────────────────────────────────────────

export type Placement = { id: string; x: number; y: number; r: number; profondeur: number }

const TAU = Math.PI * 2

/**
 * Centre au milieu, voisins directs sur un cercle (regroupés par type), voisins de voisins sur un cercle
 * extérieur, à l'angle moyen de leurs parents puis écartés d'un angle minimal.
 * Coordonnées dans [-1, 1] × [-1, 1] ; la vue les met à l'échelle.
 */
export function disposer(g: GraphData): Placement[] {
  const adj = new Map<string, Set<string>>()
  for (const n of g.nodes) adj.set(n.id, new Set())
  for (const e of g.edges) {
    adj.get(e.source)?.add(e.target)
    adj.get(e.target)?.add(e.source)
  }
  const prof = new Map<string, number>([[g.centre, 0]])
  const file = [g.centre]
  for (let i = 0; i < file.length; i++) {
    for (const v of adj.get(file[i]) ?? []) {
      if (!prof.has(v)) { prof.set(v, prof.get(file[i])! + 1); file.push(v) }
    }
  }
  const byId = new Map(g.nodes.map(n => [n.id, n]))
  const poids = (id: string) => byId.get(id)?.weight ?? 1
  const maxPoids = Math.max(1, ...g.nodes.map(n => n.weight ?? 1))
  const rayon = (id: string, profondeur: number) =>
    profondeur === 0 ? 0.13 : 0.045 + 0.05 * Math.sqrt(poids(id) / maxPoids) * (profondeur === 1 ? 1 : 0.8)

  const ordreType: NodeKind[] = ['atc', 'classe', 'labo', 'substance', 'interaction', 'retrait', 'pays']
  const premier = file.filter(id => prof.get(id) === 1).sort((a, b) => {
    const ka = ordreType.indexOf(byId.get(a)!.kind), kb = ordreType.indexOf(byId.get(b)!.kind)
    return ka - kb || poids(b) - poids(a) || a.localeCompare(b)
  })
  const angle = new Map<string, number>()
  premier.forEach((id, i) => angle.set(id, -Math.PI / 2 + (TAU * i) / premier.length))

  const second = file.filter(id => prof.get(id) === 2)
  const voulu = second.map(id => {
    const ps = [...(adj.get(id) ?? [])].filter(p => prof.get(p) === 1)
    const x = ps.reduce((s, p) => s + Math.cos(angle.get(p)!), 0)
    const y = ps.reduce((s, p) => s + Math.sin(angle.get(p)!), 0)
    return { id, a: ps.length ? Math.atan2(y, x) : 0 }
  }).sort((p, q) => p.a - q.a)
  const ecart = Math.min(TAU / Math.max(voulu.length, 1), 0.34)
  let prec = -Infinity
  for (const v of voulu) {
    const a = Math.max(v.a, prec + ecart)
    angle.set(v.id, a)
    prec = a
  }

  return g.nodes.filter(n => prof.has(n.id)).map(n => {
    const p = prof.get(n.id)!
    const R = p === 0 ? 0 : p === 1 ? 0.6 : 0.95
    const a = angle.get(n.id) ?? 0
    return { id: n.id, x: R * Math.cos(a), y: R * Math.sin(a), r: rayon(n.id, p), profondeur: p }
  })
}

/** Libellé court pour le dessin : coupe sur un espace quand c'est possible. */
export function abreger(s: string, max = 18): string {
  if (s.length <= max) return s
  const c = s.slice(0, max - 1)
  const i = c.lastIndexOf(' ')
  return `${(i > max * 0.5 ? c.slice(0, i) : c).trimEnd()}…`
}

// ─── Export (abonnés) ────────────────────────────────────────────────────────

const csvCell = (v: unknown) => {
  const s = String(v ?? '')
  // une cellule qui commence par = + - @ serait lue comme une formule par un tableur
  const sure = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n;]/.test(sure) ? `"${sure.replace(/"/g, '""')}"` : sure
}

/** CSV des arêtes : source;relation;cible;gravité;poids — avec les libellés des nœuds. */
export function enCsv(g: GraphData): string {
  const nom = new Map(g.nodes.map(n => [n.id, n.label]))
  const lignes = [['source', 'source_libelle', 'relation', 'cible', 'cible_libelle', 'gravite', 'poids']]
  for (const e of g.edges) {
    lignes.push([e.source, nom.get(e.source) ?? '', e.kind, e.target, nom.get(e.target) ?? '', e.niveau ?? '', e.weight ?? ''] as string[])
  }
  return lignes.map(l => l.map(csvCell).join(';')).join('\n') + '\n'
}

// ─── Chemins vers les pages du site ──────────────────────────────────────────

const slugLabo = (nom: string) => nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Fiche DCI (même clé que generateStaticParams : le nom en minuscules, encodé). */
export const cheminDci = (dci: string) => `/dci/${encodeURIComponent(dci.trim().toLowerCase())}`
export const cheminLabo = (nom: string) => `/laboratoire/${slugLabo(nom)}`
export const cheminAtc = (code: string) => `/classes-therapeutiques/${code.toUpperCase()}`
/** Les retraits sont rangés par année ; sans date exploitable, la page générale. */
export const cheminRetrait = (date: string | null | undefined) => {
  const a = /^(\d{4})-/.exec(date ?? '')?.[1]
  return a ? `/retraits/${a}` : '/retraits'
}

// ─── Abonnements (administration) ────────────────────────────────────────────

export type MoyenPaiement = 'ccp' | 'paypal'
export const MOYENS_PAIEMENT: MoyenPaiement[] = ['ccp', 'paypal']

export type AbonnementSaisie = {
  email: string
  ends_on: string | null
  starts_on: string | null
  moyen_paiement: MoyenPaiement | null
  reference_paiement: string | null
  montant: string | null
  note: string | null
}

/** Valide et normalise la saisie du formulaire d'activation. Renvoie l'erreur en clair ou la saisie propre. */
export function validerAbonnement(b: Record<string, unknown>): { ok: true; valeur: AbonnementSaisie } | { ok: false; erreur: string } {
  const txt = (v: unknown, max: number) => { const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; return s || null }
  const email = txt(b.email, 200)?.toLowerCase() ?? ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erreur: 'Adresse e-mail invalide.' }
  const date = (v: unknown) => { const s = txt(v, 10); return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null }
  const ends_on = date(b.ends_on), starts_on = date(b.starts_on)
  if (b.ends_on && !ends_on) return { ok: false, erreur: 'Date de fin invalide (AAAA-MM-JJ).' }
  if (b.starts_on && !starts_on) return { ok: false, erreur: 'Date de début invalide (AAAA-MM-JJ).' }
  if (!ends_on) return { ok: false, erreur: 'Indiquez la date de fin : un abonnement sans fin est une erreur de saisie probable.' }
  if (starts_on && starts_on > ends_on) return { ok: false, erreur: 'La date de fin précède la date de début.' }
  const moyen = txt(b.moyen_paiement, 10)
  if (moyen && !MOYENS_PAIEMENT.includes(moyen as MoyenPaiement)) return { ok: false, erreur: 'Moyen de paiement : CCP ou PayPal uniquement.' }
  return { ok: true, valeur: { email, ends_on, starts_on, moyen_paiement: (moyen as MoyenPaiement) ?? null, reference_paiement: txt(b.reference_paiement, 120), montant: txt(b.montant, 40), note: txt(b.note, 500) } }
}

/** Date de fin proposée : `mois` mois après `depuis` (AAAA-MM-JJ), au dernier jour du mois si besoin. */
export function finApres(depuis: string, mois: number): string {
  const [y, m, d] = depuis.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1 + mois, 1))
  const dernier = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()
  t.setUTCDate(Math.min(d, dernier))
  return t.toISOString().slice(0, 10)
}
