'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { getCopy } from '@/lib/training/copy'

export type Card = {
  id: number; type: string; stem: string; options: string[]; correct_index: number
  explanation: { contexte: string; rationales: string[] }
}
const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function FlashcardDeck({ cards: initial }: { cards: Card[] }) {
  const { lang } = useLanguage()
  const c = getCopy(lang)
  const t = c.flash
  const [cards, setCards] = useState(initial)
  const [i, setI] = useState(0)
  const [shown, setShown] = useState(false)
  const [error, setError] = useState('')
  const card = cards[Math.min(i, cards.length - 1)]

  const go = (n: number) => { setShown(false); setI(Math.min(Math.max(n, 0), cards.length - 1)) }
  const shuffle = useMemo(() => () => {
    const a = cards.slice()
    for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]] }
    setCards(a); setI(0); setShown(false)
  }, [cards])

  async function remove() {
    const res = await fetch('/api/training/flashcards', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question_id: card.id }),
    }).catch(() => null)
    if (!res?.ok) { setError(t.removeError); return }
    setError('')
    const rest = cards.filter(x => x.id !== card.id)
    setCards(rest); setShown(false); setI(Math.min(i, Math.max(rest.length - 1, 0)))
  }

  if (cards.length === 0) {
    return (
      <div className="tr-wrap tr-narrow">
        <h1 className="tr-wait-title">{t.title}</h1>
        <p className="tr-muted">{t.empty}</p>
        <Link className="tr-link" href="/training/espace">{t.back}</Link>
      </div>
    )
  }

  return (
    <div className="tr-wrap tr-narrow tr-quiz">
      <h1 className="tr-wait-title">{t.title}</h1>
      <p className="tr-muted" aria-live="polite">{t.cardOf(Math.min(i, cards.length - 1) + 1, cards.length)}</p>

      <section className="tr-card tr-flash" aria-label={card.stem}>
        <p className="tr-flash-q">{card.stem}</p>
        {shown && (
          <div className="tr-flash-a" aria-live="polite">
            <h2>{t.answer}</h2>
            <p><strong>{LETTERS[card.correct_index]}. {card.options[card.correct_index]}</strong></p>
            <h3>{t.why}</h3>
            <p>{card.explanation.rationales[card.correct_index]}</p>
            <h3>{t.context}</h3>
            <p>{card.explanation.contexte}</p>
          </div>
        )}
        <button type="button" className="tr-btn tr-btn-primary" aria-expanded={shown} onClick={() => setShown(s => !s)}>
          {shown ? t.hide : t.show}
        </button>
      </section>

      <div className="tr-pager">
        <button type="button" className="tr-btn tr-btn-outline" onClick={() => go(i - 1)} disabled={i <= 0}>{t.prev}</button>
        <button type="button" className="tr-btn tr-btn-outline" onClick={() => go(i + 1)} disabled={i >= cards.length - 1}>{t.next}</button>
      </div>
      <div className="tr-flash-tools">
        <button type="button" className="tr-btn tr-btn-outline" onClick={shuffle}>{t.shuffle}</button>
        <button type="button" className="tr-btn tr-btn-outline" onClick={remove}>{t.remove}</button>
      </div>
      <div className="tr-error" role="alert" aria-live="assertive">{error}</div>
      <p><Link className="tr-link" href="/training/espace">{t.back}</Link></p>
    </div>
  )
}
