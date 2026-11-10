/**
 * DwaDZ — Recherche guidée (Lab) : normalisation des axes et moteur de facettes.
 * Sans dépendance serveur : testable seul (tests/guide/), utilisable côté client.
 *
 * Parcours : DCI → voie → forme → dosage → présentations.
 *
 * La nomenclature écrit une même valeur de plusieurs façons (« COMP. PELL. », « COMPRIME PELLICULE » ;
 * « 1G », « 1000 MG »). Un parcours guidé affiche chaque valeur distincte comme un choix : sans
 * normalisation, ces variantes deviennent des doublons visibles. Chaque axe est donc ramené à une clé :
 *   - DCI     : substances séparées par « + », ordre alphabétique pour la clé (A + B = B + A) ;
 *   - forme   : abréviations développées, puis forme de base + qualificatifs dans un ordre fixe,
 *               libellés proches des Standard Terms EDQM (« comprimé pelliculé sécable ») ;
 *   - voie    : dérivée de la forme (groupes de formes EDQM, libellés courants) — absente de la nomenclature ;
 *   - dosage  : quantités ramenées aux unités de base (g → mg, µg → mg, l → ml, MUI → UI) ; une concentration
 *               est rapportée à l'unité de son dénominateur (250 mg/5 ml = 50 mg/ml).
 * Prudence : une valeur qui contient un mot inconnu n'est jamais rapprochée d'une autre. Elle garde son
 * écriture d'origine et sort dans l'audit (scripts/audit_guide_normalisation.mts).
 */

import { slugify } from './slug.ts'
import { translateForme } from './translate-fields.ts'
import { edqmVoie, lierForme, type EdqmRelation } from './edqm.ts'
import { UNITES_INFO, type Unite } from './ucum.ts'

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

// ═══════════════════════════════════════════════════════════════
// Voies
// ═══════════════════════════════════════════════════════════════

export type VoieId =
  | 'orale-solide' | 'orale-liquide' | 'injectable' | 'inhalee' | 'buccale' | 'nasale' | 'ophtalmique'
  | 'auriculaire' | 'cutanee' | 'transdermique' | 'rectale' | 'vaginale' | 'autre'

export type Voie = {
  id: VoieId; fr: string; courant_fr: string; ar: string; courant_ar: string
  /**
   * voie d'administration EDQM correspondante ; null quand le groupe en couvre plusieurs
   * (« injectable » : intraveineuse, intramusculaire, sous-cutanée…)
   */
  edqm: string | null
}

/** Ordre d'affichage : du plus fréquent en officine au plus rare. */
export const VOIES: Voie[] = [
  { id: 'orale-solide', fr: 'Orale solide', courant_fr: 'À avaler (comprimé, gélule…)', ar: 'فموي صلب', courant_ar: 'للبلع (أقراص، كبسولات…)', edqm: '20053000' },
  { id: 'orale-liquide', fr: 'Orale liquide', courant_fr: 'À boire (sirop, suspension…)', ar: 'فموي سائل', courant_ar: 'للشرب (شراب، معلق…)', edqm: '20053000' },
  { id: 'injectable', fr: 'Injectable', courant_fr: 'Injection ou perfusion', ar: 'للحقن', courant_ar: 'حقن أو تسريب', edqm: null },
  { id: 'cutanee', fr: 'Cutanée', courant_fr: 'Sur la peau', ar: 'جلدي', courant_ar: 'على الجلد', edqm: '20003000' },
  { id: 'ophtalmique', fr: 'Ophtalmique', courant_fr: 'Dans l’œil', ar: 'عيني', courant_ar: 'في العين', edqm: '20051000' },
  { id: 'inhalee', fr: 'Inhalée', courant_fr: 'À inhaler', ar: 'استنشاقي', courant_ar: 'للاستنشاق', edqm: '20020000' },
  { id: 'nasale', fr: 'Nasale', courant_fr: 'Dans le nez', ar: 'أنفي', courant_ar: 'في الأنف', edqm: '20049000' },
  { id: 'auriculaire', fr: 'Auriculaire', courant_fr: 'Dans l’oreille', ar: 'أذني', courant_ar: 'في الأذن', edqm: '20001000' },
  { id: 'buccale', fr: 'Buccale', courant_fr: 'Dans la bouche (bain de bouche, pastille…)', ar: 'فموي موضعي', courant_ar: 'داخل الفم (غرغرة، مصاصة…)', edqm: '20054000' },
  { id: 'rectale', fr: 'Rectale', courant_fr: 'Suppositoire, lavement', ar: 'شرجي', courant_ar: 'تحاميل، حقنة شرجية', edqm: '20061000' },
  { id: 'vaginale', fr: 'Vaginale', courant_fr: 'Ovule, crème vaginale', ar: 'مهبلي', courant_ar: 'بيوض، كريم مهبلي', edqm: '20072000' },
  { id: 'transdermique', fr: 'Transdermique', courant_fr: 'Patch', ar: 'عبر الجلد', courant_ar: 'لصقة', edqm: '20070000' },
  { id: 'autre', fr: 'Autre ou non précisée', courant_fr: 'Autre', ar: 'أخرى أو غير محددة', courant_ar: 'أخرى', edqm: null },
]
const VOIE_RANG = new Map(VOIES.map((v, i) => [v.id, i]))
export const voieParId = (id: string) => VOIES.find(v => v.id === id)

// ═══════════════════════════════════════════════════════════════
// Formes
// ═══════════════════════════════════════════════════════════════

/**
 * Vocabulaire des formes : mot (minuscules, sans accents) → concept. Un concept vide ('') est un mot
 * vide connu, ignoré. Tout mot absent de ce dictionnaire rend la forme « non reconnue ».
 */
const MOTS_FORME: Record<string, string> = {}
const vocab = (concept: string, mots: string) => { for (const m of mots.split(' ')) MOTS_FORME[m] = concept }
// formes de base
vocab('comprime', 'comp comps compr cp cpr cpe cps comprime comprimes cprime comprim2 comrime comrpime comprimpe coprime')
vocab('gelule', 'gle gles glle gelule gelules gellule gellules gel_')
vocab('capsule', 'caps capsule capsules')
vocab('solution', 'sol solu solut solute solutes solution solutions siolution solotion')
vocab('suspension', 'susp sus suspens suspension suspensions suspenssion')
vocab('emulsion', 'emul emuls emulsion emulsions')
vocab('poudre', 'pdre pdr pd poud poudre poudres poudrecpour')
vocab('lyophilisat', 'lyoph lyop lyo lyophi lyphilisee lyophilisat lyophilisats lyophilise lyophilisee lyophilisees lyophiulisat lyophilat lyophilis2e')
vocab('granules', 'gran granul granule granules granulee granulees microgranule microgranules micrgles')
vocab('sirop', 'sir sirop sirops')
vocab('suppositoire', 'sup supp suppo suppos suppositoire suppositoires')
vocab('ovule', 'ov ovule ovules')
vocab('creme', 'crm creme cremes')
vocab('pommade', 'pom pomm pommade pommades')
vocab('gel', 'gel gels')
vocab('collyre', 'coll colly collyre collyres')
vocab('gouttes', 'gtt gtte gttes gte goutte gouttes')
vocab('lotion', 'lot lotion lotions')
vocab('shampooing', 'shampooing shampoing shamp')
vocab('mousse', 'mousse')
vocab('pate', 'pate pates')
vocab('pastille', 'past pastille pastilles')
vocab('collutoire', 'collut collutoire collutoires')
vocab('bain_bouche', 'bain bouche')
vocab('aerosol', 'aer aero aerosol aerosols pressurise pressurisee')
vocab('dispositif', 'dispositif dispositifs patch patchs timbre timbres')
vocab('implant', 'implant implants')
vocab('lavement', 'lavement lavements')
vocab('sachet', 'sach sachet sachets stick sticks')
vocab('solvant', 'solv solvt solvant solvants')
vocab('vernis', 'vernis')
vocab('film', 'film films')
vocab('gomme', 'gomme gommes chewing gum')
vocab('lait', 'lait laits')
vocab('gaz', 'gaz')
vocab('liquide', 'liquide liquides')
vocab('vapeur', 'vapeur')
vocab('hemodialyse', 'hemodialyse')
vocab('hemofiltration', 'hemofiltration')
vocab('dialyse', 'dialyse')
vocab('peritoneale', 'peritoneale peritoneal')
vocab('irrigation', 'irrigation')
vocab('vesicale', 'vesicale vesical')
vocab('systeme', 'systeme systemes')
vocab('uterin', 'uterin uterine intrauterin intrauterine')
vocab('preparation', 'preparation preparations')
vocab('mini', 'mini')
vocab('dure', 'dure dures')
// qualificatifs
vocab('pellicule', 'pell pel pellic pellicul pellicule pellicules pelliculee pelliculees')
vocab('enrobe', 'enr enro enrob enrobe enrobes enrobee enrobees drag drg dragee dragees')
vocab('secable', 'sec secab secable secables')
vocab('quadrisecable', 'quadrisecable quadrisecables')
vocab('effervescent', 'eff efferv effervesc effervescent effervescente effervescents effervescentes effervessant effervessante')
vocab('dispersible', 'disp dispers dispersible dispersibles')
vocab('orodispersible', 'orodisp orodispersible orodispersibles lyoc')
vocab('croquer', 'croquer croq masticable masticables macher')
vocab('sucer', 'sucer')
vocab('sublingual', 'subl sublingual sublinguale sublinguaux sublinguales')
vocab('gastroresistant', 'gastroresistant gastroresistante gastroresistants gastroresistantes')
vocab('lp', 'lp')
vocab('lm', 'lm')
vocab('molle', 'molle molles mou')
vocab('injectable', 'inj inject injectable injectables injection injections iv im sc intravasculaire peridurale intravitreenne intravitreene medullaire lesionnelle intralesionnelle perilesionnelle parenteral parenterale intrathecale')
vocab('perfusion', 'perf perfusion perfusions perfusable perfeusion perfusin')
vocab('concentre', 'conc concentre concentree diluer dil dilier')
vocab('buvable', 'buv buvable buvables buvale buvabe')
vocab('orale', 'oral orale oraux orales os or')
vocab('inhalation', 'inhal inhalation inhalations inhale inhalee inhalateur nebul nebulisation nebuliseur')
vocab('pulverisation', 'pulv pulveris pulverisation pulverisations spray sprays spyay')
vocab('nasal', 'nas nasal nasale nasaux nasales')
vocab('ophtalmique', 'opht ophtal ophtalm ophtalmique ophtalmiques oculaire oculaires')
vocab('auriculaire', 'auric auriculaire auriculaires otique otiques')
vocab('vaginal', 'gynecologique vag vaginal vaginale vaginaux vaginales')
vocab('rectal', 'rec rect rectal rectale rectaux rectales')
vocab('cutane', 'derm dermique dermiques cutane cutanee cutanes cutanees cut externe local locale topique')
vocab('transdermique', 'transd transderm transdermique transdermiques')
vocab('buccal', 'buccal buccale buccaux buccales bucco gingival gingivale oromuqueux oromuqueuse')
vocab('application', 'app appl appli applic application applications')
// mots vides : liaisons, contenants, publics, sucre (sans incidence sur la forme)
vocab('', 'a au aux de d du des en et ou la le les l p par pour avec sans usage voie forme sucre edulcore edulcoree '
  + 'adulte adultes enfant enfants nourrisson nourrissons pediatrique pediatriques ped nour '
  + 'amp ampoule ampoules fl flac flacon flacons ser seringue seringues prerempli preremplie preremplies stylo stylos '
  + 'pre rempli remplie remplies cartouche cartouches poche poches tube tubes unidose unidoses multidose multidoses recipient monodose monodoses '
  + 'b bte boite plaquette plq dose doses '
  + 'ml mg g l ui kg mcg '
  + 'sering prerempl remlie preremlie carpule carpules vial contenant contenants dans un une unique sterile '
  + 'fluide moussant moussante lipophile hydrophile epaisse hydroalcoolique filmogene bicouche menthe '
  + 'adolescents adolescent femmes femme enceinte enceintes age ans an bas mois sur lente profonde continue '
  + 'ongles medicamenteux huileuse huileux aqueuse aqueux gout jours ds bouchon doseur gradue pou '
  + 'reconstitution reconstituer diffusion administration dialyseur stylo9 por poiur per intr intra sauf enterale dentaire')

/** Fautes de frappe relevées dans la nomenclature : mot fautif → mot attendu. Signalées dans l'audit. */
const FAUTES: Record<string, string> = {
  comrime: 'comprime', comrpime: 'comprime', comprimpe: 'comprime', coprime: 'comprime', comprim2: 'comprime',
  gellule: 'gelule', gellules: 'gelules', siolution: 'solution', solotion: 'solution', suspenssion: 'suspension',
  poudrecpour: 'poudre pour', lyophiulisat: 'lyophilisat', lyophilat: 'lyophilisat', lyphilisee: 'lyophilisee',
  lyophilis2e: 'lyophilisee', effervessant: 'effervescent', effervessante: 'effervescente', perfeusion: 'perfusion',
  perfusin: 'perfusion', dilier: 'diluer', buvale: 'buvable', buvabe: 'buvable', spyay: 'spray', micrgles: 'microgranules',
  remlie: 'remplie', preremlie: 'preremplie', por: 'pour', poiur: 'pour', pou: 'pour', stylo9: 'stylo',
}

type Genre = 'm' | 'f' | 'mp' | 'fp'
const accord = (g: Genre, m: string, f: string, mp = m + 's', fp = f + 's') => (g === 'm' ? m : g === 'f' ? f : g === 'mp' ? mp : fp)

export type FormeNorm = {
  /** identifiant stable de la forme (slug du libellé, ou « x-… » pour une forme non reconnue) */
  id: string
  fr: string
  /** libellé arabe ; null tant qu'aucune traduction sûre n'existe (l'affichage garde le français) */
  ar: string | null
  voie: VoieId
  reconnu: boolean
  /** mots que le vocabulaire ne connaît pas (pour l'audit) */
  inconnus: string[]
  /** Standard Term EDQM de rattachement et nature du lien (lib/edqm.ts) ; null sans terme sûr */
  edqm: { code: string; en: string; fr: string | null; relation: EdqmRelation } | null
  /** fautes de frappe corrigées en lisant la forme : « GELLULE → GELULE » (pour l'audit des anomalies) */
  fautes: string[]
  /**
   * voies d'administration EDQM (codes 200xxxxx) : celles que la forme écrit (« IV/IM », « S/C »), sinon celle du
   * groupe de voie. Vide quand rien ne permet de trancher (« solution injectable » sans précision).
   */
  voies_edqm: string[]
  /** méthode d'administration EDQM (codes 00xx), déduite de la forme par nos règles ; null si incertaine */
  methode_edqm: string | null
}

/** Pré-traitements sur la chaîne pliée : expressions de plusieurs mots → un concept. */
function preparerForme(s: string): string {
  return s
    .replace(/gastr?o?\s*[-.]?\s*r[eé]?s(?:ist)?\w*/g, ' gastroresistant ')
    .replace(/\bg\s*\.?\s*r\b\.?/g, ' gastroresistant ')
    .replace(/\bmicro\s*-?\s*granul\w*/g, ' microgranules ')
    .replace(/\bmini\s*-?\s*comprim\w*/g, ' mini ')
    .replace(/\bquadri\s*-?\s*secab\w*/g, ' quadrisecable ')
    .replace(/\bgastro\s*-?\s*(?:enter|intest)\w*/g, ' ')
    .replace(/\bdiffusion\s+lente\b/g, ' lp ')
    .replace(/\blib\w*\.?\s+pro\w*\.?/g, ' lp ')
    .replace(/\blib\w*\.?\s+modif\w*\.?/g, ' lm ')
    .replace(/\blib\w*\.?\s+(?:imm\w*|rapide)\.?/g, ' ')
    .replace(/\b(?:a\s+)?action\s+prolongee\b/g, ' lp ')
    .replace(/\bretard\b/g, ' lp ')
    .replace(/\bl\s*\.?\s*p\b\.?/g, ' lp ')
    .replace(/\bsous[\s-]*cutan\w*/g, ' sc ')
    .replace(/\b([sie])\s*[./]\s*([cmv])\b\.?/g, ' $1$2 ')
    .replace(/\bintra[\s-]*(?:veineu|musculair)\w*/g, ' iv ')
    .replace(/\ba\s+diluer\b/g, ' concentre ')
    .replace(/\bbain\s+de\s+bouche\b/g, ' bain bouche ')
    .replace(/\bchewing[\s-]*gum\b/g, ' gomme ')
    .replace(/\bp\s*\.\s*/g, ' pour ')
    .replace(/\bpr\b\.?/g, ' pour ')
    .replace(/\bgel\s*\.(?=\s*(?:gastro|lp|\d|$))/g, ' gel_ ')
}

function motsForme(raw: string): { concepts: Set<string>; inconnus: string[]; fautes: string[] } {
  const s = preparerForme(fold(raw).replace(/[’']/g, ' '))
  const mots = s.replace(/[^a-z0-9_%]+/g, ' ').split(' ').filter(Boolean)
  const concepts = new Set<string>()
  const inconnus: string[] = []
  const fautes: string[] = []
  if (/\bgasto[\s-]*res/.test(fold(raw))) fautes.push('GASTO → GASTRO')
  for (const m of mots) {
    if (FAUTES[m]) fautes.push(`${m.toUpperCase()} → ${FAUTES[m].toUpperCase()}`)
    if (/^\d/.test(m) || m === '%') continue // quantités égarées dans la forme : conditionnement
    const c = MOTS_FORME[m]
    if (c === undefined) inconnus.push(m)
    else if (c) concepts.add(c)
  }
  return { concepts, inconnus, fautes }
}

/**
 * Libellés arabes des formes sans Standard Term exact (sécabilité, « poudre et solvant »…).
 * Les formes rattachées exactement à l'EDQM tirent leur arabe de lib/edqm-ar.ts ; le reste passe par translateForme.
 */
const FORME_AR: Record<string, string> = {
  'comprimé pelliculé sécable': 'قرص مغلف بغشاء رقيق قابل للشطر',
  'comprimé quadrisécable': 'قرص قابل للشطر إلى أربعة',
  'comprimé pelliculé quadrisécable': 'قرص مغلف بغشاء رقيق قابل للشطر إلى أربعة',
  'gaz pour inhalation': 'غاز للاستنشاق',
  'lait en poudre': 'حليب مجفف',
  'comprimé sécable': 'قرص قابل للشطر',
  'comprimé effervescent sécable': 'قرص فوار قابل للشطر',
  'comprimé pelliculé à libération prolongée': 'قرص مغلف ممتد التحرر',
  'poudre et solvant pour solution injectable': 'مسحوق ومذيب لمحلول للحقن',
  'lyophilisat pour solution injectable': 'مسحوق مجفف بالتجميد لمحلول للحقن',
  'collyre': 'قطرة عينية',
  'solution pour inhalation': 'محلول للاستنشاق',
  'suspension pour inhalation': 'معلق للاستنشاق',
  'aérosol': 'بخاخ',
  'collutoire': 'غسول للفم',
  'lotion': 'غسول',
}

/**
 * Forme canonique : forme de base + qualificatifs dans un ordre fixe.
 * Retourne null si aucune forme de base n'est identifiable.
 */
function construireForme(c: Set<string>): { fr: string; base: string } | null {
  const has = (k: string) => c.has(k)
  const destination = (): string | null => {
    // « … pour <destination> » d'une poudre, d'un lyophilisat ou de granulés
    const liquide = has('suspension') ? 'suspension' : has('emulsion') ? 'émulsion' : has('solution') ? 'solution' : null
    if (has('perfusion')) {
      if (liquide && liquide !== 'solution') return `${liquide} pour perfusion`
      return has('concentre') ? 'solution à diluer pour perfusion' : 'solution pour perfusion'
    }
    if (has('injectable')) return `${liquide ?? 'solution'} injectable`
    if (has('inhalation')) return liquide ? `${liquide} pour inhalation` : null
    if (has('buvable') || (liquide && has('orale'))) return `${liquide ?? 'solution'} buvable`
    if (has('collyre') || has('ophtalmique')) return `collyre en ${liquide ?? 'solution'}`
    if (has('nasal')) return `${liquide ?? 'solution'} nasale`
    if (has('cutane') && liquide) return `${liquide} pour application cutanée`
    if (has('bain_bouche') || has('collutoire')) return 'solution pour bain de bouche'
    if (liquide === 'suspension' && !has('solution')) return 'suspension'
    if (liquide) return liquide
    return null
  }
  const liberation = (g: Genre) => (has('lp') ? 'à libération prolongée' : has('lm') ? 'à libération modifiée' : null)
  const gastro = (g: Genre) => (has('gastroresistant') ? accord(g, 'gastro-résistant', 'gastro-résistante') : null)
  const join = (...p: (string | null | false)[]) => p.filter(Boolean).join(' ')

  // Formes particulières, à identifier avant les poudres et les solutions
  if (has('lait')) return has('poudre') ? { fr: 'lait en poudre', base: 'lait' } : { fr: 'émulsion pour application cutanée', base: 'emulsion' }
  if (has('gaz')) return { fr: 'gaz pour inhalation', base: 'gaz' }
  if (has('liquide') && (has('inhalation') || has('vapeur'))) return { fr: 'liquide pour inhalation par vapeur', base: 'liquide' }
  if (has('hemodialyse')) return { fr: has('concentre') ? 'solution concentrée pour hémodialyse' : 'solution pour hémodialyse', base: 'solution' }
  if (has('hemofiltration')) return { fr: 'solution pour hémofiltration', base: 'solution' }
  if (has('dialyse') && has('peritoneale')) return { fr: 'solution pour dialyse péritonéale', base: 'solution' }
  if (has('irrigation')) return { fr: has('vesicale') ? 'solution pour irrigation vésicale' : 'solution pour irrigation', base: 'solution' }
  if (has('systeme')) {
    if (has('uterin')) return { fr: 'système de diffusion intra-utérin', base: 'systeme' }
    if (has('vaginal')) return { fr: 'système de diffusion vaginal', base: 'systeme' }
    return null
  }
  if (has('preparation') && has('injectable') && !has('poudre') && !has('lyophilisat')) {
    return { fr: has('solvant') ? 'solvant pour préparation injectable' : 'solution pour préparation injectable', base: 'solvant' }
  }
  // Gélule contenant des microgranules ou des mini-comprimés : la forme est la gélule (Standard Terms EDQM)
  if (has('gelule') && (has('granules') || has('mini')) && !has('inhalation')) {
    return { fr: join('gélule', gastro('f'), liberation('f')), base: 'gelule' }
  }
  // Capsule dure = gélule (EDQM)
  if (has('capsule') && has('dure') && !has('inhalation')) return { fr: join('gélule', gastro('f'), liberation('f')), base: 'gelule' }

  // Poudre / lyophilisat / granulés pour …
  for (const [k, nom, g] of [['poudre', 'poudre', 'f'], ['lyophilisat', 'lyophilisat', 'm'], ['granules', 'granulés', 'mp']] as const) {
    if (!has(k)) continue
    if (k === 'poudre' && has('inhalation') && !has('solution') && !has('suspension')) {
      return { fr: has('gelule') || has('capsule') ? 'poudre pour inhalation en gélule' : 'poudre pour inhalation', base: k }
    }
    const dest = destination()
    // un lyophilisat parentéral est une « poudre pour … » dans les Standard Terms ; seul le lyophilisat oral garde son nom
    const nomFinal = k === 'lyophilisat' && dest && /injectable|perfusion/.test(dest) ? 'poudre' : nom
    if (dest) return { fr: `${nomFinal}${has('solvant') ? ' et solvant' : ''} pour ${dest}`, base: k }
    if (k === 'poudre') {
      if (has('cutane') || has('application')) return { fr: 'poudre pour application cutanée', base: k }
      if (has('orale') || has('sachet') || has('buvable')) return { fr: 'poudre orale', base: k }
      return { fr: 'poudre', base: k }
    }
    if (k === 'lyophilisat') return { fr: has('orale') || has('orodispersible') ? 'lyophilisat oral' : 'lyophilisat', base: k }
    return { fr: join('granulés', has('effervescent') && 'effervescents', gastro('mp'), liberation('mp')), base: k }
  }

  if (has('comprime')) {
    const type = has('orodispersible') ? 'orodispersible'
      : has('dispersible') ? 'dispersible'
      : has('effervescent') ? 'effervescent'
      : has('sublingual') ? 'sublingual'
      : has('vaginal') ? 'vaginal'
      : has('croquer') ? 'à croquer'
      : has('sucer') ? 'à sucer'
      : null
    const enrobage = has('pellicule') ? 'pelliculé' : has('enrobe') ? 'enrobé' : null
    const secable = has('quadrisecable') ? 'quadrisécable' : has('secable') ? 'sécable' : null
    return { fr: join('comprimé', type, enrobage, secable, gastro('m'), liberation('m')), base: 'comprime' }
  }
  if (has('gelule') && !has('gel')) {
    if (has('inhalation')) return { fr: 'poudre pour inhalation en gélule', base: 'gelule' }
    return { fr: join('gélule', gastro('f'), liberation('f')), base: 'gelule' }
  }
  if (has('gelule') && has('gel')) return null // « GEL » et « GELULE » ensemble : ambigu
  if (has('capsule')) {
    if (has('vaginal')) return { fr: 'capsule molle vaginale', base: 'capsule' }
    return { fr: join(has('molle') ? 'capsule molle' : 'capsule', gastro('f'), liberation('f')), base: 'capsule' }
  }
  if (has('sirop')) return { fr: 'sirop', base: 'sirop' }
  if (has('suppositoire')) return { fr: has('vaginal') ? 'suppositoire vaginal' : 'suppositoire', base: 'suppositoire' }
  if (has('ovule')) return { fr: 'ovule', base: 'ovule' }
  if (has('lavement')) return { fr: 'lavement', base: 'lavement' }
  if (has('dispositif') || has('transdermique')) return { fr: 'dispositif transdermique', base: 'dispositif' }
  if (has('implant')) return { fr: 'implant', base: 'implant' }
  if (has('gomme')) return { fr: 'gomme à mâcher médicamenteuse', base: 'gomme' }
  if (has('pastille')) return { fr: 'pastille', base: 'pastille' }
  if (has('collutoire')) return { fr: 'collutoire', base: 'collutoire' }
  if (has('vernis')) return { fr: 'vernis à ongles médicamenteux', base: 'vernis' }
  if (has('film')) return { fr: has('orodispersible') ? 'film orodispersible' : 'film', base: 'film' }

  const semiSolide = (k: string, nom: string, g: Genre) => {
    if (!has(k)) return null
    const lieu = has('ophtalmique') || has('collyre') ? accord(g, 'ophtalmique', 'ophtalmique')
      : has('nasal') ? accord(g, 'nasal', 'nasale')
      : has('auriculaire') ? 'auriculaire'
      : has('rectal') ? accord(g, 'rectal', 'rectale')
      : has('vaginal') ? accord(g, 'vaginal', 'vaginale')
      : has('buccal') ? accord(g, 'buccal', 'buccale')
      : has('buvable') || has('orale') ? 'buvable'
      : null
    return { fr: join(nom, lieu), base: k }
  }
  const ss = semiSolide('creme', 'crème', 'f') ?? semiSolide('pommade', 'pommade', 'f') ?? semiSolide('gel', 'gel', 'm')
    ?? semiSolide('pate', 'pâte', 'f') ?? semiSolide('mousse', 'mousse', 'f')
  if (ss) return ss
  if (has('lotion')) return { fr: 'lotion', base: 'lotion' }
  if (has('shampooing')) return { fr: 'shampooing', base: 'shampooing' }

  if (has('collyre')) {
    if (has('suspension')) return { fr: join('collyre en suspension', liberation('m')), base: 'collyre' }
    if (has('solution')) return { fr: join('collyre en solution', liberation('m')), base: 'collyre' }
    return { fr: 'collyre', base: 'collyre' }
  }
  if (has('gouttes')) {
    if (has('auriculaire')) return { fr: 'gouttes auriculaires', base: 'gouttes' }
    if (has('nasal')) return { fr: 'gouttes nasales', base: 'gouttes' }
    if (has('ophtalmique')) return { fr: 'collyre en solution', base: 'gouttes' }
    if (has('suspension')) return { fr: 'suspension buvable en gouttes', base: 'gouttes' }
    if (has('buvable') || has('orale') || has('solution')) return { fr: 'solution buvable en gouttes', base: 'gouttes' }
    return { fr: 'gouttes', base: 'gouttes' }
  }
  if (has('pulverisation') || has('aerosol')) {
    const liquide = has('suspension') ? 'suspension' : 'solution'
    if (has('nasal')) return { fr: `${liquide} pour pulvérisation nasale`, base: 'pulverisation' }
    // « inhalation buccale », « aérosol buccal » : inhalation par la bouche, pas une pulvérisation buccale
    if (has('inhalation') || has('aerosol')) return { fr: has('aerosol') && !has('solution') && !has('suspension') ? 'aérosol' : `${liquide} pour inhalation en flacon pressurisé`, base: 'pulverisation' }
    if (has('buccal')) return { fr: `${liquide} pour pulvérisation buccale`, base: 'pulverisation' }
    if (has('cutane')) return { fr: `${liquide} pour pulvérisation cutanée`, base: 'pulverisation' }
    return { fr: `${liquide} pour pulvérisation`, base: 'pulverisation' }
  }
  if (has('solution') || has('suspension') || has('emulsion') || (has('concentre') && has('perfusion'))) {
    const liquide = has('suspension') ? 'suspension' : has('emulsion') ? 'émulsion' : 'solution'
    const concentre = has('concentre') && liquide === 'solution'
    if (has('perfusion')) return { fr: concentre ? 'solution à diluer pour perfusion' : `${liquide} pour perfusion`, base: liquide }
    if (has('injectable')) return { fr: concentre ? 'solution à diluer injectable' : `${liquide} injectable`, base: liquide }
    if (has('inhalation')) return { fr: `${liquide} pour inhalation`, base: liquide }
    const lieu = has('buvable') || has('orale') ? 'buvable'
      : has('nasal') ? 'nasale'
      : has('auriculaire') ? 'auriculaire'
      : has('ophtalmique') ? null
      : has('rectal') ? 'rectale'
      : has('vaginal') ? 'vaginale'
      : has('bain_bouche') ? 'pour bain de bouche'
      : has('buccal') ? 'buccale'
      : has('cutane') || has('application') ? 'pour application cutanée'
      : null
    if (has('ophtalmique')) return { fr: `collyre en ${liquide}`, base: liquide }
    return { fr: join(liquide, lieu, has('gouttes') && lieu === 'buvable' && 'en gouttes'), base: liquide }
  }
  if (has('bain_bouche')) return { fr: 'solution pour bain de bouche', base: 'solution' }
  if (has('enrobe')) return { fr: 'comprimé enrobé', base: 'comprime' } // « DRG. » : dragée
  if (has('buvable')) return { fr: 'solution buvable', base: 'solution' } // « AMP. BUV. » : ampoule buvable
  return null
}

/** Voie d'administration déduite des concepts (de la plus spécifique à la plus générale). */
function voieDe(c: Set<string>, fr: string | null): VoieId {
  const has = (k: string) => c.has(k)
  const f = fr ?? ''
  if (has('injectable') || has('perfusion') || /injectable|perfusion/.test(f)) return 'injectable'
  if (has('inhalation') || has('aerosol') || /inhalation/.test(f)) return 'inhalee'
  if (has('collyre') || has('ophtalmique') || /collyre|ophtalmique/.test(f)) return 'ophtalmique'
  if (has('auriculaire')) return 'auriculaire'
  if (has('nasal')) return 'nasale'
  if (has('vaginal') || has('ovule')) return 'vaginale'
  if (has('rectal') || has('suppositoire') || has('lavement')) return 'rectale'
  if (has('transdermique') || has('dispositif')) return 'transdermique'
  if (has('collutoire') || has('bain_bouche') || has('buccal') || has('pastille') || has('sublingual') || (has('sucer') && !has('croquer')) || has('gomme')) return 'buccale'
  if (/buvable|^sirop|^lait en poudre/.test(f) || has('sirop') || (has('gouttes') && (has('buvable') || has('orale')))) return 'orale-liquide'
  if (has('cutane') || has('application') || has('creme') || has('pommade') || has('lotion') || has('shampooing') || has('pate') || has('mousse') || has('vernis') || (has('gel') && !has('buvable'))) return 'cutanee'
  if (has('comprime') || has('gelule') || has('capsule') || has('granules') || /^poudre orale|^lyophilisat oral|^film/.test(f) || (has('poudre') && (has('orale') || has('sachet')))) return 'orale-solide'
  return 'autre'
}

const capitaliser = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Voies écrites en toutes lettres ou en abrégé dans la forme : motif (sur la forme pliée) → code EDQM. */
const VOIES_ECRITES: [RegExp, string][] = [
  [/\bi\s*[./]?\s*v\b|intra[\s-]*veineu|\bperf/, '20045000'], // intraveineuse (une perfusion l'est)
  [/\bi\s*[./]?\s*m\b|intra[\s-]*muscul/, '20035000'], // intramusculaire
  [/\bs\s*[./]?\s*c\b|sous[\s-]*cutan/, '20066000'], // sous-cutanée
  [/peridural/, '20009000'],
  [/intra[\s-]*thecal/, '20042000'],
  [/intra[\s-]*vitre/, '20047000'],
  [/intra[\s-]*lesion/, '20032000'],
  [/intra[\s-]*articul/, '20024000'],
]

function voiesEdqmDe(brut: string, voie: VoieId, c: Set<string>): string[] {
  const f = fold(brut)
  if (voie === 'injectable') {
    if (c.has('implant')) return ['20066000']
    return VOIES_ECRITES.filter(([re]) => re.test(f)).map(([, code]) => code)
  }
  if (c.has('hemodialyse') || c.has('hemofiltration')) return ['20015000']
  if (c.has('dialyse') && c.has('peritoneale')) return ['20038000']
  if (c.has('irrigation') && c.has('vesicale')) return ['20046000']
  if (c.has('systeme') && c.has('uterin')) return ['20044000']
  if (c.has('sublingual')) return ['20067000']
  const code = voieParId(voie)?.edqm
  return code ? [code] : []
}

/** Méthode d'administration EDQM, par règles simples sur la voie et la forme. À faire valider. */
function methodeEdqmDe(voie: VoieId, c: Set<string>, fr: string): string | null {
  const f = fold(fr)
  if (c.has('hemodialyse') || c.has('hemofiltration') || c.has('dialyse')) return '0112'
  if (c.has('implant')) return '0113'
  switch (voie) {
    case 'injectable': return /perfusion/.test(f) ? '0009' : '0011'
    case 'orale-solide':
      if (c.has('orodispersible')) return '0014'
      if (c.has('croquer') || c.has('gomme')) return '0007'
      return '0019'
    case 'orale-liquide': return '0019'
    case 'inhalee': return '0010'
    case 'cutanee': case 'transdermique': return '0005'
    case 'ophtalmique': case 'auriculaire': case 'nasale':
      if (/pulverisation/.test(f)) return '0017'
      return /collyre|gouttes|solution|suspension/.test(f) ? '0013' : '0005'
    case 'rectale': case 'vaginale':
      return /suppositoire|ovule|comprime|capsule|systeme/.test(f) ? '0012' : '0005'
    case 'buccale':
      if (/bain de bouche/.test(f)) return '0015'
      if (/gargarisme/.test(f)) return '0008'
      if (c.has('sucer') || c.has('pastille')) return '0018'
      if (/pulverisation/.test(f)) return '0017'
      return c.has('sublingual') ? '0014' : '0005'
    default: return null
  }
}

export function normaliserForme(raw: string | null | undefined): FormeNorm {
  const brut = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!brut) {
    return { id: 'non-precisee', fr: 'Non précisée', ar: 'غير محدد', voie: 'autre', reconnu: true, inconnus: [], edqm: null, fautes: [], voies_edqm: [], methode_edqm: null }
  }
  const { concepts, inconnus, fautes } = motsForme(brut)
  const canon = inconnus.length ? null : construireForme(concepts)
  const voie = voieDe(concepts, canon?.fr ?? null)
  const voies_edqm = voiesEdqmDe(brut, voie, concepts)
  if (!canon) {
    // Rien n'est rapproché : la forme garde son écriture d'origine.
    const fr = capitaliser(brut.toLowerCase())
    return { id: `x-${slugify(brut)}`, fr, ar: translateForme(brut), voie, reconnu: false, inconnus, edqm: null, fautes, voies_edqm, methode_edqm: null }
  }
  const lien = lierForme(canon.fr)
  const edqm = lien ? { code: lien.code, en: lien.en, fr: lien.fr, relation: lien.relation } : null
  // Lien exact : le libellé affiché est le terme officiel EDQM (« Gel oral », « Patch transdermique »).
  const fr = lien?.relation === 'exact' && lien.fr ? lien.fr : capitaliser(canon.fr)
  const ar = (lien?.relation === 'exact' ? lien.ar : null) ?? FORME_AR[canon.fr] ?? translateForme(canon.fr)
  return { id: slugify(fr), fr, ar, voie, reconnu: true, inconnus: [], edqm, fautes, voies_edqm, methode_edqm: methodeEdqmDe(voie, concepts, canon.fr) }
}

// ═══════════════════════════════════════════════════════════════
// Dosages
// ═══════════════════════════════════════════════════════════════

const UNITES: Record<string, Unite> = {
  mg: 'mg', milligramme: 'mg', milligrammes: 'mg',
  g: 'g', gr: 'g', gramme: 'g', grammes: 'g',
  'µg': 'µg', mcg: 'µg', ug: 'µg', microgramme: 'µg', microgrammes: 'µg', gamma: 'µg', gammas: 'µg',
  ng: 'ng', nanogramme: 'ng', nanogrammes: 'ng', kg: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', l: 'l', litre: 'l', litres: 'l', cl: 'cl', 'µl': 'µl', ul: 'µl',
  ui: 'ui', iu: 'ui', u: 'ui', unite: 'ui', unites: 'ui', mui: 'mui', kui: 'kui',
  '%': '%', '°': 'deg', ir: 'ir', mmol: 'mmol', meq: 'meq',
  dose: 'dose', doses: 'dose', goutte: 'goutte', gouttes: 'goutte', gtt: 'goutte',
  pulv: 'pulv', pulverisation: 'pulv', pulverisations: 'pulv', bouffee: 'pulv', bouffees: 'pulv', actuation: 'pulv', inhalation: 'pulv',
  cm2: 'cm2', 'cm²': 'cm2', h: 'h', heure: 'h', heures: 'h',
  // contenants : jetons posés par lireQuantites (« 1G/FL. DE PDRE. » → 1 g par flacon)
  cflacon: 'flacon', csachet: 'sachet', cstick: 'stick', campoule: 'ampoule', cseringue: 'seringue', cstylo: 'stylo', ccp: 'cp', cgelule: 'gelule',
}
const CONTENANTS = new Set<Unite>(['flacon', 'sachet', 'stick', 'ampoule', 'seringue', 'stylo', 'cp', 'gelule'])
/** Facteur vers l'unité de base de la même dimension. */
const BASE: Record<Unite, [string, number]> = {
  mg: ['mg', 1], g: ['mg', 1000], 'µg': ['mg', 0.001], ng: ['mg', 1e-6], kg: ['mg', 1e6],
  ml: ['ml', 1], l: ['ml', 1000], cl: ['ml', 10], 'µl': ['ml', 0.001],
  ui: ['ui', 1], mui: ['ui', 1e6], kui: ['ui', 1000], '%': ['%', 1], deg: ['deg', 1], ir: ['ir', 1], mmol: ['mmol', 1], meq: ['meq', 1],
  dose: ['dose', 1], goutte: ['goutte', 1], pulv: ['pulv', 1], cm2: ['cm2', 1], h: ['h', 1],
  flacon: ['flacon', 1], sachet: ['sachet', 1], stick: ['stick', 1], ampoule: ['ampoule', 1], seringue: ['seringue', 1],
  stylo: ['stylo', 1], cp: ['cp', 1], gelule: ['gelule', 1],
}
const DENOMINATEURS = new Set<Unite>(['ml', 'l', 'cl', 'µl', 'dose', 'goutte', 'pulv', 'cm2', 'h', ...CONTENANTS])
type Quantite = { v: number; u: Unite | null }

export type DosageNorm = {
  /** identifiant stable (slug de la clé), « x-… » si non reconnu, « non-precise » si vide */
  id: string
  /** écriture canonique de cette ligne : « 250 mg/5 ml », « 1 g + 125 mg », « 2,4 % » */
  libelle: string
  /**
   * clé de regroupement, unités de base. Le volume du dénominateur est conservé : « 40 mg/0,4 ml » et
   * « 80 mg/0,8 ml » sont deux présentations (une seringue n'est pas l'autre), « 250 mg/5 ml » ≠ « 50 mg/ml ».
   * Une quantité par contenant (« 1 g/flacon ») rejoint la quantité seule (« 1 g »).
   */
  cle: string
  /** valeur de tri : premier composant en unité de base, par unité de dénominateur */
  tri: number | null
  /** 0 masse/activité, 1 concentration, 2 pourcentage ou degré, 3 non reconnu */
  famille: number
  composants: number
  reconnu: boolean
  /** incohérence relevée (nombre de quantités ≠ nombre de substances) */
  alerte: string | null
  /** équivalence écartée de la clé (« (50MG/5ML) », « OU 0,05% »), gardée pour l'audit */
  complement: string | null
  /** libellé arabe (« 250 ملغ/5 مل ») ; null si le dosage n'est pas reconnu */
  libelle_ar: string | null
  /** quantités telles qu'écrites, avec leur code UCUM : de quoi construire un Ratio FHIR */
  quantites: QuantiteUcum[]
  denominateur: QuantiteUcum | null
}

export type QuantiteUcum = { valeur: number; unite: string; ucum: string | null }

const nombreFr = (n: number) => {
  const r = Number(n.toPrecision(6))
  const [ent, dec] = String(r).split('.')
  const entier = ent.length > 4 ? ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ent
  return dec ? `${entier},${dec}` : entier
}
const nombreCle = (n: number) => String(Number(n.toPrecision(6)))
const idDosage = (cle: string) => slugify(cle.replace(/\//g, ' par ').replace(/\+/g, ' plus ').replace(/%/g, ' pct').replace(/\./g, '-'))

const CONTENANT_RE = /\/\s*(fl|flac|flacons?|sachets?(?:\s*-?\s*doses?)?|sticks?|amp|ampoules?|seringues?|stylos?|cp|comprimes?|gelules?)\b\.?(?:\s*(?:de|d)\s*\.?\s*(?:pdre|poudre|lyoph|lyophilisat|conc|concentre|solution|sol)\b\.?)?/g
const CONTENANT_JETON: [RegExp, string][] = [
  [/^fl/, 'cflacon'], [/^sachet/, 'csachet'], [/^stick/, 'cstick'], [/^amp/, 'campoule'], [/^seringue/, 'cseringue'],
  [/^stylo/, 'cstylo'], [/^c(?:p|omprime)/, 'ccp'], [/^gelule/, 'cgelule'],
]

function lireQuantites(raw: string): { items: (Quantite | '/' | '+')[]; ok: boolean } {
  let s = fold(raw).replace(/μ/g, 'µ').replace(/\*+/g, ' ')
  s = s.replace(/\b[mpwv]\s*\/\s*[mpwv]\b/g, ' ') // « % m/m », « p/v »
  s = s.replace(CONTENANT_RE, (_, c: string) => ` / ${CONTENANT_JETON.find(([re]) => re.test(c))![1]} `)
  // séparateurs de milliers : espace (« 100 000 UI ») ; point seulement devant une unité d'activité
  // (« 100.000 UI ») ou sur plusieurs groupes (« 1.000.000 ») — « 1.250 MG » est lu comme un décimal (1,25 mg)
  s = s.replace(/\b([1-9]\d{0,2})((?: \d{3})+)(?![\d,.])/g, (_, a: string, rest: string) => a + rest.replace(/ /g, ''))
  s = s.replace(/\b([1-9]\d{0,2})((?:\.\d{3}){2,}|\.\d{3}(?=\s*(?:[mk]\s*)?(?:ui|u|iu)\b))(?![\d,])/g, (_, a: string, rest: string) => a + rest.replace(/\./g, ''))
  s = s.replace(/(\d),(\d)/g, '$1.$2')
  s = s.replace(/\bm\s*ui\b|\bmillions?\s+(?:d\s*')?ui\b/g, ' mui ').replace(/\bk\s*ui\b/g, ' kui ')
  const toks = s.match(/\d+(?:\.\d+)?|[a-zµ²%°]+|[/+;,]|\S/g) ?? []
  const items: (Quantite | '/' | '+')[] = []
  for (const t of toks) {
    if (/^\d/.test(t)) { items.push({ v: parseFloat(t), u: null }); continue }
    if (t === '/' || t === 'par' || t === 'pour') { items.push('/'); continue }
    if (t === '+' || t === ';' || t === ',' || t === 'et') { items.push('+'); continue }
    if (t === 'de' || t === 'd' || t === '.') continue
    const u = UNITES[t]
    if (!u) return { items, ok: false }
    const prev = items[items.length - 1]
    if (prev && typeof prev === 'object' && prev.u === null) prev.u = u
    else if (prev === '/' || prev === undefined) {
      if (prev === undefined) return { items, ok: false }
      items.push({ v: 1, u }) // « mg/ml » : dénominateur implicite de 1
    } else return { items, ok: false }
  }
  return { items, ok: true }
}

function analyserDosage(brut: string, nbSubstances: number): Omit<DosageNorm, 'complement'> | null {
  const ucum = (q: Quantite): QuantiteUcum => ({ valeur: q.v, unite: UNITES_INFO[q.u as Unite].symbole, ucum: UNITES_INFO[q.u as Unite].ucum })
  const { items, ok } = lireQuantites(brut)
  if (!ok || !items.length) return null
  // structure : quantité (sep quantité)*
  const qs: Quantite[] = []
  const seps: ('/' | '+')[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (i % 2 === 0) { if (typeof it !== 'object') return null; qs.push(it) }
    else { if (typeof it === 'object') return null; seps.push(it) }
  }
  if (seps.length !== qs.length - 1) return null
  // dénominateur : dernière quantité, introduite par « / », d'une unité de volume, de dose, d'un contenant… ou
  // d'une masse en g quand les numérateurs couvrent déjà toutes les substances (« 20 mg/g », « 5 g/100 g »)
  let denom: Quantite | null = null
  const last = qs[qs.length - 1]
  if (qs.length > 1 && seps[seps.length - 1] === '/' && last.u) {
    const masse = (last.u === 'g' || last.u === 'kg') && qs.length - 1 >= nbSubstances
    if (DENOMINATEURS.has(last.u) || masse) denom = last
  }
  const nums = denom ? qs.slice(0, -1) : qs
  // unités manquantes : héritées de la quantité suivante (« 500/62,5 mg »)
  for (let i = nums.length - 1; i >= 0; i--) {
    if (!nums[i].u) {
      const suiv = nums.slice(i + 1).find(q => q.u)
      if (!suiv) return null
      nums[i].u = suiv.u
    }
  }
  if (nums.some(q => q.u && DENOMINATEURS.has(q.u) && q.u !== 'h')) return null
  const units = nums.map(q => q.u as Unite)
  const base = nums.map(q => q.v * BASE[q.u as Unite][1])
  const contenant = denom && CONTENANTS.has(denom.u as Unite) && denom.v === 1
  // dénominateur de la clé : quantité gardée (ml, g, heures…) ; un contenant unitaire disparaît de la clé
  let d = 1
  let dCle = ''
  if (denom && !contenant) {
    const u = denom.u as Unite
    const [bu, f] = u === 'g' || u === 'kg' ? ['g', u === 'kg' ? 1000 : 1] : BASE[u]
    d = denom.v * f
    dCle = `/${nombreCle(d)}${bu}`
  }
  const cle = nums.map((q, i) => `${nombreCle(base[i])}${BASE[units[i]][0]}`).join('+') + dCle
  let libelle = nums.map(q => `${nombreFr(q.v)} ${UNITES_INFO[q.u as Unite].symbole}`).join(' + ').replace(/ °/g, '°')
  if (denom) {
    const den = `${denom.v === 1 ? '' : nombreFr(denom.v) + ' '}${UNITES_INFO[denom.u as Unite].symbole}`
    libelle = nums.length > 1 ? `${libelle} par ${den}` : `${libelle}/${den}`
  }
  let libelle_ar = nums.map(q => `${nombreFr(q.v)} ${UNITES_INFO[q.u as Unite].ar}`).join(' + ').replace(/ °/g, '°')
  if (denom) {
    const den = `${denom.v === 1 ? '' : nombreFr(denom.v) + ' '}${UNITES_INFO[denom.u as Unite].ar}`
    libelle_ar = nums.length > 1 ? `${libelle_ar} لكل ${den}` : `${libelle_ar}/${den}`
  }
  const famille = units[0] === '%' || units[0] === 'deg' ? 2 : denom && !contenant ? 1 : 0
  const alerte = nbSubstances > 1 && nums.length !== nbSubstances
    ? `${nums.length} quantité(s) pour ${nbSubstances} substances`
    : nbSubstances === 1 && nums.length > 1 ? `${nums.length} quantités pour une seule substance` : null
  return {
    id: idDosage(cle), libelle, cle, tri: base[0] / d, famille, composants: nums.length, reconnu: true, alerte,
    libelle_ar, quantites: nums.map(ucum), denominateur: denom ? ucum(denom) : null,
  }
}

/**
 * @param nbSubstances nombre de substances de la DCI : distingue « 1 g/125 mg » (deux composants)
 *                     de « 20 mg/g » (une concentration).
 */
export function normaliserDosage(raw: string | null | undefined, nbSubstances = 1): DosageNorm {
  const brut = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!brut || /^(?:-+|n\/?a|neant|\/)$/i.test(brut)) {
    return { id: 'non-precise', libelle: 'Non précisé', cle: '', tri: null, famille: 3, composants: 0, reconnu: true, alerte: null, complement: null, libelle_ar: 'غير محدد', quantites: [], denominateur: null }
  }
  // Nombre seul sans unité, entre 0 et 1 : pourcentage converti en fraction par l'export Excel de la nomenclature
  // (« 0,02 » = 2 %, « 0,0005 » = 0,05 %). Validé sur la nomenclature MIPH ; l'écriture d'origine reste dans `complement`.
  const fraction = /^0?[.,]\d+$/.test(brut) ? parseFloat(brut.replace(',', '.')) : NaN
  if (fraction > 0 && fraction < 1) {
    const pct = analyserDosage(`${String(Number((fraction * 100).toPrecision(6))).replace('.', ',')} %`, nbSubstances)
    if (pct) return { ...pct, complement: `valeur Excel « ${brut} » lue comme pourcentage` }
  }
  const direct = analyserDosage(brut, nbSubstances)
  if (direct) return { ...direct, complement: null }
  // « 10MG/ML (50MG/5ML) », « 2MG/5ML OU 0,40MG/ML » : la première écriture fait foi, l'équivalence est écartée
  const m = brut.match(/^(.+?)\s*(\(.*|\bOU\b.*)$/i)
  if (m) {
    const principal = analyserDosage(m[1].replace(/\*+/g, '').trim(), nbSubstances)
    if (principal) return { ...principal, complement: m[2].trim() }
  }
  return { id: `x-${slugify(brut)}`, libelle: brut, cle: `x:${fold(brut)}`, tri: null, famille: 3, composants: 0, reconnu: false, alerte: null, complement: null, libelle_ar: null, quantites: [], denominateur: null }
}

// ═══════════════════════════════════════════════════════════════
// DCI
// ═══════════════════════════════════════════════════════════════

export type DciNorm = { id: string; libelle: string; substances: string[] }

export function normaliserDci(raw: string | null | undefined): DciNorm {
  const libelle = (raw ?? '')
    .toUpperCase()
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/([A-ZÀ-Ü)]{2,})\s*\/\s*(?=[A-ZÀ-Ü(]{2,})/g, '$1 + ')
    .replace(/\s+ET\s+/g, ' + ')
    .replace(/,\s+(?=[A-ZÀ-Ü]{2,})/g, ' + ')
    .trim()
  if (!libelle) return { id: 'non-precisee', libelle: 'Non précisée', substances: [] }
  const substances = libelle.split(' + ').map(s => s.trim()).filter(Boolean)
  const cle = [...substances].map(s => fold(s)).sort().join(' + ')
  return { id: slugify(cle) || 'non-precisee', libelle, substances }
}

// ═══════════════════════════════════════════════════════════════
// Index et moteur de facettes
// ═══════════════════════════════════════════════════════════════

export type LigneNomenclature = {
  id: number
  dci: string | null
  nom_marque: string
  forme: string | null
  dosage: string | null
  conditionnement?: string | null
  labo?: string | null
  pays?: string | null
  statut?: string | null
}

export type Presentation = LigneNomenclature & {
  /** identifiants des axes, ceux que portent les paramètres d'URL */
  axes: { dci: string; voie: VoieId; forme: string; dosage: string; statut: string; labo: string }
  norm: { dci: DciNorm; forme: FormeNorm; dosage: DosageNorm }
}

type LienEdqm = { code: string; terme: string; relation: EdqmRelation }
type Libelle = { fr: string; ar: string | null; tri?: number | null; famille?: number; edqm?: LienEdqm | null }
export type GuideIndex = {
  presentations: Presentation[]
  /**
   * libellé retenu par axe et par identifiant : la variante d'écriture la plus fréquente. Pour le dosage, la clé
   * est « dci|dosage » : le libellé est choisi parmi les écritures de la DCI, jamais emprunté à une autre.
   */
  libelles: Record<Critere, Map<string, Libelle>>
  /** pour la recherche de la première étape : mots pliés de la DCI et des marques */
  dciTexte: Map<string, { dci: string; marques: Set<string> }>
}

export const AXES_GUIDES = ['voie', 'forme', 'dosage'] as const
export const CRITERES = ['dci', 'voie', 'forme', 'dosage', 'statut', 'labo'] as const
export type AxeGuide = (typeof AXES_GUIDES)[number]
export type Critere = (typeof CRITERES)[number]

const STATUTS: Record<string, Libelle> = {
  f: { fr: 'Fabriqué en Algérie', ar: 'مصنع في الجزائر' },
  i: { fr: 'Importé', ar: 'مستورد' },
  'non-precise': { fr: 'Non précisé', ar: 'غير محدد' },
}

/** Réordonne les composants d'un dosage selon l'ordre alphabétique des substances (clé de la DCI). */
function aligneSurDci(dos: DosageNorm, dci: DciNorm): DosageNorm {
  if (!dos.reconnu || dos.composants < 2 || dos.composants !== dci.substances.length) return dos
  const ordre = dci.substances.map((s, i) => [fold(s), i] as const).sort((a, b) => a[0].localeCompare(b[0])).map(x => x[1])
  if (ordre.every((v, i) => v === i)) return dos
  const [corps, den] = dos.cle.split('/')
  const parts = corps.split('+')
  const cle = ordre.map(i => parts[i]).join('+') + (den ? `/${den}` : '')
  return { ...dos, cle, id: idDosage(cle) }
}

export function construireIndex(lignes: LigneNomenclature[]): GuideIndex {
  const variantes: Record<Critere, Map<string, Map<string, { n: number; l: Libelle }>>> = {
    dci: new Map(), voie: new Map(), forme: new Map(), dosage: new Map(), statut: new Map(), labo: new Map(),
  }
  const compter = (c: Critere, id: string, l: Libelle) => {
    let m = variantes[c].get(id)
    if (!m) variantes[c].set(id, (m = new Map()))
    const v = m.get(l.fr)
    if (v) v.n++
    else m.set(l.fr, { n: 1, l })
  }
  const dciTexte = new Map<string, { dci: string; marques: Set<string> }>()
  const presentations: Presentation[] = []
  for (const l of lignes) {
    if (!l.nom_marque?.trim()) continue
    const dci = normaliserDci(l.dci)
    const forme = normaliserForme(l.forme)
    const dosage = aligneSurDci(normaliserDosage(l.dosage, Math.max(1, dci.substances.length)), dci)
    const statut = /^f/i.test(l.statut ?? '') ? 'f' : /^i/i.test(l.statut ?? '') ? 'i' : 'non-precise'
    const laboNom = (l.labo ?? '').replace(/\s+/g, ' ').trim()
    const labo = slugify(laboNom) || 'non-precise'
    const axes = { dci: dci.id, voie: forme.voie, forme: forme.id, dosage: dosage.id, statut, labo }
    presentations.push({ ...l, axes, norm: { dci, forme, dosage } })
    compter('dci', dci.id, { fr: dci.libelle, ar: null })
    const v = voieParId(forme.voie)!
    compter('voie', v.id, { fr: v.fr, ar: v.ar })
    compter('forme', forme.id, {
      fr: forme.fr, ar: forme.ar,
      edqm: forme.edqm ? { code: forme.edqm.code, terme: forme.edqm.fr ?? forme.edqm.en, relation: forme.edqm.relation } : null,
    })
    compter('dosage', cleLibelle('dosage', dosage.id, dci.id), { fr: dosage.libelle, ar: dosage.libelle_ar, tri: dosage.tri, famille: dosage.famille })
    compter('statut', statut, STATUTS[statut])
    compter('labo', labo, { fr: laboNom || 'Non précisé', ar: null })
    let t = dciTexte.get(dci.id)
    if (!t) dciTexte.set(dci.id, (t = { dci: fold(dci.libelle), marques: new Set() }))
    t.marques.add(l.nom_marque.replace(/\s+/g, ' ').trim())
  }
  const libelles = {} as GuideIndex['libelles']
  for (const c of CRITERES) {
    libelles[c] = new Map()
    for (const [id, m] of variantes[c]) {
      const best = [...m.values()].sort((a, b) => b.n - a.n || a.l.fr.localeCompare(b.l.fr, 'fr'))[0]
      libelles[c].set(id, best.l)
    }
  }
  return { presentations, libelles, dciTexte }
}

export type Selection = Partial<Record<Critere, string>> & { q?: string }

export type Option = {
  id: string
  libelle: string
  /** libellé arabe s'il existe ; sinon l'affichage garde le français */
  libelle_ar: string | null
  n: number
  /** voie : formulation courante (« À boire ») */
  courant?: string
  /** première étape : marques qui ont fait remonter cette DCI */
  marques?: string[]
  /** forme : Standard Term EDQM de rattachement ; voie : voie d'administration EDQM (relation exacte) */
  edqm?: LienEdqm
}

export type GuideReponse = {
  /** prochaine étape à proposer ; null quand le parcours est complet */
  etape: Critere | null
  selection: Partial<Record<Critere, { id: string; libelle: string; libelle_ar: string | null }>>
  /** étapes remplies d'office (une seule valeur possible) */
  auto: Critere[]
  /** valeurs demandées mais incompatibles avec le reste, donc retirées */
  ignores: Critere[]
  options: Partial<Record<Critere, Option[]>>
  total: number
  presentations: Presentation[]
}

/** Clé de la table des libellés : le dosage est propre à chaque DCI. */
const cleLibelle = (c: Critere, id: string, dci: string) => (c === 'dosage' ? `${dci}|${id}` : id)

const correspond = (p: Presentation, sel: Selection, sauf?: Critere) =>
  CRITERES.every(c => c === sauf || !sel[c] || p.axes[c] === sel[c])

function compterOptions(idx: GuideIndex, rows: Presentation[], c: Critere, dci: string, lang: 'fr' | 'ar'): Option[] {
  const n = new Map<string, number>()
  for (const p of rows) n.set(p.axes[c], (n.get(p.axes[c]) ?? 0) + 1)
  const opts: Option[] = [...n].map(([id, k]) => {
    const l = idx.libelles[c].get(cleLibelle(c, id, dci))!
    const o: Option = { id, libelle: l.fr, libelle_ar: l.ar, n: k }
    if (c === 'voie') {
      const v = voieParId(id)!
      o.courant = lang === 'ar' ? v.courant_ar : v.courant_fr
      const t = v.edqm ? edqmVoie(v.edqm) : null
      if (t) o.edqm = { code: t.code, terme: t.fr ?? t.en, relation: 'exact' }
    }
    if (l.edqm) o.edqm = l.edqm
    return o
  })
  if (c === 'voie') return opts.sort((a, b) => VOIE_RANG.get(a.id as VoieId)! - VOIE_RANG.get(b.id as VoieId)!)
  if (c === 'dosage') {
    return opts.sort((a, b) => {
      const la = idx.libelles.dosage.get(cleLibelle(c, a.id, dci))!, lb = idx.libelles.dosage.get(cleLibelle(c, b.id, dci))!
      return (la.famille ?? 3) - (lb.famille ?? 3) || (la.tri ?? Infinity) - (lb.tri ?? Infinity) || a.libelle.localeCompare(b.libelle, 'fr', { numeric: true })
    })
  }
  return opts.sort((a, b) => b.n - a.n || a.libelle.localeCompare(b.libelle, 'fr'))
}

/** Première étape : DCI dont le nom, une substance ou une marque contient la saisie. */
export function chercherDci(idx: GuideIndex, q: string, limite = 20): Option[] {
  const f = fold(q).replace(/\s+/g, ' ').trim()
  if (f.length < 2) return []
  const n = new Map<string, number>()
  for (const p of idx.presentations) n.set(p.axes.dci, (n.get(p.axes.dci) ?? 0) + 1)
  const res: (Option & { rang: number })[] = []
  for (const [id, t] of idx.dciTexte) {
    const l = idx.libelles.dci.get(id)!
    let rang = -1
    if (t.dci.startsWith(f)) rang = 0
    else if (t.dci.split(/[ +]+/).some(m => m.startsWith(f))) rang = 1
    else if (t.dci.includes(f)) rang = 2
    const marques = [...t.marques].filter(m => fold(m).startsWith(f))
    if (rang < 0 && marques.length) rang = 3
    if (rang < 0) continue
    const o: Option & { rang: number } = { id, libelle: l.fr, libelle_ar: null, n: n.get(id) ?? 0, rang }
    if (rang === 3) o.marques = marques.sort().slice(0, 3)
    res.push(o)
  }
  return res
    .sort((a, b) => a.rang - b.rang || b.n - a.n || a.libelle.localeCompare(b.libelle, 'fr'))
    .slice(0, limite)
    .map(({ rang, ...o }) => o)
}

/**
 * Une étape du parcours. Règles :
 *  1. aucune option ne mène à zéro présentation (chaque axe est compté avec tous les autres choix) ;
 *  2. un axe guidé à une seule valeur est rempli d'office (`auto`) ;
 *  3. un choix devenu incompatible est retiré (`ignores`), les autres sont gardés ;
 *  4. l'état tient dans les identifiants : la sélection est l'URL.
 */
export function guider(idx: GuideIndex, demande: Selection, lang: 'fr' | 'ar' = 'fr'): GuideReponse {
  const sel: Selection = {}
  for (const c of CRITERES) if (demande[c]) sel[c] = demande[c]
  const auto: Critere[] = []
  const ignores: Critere[] = []

  if (!sel.dci || !idx.libelles.dci.has(sel.dci)) {
    if (sel.dci) ignores.push('dci')
    return { etape: 'dci', selection: {}, auto, ignores, options: { dci: chercherDci(idx, demande.q ?? '') }, total: 0, presentations: [] }
  }
  const deLaDci = idx.presentations.filter(p => p.axes.dci === sel.dci)
  // une valeur absente de cette DCI est retirée seule, sans entraîner les autres choix
  for (const c of CRITERES) {
    if (c !== 'dci' && sel[c] && !deLaDci.some(p => p.axes[c] === sel[c])) { delete sel[c]; ignores.push(c) }
  }
  for (let tour = 0; tour < CRITERES.length; tour++) {
    let change = false
    // de l'aval vers l'amont : en cas de conflit, le choix le plus en amont l'emporte
    for (const c of [...CRITERES].reverse()) {
      if (c === 'dci' || !sel[c]) continue
      if (!deLaDci.some(p => p.axes[c] === sel[c] && correspond(p, sel, c))) {
        delete sel[c]; ignores.push(c); change = true
      }
    }
    for (const c of AXES_GUIDES) {
      if (sel[c]) continue
      const vals = new Set(deLaDci.filter(p => correspond(p, sel, c)).map(p => p.axes[c]))
      if (vals.size === 1) { sel[c] = [...vals][0]; auto.push(c); change = true }
    }
    if (!change) break
  }
  const options: GuideReponse['options'] = {}
  for (const c of CRITERES) {
    if (c === 'dci') continue
    options[c] = compterOptions(idx, deLaDci.filter(p => correspond(p, sel, c)), c, sel.dci, lang)
  }
  const selection: GuideReponse['selection'] = {}
  for (const c of CRITERES) {
    const id = sel[c]
    if (!id) continue
    const l = idx.libelles[c].get(cleLibelle(c, id, sel.dci))!
    selection[c] = { id, libelle: l.fr, libelle_ar: l.ar }
  }
  const presentations = deLaDci
    .filter(p => correspond(p, sel))
    .sort((a, b) => a.nom_marque.localeCompare(b.nom_marque, 'fr') || a.id - b.id)
  return {
    etape: AXES_GUIDES.find(c => !sel[c]) ?? null,
    selection,
    auto: [...new Set(auto)],
    ignores: [...new Set(ignores)],
    options,
    total: presentations.length,
    presentations,
  }
}
