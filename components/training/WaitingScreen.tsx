'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { AR_VALIDATED, getCopy, PAGE_FACEBOOK_URL } from '@/lib/training/copy'
import { CheckIcon, ClockIcon, FacebookIcon, MailIcon } from './icons'

export function WaitingScreen() {
  const { lang } = useLanguage()
  const t = getCopy(lang).wait
  const state = ['done', 'current', 'todo'] as const
  const stateLabel = { done: t.stateDone, current: t.stateCurrent, todo: t.stateTodo }
  const icons = [<CheckIcon key="a" size={22} />, <ClockIcon key="b" size={22} />, <MailIcon key="c" size={22} />]

  return (
    <div className="tr-wrap tr-narrow">
      <h1 className="tr-wait-title" role="status">{t.title}</h1>
      <p className="tr-intro">{t.lead}</p>
      {lang === 'ar' && !AR_VALIDATED && <p className="tr-pending-note">{getCopy(lang).arPending}</p>}

      <ol className="tr-timeline" aria-label={t.title}>
        {t.steps.map((label, i) => (
          <li key={label} className={`is-${state[i]}`} aria-current={state[i] === 'current' ? 'step' : undefined}>
            <span className="tr-tl-icon">{icons[i]}</span>
            <span className="tr-tl-label">{label}</span>
            <span className="tr-tl-state">{stateLabel[state[i]]}</span>
          </li>
        ))}
      </ol>

      <p>{t.body}</p>

      <section className="tr-card tr-card-sm" aria-labelledby="tr-fb">
        <h2 id="tr-fb">{t.facebookTitle}</h2>
        <p>{t.facebookText}</p>
        <a className="tr-btn tr-btn-facebook" href={PAGE_FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
          <FacebookIcon /> {t.facebookCta}
        </a>
      </section>

      <p><Link className="tr-link" href="/">{t.home}</Link></p>
    </div>
  )
}
