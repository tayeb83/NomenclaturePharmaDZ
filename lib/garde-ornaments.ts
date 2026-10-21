/**
 * Ornements « Casbah / andalou » des visuels de garde (Facebook).
 *
 * Mêmes motifs que le site (HomeClient : arc outrepassé, zellige à étoile à
 * huit branches ; globals.css : bandeau de zellige) et mêmes couleurs — marine,
 * bleu, laiton, blanc chaux. Chaque ornement est un SVG autonome renvoyé en
 * data URI : satori ne sait ni charger d'URL distante ni évaluer de CSS
 * complexe, mais rend sans problème un <img> SVG.
 */

export const CASBAH = {
  navy: '#12233f',
  navyDeep: '#0b1730',
  blue: '#1d4e9e',
  blueDeep: '#173f82',
  brass: '#b98425',
  brassLight: '#e3b65b',
  brassDark: '#8a5f12',
  teal: '#1e8e8a',
  tealLight: '#e2f1ef',
  whitewash: '#f1f4f4',
  cream: '#fbf7ec',
  creamEdge: '#efe4c8',
  tile: '#e4edf2',
  ink: '#12233f',
  muted: '#5b6577',
} as const

/** Étoile à huit branches (khatam), points pour <polygon>. */
export function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  return Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI * i) / 8 - Math.PI / 2
    const r = i % 2 ? inner : outer
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const SVG_NS = 'xmlns="http://www.w3.org/2000/svg"'

/** Étoile isolée — puce des lignes, séparateurs. */
export function starUri(color: string): string {
  return svgDataUri(
    `<svg ${SVG_NS} viewBox="0 0 56 56"><polygon points="${starPoints(28, 28, 27, 14)}" fill="${color}"/>` +
    `<circle cx="28" cy="28" r="5" fill="#fff" fill-opacity=".85"/></svg>`
  )
}

/** Fond de page : dégradé marine + semis de zellige laiton très discret. */
export function backgroundUri(width: number, height: number): string {
  const tile = 84
  return svgDataUri(
    `<svg ${SVG_NS} width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs>` +
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${CASBAH.blueDeep}"/><stop offset="1" stop-color="${CASBAH.navyDeep}"/>` +
    `</linearGradient>` +
    `<pattern id="p" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse">` +
    `<polygon points="${starPoints(tile / 2, tile / 2, 36, 19)}" fill="${CASBAH.brassLight}" fill-opacity=".05" stroke="${CASBAH.brassLight}" stroke-opacity=".2" stroke-width="1.4"/>` +
    `<circle cx="${tile / 2}" cy="${tile / 2}" r="4" fill="${CASBAH.brassLight}" fill-opacity=".2"/>` +
    `</pattern>` +
    `<radialGradient id="v" cx=".5" cy=".4" r=".75">` +
    `<stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>` +
    `<rect width="100%" height="100%" fill="url(#p)"/>` +
    `<rect width="100%" height="100%" fill="url(#v)"/>` +
    `</svg>`
  )
}

/**
 * Bandeau de zellige (celui de la navigation du site) : fond carreau clair,
 * étoiles bleues, filets laiton haut et bas.
 */
export function bandUri(width: number, height: number): string {
  const tile = height - 4
  const c = tile / 2
  return svgDataUri(
    `<svg ${SVG_NS} width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><pattern id="b" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse" x="${(width % tile) / 2}" y="2">` +
    `<polygon points="${starPoints(c, c, c - 1, (c - 1) * 0.54)}" fill="${CASBAH.blue}" fill-opacity=".14" stroke="${CASBAH.blue}" stroke-opacity=".5" stroke-width="1.1"/>` +
    `<circle cx="${c}" cy="${c}" r="${(c * 0.16).toFixed(1)}" fill="${CASBAH.blue}" fill-opacity=".5"/>` +
    `</pattern></defs>` +
    `<rect width="100%" height="100%" fill="${CASBAH.tile}"/>` +
    `<rect width="100%" height="100%" fill="url(#b)"/>` +
    `<rect width="100%" height="2" fill="${CASBAH.brass}"/>` +
    `<rect y="${height - 2}" width="100%" height="2" fill="${CASBAH.brass}"/>` +
    `</svg>`
  )
}

/**
 * Niche en arc outrepassé (reprise de HeroNiche du site) : double arc bleu et
 * crème zellige, filet laiton, socle. Le médaillon central accueille le blason
 * de la wilaya ou l'emblème des pharmacies, posés par-dessus en <img>.
 *
 * Retourne l'URI et la position du médaillon (centre + rayon, en px).
 */
export function nicheUri(scale: number): {
  uri: string; width: number; height: number
  medallion: { cx: number; cy: number; r: number }
} {
  const vbW = 100
  const vbH = 134
  const arch = 'M14 134V66A40 40 0 1 1 86 66V134Z'
  const inner = 'M21 134V67A33 33 0 1 1 79 67V134Z'
  const m = { cx: 50, cy: 80, r: 29 }
  const uri = svgDataUri(
    `<svg ${SVG_NS} width="${vbW * scale}" height="${vbH * scale}" viewBox="0 0 ${vbW} ${vbH}">` +
    `<defs><pattern id="z" width="30" height="30" patternUnits="userSpaceOnUse">` +
    `<polygon points="${starPoints(15, 15, 13.5, 7.3)}" fill="${CASBAH.blue}" fill-opacity=".12" stroke="${CASBAH.blue}" stroke-opacity=".42" stroke-width="1"/>` +
    `<circle cx="15" cy="15" r="2" fill="${CASBAH.blue}" fill-opacity=".4"/>` +
    `</pattern></defs>` +
    `<path d="${arch}" fill="${CASBAH.brassLight}"/>` +
    `<path d="M16 134V66.4A38 38 0 1 1 84 66.4V134Z" fill="${CASBAH.blue}"/>` +
    `<path d="${inner}" fill="${CASBAH.cream}"/>` +
    `<path d="${inner}" fill="url(#z)"/>` +
    `<path d="${inner}" fill="none" stroke="${CASBAH.brass}" stroke-width="1.4"/>` +
    `<circle cx="${m.cx}" cy="${m.cy}" r="${m.r}" fill="#fff" stroke="${CASBAH.brass}" stroke-width="1.6"/>` +
    `<circle cx="${m.cx}" cy="${m.cy}" r="${m.r - 3}" fill="none" stroke="${CASBAH.brassLight}" stroke-width=".8"/>` +
    `<path d="M14 133h72" stroke="${CASBAH.brass}" stroke-width="2"/>` +
    `</svg>`
  )
  return {
    uri,
    width: vbW * scale,
    height: vbH * scale,
    medallion: { cx: m.cx * scale, cy: m.cy * scale, r: m.r * scale },
  }
}

/**
 * Filet orné : trait laiton interrompu par une étoile centrale. `starRadius`
 * règle aussi la hauteur de l'image (2 × rayon + 2).
 */
export function ornamentRuleUri(width: number, color: string = CASBAH.brass, starRadius = 10, opacity = 0.7): string {
  const h = starRadius * 2 + 2
  const mid = width / 2
  const half = mid - starRadius * 2
  return svgDataUri(
    `<svg ${SVG_NS} width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">` +
    `<rect x="0" y="${h / 2 - 1}" width="${half}" height="2" fill="${color}" fill-opacity="${opacity}"/>` +
    `<rect x="${mid + starRadius * 2}" y="${h / 2 - 1}" width="${half}" height="2" fill="${color}" fill-opacity="${opacity}"/>` +
    `<polygon points="${starPoints(mid, h / 2, starRadius, starRadius * 0.54)}" fill="${color}"/>` +
    `</svg>`
  )
}

export type IconKind = 'pill' | 'alert' | 'sparkle' | 'chart'

/**
 * Pictogrammes posés dans le médaillon de la niche des visuels éditoriaux
 * (publications thématiques). Dessinés à la main plutôt qu'en emoji : satori
 * ne rend pas les emoji sans les télécharger.
 */
export function iconUri(kind: IconKind): string {
  const body: Record<IconKind, string> = {
    pill:
      `<g transform="rotate(-40 48 48)"><rect x="14" y="30" width="68" height="36" rx="18" fill="${CASBAH.teal}"/>` +
      `<path d="M48 30h16a18 18 0 0 1 0 36H48z" fill="${CASBAH.brass}"/>` +
      `<rect x="22" y="36" width="22" height="6" rx="3" fill="#fff" fill-opacity=".55"/></g>`,
    alert:
      `<path d="M48 10 90 82H6z" fill="#dc2626" stroke="#dc2626" stroke-width="6" stroke-linejoin="round"/>` +
      `<rect x="44" y="34" width="8" height="26" rx="4" fill="#fff"/><circle cx="48" cy="70" r="5" fill="#fff"/>`,
    sparkle:
      `<path d="M48 6 58 38 90 48 58 58 48 90 38 58 6 48 38 38z" fill="${CASBAH.brass}"/>` +
      `<path d="M48 22 53 43 74 48 53 53 48 74 43 53 22 48 43 43z" fill="#fff" fill-opacity=".6"/>`,
    chart:
      `<rect x="12" y="52" width="18" height="32" rx="3" fill="${CASBAH.teal}"/>` +
      `<rect x="39" y="30" width="18" height="54" rx="3" fill="${CASBAH.blue}"/>` +
      `<rect x="66" y="10" width="18" height="74" rx="3" fill="${CASBAH.brass}"/>`,
  }
  return svgDataUri(`<svg ${SVG_NS} width="96" height="96" viewBox="0 0 96 96">${body[kind]}</svg>`)
}
