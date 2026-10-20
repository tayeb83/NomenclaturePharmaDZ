import type { OpenStatus } from '@/lib/annuaire-hours'

/** Étoile à huit branches (khatam) : 16 sommets alternant rayon externe / interne. */
function starPoints(cx: number, cy: number, outer: number, inner: number) {
  return Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI * i) / 8 - Math.PI / 2
    const r = i % 2 ? inner : outer
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

const STAR = starPoints(24, 24, 23.5, 14.5)

const GLYPH: Record<OpenStatus['state'], React.ReactNode> = {
  garde: <path d="M28 15a10 10 0 1 0 6 14 8.5 8.5 0 0 1-6-14z" fill="currentColor" />,
  open: <path d="M16.5 25l5.5 5.5 10-11" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />,
  closing: (
    <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <circle cx="24" cy="24" r="8.5" />
      <path d="M24 19v5.5l3.5 2" />
    </g>
  ),
  closed: <path d="M17.5 24h13" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />,
}

/** Médaillon d'état d'une pharmacie : la couleur et le pictogramme disent l'état, le texte reste affiché à côté. */
export function StateMedal({ state, size = 46 }: { state: OpenStatus['state']; size?: number }) {
  return (
    <svg className={`an-medal an-m-${state}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <polygon points={STAR} />
      {GLYPH[state]}
    </svg>
  )
}

/** Médaillon portant un code court (numéro de wilaya). */
export function CodeMedal({ code, size = 50, soon = false }: { code: string; size?: number; soon?: boolean }) {
  return (
    <svg className={`an-medal ${soon ? 'an-m-soon' : 'an-m-code'}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <polygon points={STAR} />
      <text x="24" y="29.5" textAnchor="middle" fontSize="15" fontWeight="800" fill="currentColor" style={{ fontFamily: 'var(--font-mono)' }}>{code}</text>
    </svg>
  )
}
