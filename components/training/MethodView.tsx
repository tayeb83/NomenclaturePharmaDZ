'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { getCopy } from '@/lib/training/copy'
import { THEME_KEYS, THEMES } from '@/lib/training/themes'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

/** Un exemple réel : une question publiée de ce type, avec sa correction repliée. */
export type MethodExample = {
  type: string
  stem: string
  options: string[]
  correct_index: number
  rationale: string
  contexte: string
}

export function MethodView({ examples }: { examples: MethodExample[] }) {
  const { lang } = useLanguage()
  const c = getCopy(lang)
  const m = c.method
  const byType = new Map(examples.map(e => [e.type, e]))

  return (
    <div className="tr-wrap tr-narrow">
      <p className="tr-eyebrow">Dzair-Pharma Training</p>
      <h1>{m.title}</h1>
      <p className="tr-intro">{m.lead}</p>
      <p><Link className="tr-link" href="/training/espace">← {m.back}</Link></p>

      {THEME_KEYS.map(theme => (
        <section key={theme} className="tr-method-group" aria-labelledby={`m-${theme}`}>
          <h2 id={`m-${theme}`}>{m.groups[theme]}</h2>
          {THEMES[theme].map(type => {
            const info = m.byType[type]
            const ex = byType.get(type)
            return (
              <article key={type} className="tr-method-card">
                <h3>{c.typeLabels[type] ?? type}</h3>
                <p className="tr-muted">{m.toolLabel} : <Link className="tr-link" href={info.href}>{info.tool}</Link></p>
                <strong>{m.stepsLabel}</strong>
                <ol>{info.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                <div className="tr-method-example">
                  <strong>{m.exampleLabel}</strong>
                  {ex ? (
                    <>
                      <p style={{ margin: '6px 0 0' }}>{ex.stem}</p>
                      <ul>{ex.options.map((o, i) => <li key={i}>{o}</li>)}</ul>
                      <details>
                        <summary>{m.showAnswer}</summary>
                        <p><strong>{LETTERS[ex.correct_index]}.</strong> {ex.options[ex.correct_index]}</p>
                        <p>{ex.rationale}</p>
                        <p className="tr-muted">{ex.contexte}</p>
                      </details>
                    </>
                  ) : (
                    <p className="tr-muted" style={{ margin: '6px 0 0' }}>{m.noExample}</p>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      ))}
    </div>
  )
}
