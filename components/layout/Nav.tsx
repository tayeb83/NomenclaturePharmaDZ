'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { useLanguage } from '@/components/i18n/LanguageProvider'

export function Nav({ currentVersion }: { currentVersion?: string | null }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { lang } = useLanguage()

  const links = useMemo(() => [
    { href: '/', label: lang === 'ar' ? 'الرئيسية' : 'Accueil' },
    { href: '/recherche', label: lang === 'ar' ? 'البحث' : 'Recherche' },
    { href: '/alertes', label: lang === 'ar' ? '🚨 التنبيهات' : '🚨 Alertes', badge: true },
    { href: '/substitution', label: lang === 'ar' ? 'الاستبدال' : 'Substitution' },
    { href: '/a-propos', label: lang === 'ar' ? 'حول' : 'À propos' },
  ], [lang])

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">💊</div>
          <div>
            <div className="nav-logo-text">PharmaVeille DZ</div>
            <div className="nav-logo-sub">
              {currentVersion ? `${lang === 'ar' ? 'الإصدار' : 'Version'} ${currentVersion}` : (lang === 'ar' ? 'MIPH — بيانات رسمية' : 'MIPH — Données officielles')}
            </div>
          </div>
        </Link>

        <div className={`nav-links${open ? ' open' : ''}`}>
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link${pathname === l.href ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
              {l.badge && <span className="nav-link-badge">!</span>}
            </Link>
          ))}
        </div>

        {currentVersion && (
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
            display: 'none',
            flexShrink: 0,
          }} className="nav-version-badge">
            📋 {currentVersion}
          </span>
        )}

        <LanguageSwitcher />

        <Link href="/newsletter" className="nav-newsletter-btn">
          📧 {lang === 'ar' ? 'النشرة البريدية' : 'Newsletter'}
        </Link>

        <button className="nav-mobile-toggle" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  )
}
