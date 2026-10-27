'use client'

import type { Suggestion, SuggestionKind } from '@/lib/suggest'

const TITLES: Record<SuggestionKind, { fr: string; ar: string }> = {
  marque: { fr: 'Médicaments', ar: 'الأدوية' },
  dci: { fr: 'Substances actives', ar: 'المواد الفعالة' },
  labo: { fr: 'Laboratoires', ar: 'المخابر' },
}

/** Liste déroulante des suggestions, groupées par type (rôle ARIA « listbox »). */
export function SuggestionList({
  id, items, active, lang, onPick, onHover,
}: {
  id: string
  items: Suggestion[]
  active: number
  lang: 'fr' | 'ar'
  onPick: (s: Suggestion) => void
  onHover: (i: number) => void
}) {
  let lastKind: SuggestionKind | null = null
  return (
    <ul id={id} className="sg-list" role="listbox">
      {items.map((s, i) => {
        const head = s.kind !== lastKind
        lastKind = s.kind
        return (
          <li key={`${s.kind}-${s.label}`} role="presentation">
            {head && <div className="sg-head" role="presentation">{TITLES[s.kind][lang]}</div>}
            <div
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`sg-item${i === active ? ' active' : ''}`}
              // mousedown : le clic doit passer avant que l'input perde le focus et ferme la liste
              onMouseDown={e => { e.preventDefault(); onPick(s) }}
              onMouseEnter={() => onHover(i)}
            >
              <span className="sg-label">{s.label}</span>
              {s.sub && <span className="sg-sub">{s.sub}</span>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
