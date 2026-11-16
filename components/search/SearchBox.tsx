'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { ModesRecherche, PanneauGarde, type ModeRecherche } from './ModesRecherche'
import { SuggestionList } from './SuggestionList'
import { useSuggestions } from './useSuggestions'

/**
 * Recherche de l'accueil, en trois onglets comme /recherche :
 * médicament (autocomplétion marques, substances, laboratoires), recherche guidée, pharmacie de garde.
 * Sans JavaScript, le formulaire du premier onglet fonctionne quand même (GET /recherche?q=…).
 */
export function SearchBox() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const t = (fr: string, a: string) => (ar ? a : fr)
  const router = useRouter()
  const [mode, setMode] = useState<ModeRecherche>('medicament')
  const [q, setQ] = useState('')
  const go = useCallback((text: string, dci = false) => {
    const v = text.trim()
    // Une substance choisie : toutes ses présentations par ordre alphabétique (mode=dci)
    if (v) router.push(`/recherche?q=${encodeURIComponent(v)}${dci ? '&mode=dci' : ''}`)
  }, [router])
  const sg = useSuggestions(q, s => { setQ(s.label); go(s.label, s.kind === 'dci') })

  return (
    <div className="home-search-wrap">
      <p className="home-question" id="home-question">
        {t('Que cherchez-vous ?', 'عمّ تبحث؟')} <span>{t('Choisissez un mode', 'اختر نمط البحث')}</span>
      </p>
      <ModesRecherche mode={mode} onChange={setMode} ar={ar} labelledBy="home-question" />

      {mode === 'medicament' && (
        <>
          <form className="home-search" action="/recherche" method="get" role="search" onSubmit={e => { e.preventDefault(); go(q) }}>
            <input
              type="search" name="q" required autoComplete="off" enterKeyHint="search"
              role="combobox" aria-expanded={sg.open} aria-controls="home-sg" aria-autocomplete="list"
              aria-activedescendant={sg.active >= 0 ? `home-sg-${sg.active}` : undefined}
              aria-label={t('Rechercher un médicament', 'البحث عن دواء')}
              placeholder={t('Nom, substance active ou laboratoire…', 'الاسم أو المادة الفعالة أو المخبر…')}
              value={q}
              onChange={e => { setQ(e.target.value); sg.setOpen(true) }}
              onKeyDown={e => { sg.onKeyDown(e) }}
              onFocus={() => sg.items.length > 0 && sg.setOpen(true)}
              onBlur={() => sg.setOpen(false)}
            />
            <button type="submit">{t('Rechercher', 'بحث')}</button>
            {sg.open && sg.items.length > 0 && (
              <SuggestionList id="home-sg" items={sg.items} active={sg.active} lang={lang} onPick={sg.pick} onHover={sg.setActive} />
            )}
          </form>
          <p className="home-mode-aide">{t('Filtrez ensuite par voie, forme, dosage ou origine, ou ajoutez des conditions avancées (ET / OU).', 'ثم صفِّ حسب الطريقة والشكل والجرعة والمصدر، أو أضف شروطًا متقدمة (و / أو).')}</p>
        </>
      )}

      {mode === 'guidee' && (
        <div className="home-panneau">
          <p><b>{t('Trouvez pas à pas', 'اعثر عليه خطوة بخطوة')}</b> — {t('sans connaître le nom exact : la substance, puis la voie, la forme et le dosage.', 'دون معرفة الاسم بدقة: المادة الفعالة، ثم الطريقة والشكل والجرعة.')}</p>
          <div className="home-etapes" aria-hidden>
            {['Substance', 'Voie', 'Forme', 'Dosage'].map((e, i) => <span key={e}><i>{i + 1}</i>{ar ? ['المادة', 'الطريقة', 'الشكل', 'الجرعة'][i] : e}</span>)}
          </div>
          <Link href="/recherche?onglet=guide" className="home-bouton">🧭 {t('Commencer la recherche guidée', 'ابدأ البحث الموجَّه')}</Link>
        </div>
      )}

      {mode === 'garde' && <PanneauGarde ar={ar} />}
    </div>
  )
}
