'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { SuggestionList } from './SuggestionList'
import { useSuggestions } from './useSuggestions'

/**
 * Recherche de l'accueil : autocomplétion (marques, substances, laboratoires)
 * et accès direct à la recherche avancée. Sans JavaScript, le formulaire
 * fonctionne quand même (GET /recherche?q=…).
 */
export function SearchBox() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [q, setQ] = useState('')
  const go = useCallback((text: string, dci = false) => {
    const v = text.trim()
    // Une substance choisie : toutes ses présentations par ordre alphabétique (mode=dci)
    if (v) router.push(`/recherche?q=${encodeURIComponent(v)}${dci ? '&mode=dci' : ''}`)
  }, [router])
  const sg = useSuggestions(q, s => { setQ(s.label); go(s.label, s.kind === 'dci') })

  return (
    <div className="home-search-wrap">
      <form className="home-search" action="/recherche" method="get" role="search" onSubmit={e => { e.preventDefault(); go(q) }}>
        <input
          type="search" name="q" required autoComplete="off" enterKeyHint="search"
          role="combobox" aria-expanded={sg.open} aria-controls="home-sg" aria-autocomplete="list"
          aria-activedescendant={sg.active >= 0 ? `home-sg-${sg.active}` : undefined}
          aria-label={lang === 'ar' ? 'البحث عن دواء' : 'Rechercher un médicament'}
          placeholder={lang === 'ar' ? 'الاسم أو المادة الفعالة أو المخبر…' : 'Nom, substance active ou laboratoire…'}
          value={q}
          onChange={e => { setQ(e.target.value); sg.setOpen(true) }}
          onKeyDown={e => { sg.onKeyDown(e) }}
          onFocus={() => sg.items.length > 0 && sg.setOpen(true)}
          onBlur={() => sg.setOpen(false)}
        />
        <button type="submit">{lang === 'ar' ? 'بحث' : 'Rechercher'}</button>
        {sg.open && sg.items.length > 0 && (
          <SuggestionList id="home-sg" items={sg.items} active={sg.active} lang={lang} onPick={sg.pick} onHover={sg.setActive} />
        )}
      </form>
      <div className="home-modes">
        <a className="home-mode guidee" href="/recherche?onglet=guide">
          <span aria-hidden>🧭</span>
          <span><b>{lang === 'ar' ? 'البحث الموجَّه' : 'Recherche guidée'}</b><small>{lang === 'ar' ? 'المادة ← الطريقة ← الشكل ← الجرعة' : 'Substance → voie → forme → dosage'}</small></span>
          <em>{lang === 'ar' ? 'جديد' : 'Nouveau'}</em>
        </a>
        <a className="home-mode" href="/recherche?avancee=1">
          <span aria-hidden>⚙️</span>
          <span><b>{lang === 'ar' ? 'بحث متقدم' : 'Recherche avancée'}</b><small>{lang === 'ar' ? 'شروط و/أو، الجرعة، السنة…' : 'Conditions ET / OU, dosage, année…'}</small></span>
        </a>
      </div>
    </div>
  )
}
