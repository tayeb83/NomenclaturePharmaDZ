'use client'

import { useLanguage } from '@/components/i18n/LanguageProvider'
import { AR_VALIDATED, getCopy } from '@/lib/training/copy'
import { CheckIcon } from './icons'
import { SignupForm } from './SignupForm'

export function TrainingLanding({ facebookEnabled, fbCode }: { facebookEnabled: boolean; fbCode: string | null }) {
  const { lang } = useLanguage()
  const t = getCopy(lang)

  return (
    <div className="tr-wrap">
      <header className="tr-hero">
        <p className="tr-eyebrow">{t.brand}</p>
        <h1>{t.hero.title}</h1>
        <p className="tr-subtitle" lang={t.hero.subtitleLang} dir={t.hero.subtitleLang === 'ar' ? 'rtl' : 'ltr'}>
          {t.hero.subtitleOther}
        </p>
        <p className="tr-intro">{t.hero.intro}</p>
        {lang === 'ar' && !AR_VALIDATED && <p className="tr-pending-note">{t.arPending}</p>}
      </header>

      <div className="tr-grid">
        <div className="tr-main">
          <section className="tr-card" aria-labelledby="tr-included">
            <h2 id="tr-included">{t.included.title}</h2>
            <ul className="tr-checks">
              {t.included.items.map(item => (
                <li key={item}><CheckIcon className="tr-check" /><span>{item}</span></li>
              ))}
            </ul>
          </section>

          <section className="tr-section" aria-labelledby="tr-benefits">
            <h2 id="tr-benefits">{t.benefits.title}</h2>
            <ul className="tr-cards">
              {t.benefits.items.map(b => (
                <li key={b.t} className="tr-card tr-card-sm"><h3>{b.t}</h3><p>{b.d}</p></li>
              ))}
            </ul>
          </section>

          <section className="tr-section" aria-labelledby="tr-types">
            <h2 id="tr-types">{t.types.title}</h2>
            <p className="tr-muted">{t.types.intro}</p>
            <ul className="tr-types">
              {t.types.items.map(x => (
                <li key={x.t}><strong>{x.t}</strong><span>{x.d}</span></li>
              ))}
            </ul>
          </section>

          <section className="tr-section" aria-labelledby="tr-steps">
            <h2 id="tr-steps">{t.steps.title}</h2>
            <ol className="tr-steps">
              {t.steps.items.map((s, i) => (
                <li key={s.t}>
                  <span className="tr-step-n" aria-hidden="true">{i + 1}</span>
                  <div><h3>{s.t}</h3><p>{s.d}</p></div>
                </li>
              ))}
            </ol>
          </section>

          <section className="tr-section" aria-labelledby="tr-faq">
            <h2 id="tr-faq">{t.faq.title}</h2>
            <div className="tr-faq">
              {t.faq.items.map(f => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside className="tr-aside" aria-label={t.form.title}>
          <SignupForm facebookEnabled={facebookEnabled} fbCode={fbCode} />
        </aside>
      </div>
    </div>
  )
}
