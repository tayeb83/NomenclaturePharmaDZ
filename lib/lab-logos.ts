/**
 * PharmaVeille DZ — Service de récupération de logos de laboratoires
 *
 * Stratégie combinée :
 *  1. Mapping manuel pour les labos algériens et internationaux connus
 *  2. Clearbit Logo API en fallback (https://logo.clearbit.com/{domain})
 *
 * Clearbit retourne le logo officiel de l'entreprise à partir de son domaine.
 * Aucune clé API requise pour le tier gratuit.
 */

// Mapping : fragment normalisé du nom de labo → domaine web officiel
const DOMAIN_MAP: [string, string][] = [
  // ─── Laboratoires algériens ────────────────────────────────────────────────
  ['saidal',          'saidal-pharma.com'],
  ['biopharm',        'biopharm.dz'],
  ['el kendi',        'elkendi.com'],
  ['propharmal',      'propharmal.com'],
  ['frater razes',    'frater-razes.com'],
  ['frater-razes',    'frater-razes.com'],
  ['unipharm',        'unipharm-dz.com'],
  ['solupharm',       'solupharm.com'],
  ['iphar',           'iphar.dz'],
  ['pharmal',         'pharmal.dz'],
  ['endopharm',       'endopharm.dz'],
  ['sothema',         'sothema.com'],     // Maroc, présent en Algérie

  // ─── Moyen-Orient / MENA ──────────────────────────────────────────────────
  ['hikma',           'hikma.com'],
  ['julphar',         'julphar.com'],
  ['tabuk',           'tabukpharma.com'],
  ['eve',             'eve-pharma.com'],

  // ─── France ───────────────────────────────────────────────────────────────
  ['sanofi',          'sanofi.com'],
  ['servier',         'servier.com'],
  ['ipsen',           'ipsen.com'],
  ['pierre fabre',    'pierre-fabre.com'],
  ['pierre-fabre',    'pierre-fabre.com'],
  ['fabre',           'pierre-fabre.com'],
  ['guerbet',         'guerbet.com'],
  ['biocodex',        'biocodex.com'],
  ['mayoly',          'mayoly-spindler.com'],
  ['beaufour',        'ipsen.com'],
  ['besins',          'besins-healthcare.com'],
  ['menarini',        'menarini.com'],
  ['laboratoire rivat', 'rivat.fr'],
  ['innotech',        'innotech-international.com'],

  // ─── Allemagne ────────────────────────────────────────────────────────────
  ['bayer',           'bayer.com'],
  ['boehringer',      'boehringer-ingelheim.com'],
  ['stada',           'stada.de'],
  ['merck kgaa',      'emdgroup.com'],
  ['merck serono',    'emdgroup.com'],
  ['hexal',           'hexal.com'],

  // ─── Suisse ───────────────────────────────────────────────────────────────
  ['novartis',        'novartis.com'],
  ['roche',           'roche.com'],
  ['sandoz',          'sandoz.com'],
  ['vifor',           'viforpharma.com'],

  // ─── Royaume-Uni ──────────────────────────────────────────────────────────
  ['glaxosmithkline', 'gsk.com'],
  ['gsk',             'gsk.com'],
  ['astrazeneca',     'astrazeneca.com'],

  // ─── États-Unis ───────────────────────────────────────────────────────────
  ['pfizer',          'pfizer.com'],
  ['abbott',          'abbott.com'],
  ['abbvie',          'abbvie.com'],
  ['bristol',         'bms.com'],
  ['amgen',           'amgen.com'],
  ['gilead',          'gilead.com'],
  ['biogen',          'biogen.com'],
  ['lilly',           'lilly.com'],
  ['eli lilly',       'lilly.com'],
  ['johnson',         'jnj.com'],
  ['janssen',         'janssen.com'],
  ['merck',           'merck.com'],
  ['msd',             'merck.com'],
  ['baxter',          'baxter.com'],
  ['fresenius',       'fresenius-kabi.com'],
  ['allergan',        'allergan.com'],
  ['hospira',         'pfizer.com'],
  ['watson',          'allergan.com'],

  // ─── Génériciens internationaux ───────────────────────────────────────────
  ['teva',            'tevapharm.com'],
  ['mylan',           'viatris.com'],
  ['viatris',         'viatris.com'],
  ['zentiva',         'zentiva.com'],
  ['actavis',         'actavis.com'],
  ['apotex',          'apotex.com'],
  ['ranbaxy',         'sunpharma.com'],
  ['sun pharma',      'sunpharma.com'],
  ['cipla',           'cipla.com'],
  ['dr reddy',        'drreddys.com'],
  ['lupin',           'lupinpharmaceuticals.com'],
  ['aurobindo',       'aurobindo.com'],

  // ─── Japon / Asie ─────────────────────────────────────────────────────────
  ['takeda',          'takeda.com'],
  ['astellas',        'astellas.com'],
  ['daiichi',         'daiichisankyo.com'],
  ['otsuka',          'otsuka-pharma.com'],
  ['shionogi',        'shionogi.com'],

  // ─── Autres européens ─────────────────────────────────────────────────────
  ['ucb',             'ucb.com'],
  ['novo nordisk',    'novonordisk.com'],
  ['novo',            'novonordisk.com'],
  ['lundbeck',        'lundbeck.com'],
  ['ferring',         'ferring.com'],
  ['nycomed',         'takeda.com'],
  ['zambon',          'zambon.com'],
  ['recordati',       'recordati.com'],
  ['angelini',        'angelinipharma.com'],
  ['chiesi',          'chiesi.com'],
  ['biomarin',        'biomarin.com'],
]

/**
 * Normalise un nom de laboratoire pour la comparaison :
 * - Met en minuscules
 * - Supprime les accents
 * - Supprime les suffixes juridiques (S.A., SPA, SARL, Ltd, GmbH, etc.)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(s\.?a\.?r?l?\.?|spa|eurl|sarl|llc|ltd|gmbh|ag|inc|corp|s\.?p\.?a\.?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Retourne l'URL du logo Clearbit pour un nom de laboratoire donné.
 * Retourne `null` si aucune correspondance n'est trouvée dans le mapping.
 *
 * @param labName - Nom du laboratoire tel qu'il apparaît dans la base de données
 */
export function getLabLogoUrl(labName: string | null): string | null {
  if (!labName) return null

  const normalized = normalizeName(labName)

  for (const [key, domain] of DOMAIN_MAP) {
    if (normalized.includes(key)) {
      return `https://logo.clearbit.com/${domain}`
    }
  }

  return null
}

/**
 * Retourne l'URL de la page Wikipedia (FR) pour un nom de laboratoire donné.
 * Utile pour enrichir les fiches avec un lien vers l'article du laboratoire.
 *
 * @param labName - Nom du laboratoire
 * @param pays - Pays du laboratoire (optionnel, pour affiner la recherche)
 */
export function getLabWikipediaSearchUrl(labName: string | null, pays?: string | null): string | null {
  if (!labName) return null

  const lang = pays === 'FRANCE' ? 'fr' : pays === 'ALGERIE' ? 'fr' : 'en'
  const query = encodeURIComponent(labName.split(' ').slice(0, 3).join(' '))
  return `https://${lang}.wikipedia.org/w/index.php?search=${query}&ns0=1`
}
