/**
 * DwaDZ — rapprochement d'un nom cité dans un RCP (« Méthotrexate », « Autres rétinoïdes »,
 * « Aspirine (acide acétylsalicylique) ») avec les DCI de la nomenclature et les classes ATC.
 * Sans dépendance serveur : testable seul.
 *
 * Principe : prudence. Un lien faux est pire qu'un lien manquant, donc on ne relie que
 * sur un nom entier retrouvé (accents, pluriel, sel, synonyme usuel), jamais sur un mot isolé générique.
 */

export type MatchInput = {
  dcis: { dci: string; n: number }[]
  atc: { code: string; niveau: number; label_fr: string | null; label_en: string | null }[]
}

export type CibleResolue = {
  /** DCI de la nomenclature, telle qu'écrite dans la base (la plus représentée si plusieurs graphies). */
  dci: string | null
  /** Clé de la substance sans ses sels : deux graphies d'une même substance partagent le groupe. */
  groupe: string | null
  classe: { code: string; label: string } | null
}

export type MatchIndex = {
  exact: Map<string, { dci: string; n: number }[]>
  loose: Map<string, { dci: string; n: number }[]>
  classes: Map<string, { code: string; label: string }>
  codes: Map<string, string>
}

/** minuscules, sans accents ni ponctuation, espaces simples */
export function foldNom(s: string): string {
  return s
    .replace(/[œŒ]/g, 'oe').replace(/[æÆ]/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
/** clé de comparaison : « éthinyl estradiol » = « ethinylestradiol » */
export const compact = (s: string): string => foldNom(s).replace(/ /g, '')

const SELS = new Set((
  'chlorhydrate dichlorhydrate hydrochlorure bromhydrate sulfate hemisulfate phosphate sodique disodique calcique potassique magnesique ' +
  'monohydrate dihydrate trihydrate hemihydrate pentahydrate anhydre maleate fumarate tartrate succinate mesilate besilate citrate acetate ' +
  'benzoate lactate gluconate oxalate valerate propionate dipropionate hydrogenosuccinate nitrate'
).split(' '))

/** noms trop généraux pour relier un nom raccourci */
const GENERIQUES = new Set(['acide', 'sel', 'sels', 'vitamine', 'huile', 'extrait', 'oxyde', 'chlorure', 'sodium', 'potassium', 'calcium', 'magnesium', 'fer', 'zinc', 'eau'])

/** Noms usuels ↔ DCI. Seuls les équivalents sûrs. */
const SYNONYMES: Record<string, string> = {
  aspirine: 'acide acetylsalicylique', acetaminophene: 'paracetamol', cyclosporine: 'ciclosporine',
  epinephrine: 'adrenaline', norepinephrine: 'noradrenaline', vitaminea: 'retinol', vitamined: 'cholecalciferol',
  vitamineb12: 'cyanocobalamine', vitaminec: 'acide ascorbique', vitaminek: 'phytomenadione', vitamineb9: 'acide folique',
}

/** Classes que les RCP nomment à leur façon ; le code n'est retenu que s'il existe dans atc_codes. */
const CLASSES_USUELLES: Record<string, string> = {
  cyclines: 'J01AA', tetracyclines: 'J01AA', fluoroquinolones: 'J01MA', quinolones: 'J01M', macrolides: 'J01FA',
  statines: 'C10AA', ains: 'M01A', 'anti inflammatoires non steroidiens': 'M01A', 'inhibiteurs de la pompe a protons': 'A02BC',
  'inhibiteurs de l enzyme de conversion': 'C09A', iec: 'C09A', sartans: 'C09C', 'betabloquants': 'C07', 'beta bloquants': 'C07',
  diuretiques: 'C03', corticoides: 'H02', retinoides: 'D05BB',
}

const QUALIFS = /^(autres?|tous?|toutes?|les|des|du|de la|de l|le|la|l|d|medicaments?|produits?)\s+/
const SELS_DE = /^(sels?|derives?)\s+(de|d)\s+/
const COUPURES = new Set(['a', 'en', 'par', 'avec', 'dose', 'doses', 'sous', 'chez', 'pendant', 'lors'])

const sansEt = (s: string) => s.split(' ').filter(t => t !== 'et').join(' ')

/** Retire les sels : « chlorhydrate de metformine » → « metformine » */
function dessale(folded: string): string {
  const toks = folded.split(' ').filter(t => !SELS.has(t))
  while (toks.length && (toks[0] === 'de' || toks[0] === 'd')) toks.shift()
  while (toks.length && (toks[toks.length - 1] === 'de' || toks[toks.length - 1] === 'd')) toks.pop()
  return toks.join(' ')
}

function aliasDe(dci: string): { exact: string; loose: string[] } {
  const f = foldNom(dci)
  const loose: string[] = []
  const m = f.match(/^(.*?)\s+exprimee?s?\s+(?:en|sous forme de)\s+(.+)$/)
  const avant = m ? m[1] : f
  if (m) loose.push(compact(m[2]), compact(dessale(sansEt(m[1]))))
  const d = dessale(sansEt(avant))
  if (d && d !== sansEt(f)) loose.push(compact(d))
  return { exact: compact(sansEt(f)), loose: loose.filter(k => k.length >= 5 && !GENERIQUES.has(k)) }
}

export function groupeDe(dci: string): string {
  const a = aliasDe(dci)
  return a.loose[a.loose.length - 1] ?? a.exact
}

export function buildMatchIndex(input: MatchInput): MatchIndex {
  const exact = new Map<string, { dci: string; n: number }[]>()
  const loose = new Map<string, { dci: string; n: number }[]>()
  const put = (m: typeof exact, k: string, v: { dci: string; n: number }) => { if (k) m.set(k, [...(m.get(k) ?? []), v]) }
  for (const { dci, n } of input.dcis) {
    const d = dci.trim()
    if (!d) continue
    const a = aliasDe(d)
    put(exact, a.exact, { dci: d, n })
    for (const k of a.loose) put(loose, k, { dci: d, n })
  }
  const classes = new Map<string, { code: string; label: string }>()
  const codes = new Map<string, string>()
  for (const c of input.atc) codes.set(c.code, c.label_fr || c.label_en || c.code)
  // niveaux croissants, le dernier écrit gagne : le plus précis (niveau 4) l'emporte
  for (const c of [...input.atc].sort((x, y) => x.niveau - y.niveau || y.code.localeCompare(x.code))) {
    const label = codes.get(c.code)!
    for (const l of [c.label_fr, c.label_en]) {
      const k = l ? compact(l) : ''
      if (k.length >= 5) classes.set(k, { code: c.code, label })
    }
  }
  for (const [nom, code] of Object.entries(CLASSES_USUELLES)) {
    if (codes.has(code)) classes.set(compact(nom), { code, label: codes.get(code)! })
  }
  return { exact, loose, classes, codes }
}

/** Formes à essayer pour un nom cité, de la plus complète à la plus courte. */
export function candidats(libelle: string): string[] {
  const out: string[] = []
  const inners = [...libelle.matchAll(/\(([^)]{3,80})\)/g)].map(m => m[1])
  const outer = libelle.replace(/\([^)]*\)/g, ' ')
  for (const [i, texte] of [outer, ...inners].entries()) {
    let f = foldNom(texte)
    if (!f) continue
    for (let guard = 0; guard < 4; guard++) {
      const g = f.replace(QUALIFS, '').replace(SELS_DE, '')
      if (g === f) break
      f = g
    }
    const toks = f.split(' ')
    const push = (t: string[], coupe: boolean) => {
      const s = t.join(' ')
      if (!s || (coupe && (s.replace(/ /g, '').length < 5 || GENERIQUES.has(s)))) return
      out.push(s)
    }
    push(toks, false)
    const cut = toks.findIndex((t, j) => j > 0 && COUPURES.has(t))
    if (cut > 0) push(toks.slice(0, cut), true)
    for (let k = 1; k <= 2; k++) if (toks.length - k >= 1 && i === 0) push(toks.slice(0, toks.length - k), true)
  }
  const all: string[] = []
  for (const c of out) {
    all.push(c)
    const e = sansEt(c)
    if (e !== c) all.push(e)
    const d = dessale(e)
    if (d && d !== e && d.replace(/ /g, '').length >= 5 && !GENERIQUES.has(d)) all.push(d)
  }
  return [...new Set(all)]
}

const singulier = (k: string): string[] => (k.endsWith('s') || k.endsWith('x') ? [k, k.slice(0, -1)] : [k])

const meilleur = (l: { dci: string; n: number }[]) => [...l].sort((a, b) => b.n - a.n || a.dci.localeCompare(b.dci))[0].dci

export function resolveCible(
  index: MatchIndex,
  f: { libelle: string; cible_type: 'dci' | 'classe' | null; cible: string | null },
): CibleResolue {
  const vide: CibleResolue = { dci: null, groupe: null, classe: null }
  if (f.cible_type === 'classe' && f.cible) {
    return { ...vide, classe: { code: f.cible, label: index.codes.get(f.cible) ?? f.libelle } }
  }
  const noms = f.cible_type === 'dci' && f.cible ? [f.cible, f.libelle] : [f.libelle]
  for (const nom of noms) {
    for (const c of candidats(nom)) {
      for (const k0 of singulier(compact(c))) {
        const k = compact(SYNONYMES[k0] ?? k0)
        if (k.length < 4) continue
        const hit = index.exact.get(k) ?? index.loose.get(k)
        if (hit) {
          const dci = meilleur(hit)
          return { ...vide, dci, groupe: groupeDe(dci) }
        }
      }
    }
  }
  for (const c of candidats(f.libelle)) {
    for (const k of singulier(compact(c))) {
      const cl = index.classes.get(k)
      if (cl) return { ...vide, classe: cl }
    }
  }
  return vide
}
