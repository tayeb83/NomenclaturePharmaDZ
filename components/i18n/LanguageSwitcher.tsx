'use client'

import { useLanguage } from './LanguageProvider'

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()

  return (
    <div style={{ display: 'inline-flex', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 999, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setLang('fr')}
        style={{
          border: 'none',
          background: lang === 'fr' ? 'rgba(255,255,255,0.24)' : 'transparent',
          color: 'white',
          fontSize: 12,
          fontWeight: 700,
          padding: '6px 10px',
          cursor: 'pointer',
        }}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLang('ar')}
        style={{
          border: 'none',
          borderLeft: '1px solid rgba(255,255,255,0.2)',
          background: lang === 'ar' ? 'rgba(255,255,255,0.24)' : 'transparent',
          color: 'white',
          fontSize: 12,
          fontWeight: 700,
          padding: '6px 10px',
          cursor: 'pointer',
        }}
      >
        AR
      </button>
    </div>
  )
}
