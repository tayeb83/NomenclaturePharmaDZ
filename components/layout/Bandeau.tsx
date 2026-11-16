import type { ReactNode } from 'react'

/** Étoile à huit branches (khatam), points pour <polygon>. */
function starPoints(cx: number, cy: number, outer: number, inner: number) {
  return Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI * i) / 8 - Math.PI / 2
    const r = i % 2 ? inner : outer
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

/** Arc outrepassé (style Casbah) abritant le symbole des pharmacies algériennes. */
export function HeroNiche() {
  const arch = 'M14 134V66A40 40 0 1 1 86 66V134Z'
  const inner = 'M21 134V67A33 33 0 1 1 79 67V134Z'
  return (
    <div className="hero-niche" aria-hidden="true">
      <svg viewBox="0 0 100 134">
        <defs>
          <pattern id="hero-zellige" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
            <polygon points={starPoints(28, 28, 25, 13.5)} fill="var(--blue)" fillOpacity=".11" stroke="var(--blue)" strokeOpacity=".4" strokeWidth="1.4" />
            <circle cx="28" cy="28" r="3.6" fill="var(--blue)" fillOpacity=".4" />
          </pattern>
        </defs>
        <path d={arch} fill="var(--blue)" />
        <path d={inner} fill="#fff" />
        <path d={inner} fill="url(#hero-zellige)" />
        <path d={inner} fill="none" stroke="var(--brass)" strokeWidth="1.4" />
        <circle cx="50" cy="84" r="26" fill="#fff" stroke="var(--brass)" strokeWidth="1.4" />
        <image href="/emblem-pharma-dz.svg" x="29" y="63" width="42" height="42" />
        <path d="M14 134h72" stroke="var(--brass)" strokeWidth="2" />
      </svg>
    </div>
  )
}

/**
 * Bandeau commun à tout le site : même fond, même liseré et même niche que l'accueil.
 * Version repliée (recherche, recherche guidée) ; les autres pages l'obtiennent par `.page-header`.
 */
export function Bandeau({ children, dir }: { children: ReactNode; dir?: 'rtl' | 'ltr' }) {
  return (
    <section className="hero bandeau" dir={dir}>
      <div className="container hero-grid">
        <div className="hero-content">{children}</div>
        <HeroNiche />
      </div>
    </section>
  )
}
